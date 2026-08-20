import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const handoverPath = path.join(root, "docs", "project-handover", "16_CURRENT_WORKING_STATE_AR.md");
const indexPath = path.join(root, "docs", "project-handover", "README.md");

const handover = fs.readFileSync(handoverPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

const required = [
  ["current date", "2026-08-19"],
  ["production branch", "Production branch: `main`"],
  ["recovery branch", "develop/platform-v3-recovery"],
  ["recovery pr", "PR النشط: `#26"],
  ["production baseline", "fab4e31f037feeeb178788dd2a79971e4fce2cbc"],
  ["frontend url", "https://almeaacodax.vercel.app/"],
  ["api url", "https://almeaacodax-k2ux.onrender.com/api"],
  ["github repo", "https://github.com/nasef6464/almeaacodax.git"],
  ["main is production only", "`main` هو خط الإنتاج المستقر فقط"],
  ["no direct main development", "لا يتم التطوير مباشرة على `main`"],
  ["explicit approval", "موافقة صريحة"],
  ["no force push", "لا Force Push"],
  ["no secrets", "لا أسرار أو كلمات مرور أو Tokens"],
  ["recovery gate", "Platform V3 Recovery Gate"],
  ["public ui gate", "Platform V3 Public UI Gate"],
  ["phase handover gate", "Platform V3 Phase + Handover Gate"],
  ["live role gate", "Platform V3 Live Role Gate"],
  ["role secrets", "GitHub Actions Secrets"],
  ["vercel env", "VITE_API_URL"],
  ["render env", "MONGODB_URI"],
  ["redis scale", "REDIS_URL"],
  ["current plan", "docs/PLATFORM_V3_RECOVERY_PLAN_AR.md"],
  ["no audit force fix", "`npm audit fix --force` ممنوع"],
];

const forbidden = [
  ["old active branch", "الفرع النشط: `complete-platform-production-v1`"],
  ["direct feature push to main", "git push origin complete-platform-production-v1:main"],
];

const failures = required.filter(([, needle]) => !handover.includes(needle));
for (const [name, needle] of forbidden) {
  if (handover.includes(needle)) {
    failures.push([name, `forbidden ${needle}`]);
  }
}

if (!index.includes("16_CURRENT_WORKING_STATE_AR.md")) {
  failures.push(["handover index", "16_CURRENT_WORKING_STATE_AR.md"]);
}

if (failures.length > 0) {
  console.error("Current handover contract failed:");
  failures.forEach(([name, needle]) => console.error(`- ${name}: ${needle}`));
  process.exit(1);
}

console.log(`Current handover contract passed (${required.length + forbidden.length + 1} checks).`);
