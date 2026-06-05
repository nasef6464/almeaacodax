import { readFile } from "node:fs/promises";

const files = {
  packageJson: await readFile(new URL("../package.json", import.meta.url), "utf8"),
  studentContract: await readFile(new URL("./smoke-global-student-journey-contract.mjs", import.meta.url), "utf8"),
  studentLive: await readFile(new URL("./live-student-learning-deep-audit.mjs", import.meta.url), "utf8"),
  roleLive: await readFile(new URL("./live-role-pages-audit.mjs", import.meta.url), "utf8"),
  reportActionsLive: await readFile(new URL("./live-report-actions-audit.mjs", import.meta.url), "utf8"),
  supervisorLive: await readFile(new URL("./live-supervisor-school-command-audit.mjs", import.meta.url), "utf8"),
  schoolFromScratchLive: await readFile(new URL("./live-school-from-scratch-audit.mjs", import.meta.url), "utf8"),
  barcodeContract: await readFile(new URL("./smoke-barcode-public-tests-contract.mjs", import.meta.url), "utf8"),
  barcodeLive: await readFile(new URL("./live-barcode-public-tests-audit.mjs", import.meta.url), "utf8"),
};

const pkg = JSON.parse(files.packageJson);
const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertScriptIncludes(scriptName, fragments) {
  const script = pkg.scripts?.[scriptName] || "";
  for (const fragment of fragments) assertIncludes(script, fragment, `${scriptName} missing ${fragment}`);
}

check("core goal live gate is wired as one command", () => {
  assertScriptIncludes("smoke:goal-live-core", [
    "smoke:global-student-journey",
    "smoke:arabic-mojibake",
    "smoke:barcode-public-tests",
    "smoke:student-learning-live",
    "smoke:role-pages-live",
    "smoke:report-actions-live",
    "smoke:supervisor-school-live",
    "smoke:school-from-scratch-live",
    "smoke:barcode-public-tests-live",
  ]);
});

check("core goal contract is wired into package scripts", () => {
  if (pkg.scripts?.["smoke:goal-live-core-contract"] !== "node scripts/smoke-goal-live-core-contract.mjs") {
    throw new Error("smoke:goal-live-core-contract must point to scripts/smoke-goal-live-core-contract.mjs");
  }
});

check("role pages live audit is wired into package scripts", () => {
  if (pkg.scripts?.["smoke:role-pages-live"] !== "node scripts/live-role-pages-audit.mjs") {
    throw new Error("smoke:role-pages-live must point to scripts/live-role-pages-audit.mjs");
  }
});

check("report actions live audit is wired into package scripts", () => {
  if (pkg.scripts?.["smoke:report-actions-live"] !== "node scripts/live-report-actions-audit.mjs") {
    throw new Error("smoke:report-actions-live must point to scripts/live-report-actions-audit.mjs");
  }
});

check("student live gate covers packages, payment activation, mobile layout, and next action", () => {
  assertIncludes(files.studentLive, "student-memberships-pricing");
  assertIncludes(files.studentLive, "paymentProbe");
  assertIncludes(files.studentLive, "unenrollConfirmProbe");
  assertIncludes(files.studentLive, "nextActionStripProbe");
  assertIncludes(files.studentLive, "nextActionStripStatus");
  assertIncludes(files.studentLive, "nextActionStrip: true");
  assertIncludes(files.studentLive, "quizStepHintProbe");
  assertIncludes(files.studentLive, "quizStepHintStatus");
  assertIncludes(files.studentLive, "quizStepHint: true");
  assertIncludes(files.studentLive, "student-path-enroll");
  assertIncludes(files.studentLive, "student-path-unenroll");
  assertIncludes(files.studentLive, "pricing-membership-request");
  assertIncludes(files.studentLive, "payment-access-code-input");
  assertIncludes(files.studentLive, "VIEWPORTS");
  assertIncludes(files.studentLive, 'name: "mobile"');
  assertIncludes(files.studentLive, "horizontalOverflow");
  assertIncludes(files.studentLive, "missingNextAction");
});

check("student contract keeps Saher, directed tests, reports, foundation actions, and payment path visible", () => {
  assertIncludes(files.studentContract, "quiz center separates self Saher, directed tests");
  assertIncludes(files.studentContract, "student report remains simple first");
  assertIncludes(files.studentContract, "buildFoundationTopicLink");
  assertIncludes(files.studentContract, "student membership and activation purchase path is explicit and live-audited");
});

