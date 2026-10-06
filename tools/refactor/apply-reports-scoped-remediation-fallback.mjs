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

const fallbackImport = "import { buildScopedRemediationFallback } from './Reports/scopedRemediationFallbackViewModel';";
const fallbackDelegation = 'setScopedSmartRemediation(buildScopedRemediationFallback(skillPayload));';
const fallbackRoleOwnership = "../pages/Reports/scopedRemediationFallbackViewModel.ts";

const alreadyApplied =
  reports.includes(fallbackImport) &&
  reports.includes(fallbackDelegation) &&
  roleContract.includes(fallbackRoleOwnership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'scoped-remediation-fallback' }, null, 2));
  process.exit(0);
}

if (!reports.includes(fallbackImport)) {
  reports = replaceOnce(
    reports,
    "import { buildStudentRemediationFallback } from './Reports/studentRemediationFallbackViewModel';\n",
    "import { buildStudentRemediationFallback } from './Reports/studentRemediationFallbackViewModel';\nimport { buildScopedRemediationFallback } from './Reports/scopedRemediationFallbackViewModel';\n",
    'student remediation fallback import anchor',
  );
}

if (!reports.includes(fallbackDelegation)) {
  reports = replaceRange(
    reports,
    "        } catch {\n            setScopedSmartRemediation({\n",
    "        }\n\n        const leadStudent = scopedAnalytics.weakestStudents[0];\n",
    "        } catch {\n            setScopedSmartRemediation(buildScopedRemediationFallback(skillPayload));\n",
    'scoped remediation local fallback block',
  );
}

if (!roleContract.includes(fallbackRoleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role scoped remediation fallback ownership list',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'scoped-remediation-fallback',
  files: [reportsPath, roleContractPath],
}, null, 2));
