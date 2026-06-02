import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) throw new Error(`Missing: ${message}`);
};

const bookSession = read("pages/BookSession.tsx");
const myRequests = read("pages/MyRequests.tsx");
const dashboard = read("pages/Dashboard.tsx");
const liveSessionsManager = read("dashboards/admin/LiveSessionsManager.tsx");
const apiSource = read("services/api.ts");
const activityRoute = read("server/src/routes/activity.routes.ts");
const routeIndex = read("server/src/routes/index.ts");
const activityModel = read("server/src/models/Activity.ts");

check("book session only confirms after persisted API activity", () => {
  assertIncludes(bookSession, "await api.createMyActivity(payload)");
  assertIncludes(bookSession, "setFormError(error instanceof Error");
  assertIncludes(bookSession, "setIsSubmitting(true)");
});

check("student requests reload session bookings from backend", () => {
  assertIncludes(myRequests, "api.getMyActivities({ limit: 50 })");
  assertIncludes(myRequests, "serverActivities");
  assertIncludes(myRequests, "mergedActivities");
  assertIncludes(dashboard, "api.getMyActivities({ limit: 50 })");
  assertIncludes(dashboard, "bookingStatus");
});

check("activity API exposes authenticated create/list endpoints", () => {
  assertIncludes(apiSource, "createMyActivity");
  assertIncludes(apiSource, "getMyActivities");
  assertIncludes(apiSource, "getAdminSessionBookings");
  assertIncludes(apiSource, "updateAdminSessionBooking");
  assertIncludes(routeIndex, 'apiRouter.use("/activities", activityRouter)');
  assertIncludes(activityRoute, 'activityRouter.post(');
  assertIncludes(activityRoute, 'activityRouter.get(');
  assertIncludes(activityRoute, '"/admin/session-bookings"');
  assertIncludes(activityRoute, 'activityRouter.patch(');
  assertIncludes(activityRoute, 'requireAuth');
  assertIncludes(activityRoute, 'requireRole(["admin", "supervisor", "teacher"])');
});

check("session booking metadata is stored with activity", () => {
  assertIncludes(activityModel, "targetLabel");
  assertIncludes(activityModel, "scheduledDate");
  assertIncludes(activityModel, "scheduledTime");
  assertIncludes(activityModel, "notes");
  assertIncludes(activityModel, "bookingStatus");
  assertIncludes(activityModel, "assignedTeacherName");
  assertIncludes(activityModel, "adminNotes");
});

check("admin live sessions manager exposes booking queue", () => {
  assertIncludes(liveSessionsManager, "طلبات الحصص الخاصة");
  assertIncludes(liveSessionsManager, "loadSessionBookings");
  assertIncludes(liveSessionsManager, "updateSessionBooking");
  assertIncludes(liveSessionsManager, "api.getAdminSessionBookings");
  assertIncludes(liveSessionsManager, "api.updateAdminSessionBooking");
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} session booking contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} session booking contract checks passed.`);
