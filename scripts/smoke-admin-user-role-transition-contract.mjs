import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const auth = read("server/src/routes/auth.routes.ts");
const users = read("dashboards/admin/UsersManager.tsx");
const live = read("scripts/live-supervisor-school-command-audit.mjs");
const required = (source, fragments, label) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) throw new Error(`${label} missing contract fragment: ${fragment}`);
  }
};

required(auth, [
  'select("role schoolId groupIds")',
  'const roleChanged = Boolean(payload.role && effectiveRole !== previousRole);',
  'nextPayload.schoolId = null;',
  'nextPayload.groupIds = [];',
  'GroupModel.updateMany({ studentIds: membershipUserId }, { $pull: { studentIds: membershipUserId } })',
  'GroupModel.updateMany({ supervisorIds: membershipUserId }, { $pull: { supervisorIds: membershipUserId } })',
], "auth role transition");
required(users, [
  'api.updateAdminUser(currentUser.id, { role: newRole })',
  'const persistedUser = buildStoreUser(persistedPayload);',
  'handleRoleChange(currentUser, event.target.value as Role)',
], "UsersManager role transition");
required(live, [
  'verifyAdminUserRoleRelationshipJourney',
  'Stale Group.studentIds membership survived Student → Supervisor transition',
  'Supervisor school/class assignment did not persist after reload',
], "live role relationship journey");
console.log("Admin user role transition contract: PASS");
