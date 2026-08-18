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
  "import { buildScopedFollowUpSummary, buildScopedInterventionPlan } from './Reports/scopedAnalyticsViewModel';\n",
  "import { buildScopedFollowUpSummary, buildScopedInterventionPlan } from './Reports/scopedAnalyticsViewModel';\nimport {\n    buildScopedAvailableGroups,\n    buildScopedGroupPerformanceRows,\n    buildScopedLatestResults,\n    buildScopedTeacherPerformanceRows,\n    filterScopedStudentsByGroup,\n    getStrongestScopedGroup,\n} from './Reports/scopedComparisonViewModel';\n",
  'scoped analytics import anchor',
);
reports = replaceRange(
  reports,
  '    const scopedAvailableGroups = useMemo(() => {',
  '    const directedFollowUpOptions = useMemo(',
  "    const scopedAvailableGroups = useMemo(\n        () => buildScopedAvailableGroups(scopedAnalytics),\n        [scopedAnalytics],\n    );\n    const scopedFilteredStudents = useMemo(\n        () => filterScopedStudentsByGroup(scopedAnalytics, scopedGroupFilter),\n        [scopedAnalytics, scopedGroupFilter],\n    );\n    const scopedLatestResults = useMemo(\n        () => buildScopedLatestResults(scopedResults, scopedGroupFilter, scopedFilteredStudents),\n        [scopedResults, scopedGroupFilter, scopedFilteredStudents],\n    );\n    const scopedGroupPerformanceRows = useMemo(\n        () => buildScopedGroupPerformanceRows({ scopedAnalytics, scopedResults, groups }),\n        [groups, scopedAnalytics, scopedResults],\n    );\n    const weakestScopedGroup = scopedGroupPerformanceRows[0] || null;\n    const strongestScopedGroup = useMemo(\n        () => getStrongestScopedGroup(scopedGroupPerformanceRows),\n        [scopedGroupPerformanceRows],\n    );\n    const scopedTeacherPerformanceRows = useMemo(\n        () => buildScopedTeacherPerformanceRows({ scopedAnalytics, scopedResults, groups, users }),\n        [groups, scopedAnalytics, scopedResults, users],\n    );\n",
  'scoped comparison derivation block',
);
write(reportsPath, reports);

const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
let roleContract = read(roleContractPath);
roleContract = replaceOnce(
  roleContract,
  "  await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "  await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n",
  'reports role scoped comparison ownership list',
);
roleContract = replaceOnce(
  roleContract,
  "  assertIncludes(reportsSource, 'scopedTeacherPerformanceRows');\n",
  "  assertIncludes(reportsSource, 'scopedTeacherPerformanceRows');\n  assertIncludes(reportsSource, 'buildScopedGroupPerformanceRows({');\n  assertIncludes(reportsSource, 'buildScopedTeacherPerformanceRows({');\n",
  'reports role scoped comparison assertions',
);
write(roleContractPath, roleContract);

const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';
let globalJourney = read(globalJourneyPath);
globalJourney = replaceOnce(
  globalJourney,
  "    await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  "    await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n",
  'global journey scoped comparison ownership list',
);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
