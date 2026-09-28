import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [route, helper, membership, assignment, backfill, audit] = await Promise.all([
  read("server/src/routes/schoolAccess.routes.ts"),
  read("server/src/modules/schools/application/schoolReferenceIntegrity.ts"),
  read("server/src/models/SchoolMembership.ts"),
  read("server/src/models/TeachingAssignment.ts"),
  read("server/src/scripts/backfillSchoolMemberships.ts"),
  read("server/src/scripts/db2ReferenceIntegrityAudit.ts"),
]);
const assert = (ok, message) => { if (!ok) throw new Error(message); };

for (const guard of ["assertSchoolContractReference", "assertSchoolMembershipReference", "assertTeachingAssignmentReference"]) {
  assert(route.includes(guard), `schoolAccess writer lost ${guard}`);
}
for (const invariant of [
  'type: "SCHOOL"',
  'type: "CLASS"',
  'Membership role must match',
  'Class does not belong to this school',
  'Teacher must have an active membership',
]) assert(helper.includes(invariant), `reference guard missing: ${invariant}`);

assert(membership.includes("migrationKey"), "school membership rollback identity missing");
assert(membership.includes("{ userId: 1, schoolId: 1, role: 1 }, { unique: true }"), "school membership canonical unique identity missing");
assert(assignment.includes("{ schoolId: 1, teacherId: 1, classId: 1, subjectId: 1 }, { unique: true }"), "teaching assignment canonical unique identity missing");

assert(backfill.includes('const APPLY = process.argv.includes("--apply")'), "school membership backfill must be dry-run by default");
assert(backfill.includes('const ROLLBACK = process.argv.includes("--rollback")'), "school membership rollback mode missing");
assert(backfill.includes("DB2_SCHOOL_MEMBERSHIP_20260928"), "school membership migration identity missing");
assert(backfill.includes("roleConflicts") && backfill.includes("statusConflicts"), "backfill conflict containment missing");
assert(!backfill.includes("deleteMany({})"), "unbounded destructive rollback forbidden");

assert(audit.includes("readOnly: true"), "DB-2 audit must identify itself as read-only");
assert(audit.includes("missingWithoutSnapshot"), "historical result integrity check missing");
assert(audit.includes("validLegacySchoolUsersWithoutCanonicalMembership"), "legacy/canonical parity inventory missing");

console.log("PASS DB-2 schema/reference integrity contract");
