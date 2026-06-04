import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];

function addCheck(name, condition, detail) {
  checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
}

function includes(file, needle) {
  return read(file).includes(needle);
}

function notIncludes(file, needle) {
  return !read(file).includes(needle);
}

const loader = read("utils/xlsxLoader.ts");
const packageJson = read("package.json");
addCheck(
  "xlsx is loaded lazily",
  loader.includes("import('@e965/xlsx')"),
  "xlsxLoader keeps xlsx out of the initial admin bundle",
);
addCheck(
  "legacy xlsx package is removed",
  packageJson.includes('"@e965/xlsx"') && !packageJson.includes('"xlsx"'),
  "the audited npm package xlsx must not be a direct dependency",
);
addCheck(
  "workbook import disables formula parsing",
  loader.includes("cellFormula: false"),
  "spreadsheet reads must not preserve formulas from uploaded files",
);
addCheck(
  "workbook import disables VBA payloads",
  loader.includes("bookVBA: false"),
  "spreadsheet reads must not preserve VBA payloads",
);
addCheck(
  "workbook import rejects oversized files",
  loader.includes("MAX_XLSX_IMPORT_BYTES") && loader.includes("buffer.byteLength > MAX_XLSX_IMPORT_BYTES"),
  "spreadsheet reads must bound parser work for uploaded Excel files",
);
addCheck(
  "spreadsheet object sanitizer strips prototype pollution keys",
  ["__proto__", "prototype", "constructor"].every((key) => loader.includes(key)) &&
    loader.includes("sanitizeSpreadsheetValue"),
  "imported row objects are recursively sanitized",
);
addCheck(
  "sheet utilities require registered runtime",
  loader.includes("registerXlsxRuntime") && loader.includes("XLSX runtime is not registered"),
  "import parsers cannot silently run against an unregistered runtime",
);

const adminImportFiles = [
  "dashboards/admin/LessonsManager.tsx",
  "dashboards/admin/QuestionBankManager.tsx",
  "dashboards/admin/SchoolsManager.tsx",
];

for (const file of adminImportFiles) {
  addCheck(
    `${file} uses safe workbook reader`,
    includes(file, "readWorkbookFromBuffer") &&
      includes(file, "registerXlsxRuntime") &&
      (includes(file, "sheetToSafeObjects") || includes(file, "sheetToSafeRows")),
    "Excel imports must go through xlsxLoader safety helpers",
  );
  addCheck(
    `${file} has no static xlsx import`,
    notIncludes(file, "import * as XLSX from 'xlsx'") &&
      notIncludes(file, 'import * as XLSX from "xlsx"') &&
      notIncludes(file, "from 'xlsx'") &&
      notIncludes(file, 'from "xlsx"'),
    "static xlsx imports would bypass lazy loading and safety review",
  );
}

const exportOnlyFiles = [
  "pages/Reports.tsx",
  "dashboards/admin/UsersManager.tsx",
  "dashboards/admin/GroupsManager.tsx",
  "dashboards/admin/QuizzesManager.tsx",
  "dashboards/admin/LibraryManager.tsx",
];

for (const file of exportOnlyFiles) {
  addCheck(
    `${file} avoids static xlsx import`,
    notIncludes(file, "import * as XLSX from 'xlsx'") &&
      notIncludes(file, 'import * as XLSX from "xlsx"') &&
      notIncludes(file, "from 'xlsx'") &&
      notIncludes(file, 'from "xlsx"'),
    "export-only surfaces may load xlsx dynamically but must not statically bundle it",
  );
}

const failed = checks.filter((check) => check.status === "FAIL");
for (const check of checks) {
  console.log(`${check.status} ${check.name} - ${check.detail}`);
}

if (failed.length) {
  console.error(`\n${failed.length} xlsx safety contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} xlsx safety contract checks passed.`);
