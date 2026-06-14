import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mongoose = require("../server/node_modules/mongoose");

const ENV_FILES = [
  ".env.codex.local",
  ".env.local",
  ".env.development",
  "server/.env",
];

for (const file of ENV_FILES) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

function idOf(document) {
  return String(document?.id || document?._id || "").trim();
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function shortUser(user) {
  return {
    id: idOf(user),
    email: user.email || "",
    name: user.name || "",
    role: user.role || "",
    schoolId: user.schoolId || null,
    groupIds: unique(user.groupIds || []),
  };
}

function shortGroup(group) {
  return {
    id: idOf(group),
    name: group.name || "",
    type: group.type || "",
    parentId: group.parentId || null,
    studentIds: unique(group.studentIds || []),
    supervisorIds: unique(group.supervisorIds || []),
  };
}

function pushFinding(findings, key, item, limit = 50) {
  if (!findings[key]) findings[key] = [];
  if (findings[key].length < limit) findings[key].push(item);
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to an env file or the current process before running this dry-run audit.");
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 12000 });
  const db = mongoose.connection.db;
  const [users, groups] = await Promise.all([
    db.collection("users").find({}).project({ passwordHash: 0 }).toArray(),
    db.collection("groups").find({}).toArray(),
  ]);

  const groupIds = new Set(groups.flatMap((group) => unique([group.id, group._id])));
  const userIds = new Set(users.flatMap((user) => unique([user.id, user._id])));
  const groupsById = new Map();
  groups.forEach((group) => {
    unique([group.id, group._id]).forEach((id) => groupsById.set(id, group));
  });

  const schoolGroups = groups.filter((group) => group.type === "SCHOOL");
  const classGroups = groups.filter((group) => group.type === "CLASS");
  const classIdsBySchool = new Map();
  classGroups.forEach((group) => {
    const parentId = String(group.parentId || "").trim();
    if (!parentId) return;
    if (!classIdsBySchool.has(parentId)) classIdsBySchool.set(parentId, new Set());
    unique([group.id, group._id]).forEach((id) => classIdsBySchool.get(parentId).add(id));
  });

  const findings = {};

  users.forEach((user) => {
    const schoolId = String(user.schoolId || "").trim();
    if (schoolId && !groupIds.has(schoolId)) {
      pushFinding(findings, "usersWithMissingSchoolIdGroup", shortUser(user));
    }

    unique(user.groupIds || []).forEach((groupId) => {
      if (!groupIds.has(groupId)) {
        pushFinding(findings, "usersWithOrphanGroupIds", {
          ...shortUser(user),
          orphanGroupId: groupId,
        });
      }
    });

    if (["supervisor", "teacher"].includes(String(user.role || ""))) {
      const linkedToDeletedSchool = schoolId && !groupIds.has(schoolId);
      const orphanGroupIds = unique(user.groupIds || []).filter((groupId) => !groupIds.has(groupId));
      if (linkedToDeletedSchool || orphanGroupIds.length) {
        pushFinding(findings, "supervisorsLinkedToDeletedSchoolsOrClasses", {
          ...shortUser(user),
          linkedToDeletedSchool: Boolean(linkedToDeletedSchool),
          orphanGroupIds,
        });
      }
    }
  });

  groups.forEach((group) => {
    unique(group.studentIds || []).forEach((studentId) => {
      if (!userIds.has(studentId)) {
        pushFinding(findings, "groupsWithMissingStudentIds", {
          group: shortGroup(group),
          missingStudentId: studentId,
        });
      }
    });

    unique(group.supervisorIds || []).forEach((supervisorId) => {
      if (!userIds.has(supervisorId)) {
        pushFinding(findings, "groupsWithMissingSupervisorIds", {
          group: shortGroup(group),
          missingSupervisorId: supervisorId,
        });
      }
    });
  });

  schoolGroups.forEach((school) => {
    const schoolId = idOf(school);
    const classIds = classIdsBySchool.get(schoolId) || new Set();
    const visibleStudentIds = new Set(
      users
        .filter((user) => {
          if (user.role !== "student") return false;
          if (String(user.schoolId || "") === schoolId) return true;
          return unique(user.groupIds || []).some((groupId) => classIds.has(groupId));
        })
        .map(idOf),
    );
    const groupStudentIds = new Set(unique(school.studentIds || []));

    groupStudentIds.forEach((studentId) => {
      if (!visibleStudentIds.has(studentId)) {
        pushFinding(findings, "studentsImportedButNotVisibleInSelectedSchool", {
          school: shortGroup(school),
          studentId,
          reason: "school.studentIds contains a user id that is not a student with this schoolId or one of this school's class groupIds",
        });
      }
    });

    visibleStudentIds.forEach((studentId) => {
      if (!groupStudentIds.has(studentId)) {
        const student = users.find((user) => idOf(user) === studentId);
        pushFinding(findings, "studentsImportedButMissingFromSchoolGroupRoster", {
          school: shortGroup(school),
          student: student ? shortUser(student) : { id: studentId },
          reason: "student is visible by schoolId/class groupIds but missing from school.studentIds",
        });
      }
    });
  });

  const summary = Object.fromEntries(
    [
      "usersWithMissingSchoolIdGroup",
      "usersWithOrphanGroupIds",
      "groupsWithMissingStudentIds",
      "groupsWithMissingSupervisorIds",
      "supervisorsLinkedToDeletedSchoolsOrClasses",
      "studentsImportedButNotVisibleInSelectedSchool",
      "studentsImportedButMissingFromSchoolGroupRoster",
    ].map((key) => [key, findings[key]?.length || 0]),
  );

  console.log(JSON.stringify({
    mode: "dry-run",
    writesPerformed: 0,
    database: db.databaseName,
    totals: {
      users: users.length,
      groups: groups.length,
      schools: schoolGroups.length,
      classes: classGroups.length,
    },
    summary,
    findings,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(JSON.stringify({
    mode: "dry-run",
    writesPerformed: 0,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
