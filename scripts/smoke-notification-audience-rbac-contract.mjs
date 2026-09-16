import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authorityPath = "server/src/modules/notifications/http/notificationAudienceAuthority.ts";
const routesPath = "server/src/routes/index.ts";
const authority = readFileSync(authorityPath, "utf8");
const routes = readFileSync(routesPath, "utf8");

assert.match(authority, /SchoolMembershipModel/, "notification audience guard must use SchoolMembership authority");
assert.match(authority, /TeachingAssignmentModel/, "teacher notification authority must use TeachingAssignment");
assert.match(authority, /canonicalAuthorityPresent/, "guard must make canonical-vs-legacy precedence explicit");
assert.match(authority, /membership\.status === "active"/, "school authority must require active membership");
assert.match(authority, /assignment\.status === "active"/, "teacher authority must require active assignment");
assert.match(authority, /authUser\.groupIds = activeAssignedClassIds/, "teacher legacy projection must be replaced by canonical assignments, never unioned");
assert.match(authority, /authUser\.linkedStudentIds = \[\]/, "canonical staff authority must clear unrelated legacy parent links");
assert.match(authority, /if \(!canonicalAuthorityPresent\) return next\(\);/, "legacy compatibility may run only when canonical staff authority is absent");
assert.match(authority, /scope\.students\.every/, "every requested student must be authorized independently");
assert.match(authority, /"\/intervention-alert"/, "intervention alerts must pass through canonical audience authorization");
assert.match(authority, /"\/student-alert"/, "student alerts must pass through canonical audience authorization");

const guardMount = 'apiRouter.use("/notifications", notificationAudienceAuthorityRouter);';
const notificationMount = 'apiRouter.use("/notifications", notificationRouter);';
const guardIndex = routes.indexOf(guardMount);
const notificationIndex = routes.indexOf(notificationMount);
assert.ok(guardIndex >= 0, "notification audience authority router is not mounted");
assert.ok(notificationIndex >= 0, "notification router is not mounted");
assert.ok(guardIndex < notificationIndex, "canonical audience authority must run before legacy notification handlers");

console.log("notification audience RBAC contract PASS");
