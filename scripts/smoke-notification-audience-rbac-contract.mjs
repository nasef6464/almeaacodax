import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authority = readFileSync("server/src/modules/notifications/http/notificationAudienceAuthority.ts", "utf8");
const rootRouter = readFileSync("server/src/routes/notificationRoot.routes.ts", "utf8");
const routes = readFileSync("server/src/routes/index.ts", "utf8");

assert.match(authority, /SchoolMembershipModel/, "notification audience guard must use SchoolMembership authority");
assert.match(authority, /TeachingAssignmentModel/, "teacher notification authority must use TeachingAssignment");
assert.match(authority, /canonicalAuthorityPresent/, "guard must make canonical-vs-legacy precedence explicit");
assert.match(authority, /membership\.status === "active"/, "school authority must require active membership");
assert.match(authority, /assignment\.status === "active"/, "teacher authority must require active assignment");
assert.match(authority, /authUser\.groupIds = activeAssignedClassIds/, "teacher legacy projection must be replaced by canonical assignments, never unioned");
assert.match(authority, /authUser\.linkedStudentIds = \[\]/, "canonical staff authority must clear unrelated legacy parent links");
assert.match(authority, /if \(!canonicalAuthorityPresent\) return next\(\);/, "legacy compatibility may run only when canonical staff authority is absent");
assert.match(authority, /scope\.students\.every/, "every requested student must be authorized independently");

assert.match(rootRouter, /guardedAudiencePaths = new Set\(\["\/intervention-alert", "\/student-alert"\]\)/, "both audience mutations must be guarded");
assert.match(rootRouter, /requireAuth\(req, res/, "audience guard must run with a refreshed authenticated principal");
assert.match(rootRouter, /requireCanonicalNotificationAudience\(req, res/, "canonical audience authority must run before legacy delivery");
assert.ok(
  rootRouter.indexOf("requireCanonicalNotificationAudience(req, res") < rootRouter.lastIndexOf("forwardToLegacy(req, res, next)"),
  "canonical authority must execute before legacy notification delivery",
);

const notificationMount = 'apiRouter.use("/notifications", notificationRouter);';
assert.equal(routes.split(notificationMount).length - 1, 1, "architecture must keep exactly one canonical /notifications mount");
assert.match(routes, /notificationRouter \} from "\.\/notificationRoot\.routes\.js"/, "canonical mount must point at the security root adapter");

console.log("notification audience RBAC contract PASS");
