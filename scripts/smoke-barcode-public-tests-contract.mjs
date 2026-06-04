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
  "barcode frontend API helpers are available",
  apiSource.includes("createPublicBarcodeTest") &&
    apiSource.includes("getPublicBarcodeTest") &&
    apiSource.includes("submitPublicBarcodeTest") &&
    apiSource.includes("getPublicBarcodeTestReport"),
  "admin and public pages need typed API entry points",
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
