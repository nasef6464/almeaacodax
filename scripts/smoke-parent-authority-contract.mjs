import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = {
  authority: await read("server/src/modules/parents/application/parentAuthority.ts"),
  facade: await read("server/src/services/parentAuthorityService.ts"),
  authRoute: await read("server/src/routes/auth.routes.ts"),
  notificationRoute: await read("server/src/routes/notification.routes.ts"),
  weeklyBatch: await read("server/src/modules/reports/application/runWeeklyParentReportBatch.ts"),
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

check("legacy service path is only a compatibility facade", () => {
  includes(files.facade, 'from "../modules/parents/application/parentAuthority.js"');
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed, checks }, null, 2));
if (failed.length) process.exit(1);
