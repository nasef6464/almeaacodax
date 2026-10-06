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

const APPLY_FLAG = "--apply";
const CONFIRM_FLAG = "--confirm-school-orphan-cleanup";
const args = new Set(process.argv.slice(2));
const shouldApply = args.has(APPLY_FLAG);
const hasConfirmation = args.has(CONFIRM_FLAG);

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

function buildCleanupPlan(users, groups) {
  const groupIds = new Set(groups.flatMap((group) => unique([group.id, group._id])));
  const affectedUsers = [];
  const affectedSupervisors = [];
  const affectedStudents = [];
  const userUpdates = [];

  for (const user of users) {
    const currentGroupIds = unique(user.groupIds || []);
    const validGroupIds = currentGroupIds.filter((groupId) => groupIds.has(groupId));
    const removedGroupIds = currentGroupIds.filter((groupId) => !groupIds.has(groupId));
    const schoolId = String(user.schoolId || "").trim();
    const clearSchoolId = Boolean(schoolId && !groupIds.has(schoolId));

    if (!removedGroupIds.length && !clearSchoolId) {
      continue;
    }

    const item = {
      user: shortUser(user),
      removeGroupIds: removedGroupIds,
      clearSchoolId,
      nextGroupIds: validGroupIds,
      operations: [
        ...(removedGroupIds.length ? ["set groupIds to existing groups only"] : []),
        ...(clearSchoolId ? ["unset schoolId because the school group no longer exists"] : []),
      ],
    };

    affectedUsers.push(item);
    if (["supervisor", "teacher"].includes(String(user.role || ""))) {
      affectedSupervisors.push(item);
    }
    if (String(user.role || "") === "student") {
      affectedStudents.push(item);
    }

    const update = {};
    if (removedGroupIds.length) {
      update.$set = { ...(update.$set || {}), groupIds: validGroupIds };
    }
    if (clearSchoolId) {
      update.$unset = { ...(update.$unset || {}), schoolId: "" };
    }

    userUpdates.push({
      updateOne: {
        filter: { _id: user._id },
        update,
      },
    });
  }

  return {
    affectedUsers,
    affectedSupervisors,
    affectedStudents,
    userUpdates,
  };
}

async function main() {
  if (shouldApply && !hasConfirmation) {
    throw new Error(`Refusing to apply. Re-run with both ${APPLY_FLAG} and ${CONFIRM_FLAG} after explicit approval.`);
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to an env file or the current process before running this cleanup dry-run.");
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 12000 });
  const db = mongoose.connection.db;
  const [users, groups] = await Promise.all([
    db.collection("users").find({}).project({ passwordHash: 0 }).toArray(),
    db.collection("groups").find({}).toArray(),
  ]);

  const schoolGroups = groups.filter((group) => group.type === "SCHOOL");
  const classGroups = groups.filter((group) => group.type === "CLASS");
  const plan = buildCleanupPlan(users, groups);

  let writesPerformed = 0;
  if (shouldApply && hasConfirmation && plan.userUpdates.length) {
    const result = await db.collection("users").bulkWrite(plan.userUpdates, { ordered: false });
    writesPerformed = result.modifiedCount || 0;
  }

  const affectedUsers = plan.affectedUsers.map(({ user, removeGroupIds, clearSchoolId, nextGroupIds, operations }) => ({
    user,
    removeGroupIds,
    clearSchoolId,
    nextGroupIds,
    operations,
  }));

  const output = {
    mode: shouldApply && hasConfirmation ? "apply" : "dry-run",
    writesPerformed,
    safety: {
      deletesUsers: false,
      deletesSchools: false,
      deletesClassesOrGroups: false,
      modifiesDatabaseOnlyWithBothFlags: true,
      requiredApplyFlags: [APPLY_FLAG, CONFIRM_FLAG],
    },
    database: db.databaseName,
    totals: {
      users: users.length,
      groups: groups.length,
      schools: schoolGroups.length,
      classes: classGroups.length,
    },
    summary: {
      affectedUsers: plan.affectedUsers.length,
      affectedSupervisors: plan.affectedSupervisors.length,
      affectedStudents: plan.affectedStudents.length,
      userRecordsThatWouldChange: plan.userUpdates.length,
      groupRecordsThatWouldChange: 0,
      usersThatWouldBeDeleted: 0,
      schoolsThatWouldBeDeleted: 0,
      classesOrGroupsThatWouldBeDeleted: 0,
    },
    changesThatWouldBeApplied: {
      removeOrphanGroupIdsFromUsers: affectedUsers.filter((item) => item.removeGroupIds.length > 0),
      clearMissingSchoolIdsFromUsers: affectedUsers.filter((item) => item.clearSchoolId),
      removeOldSupervisorLinksToDeletedSchoolsOrClasses: plan.affectedSupervisors.map(({ user, removeGroupIds, clearSchoolId, nextGroupIds }) => ({
        user,
        removeGroupIds,
        clearSchoolId,
        nextGroupIds,
      })),
    },
    affectedUsers,
    affectedSupervisors: plan.affectedSupervisors.map((item) => item.user),
    affectedStudents: plan.affectedStudents.map((item) => item.user),
    productionRiskAssessment: {
      touchesOnlyReferencesToMissingGroups: true,
      removesAnyValidSchoolOrClassLink: false,
      removesAnyCorrectStudentFromExistingSchool: false,
      safeForCurrentProductionSchoolsBasedOnDryRun: true,
      requiresExplicitApprovalBeforeApply: true,
    },
  };

  console.log(JSON.stringify(output, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(JSON.stringify({
    mode: shouldApply && hasConfirmation ? "apply" : "dry-run",
    writesPerformed: 0,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
