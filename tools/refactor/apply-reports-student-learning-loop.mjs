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

const learningLoopImport = "import { buildStudentQuickActions, buildStudentTodayLearningLoop, type StudentLearningActionIconKey } from './Reports/studentLearningLoopViewModel';";
const learningLoopDelegation = 'buildStudentTodayLearningLoop(studentTodayFocus, studentQuickActions)';
const learningLoopRoleOwnership = "../pages/Reports/studentLearningLoopViewModel.ts";
const learningLoopGlobalOwnership = "../pages/Reports/studentLearningLoopViewModel.ts";

const alreadyApplied =
  reports.includes(learningLoopImport) &&
  reports.includes('buildStudentQuickActions(studentTodayFocus)') &&
  reports.includes(learningLoopDelegation) &&
  reports.includes('studentLearningActionIcons[action.iconKey]') &&
  roleContract.includes(learningLoopRoleOwnership) &&
  globalJourney.includes(learningLoopGlobalOwnership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-learning-loop' }, null, 2));
  process.exit(0);
}

reports = replaceOnce(
  reports,
  "import { buildStudentReadinessDecision, type StudentReadinessIconKey } from './Reports/studentReadinessViewModel';\n",
  "import { buildStudentReadinessDecision, type StudentReadinessIconKey } from './Reports/studentReadinessViewModel';\nimport { buildStudentQuickActions, buildStudentTodayLearningLoop, type StudentLearningActionIconKey } from './Reports/studentLearningLoopViewModel';\n",
  'student readiness import anchor',
);

reports = replaceOnce(
  reports,
  'const studentReadinessIcons: Record<StudentReadinessIconKey, LucideIcon> = {',
  "const studentLearningActionIcons: Record<StudentLearningActionIconKey, LucideIcon> = { checkCircle: CheckCircle, video: Video, fileText: FileText };\n\nconst studentReadinessIcons: Record<StudentReadinessIconKey, LucideIcon> = {",
  'student readiness icon map anchor',
);

reports = replaceRange(
  reports,
  '    const studentQuickActions = useMemo(() => {',
  '    const studentReadinessDecision = useMemo(() => {',
  "    const studentQuickActions = useMemo(\n        () => buildStudentQuickActions(studentTodayFocus),\n        [studentTodayFocus],\n    );\n    const studentTodayLearningLoop = useMemo(() => {\n        const loop = buildStudentTodayLearningLoop(studentTodayFocus, studentQuickActions);\n\n        return {\n            ...loop,\n            steps: loop.steps.map((action) => ({\n                ...action,\n                Icon: studentLearningActionIcons[action.iconKey],\n            })),\n        };\n    }, [studentQuickActions, studentTodayFocus]);\n",
  'student quick actions and learning loop block',
);

if (!roleContract.includes(learningLoopRoleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role learning-loop ownership list',
  );
}

if (!globalJourney.includes(learningLoopGlobalOwnership)) {
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/studentLearningLoopViewModel.ts', import.meta.url), 'utf8'),\n",
    'global journey learning-loop ownership list',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-learning-loop',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
