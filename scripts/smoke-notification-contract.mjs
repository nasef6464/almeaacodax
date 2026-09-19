import { readFile } from "node:fs/promises";

const files = {
  template: await readFile(new URL("../server/src/models/NotificationTemplate.ts", import.meta.url), "utf8"),
  delivery: await readFile(new URL("../server/src/models/NotificationDelivery.ts", import.meta.url), "utf8"),
  service: await readFile(new URL("../server/src/services/notificationService.ts", import.meta.url), "utf8"),
  providers: await readFile(new URL("../server/src/services/notificationProviders.ts", import.meta.url), "utf8"),
  route: await readFile(new URL("../server/src/routes/notification.routes.ts", import.meta.url), "utf8"),
  audience: await readFile(new URL("../server/src/modules/notifications/application/notificationAudienceAuthority.ts", import.meta.url), "utf8"),
  schoolStudentAuthority: await readFile(new URL("../server/src/modules/schools/application/schoolStaffStudentAuthority.ts", import.meta.url), "utf8"),
  campaign: await readFile(new URL("../server/src/modules/notifications/application/createNotificationCampaign.ts", import.meta.url), "utf8"),
  index: await readFile(new URL("../server/src/routes/index.ts", import.meta.url), "utf8"),
  env: await readFile(new URL("../server/.env.example", import.meta.url), "utf8"),
  guide: await readFile(new URL("../docs/archive_reports/NOTIFICATION_SYSTEM_GUIDE.md", import.meta.url), "utf8"),
  whatsapp: await readFile(new URL("../docs/archive_reports/WHATSAPP_INTEGRATION_GUIDE.md", import.meta.url), "utf8"),
  readiness: await readFile(new URL("../docs/archive_reports/PRODUCTION_READINESS_REPORT.md", import.meta.url), "utf8"),
};

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment) {
  if (source.includes(fragment)) {
    throw new Error(`Unexpected fragment: ${fragment}`);
  }
}

check("notification models include templates and delivery states", () => {
  assertIncludes(files.template, "NotificationTemplateModel");
  assertIncludes(files.delivery, 'enum: ["pending", "sent", "failed", "retrying"]');
  assertIncludes(files.delivery, "notificationDeliverySchema.index({ recipientUserId: 1, channel: 1, createdAt: -1 })");
});

check("notification service creates bounded delivery records without silent truncation", () => {
  assertIncludes(files.service, "MAX_RECIPIENTS_PER_REQUEST = 500");
  assertIncludes(files.service, "NotificationAudienceTooLargeError");
  assertIncludes(files.service, 'status: channel === "in_app" ? "sent" : "pending"');
  assertIncludes(files.service, "processPendingNotifications");
  assertNotIncludes(files.service, ".slice(0, MAX_RECIPIENTS_PER_REQUEST)");
  assertNotIncludes(files.service, "fetch(");
});

check("external provider adapter supports production delivery modes", () => {
  assertIncludes(files.providers, "sendExternalNotification");
  assertIncludes(files.providers, "sendResendEmail");
  assertIncludes(files.providers, "sendHttpEmail");
  assertIncludes(files.providers, "sendWhatsAppCloud");
  assertIncludes(files.providers, "provider_http_");
});

check("notification routes protect admin actions and use campaign orchestration", () => {
  assertIncludes(files.route, 'requireRole(["admin"])');
  assertIncludes(files.route, '"/admin/send"');
  assertIncludes(files.route, '"/admin/process-pending"');
  assertIncludes(files.route, "createNotificationCampaignDeliveries");
  assertIncludes(files.route, "maxRecipientsPerCampaign");
  assertIncludes(files.index, 'apiRouter.use("/notifications", notificationRouter)');
});

check("intervention parent recipients use canonical parent authority resolver", () => {
  assertIncludes(files.route, "getAuthorizedParentIdsForStudent");
  assertIncludes(files.route, "authorizedParentIds");
  assertNotIncludes(files.route, 'ParentStudentRelationshipModel.find({ studentUserId: studentId, status: "active" })');
});

check("large notification campaigns are resolved fully then batched", () => {
  assertIncludes(files.campaign, "MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS");
  assertIncludes(files.campaign, "countDocuments");
  assertIncludes(files.campaign, "getNotificationBatchLimit()");
  assertIncludes(files.campaign, "for (const userIds of batches)");
  assertIncludes(files.campaign, "enqueueNotificationDeliveries");
});

check("teacher and supervisor notification reachability is module-owned and canonical-first", () => {
  assertIncludes(files.route, "getAuthorizedStudentIdsForNotificationActor");
  assertIncludes(files.route, "getAuthorizedSupervisorRecipientIdsForStudent");
  assertIncludes(files.audience, "getAuthorizedStudentIdsForSchoolStaffActor");
  assertIncludes(files.schoolStudentAuthority, "SchoolMembershipModel");
  assertIncludes(files.schoolStudentAuthority, "TeachingAssignmentModel");
  assertIncludes(files.schoolStudentAuthority, "assignments.length > 0");
  assertIncludes(files.schoolStudentAuthority, "actorContext.hasCanonical");
  assertNotIncludes(files.route, "const sharesSchool =");
  assertNotIncludes(files.route, "const sharesAssignedGroup =");
});

check("notification env and docs exist", () => {
  assertIncludes(files.env, "EMAIL_PROVIDER=");
  assertIncludes(files.env, "RESEND_API_KEY=");
  assertIncludes(files.env, "EMAIL_WEBHOOK_URL=");
  assertIncludes(files.env, "WHATSAPP_PROVIDER=");
  assertIncludes(files.env, "WHATSAPP_PHONE_NUMBER_ID=");
  assertIncludes(files.guide, "EMAIL_PROVIDER=resend");
  assertIncludes(files.guide, "EMAIL_PROVIDER=http");
  assertIncludes(files.whatsapp, "WHATSAPP_PROVIDER=whatsapp_cloud");
});

check("readiness report records notification sprint", () => {
  assertIncludes(files.readiness, "Notification Foundation Sprint - 2026-05-12");
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Notification contract passed (${checks.length} checks).`);
