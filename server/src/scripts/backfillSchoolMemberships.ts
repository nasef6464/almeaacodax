import mongoose from "mongoose";
import { env } from "../config/env.js";
import { GroupModel } from "../models/Group.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { UserModel } from "../models/User.js";

const APPLY = process.argv.includes("--apply");
const ROLLBACK = process.argv.includes("--rollback");
const MIGRATION_KEY = "DB2_SCHOOL_MEMBERSHIP_20260928";
const ELIGIBLE_ROLES = new Set(["student", "teacher", "supervisor", "school_admin", "parent"]);

if (ROLLBACK && !APPLY) {
  console.error("Rollback is dry-run unless --apply is also supplied.");
}

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    if (ROLLBACK) {
      const rows = await SchoolMembershipModel.find({ migrationKey: MIGRATION_KEY })
        .select("_id userId schoolId role status")
        .lean() as any[];
      const summary = { mode: APPLY ? "rollback-apply" : "rollback-dry-run", migrationKey: MIGRATION_KEY, rows: rows.length };
      console.log(JSON.stringify(summary, null, 2));
      if (APPLY && rows.length) {
        const ids = rows.map((row) => row._id);
        const assignments = await mongoose.connection.collection("teachingassignments").countDocuments({
          teacherId: { $in: rows.filter((row) => row.role === "teacher").map((row) => String(row.userId)) },
          schoolId: { $in: rows.map((row) => String(row.schoolId)) },
          status: "active",
        });
        if (assignments > 0) throw new Error("rollback_blocked_by_active_teaching_assignments");
        const result = await SchoolMembershipModel.deleteMany({ _id: { $in: ids }, migrationKey: MIGRATION_KEY });
        console.log(JSON.stringify({ ...summary, deleted: result.deletedCount }, null, 2));
      }
      return;
    }

    const users = await UserModel.find({
      schoolId: { $exists: true, $type: "string", $ne: "" },
      role: { $in: Array.from(ELIGIBLE_ROLES) },
    }).select("_id role isActive schoolId").lean() as any[];

    const schoolIds = Array.from(new Set(users.map((user) => String(user.schoolId || "").trim()).filter(Boolean)));
    const validSchoolObjectIds = schoolIds.filter((id) => mongoose.isValidObjectId(id));
    const schools = validSchoolObjectIds.length
      ? await GroupModel.find({ _id: { $in: validSchoolObjectIds }, type: "SCHOOL" }).select("_id").lean() as any[]
      : [];
    const validSchools = new Set(schools.map((school) => String(school._id)));

    const userIds = users.map((user) => String(user._id));
    const existingRows = userIds.length
      ? await SchoolMembershipModel.find({ userId: { $in: userIds } }).select("userId schoolId role status migrationKey").lean() as any[]
      : [];
    const byUserSchool = new Map<string, any[]>();
    for (const row of existingRows) {
      const key = `${String(row.userId)}:${String(row.schoolId)}`;
      const bucket = byUserSchool.get(key) || [];
      bucket.push(row);
      byUserSchool.set(key, bucket);
    }

    const candidates: Array<{ userId: string; schoolId: string; role: any; status: "active" | "inactive" }> = [];
    let invalidSchoolRefs = 0;
    let exactExisting = 0;
    let roleConflicts = 0;
    let statusConflicts = 0;

    for (const user of users) {
      const userId = String(user._id);
      const schoolId = String(user.schoolId || "").trim();
      const role = String(user.role || "");
      if (!ELIGIBLE_ROLES.has(role) || !validSchools.has(schoolId)) {
        invalidSchoolRefs += 1;
        continue;
      }
      const status: "active" | "inactive" = user.isActive === false ? "inactive" : "active";
      const rows = byUserSchool.get(`${userId}:${schoolId}`) || [];
      const exact = rows.find((row) => String(row.role) === role);
      if (exact) {
        exactExisting += 1;
        if (String(exact.status || "active") !== status) statusConflicts += 1;
        continue;
      }
      if (rows.some((row) => String(row.status || "active") === "active" && String(row.role) !== role)) {
        roleConflicts += 1;
        continue;
      }
      candidates.push({ userId, schoolId, role, status });
    }

    const summary = {
      mode: APPLY ? "apply" : "dry-run",
      migrationKey: MIGRATION_KEY,
      legacyUsersScanned: users.length,
      validSchools: validSchools.size,
      candidates: candidates.length,
      exactExisting,
      invalidSchoolRefs,
      roleConflicts,
      statusConflicts,
      activeCandidates: candidates.filter((row) => row.status === "active").length,
      inactiveCandidates: candidates.filter((row) => row.status === "inactive").length,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!APPLY || candidates.length === 0) return;
    if (roleConflicts || statusConflicts) throw new Error("backfill_conflicts_must_be_resolved_before_apply");

    await SchoolMembershipModel.bulkWrite(
      candidates.map((row) => ({
        updateOne: {
          filter: { userId: row.userId, schoolId: row.schoolId, role: row.role },
          update: { $setOnInsert: { ...row, migrationKey: MIGRATION_KEY } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    console.log(JSON.stringify({ ...summary, applied: candidates.length }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("DB-2 school membership backfill failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
