import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "docs", "BARCODE_PUBLIC_TESTS_PLAN_AR.md");
const packagePath = path.join(root, "package.json");
const plan = fs.readFileSync(planPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const routesIndex = fs.readFileSync(path.join(root, "server", "src", "routes", "index.ts"), "utf8");
const publicRoutes = fs.readFileSync(path.join(root, "server", "src", "routes", "publicTests.routes.ts"), "utf8");
const publicTestModel = fs.readFileSync(path.join(root, "server", "src", "models", "PublicBarcodeTest.ts"), "utf8");
const publicSubmissionModel = fs.readFileSync(path.join(root, "server", "src", "models", "PublicBarcodeSubmission.ts"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "services", "api.ts"), "utf8");
const appSource = fs.readFileSync(path.join(root, "App.tsx"), "utf8");
const adminDashboardSource = fs.readFileSync(path.join(root, "dashboards", "admin", "AdminDashboard.tsx"), "utf8");
const barcodePageSource = fs.readFileSync(path.join(root, "pages", "BarcodeTest.tsx"), "utf8");
const barcodeManagerSource = fs.readFileSync(path.join(root, "dashboards", "admin", "PublicBarcodeTestsManager.tsx"), "utf8");
const liveAuditSource = fs.readFileSync(path.join(root, "scripts", "live-barcode-public-tests-audit.mjs"), "utf8");

const checks = [];

function addCheck(name, condition, detail) {
  checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
}

for (const required of [
  "بدون تسجيل",
  "الاسم، المدرسة، الفصل",
  "مركز الأسئلة",
  "QR",
  "أضعف مهارة",
  "اختبارات باركود",
  "PublicBarcodeTest",
  "PublicBarcodeSubmission",
  "GET /public-tests/:slug",
  "POST /public-tests/:slug/submit",
  "تصدير Excel/PDF",
]) {
  addCheck(`barcode public tests plan includes ${required}`, plan.includes(required), "required product and technical contract");
}

addCheck(
  "barcode tests contract is wired into package scripts",
  pkg.scripts?.["smoke:barcode-public-tests"] === "node scripts/smoke-barcode-public-tests-contract.mjs",
  "the barcode tests goal must remain visible in automated checks",
);
addCheck(
  "barcode live browser audit is wired into package scripts",
  pkg.scripts?.["smoke:barcode-public-tests-live"] === "node scripts/live-barcode-public-tests-audit.mjs",
  "barcode tests need a real admin/public browser proof after changes and deployment",
);

addCheck(
  "barcode tests API is mounted",
  routesIndex.includes('apiRouter.use("/public-tests", publicTestsRouter)'),
  "public barcode tests must be reachable from /api/public-tests",
);
addCheck(
  "barcode tests have a dedicated admin creation endpoint",
  publicRoutes.includes('publicTestsRouter.post(') && publicRoutes.includes('"/admin"') && publicRoutes.includes('requireRole(["admin", "supervisor", "teacher"])'),
  "staff creates public QR tests without mixing them with Saher or directed tests",
);
addCheck(
  "barcode tests have a dedicated admin listing endpoint",
  publicRoutes.includes('publicTestsRouter.get(') &&
    publicRoutes.includes('"/admin"') &&
    publicRoutes.includes("summaryByTestId") &&
    publicRoutes.includes("PublicBarcodeSubmissionModel.aggregate"),
  "staff must reopen old QR tests and review submissions after creation",
);
addCheck(
  "barcode public test view does not require auth",
  publicRoutes.includes('publicTestsRouter.get(') && publicRoutes.includes('"/:slug"') && !publicRoutes.includes('"/:slug",\n  requireAuth'),
  "students can open a barcode test without logging in",
);
addCheck(
  "barcode public submit captures student identity fields",
  publicRoutes.includes("studentName") && publicRoutes.includes("schoolName") && publicRoutes.includes("classroomName") && publicRoutes.includes('"/:slug/submit"'),
  "public submissions must collect name, school, and class",
);
addCheck(
  "barcode public tests force school and classroom for QR classroom usage",
  publicRoutes.includes("collectSchool: true") &&
    publicRoutes.includes("collectClassroom: true") &&
    publicRoutes.includes("payload.schoolName.trim()") &&
    publicRoutes.includes("payload.classroomName.trim()"),
  "QR/WhatsApp tests need student name, school, and class before submission",
);
addCheck(
  "barcode questions come from the approved question center",
  publicRoutes.includes("QuestionModel.find") && publicRoutes.includes('approvalStatus: "approved"') && publicRoutes.includes("questionIds"),
  "barcode tests must reuse approved question center items",
);
addCheck(
  "barcode result computes skill analysis",
  publicRoutes.includes("buildSkillsAnalysis") && publicRoutes.includes("weakestSkill") && publicRoutes.includes("strongestSkill"),
  "student and supervisor reports need skill-level analysis",
);
addCheck(
  "barcode models persist tests and submissions separately",
  publicTestModel.includes("PublicBarcodeTest") &&
    publicSubmissionModel.includes("PublicBarcodeSubmission") &&
    publicSubmissionModel.includes("skillsAnalysis"),
  "barcode tests need separate lifecycle and reporting storage",
);
addCheck(
  "barcode tests store real quiz settings",
  publicTestModel.includes("testKind") &&
    publicTestModel.includes("settings") &&
    publicTestModel.includes("timeLimit") &&
    publicTestModel.includes("maxAttempts") &&
    publicTestModel.includes("passingScore") &&
    publicTestModel.includes("randomizeOptions"),
  "barcode tests can behave like quick or mock real tests",
);
addCheck(
  "barcode API returns and enforces real test settings",
  publicRoutes.includes("testKind") &&
    publicRoutes.includes("settings") &&
    publicRoutes.includes("buildAttemptIdentityFilter") &&
    publicRoutes.includes("optionOrder") &&
    publicRoutes.includes("passed"),
  "public tests need attempts, timing, pass score, and safe shuffled options",
);
addCheck(
  "barcode frontend API helpers are available",
  apiSource.includes("createPublicBarcodeTest") &&
    apiSource.includes("getPublicBarcodeTest") &&
    apiSource.includes("listPublicBarcodeTests") &&
    apiSource.includes("submitPublicBarcodeTest") &&
    apiSource.includes("getPublicBarcodeTestReport"),
  "admin and public pages need typed API entry points",
);
addCheck(
  "barcode public student route is registered",
  appSource.includes('path="/barcode-test/:slug"') && appSource.includes("pages/BarcodeTest"),
  "students need a real public route for QR links",
);
addCheck(
  "barcode student page submits identity and answers",
  barcodePageSource.includes("studentName") &&
    barcodePageSource.includes("schoolName") &&
    barcodePageSource.includes("classroomName") &&
    barcodePageSource.includes("submitPublicBarcodeTest") &&
    barcodePageSource.includes("timeSpentSeconds") &&
    barcodePageSource.includes("optionOrder") &&
    barcodePageSource.includes("أجبت عن"),
  "public test experience must be simple and actionable",
);
addCheck(
  "barcode admin tab is available for staff",
  adminDashboardSource.includes("'barcode-tests'") &&
    adminDashboardSource.includes("PublicBarcodeTestsManager") &&
    adminDashboardSource.includes("QrCode"),
  "staff must reach barcode test management from the admin dashboard",
);
addCheck(
  "barcode admin manager creates QR tests from approved questions",
  barcodeManagerSource.includes("QRCodeSVG") &&
    barcodeManagerSource.includes("createPublicBarcodeTest") &&
    barcodeManagerSource.includes("listPublicBarcodeTests") &&
    barcodeManagerSource.includes("openSavedTest") &&
    barcodeManagerSource.includes("approvalStatus === 'approved'") &&
    barcodeManagerSource.includes("getPublicBarcodeTestReport"),
  "admin manager must create QR links and expose a simple report",
);
addCheck(
  "barcode admin manager is a full workspace, not a narrow side panel",
  barcodeManagerSource.includes('data-testid="barcode-workspace-shell"') &&
    barcodeManagerSource.includes('data-testid="barcode-tests-list"') &&
    barcodeManagerSource.includes('data-testid="barcode-test-full-report"') &&
    barcodeManagerSource.includes('data-testid="barcode-open-full-preview"'),
  "manager should create, open, monitor, and report barcode tests from a full page workspace",
);
addCheck(
  "barcode manager can add a question from the unified question builder",
  barcodeManagerSource.includes("UnifiedQuestionBuilder") &&
    barcodeManagerSource.includes("addQuestion") &&
    barcodeManagerSource.includes('data-testid="barcode-add-question-from-builder"') &&
    barcodeManagerSource.includes('data-testid="barcode-unified-question-builder"') &&
    barcodeManagerSource.includes('data-testid="barcode-question-center-empty-state"') &&
    barcodeManagerSource.includes("saveQuestionFromBuilder"),
  "staff should create a missing question from the same barcode workflow and store it in the question center",
);
addCheck(
  "barcode admin manager exposes quick and mock real-test settings",
  barcodeManagerSource.includes("testKind") &&
    barcodeManagerSource.includes('data-testid="barcode-test-kind-selector"') &&
    barcodeManagerSource.includes('data-testid="barcode-kind-quick"') &&
    barcodeManagerSource.includes('data-testid="barcode-kind-mock"') &&
    barcodeManagerSource.includes('data-testid="barcode-real-test-settings"') &&
    barcodeManagerSource.includes("اختبار محاكي") &&
    barcodeManagerSource.includes("timeLimit") &&
    barcodeManagerSource.includes("maxAttempts") &&
    barcodeManagerSource.includes("passingScore") &&
    barcodeManagerSource.includes("randomizeOptions") &&
    barcodeManagerSource.includes("optionLayout"),
  "staff must configure barcode tests like regular platform tests",
);

addCheck(
  "barcode admin manager filters approved questions by path, subject, section, type, and difficulty",
  barcodeManagerSource.includes("activeSections") &&
    barcodeManagerSource.includes('data-testid="barcode-path-select"') &&
    barcodeManagerSource.includes('data-testid="barcode-subject-select"') &&
    barcodeManagerSource.includes('data-testid="barcode-question-center-filter"') &&
    barcodeManagerSource.includes("sectionId") &&
    barcodeManagerSource.includes("questionTypeFilter") &&
    barcodeManagerSource.includes("difficultyFilter") &&
    barcodeManagerSource.includes("question.pathId === pathId") &&
    barcodeManagerSource.includes("question.subject === normalizedSubjectId") &&
    barcodeManagerSource.includes("question.sectionId === sectionId"),
  "staff should choose barcode questions from the same path/topic taxonomy used by the question center",
);

addCheck(
  "barcode admin manager exposes publishing and identity settings",
  barcodeManagerSource.includes("collectSchool") &&
    barcodeManagerSource.includes("collectClassroom") &&
    barcodeManagerSource.includes("startsAtLocal") &&
    barcodeManagerSource.includes("endsAtLocal") &&
    barcodeManagerSource.includes("maxSubmissions") &&
    barcodeManagerSource.includes("startsAt: startsAtLocal") &&
    barcodeManagerSource.includes("endsAt: endsAtLocal"),
  "barcode tests need real-test controls for opening window, submission cap, and identity fields",
);

addCheck(
  "barcode admin manager supports WhatsApp sharing and live classroom monitoring",
  barcodeManagerSource.includes("copyWhatsAppInvite") &&
    barcodeManagerSource.includes('data-testid="barcode-copy-whatsapp-invite"') &&
    barcodeManagerSource.includes('data-testid="barcode-required-identity-note"') &&
    barcodeManagerSource.includes('data-testid="barcode-live-results-board"') &&
    barcodeManagerSource.includes('data-testid="barcode-live-monitor-toggle"') &&
    barcodeManagerSource.includes("window.setInterval") &&
    barcodeManagerSource.includes("5000"),
  "staff should share links by WhatsApp/QR and watch results live like a forms dashboard",
);

addCheck(
  "barcode public page renders as a real timed test shell with identity fields and submit action",
  barcodePageSource.includes('data-testid="barcode-public-real-test-shell"') &&
    barcodePageSource.includes('data-testid="barcode-public-test-header"') &&
    barcodePageSource.includes('data-testid="barcode-public-identity-fields"') &&
    barcodePageSource.includes('data-testid="barcode-public-question-list"') &&
    barcodePageSource.includes('data-testid="barcode-public-submit"') &&
    barcodePageSource.includes("timeExpired") &&
    barcodePageSource.includes("disabled={timeExpired}"),
  "students entering by barcode must see a real timed test, not a loose form",
);

addCheck(
  "barcode live audit checks admin and public test surfaces on desktop and mobile",
  liveAuditSource.includes("VIEWPORTS") &&
    liveAuditSource.includes('name: "mobile"') &&
    liveAuditSource.includes('"/admin-dashboard?tab=barcode-tests"') &&
    liveAuditSource.includes('`/barcode-test/${encodeURIComponent(selectedTest.slug)}`') &&
    liveAuditSource.includes("horizontalOverflow") &&
    liveAuditSource.includes('data-testid="barcode-real-test-settings"') &&
    liveAuditSource.includes('data-testid="barcode-public-real-test-shell"'),
  "live proof must cover barcode management and student public entry without registration",
);

addCheck(
  "barcode live audit creates a public test when production has none ready",
  liveAuditSource.includes("createAuditPublicTest") &&
    liveAuditSource.includes("/quizzes/questions?approvalStatus=approved") &&
    liveAuditSource.includes("/public-tests/admin") &&
    liveAuditSource.includes("Unable to create a live barcode audit test") &&
    liveAuditSource.includes("Created audit test"),
  "live barcode proof should not silently skip the public student page when no active test exists",
);

addCheck(
  "barcode reports summarize schools, classrooms, weak skills, and low performers",
  publicRoutes.includes("bySchool") &&
    publicRoutes.includes("byClassroom") &&
    publicRoutes.includes("lowPerformers") &&
    publicRoutes.includes("passRate") &&
    publicRoutes.includes("averageTimeSeconds"),
  "public QR tests need useful post-test analysis for supervisors and school managers",
);
addCheck(
  "barcode admin report can export Excel-ready CSV and printable PDF",
  barcodeManagerSource.includes("downloadCsv") &&
    barcodeManagerSource.includes("openPrintReport") &&
    barcodeManagerSource.includes("exportReportCsv") &&
    barcodeManagerSource.includes("printReport") &&
    barcodeManagerSource.includes('data-testid="barcode-test-top-students"') &&
    barcodeManagerSource.includes("reportTopStudents") &&
    barcodeManagerSource.includes("حسب المدرسة") &&
    barcodeManagerSource.includes("طلاب يحتاجون متابعة"),
  "staff must be able to share barcode test results outside the platform",
);

const failed = checks.filter((check) => check.status === "FAIL");
for (const check of checks) {
  console.log(`${check.status} ${check.name} - ${check.detail}`);
}

if (failed.length) {
  console.error(`\n${failed.length} barcode public tests contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} barcode public tests contract checks passed.`);
