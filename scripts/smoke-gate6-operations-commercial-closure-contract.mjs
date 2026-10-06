import { readFile } from "node:fs/promises";

const healthRoutes = await readFile(new URL("../server/src/routes/health.routes.ts", import.meta.url), "utf8");
const backupRoutes = await readFile(new URL("../server/src/routes/backup.routes.ts", import.meta.url), "utf8");
const queueSource = await readFile(new URL("../server/src/queues/notificationQueue.ts", import.meta.url), "utf8");
const opsAudit = await readFile(new URL("../docs/architecture/GATE6_OPERATIONS_AUDIT_AR.md", import.meta.url), "utf8");
const deploymentReport = await readFile(new URL("../docs/archive_reports/19_20_DEPLOYMENT_HANDOVER_REPORT.md", import.meta.url), "utf8");

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
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
}

check("health keeps liveness and readiness separate", () => {
  assertIncludes(healthRoutes, 'healthRouter.get("/live"');
  assertIncludes(healthRoutes, 'healthRouter.get("/ready"');
  assertIncludes(healthRoutes, "getDependencyHealth");
});

check("notification queue has explicit shutdown ownership", () => {
  assertIncludes(queueSource, "export async function closeNotificationQueue()");
});

check("backup and restore are Admin-only", () => {
  assertIncludes(backupRoutes, 'requireRole(["admin"])');
  assertIncludes(backupRoutes, 'const expectedConfirmation = isReplace ? "استبدال" : "استرجاع"');
});

check("restore apply creates a safety snapshot before mutation", () => {
  const safetyIndex = backupRoutes.indexOf('title: `نسخة أمان قبل الاسترجاع');
  const restoreIndex = backupRoutes.indexOf("restoreLearningBackup(snapshot.payload");
  if (safetyIndex < 0 || restoreIndex < 0 || safetyIndex > restoreIndex) {
    throw new Error("Safety snapshot is not proved before snapshot restore apply");
  }
});

check("operations boundary records media accuracy and scale uncertainty honestly", () => {
  assertIncludes(opsAudit, "O-01 Media/storage contract accuracy: `VERIFIED`");
  assertIncludes(opsAudit, "NOT PROVEN/BLOCKED-ENV");
  assertIncludes(opsAudit, "production-like load/restore/live-provider proofs");
});

check("deployment handover forbids unsupported scale claims", () => {
  assertIncludes(deploymentReport, "Not certified for `10,000+`");
  assertIncludes(deploymentReport, "/api/health/ready");
  assertIncludes(deploymentReport, "Rollback");
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Gate 6 operations commercial closure contract passed (${checks.length} checks).`);
