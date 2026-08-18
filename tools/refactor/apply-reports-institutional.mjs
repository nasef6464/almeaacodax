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
let reports = read(reportsPath);
reports = replaceOnce(
  reports,
  "} from './Reports/directedQuizAnalyticsViewModel';\n",
  "} from './Reports/directedQuizAnalyticsViewModel';\nimport { buildInstitutionalReportHub, buildScopedLeadStudentSummary } from './Reports/institutionalReportViewModel';\n",
  'directed quiz import anchor',
);
reports = replaceRange(
  reports,
  '    const scopedLeadStudentSummary = useMemo(() => {',
  '    const copyInstitutionalAlert = async () => {',
  "    const scopedLeadStudentSummary = useMemo(\n        () => buildScopedLeadStudentSummary(scopedLeadStudent),\n        [scopedLeadStudent],\n    );\n    const institutionalReportHub = useMemo(\n        () => buildInstitutionalReportHub({\n            role: user.role,\n            scopedAnalytics,\n            scopedLeadSkill,\n            scopedLeadStudent,\n            scopedLeadSubject,\n            skills,\n        }),\n        [scopedAnalytics, scopedLeadSkill, scopedLeadStudent, scopedLeadSubject, skills, user.role],\n    );\n",
  'institutional report derivation block',
);
write(reportsPath, reports);

const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
let roleContract = read(roleContractPath);
roleContract = replaceOnce(
  roleContract,
  "  await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "  await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/institutionalReportViewModel.ts', import.meta.url), 'utf8'),\n",
  'reports role institutional ownership list',
);
roleContract = replaceOnce(
  roleContract,
  "check('staff reports can send a real intervention alert to linked parent and supervisor recipients', () => {\n",
  "check('staff reports can send a real intervention alert to linked parent and supervisor recipients', () => {\n  assertIncludes(reportsSource, 'buildInstitutionalReportHub({');\n  assertIncludes(reportsSource, 'buildScopedLeadStudentSummary(scopedLeadStudent)');\n",
  'reports role institutional builder assertions',
);
write(roleContractPath, roleContract);

const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';
let globalJourney = read(globalJourneyPath);
globalJourney = replaceOnce(
  globalJourney,
  "    await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "    await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/institutionalReportViewModel.ts', import.meta.url), 'utf8'),\n",
  'global journey institutional ownership list',
);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
