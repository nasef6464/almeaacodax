import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [routes, audit, decision] = await Promise.all([
  read("server/src/routes/operations.routes.ts"),
  read("server/src/services/operationsAudit.ts"),
  read("docs/architecture/GATE6_OPERATIONS_O02_DECISION_AR.md"),
]);

const checks = [
  [
    "operations status is Admin-only",
    routes.includes('operationsRouter.get("/status", requireAuth, requireRole(["admin"])'),
  ],
  [
    "operations audit is Admin-only",
    routes.includes('operationsRouter.get("/audit", requireAuth, requireRole(["admin"])'),
  ],
  [
    "status reads keep explicit projections and lean documents",
    routes.includes("OPERATIONS_STATUS_PATH_SELECT") &&
      routes.includes("OPERATIONS_STATUS_LIBRARY_SELECT") &&
      (routes.match(/\.lean\(\)/g) || []).length >= 7,
  ],
  [
    "status read is cached and single-flight",
    routes.includes("OPERATIONS_STATUS_CACHE_TTL_MS = 30 * 1000") &&
      routes.includes("cachedOperationsStatus") &&
      routes.includes("pendingOperationsStatus"),
  ],
  [
    "audit read is cached and single-flight",
    audit.includes("OPERATIONS_AUDIT_CACHE_TTL_MS = 30 * 1000") &&
      audit.includes("cachedOperationsAudit") &&
      audit.includes("pendingOperationsAudit"),
  ],
  [
    "audit keeps explicit projections",
    audit.includes("OPERATIONS_AUDIT_QUESTION_SELECT") &&
      audit.includes("OPERATIONS_AUDIT_COURSE_SELECT") &&
      audit.includes("OPERATIONS_AUDIT_USER_SELECT"),
  ],
  [
    "lesson audit derives content presence without hydrating lesson content",
    audit.includes("LessonModel.aggregate") &&
      audit.includes("contentPresent") &&
      audit.includes("$strLenCP"),
  ],
  [
    "O-02 production-scale certification remains explicitly unproved",
    decision.includes("O-02") &&
      decision.includes("NOT PROVEN / BLOCKED-ENV") &&
      decision.includes("DEFERRED") &&
      decision.includes("لا يوجد claim للسعة"),
  ],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}

if (failed.length) process.exit(1);
console.log(`Gate 6 operations audit boundary contract passed (${checks.length} checks).`);
