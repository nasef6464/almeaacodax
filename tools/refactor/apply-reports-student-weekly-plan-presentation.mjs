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

const panelImport = "import { StudentWeeklyPlanPanel } from './Reports/StudentWeeklyPlanPanel';";
const delegation = '<StudentWeeklyPlanPanel visible={isStudentReportFull} items={studentWeeklyPlan} />';
const ownership = "../pages/Reports/StudentWeeklyPlanPanel.tsx";

const alreadyApplied = reports.includes(panelImport)
  && reports.includes(delegation)
  && roleContract.includes(ownership)
  && globalJourney.includes(ownership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-weekly-plan-presentation' }, null, 2));
  process.exit(0);
}

if (!reports.includes(panelImport)) {
  reports = replaceOnce(
    reports,
    "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';\n",
    "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';\nimport { StudentWeeklyPlanPanel } from './Reports/StudentWeeklyPlanPanel';\n",
    'student weekly plan import anchor',
  );
}

if (!reports.includes(delegation)) {
  reports = replaceRange(
    reports,
    '            {isStudentReportFull && studentWeeklyPlan.length > 0 ? (\n',
    '\n\n            </>\n',
    `            ${delegation}`,
    'student weekly plan presentation',
  );
}

if (!roleContract.includes(ownership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n",
    'reports role weekly plan presentation ownership',
  );
}

if (!globalJourney.includes(ownership)) {
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/StudentWeeklyPlanPanel.tsx', import.meta.url), 'utf8'),\n",
    'global journey weekly plan presentation ownership',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-weekly-plan-presentation',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
