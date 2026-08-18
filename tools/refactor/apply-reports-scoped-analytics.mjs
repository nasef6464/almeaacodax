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
  "} from './Reports/studentAnalyticsViewModel';\n",
  "} from './Reports/studentAnalyticsViewModel';\nimport { buildScopedFollowUpSummary, buildScopedInterventionPlan } from './Reports/scopedAnalyticsViewModel';\n",
  'student analytics import anchor',
);
reports = replaceRange(
  reports,
  '    const scopedInterventionPlan = useMemo(() => {',
  '    const copyScopedSummary = async () => {',
  "    const scopedInterventionPlan = useMemo(\n        () => buildScopedInterventionPlan(scopedAnalytics),\n        [scopedAnalytics],\n    );\n    const scopedFollowUpSummary = useMemo(\n        () => buildScopedFollowUpSummary(scopedAnalytics, user.role),\n        [scopedAnalytics, user.role],\n    );\n",
  'scoped analytics derivation block',
);
write(reportsPath, reports);

const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
let roleContract = read(roleContractPath);
roleContract = replaceOnce(
  roleContract,
  "  await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "  await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  'reports role analytics ownership list',
);
roleContract = replaceOnce(
  roleContract,
  "  assertIncludes(reportsSource, 'const scopedInterventionPlan = useMemo');",
  "  assertIncludes(reportsSource, 'buildScopedInterventionPlan(scopedAnalytics)');",
  'scoped intervention role assertion',
);
roleContract = replaceOnce(
  roleContract,
  "  assertIncludes(reportsSource, 'const scopedFollowUpSummary = useMemo');",
  "  assertIncludes(reportsSource, 'buildScopedFollowUpSummary(scopedAnalytics, user.role)');",
  'scoped summary role assertion',
);
write(roleContractPath, roleContract);

const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';
let globalJourney = read(globalJourneyPath);
globalJourney = replaceOnce(
  globalJourney,
  "    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  'global journey reports ownership list',
);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
