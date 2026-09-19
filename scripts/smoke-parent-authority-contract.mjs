import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = {
  authority: await read("server/src/modules/parents/application/parentAuthority.ts"),
  facade: await read("server/src/services/parentAuthorityService.ts"),
  authRoute: await read("server/src/routes/auth.routes.ts"),
  notificationRoute: await read("server/src/routes/notification.routes.ts"),
  weeklyBatch: await read("server/src/modules/reports/application/runWeeklyParentReportBatch.ts"),
  whatsappBatch: await read("server/src/modules/reports/application/runParentWhatsappDigestBatch.ts"),
  aiAuthority: await read("server/src/modules/ai/application/aiStudentTargetAuthorization.ts"),
  contentBootstrap: await read("server/src/modules/content/infrastructure/contentBootstrapOperationalData.ts"),
  backfill: await read("server/src/scripts/backfillParentStudentRelationships.ts"),
  quizReportScope: await read("server/src/modules/quizzes/application/quizReportStudentScope.ts"),
  parentWeeklyReport: await read("server/src/modules/reports/application/sendParentWeeklyPerformanceReport.ts"),
  certificates: await read("server/src/routes/certificates.routes.ts"),
  contentRoute: await read("server/src/routes/content.routes.ts"),
  operationsAudit: await read("server/src/services/operationsAudit.ts"),
};

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", message: error.message }); }
};
const includes = (source, value) => {
  if (!source.includes(value)) throw new Error(`missing: ${value}`);
};
const excludes = (source, value) => {
  if (source.includes(value)) throw new Error(`unexpected: ${value}`);
};

check("canonical parent rows tombstone legacy fallback", () => {
  includes(files.authority, "parentsWithCanonicalRows");
  includes(files.authority, 'if (row.status === "active")');
  includes(files.authority, "!parentsWithCanonicalRows.has(parentUserId)");
  excludes(files.authority, 'parentUserId,\n    status: "active"');
});

check("bulk parent authority resolver exists for large report populations", () => {
  includes(files.authority, "getAuthorizedStudentIdsForParents");
  includes(files.authority, "parentUserId: { $in: normalizedParentIds }");
  includes(files.weeklyBatch, "getAuthorizedStudentIdsForParents");
  includes(files.weeklyBatch, "authorizedStudentsByParent");
});

check("reverse parent recipient resolution respects canonical presence per parent", () => {
  includes(files.authority, "getAuthorizedParentIdsForStudent");
  includes(files.authority, "canonicalPresenceRows");
  includes(files.authority, "!parentsWithCanonicalRows.has(parentUserId)");
  includes(files.notificationRoute, "getAuthorizedParentIdsForStudent");
});

check("admin role transitions revoke stale parent authority", () => {
  includes(files.authRoute, 'previousRole === "parent" || effectiveRole === "parent"');
  includes(files.authRoute, 'studentUserIds: isParentRole ? normalizedLinkedStudentIds : []');
  includes(files.authRoute, "ParentStudentRelationshipModel.updateMany(");
  includes(files.authRoute, 'status: "revoked"');
});

check("AI and content parent readers use canonical parent authority", () => {
  includes(files.aiAuthority, "getAuthorizedStudentIdsForParent");
  excludes(files.aiAuthority, "actor.linkedStudentIds");
  includes(files.contentBootstrap, "getAuthorizedStudentIdsForParent");
  excludes(files.contentBootstrap, "user.linkedStudentIds");
});

check("admin WhatsApp digest batch is bulk-authority and bulk-result based", () => {
  includes(files.whatsappBatch, "getAuthorizedStudentIdsForParents");
  includes(files.whatsappBatch, "QuizResultModel.aggregate");
  includes(files.whatsappBatch, "authorizedStudentIds");
  excludes(files.whatsappBatch, "QuizResultModel.find(");
  excludes(files.whatsappBatch, "linkedStudentIds");
});

check("parent quiz report scope uses canonical authority", () => {
  includes(files.quizReportScope, "getAuthorizedStudentIdsForParent");
  includes(files.quizReportScope, "authorizedStudentIds");
  excludes(files.quizReportScope, "authUser.linkedStudentIds");
});

check("compatibility weekly report uses canonical parent authority", () => {
  includes(files.parentWeeklyReport, "getAuthorizedStudentIdsForParent");
  includes(files.parentWeeklyReport, "authorizedStudentIds");
  excludes(files.parentWeeklyReport, "linkedStudentIds");
});

check("certificate recipients and school relation imports use canonical parent authority", () => {
  includes(files.certificates, "getAuthorizedParentIdsForStudent");
  excludes(files.certificates, "linkedStudentIds: { $in:");
  includes(files.contentRoute, "ensureCanonicalParentRelationship");
  includes(files.authority, "ensureCanonicalParentRelationship");
});

check("operations audit respects canonical parent relationship tombstones", () => {
  includes(files.operationsAudit, "parentsWithCanonicalRows");
  includes(files.operationsAudit, "parentsWithActiveCanonicalChildren");
  includes(files.operationsAudit, "ParentStudentRelationshipModel.find()");
});

check("parent relationship backfill is explicit and dry-run by default", () => {
  includes(files.backfill, 'const APPLY = process.argv.includes("--apply")');
  includes(files.backfill, 'mode: APPLY ? "apply" : "dry-run"');
  includes(files.backfill, "$setOnInsert");
  includes(files.backfill, 'source: SOURCE');
  excludes(files.backfill, "deleteMany(");
});

check("legacy service path is only a compatibility facade", () => {
  includes(files.facade, 'from "../modules/parents/application/parentAuthority.js"');
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed, checks }, null, 2));
if (failed.length) process.exit(1);