check("role live gate covers every requested role on desktop and mobile before deployment", () => {
  for (const role of ["guest", "student", "parent", "teacher", "supervisor", "admin"]) {
    assertIncludes(files.roleLive, `role: "${role}"`, `live role audit missing ${role}`);
  }
  assertIncludes(files.roleLive, 'path: "/dashboard"');
  assertIncludes(files.roleLive, 'path: "/parent-dashboard"');
  assertIncludes(files.roleLive, 'path: "/admin-dashboard"');
  assertIncludes(files.roleLive, 'path: "/reports"');
  assertIncludes(files.roleLive, 'path: "/plan"');
  assertIncludes(files.roleLive, 'path: "/pricing"');
  assertIncludes(files.roleLive, "viewports");
  assertIncludes(files.roleLive, 'name: "mobile"');
  assertIncludes(files.roleLive, "horizontalOverflow");
  assertIncludes(files.roleLive, "network5xx");
  assertIncludes(files.roleLive, "consoleErrors");
  assertIncludes(files.roleLive, "ACTION_HINT_PATTERN");
  assertIncludes(files.roleLive, "actionControlCount");
  assertIncludes(files.roleLive, "missing visible action hint");
  assertIncludes(files.roleLive, "MOJIBAKE_PATTERN");
  assertIncludes(files.roleLive, "hasMojibakeText");
  assertIncludes(files.roleLive, "visible mojibake text");
});

check("report action gate proves the important next action buttons by role", () => {
  for (const role of ["student", "parent", "teacher", "supervisor", "admin"]) {
    assertIncludes(files.reportActionsLive, `role: "${role}"`, `report actions audit missing ${role}`);
  }
  for (const testId of [
    "student-next-action-primary",
    "student-report-export-pdf",
    "student-report-export-excel",
    "parent-report-copy",
    "parent-report-share",
    "parent-report-pdf",
    "staff-intervention-create",
    "staff-management-export",
    "staff-intervention-alert-send",
    "staff-students-export",
    "directed-quiz-analysis-export",
  ]) {
    assertIncludes(files.reportActionsLive, `data-testid="${testId}"`, `report actions audit missing ${testId}`);
  }
  assertIncludes(files.reportActionsLive, "VIEWPORTS");
  assertIncludes(files.reportActionsLive, 'name: "mobile"');
  assertIncludes(files.reportActionsLive, "printProbeSelector");
  assertIncludes(files.reportActionsLive, "printProbe");
  assertIncludes(files.reportActionsLive, "wroteDocument");
  assertIncludes(files.reportActionsLive, "printed");
  assertIncludes(files.reportActionsLive, "horizontalOverflow");
  assertIncludes(files.reportActionsLive, "network5xx");
});

check("supervisor live gate covers school command center and directed quiz analysis", () => {
  assertIncludes(files.supervisorLive, '"/admin-dashboard?tab=school-portal"');
  assertIncludes(files.supervisorLive, '"/reports"');
  assertIncludes(files.supervisorLive, "directed-quiz-entry");
  assertIncludes(files.supervisorLive, "scope-notice-visible-for-current-supervisor");
  assertIncludes(files.supervisorLive, "VIEWPORTS");
  assertIncludes(files.supervisorLive, 'name: "mobile"');
  assertIncludes(files.supervisorLive, "horizontalOverflow");
});

check("school commercial live gate creates and cleans a school from scratch", () => {
  assertScriptIncludes("smoke:goal-live-core", ["smoke:school-from-scratch-live"]);
  assertIncludes(files.schoolFromScratchLive, "create temporary school");
  assertIncludes(files.schoolFromScratchLive, "create class under school");
  assertIncludes(files.schoolFromScratchLive, "import one student into class");
  assertIncludes(files.schoolFromScratchLive, "apply parent and class supervisor relations");
  assertIncludes(files.schoolFromScratchLive, "create school package with path scope");
  assertIncludes(files.schoolFromScratchLive, "create school access code");
  assertIncludes(files.schoolFromScratchLive, "metrics.totalStudents === 1");
  assertIncludes(files.schoolFromScratchLive, "cleanupStaleAuditData");
});

check("barcode contract keeps direct QR tests as a separate real-test system", () => {
  assertIncludes(files.barcodeContract, "barcode public test view does not require auth");
  assertIncludes(files.barcodeContract, "barcode public tests force school and classroom");
  assertIncludes(files.barcodeContract, "barcode questions come from the approved question center");
  assertIncludes(files.barcodeContract, "barcode admin manager exposes quick and mock real-test settings");
  assertIncludes(files.barcodeContract, "barcode reports summarize schools, classrooms, weak skills, and low performers");
});

check("barcode live gate checks admin creation and public student entry on desktop and mobile", () => {
  assertIncludes(files.barcodeLive, '"/admin-dashboard?tab=barcode-tests"');
  assertIncludes(files.barcodeLive, "`/barcode-test/${encodeURIComponent(selectedTest.slug)}`");
  assertIncludes(files.barcodeLive, 'data-testid="barcode-required-identity-note"');
  assertIncludes(files.barcodeLive, 'data-testid="barcode-public-identity-fields"');
  assertIncludes(files.barcodeLive, "createAuditPublicTest");
  assertIncludes(files.barcodeLive, "Unable to create a live barcode audit test");
  assertIncludes(files.barcodeLive, "VIEWPORTS");
  assertIncludes(files.barcodeLive, 'name: "mobile"');
  assertIncludes(files.barcodeLive, "horizontalOverflow");
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ""}`);
}

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(`\n${failed.length} core goal live contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} core goal live contract checks passed.`);
