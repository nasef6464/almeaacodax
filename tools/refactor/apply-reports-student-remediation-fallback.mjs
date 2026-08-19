import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const write = (file, content) => writeFileSync(path.join(root, file), content, 'utf8');

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Duplicate ${label}`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${label} start marker`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing ${label} end marker`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const reportsPath = 'pages/Reports.tsx';
const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';

let reports = read(reportsPath);
let roleContract = read(roleContractPath);

const fallbackImport = "import { buildStudentRemediationFallback } from './Reports/studentRemediationFallbackViewModel';";
const fallbackDelegation = 'setSmartRemediation(buildStudentRemediationFallback(focusedReportSkills));';
const fallbackRoleOwnership = "../pages/Reports/studentRemediationFallbackViewModel.ts";

const alreadyApplied =
  reports.includes(fallbackImport) &&
  reports.includes(fallbackDelegation) &&
  roleContract.includes(fallbackRoleOwnership) &&
  !roleContract.includes("assertIncludes(reportsSource, 'setSmartRemediation({');");

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-remediation-fallback' }, null, 2));
  process.exit(0);
}

if (!reports.includes(fallbackImport)) {
  reports = replaceOnce(
    reports,
    "import { buildStudentReportScope } from './Reports/studentReportScopeViewModel';\n",
    "import { buildStudentReportScope } from './Reports/studentReportScopeViewModel';\nimport { buildStudentRemediationFallback } from './Reports/studentRemediationFallbackViewModel';\n",
    'student report scope import anchor',
  );
}

if (!reports.includes(fallbackDelegation)) {
  reports = replaceRange(
    reports,
    "        } catch {\n            setSmartRemediation({\n",
    "        } finally {\n",
    "        } catch {\n            setSmartRemediation(buildStudentRemediationFallback(focusedReportSkills));\n",
    'student remediation local fallback block',
  );
}

if (!roleContract.includes(fallbackRoleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentReportScopeViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentReportScopeViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role remediation fallback ownership list',
  );
}

if (roleContract.includes("assertIncludes(reportsSource, 'setSmartRemediation({');")) {
  roleContract = replaceOnce(
    roleContract,
    "  assertIncludes(reportsSource, 'setSmartRemediation({');\n",
    "  assertIncludes(reportsSource, 'buildStudentRemediationFallback(focusedReportSkills)');\n",
    'reports role remediation fallback delegation assertion',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-remediation-fallback',
  files: [reportsPath, roleContractPath],
}, null, 2));
