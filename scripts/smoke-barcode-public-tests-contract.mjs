import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "docs", "BARCODE_PUBLIC_TESTS_PLAN_AR.md");
const packagePath = path.join(root, "package.json");
const plan = fs.readFileSync(planPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

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

const failed = checks.filter((check) => check.status === "FAIL");
for (const check of checks) {
  console.log(`${check.status} ${check.name} - ${check.detail}`);
}

if (failed.length) {
  console.error(`\n${failed.length} barcode public tests contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} barcode public tests contract checks passed.`);
