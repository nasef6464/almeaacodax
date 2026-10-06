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
const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';

let reports = read(reportsPath);
let roleContract = read(roleContractPath);
let globalJourney = read(globalJourneyPath);

const panelImport = "import { StudentSmartRemediationPanel } from './Reports/StudentSmartRemediationPanel';";
const delegation = '<StudentSmartRemediationPanel visible={isStudentReportFull} plan={smartRemediation} />';
const ownership = "../pages/Reports/StudentSmartRemediationPanel.tsx";

const alreadyApplied = reports.includes(panelImport)
  && reports.includes(delegation)
  && roleContract.includes(ownership)
  && globalJourney.includes(ownership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-smart-remediation-presentation' }, null, 2));
  process.exit(0);
}

if (!reports.includes(panelImport)) {
  reports = replaceOnce(
    reports,
    "import { StudentWeeklyPlanPanel } from './Reports/StudentWeeklyPlanPanel';\n",
    "import { StudentWeeklyPlanPanel } from './Reports/StudentWeeklyPlanPanel';\nimport { StudentSmartRemediationPanel } from './Reports/StudentSmartRemediationPanel';\n",
    'student smart remediation import anchor',
  );
}

if (!reports.includes(delegation)) {
  reports = replaceRange(
    reports,
    '            {smartRemediation && isStudentReportFull ? (\n',
    '\n\n            {isStudentReportFull ? (\n',
    `            ${delegation}`,
    'student smart remediation presentation',
  );
}

if (!roleContract.includes(ownership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/StudentSmartRemediationPanel.tsx', import.meta.url), 'utf8'),\n",
    'reports role smart remediation presentation ownership',
  );
}

if (!globalJourney.includes(ownership)) {
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/StudentSmartRemediationPanel.tsx', import.meta.url), 'utf8'),\n",
    'global journey smart remediation presentation ownership',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-smart-remediation-presentation',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
