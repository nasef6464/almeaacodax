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

const scopeImport = "import { buildStudentReportScope } from './Reports/studentReportScopeViewModel';";
const scopeDelegation = 'buildStudentReportScope({';
const scopeRoleOwnership = "../pages/Reports/studentReportScopeViewModel.ts";
const scopeGlobalOwnership = "../pages/Reports/studentReportScopeViewModel.ts";

const alreadyApplied =
  reports.includes(scopeImport) &&
  reports.includes(scopeDelegation) &&
  !reports.includes('const effectiveStudentPathIds = selectedStudentPathId') &&
  roleContract.includes(scopeRoleOwnership) &&
  globalJourney.includes(scopeGlobalOwnership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-report-scope' }, null, 2));
  process.exit(0);
}

reports = replaceOnce(
  reports,
  "import { buildStudentQuickActions, buildStudentTodayLearningLoop, type StudentLearningActionIconKey } from './Reports/studentLearningLoopViewModel';\n",
  "import { buildStudentQuickActions, buildStudentTodayLearningLoop, type StudentLearningActionIconKey } from './Reports/studentLearningLoopViewModel';\nimport { buildStudentReportScope } from './Reports/studentReportScopeViewModel';\n",
  'student learning loop import anchor',
);

reports = replaceOnce(
  reports,
  '    const weakestSkill = aggregatedSkills.length > 0 ? aggregatedSkills[0] : null;\n',
  '',
  'weakest skill local derivation',
);

reports = replaceRange(
  reports,
  '    const studentEnrolledPathIds = useMemo(',
  '    const selectedSkillRecommendation = getSkillRecommendation',
  "    const {\n        weakestSkill, studentEnrolledPathIds, studentEnrolledPathLabels, studentReportPathOptions,\n        studentPathScopedSkills, reportBaseSkills, reliableAggregatedSkills, reliableWeakSkills,\n        reliableAverageSkills, earlyWeakSignals, focusedReportSkills, primaryReportSkill,\n        selectedReportSkill, studentTrackLabel, hasStudentTrackScope,\n    } = useMemo(\n        () => buildStudentReportScope({\n            aggregatedSkills,\n            paths,\n            enrolledPaths,\n            selectedStudentPathId,\n            selectedSkillKey,\n            role: user.role,\n        }),\n        [aggregatedSkills, enrolledPaths, paths, selectedSkillKey, selectedStudentPathId, user.role],\n    );\n",
  'student report path and focus policy block',
);

reports = replaceOnce(
  reports,
  "    const studentTrackLabel = studentEnrolledPathLabels.length > 0 ? studentEnrolledPathLabels.join('، ') : '';\n    const hasStudentTrackScope = studentEnrolledPathIds.length > 0;\n",
  '',
  'student track summary local derivation',
);

if (!roleContract.includes(scopeRoleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentReportScopeViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role student report scope ownership list',
  );
}

if (!globalJourney.includes(scopeGlobalOwnership)) {
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/studentReportScopeViewModel.ts', import.meta.url), 'utf8'),\n",
    'global journey student report scope ownership list',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-report-scope',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
