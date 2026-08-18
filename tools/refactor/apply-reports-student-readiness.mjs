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

const readinessImport = "import { buildStudentReadinessDecision, type StudentReadinessIconKey } from './Reports/studentReadinessViewModel';";
const readinessDelegation = 'buildStudentReadinessDecision(isStudentView, studentTodayFocus)';
const readinessRoleOwnership = "../pages/Reports/studentReadinessViewModel.ts";
const readinessGlobalOwnership = "../pages/Reports/studentReadinessViewModel.ts";

const alreadyApplied =
  reports.includes(readinessImport) &&
  reports.includes(readinessDelegation) &&
  reports.includes('studentReadinessIcons[decision.iconKey]') &&
  roleContract.includes(readinessRoleOwnership) &&
  globalJourney.includes(readinessGlobalOwnership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'student-readiness' }, null, 2));
  process.exit(0);
}

reports = replaceOnce(
  reports,
  "import { buildStudentSkillReportRows } from './Reports/studentSkillRowsViewModel';\n",
  "import { buildStudentSkillReportRows } from './Reports/studentSkillRowsViewModel';\nimport { buildStudentReadinessDecision, type StudentReadinessIconKey } from './Reports/studentReadinessViewModel';\n",
  'student skill rows import anchor',
);

reports = replaceOnce(
  reports,
  'const Reports: React.FC = () => {',
  "const studentReadinessIcons: Record<StudentReadinessIconKey, LucideIcon> = {\n    target: Target,\n    checkCircle: CheckCircle,\n    fileText: FileText,\n    bookOpen: BookOpen,\n};\n\nconst Reports: React.FC = () => {",
  'Reports component declaration',
);

reports = replaceRange(
  reports,
  '    const studentReadinessDecision = useMemo(() => {',
  '    const compactStudentSkillRows = useMemo(',
  "    const studentReadinessDecision = useMemo(() => {\n        const decision = buildStudentReadinessDecision(isStudentView, studentTodayFocus);\n        if (!decision) return null;\n\n        return {\n            ...decision,\n            Icon: studentReadinessIcons[decision.iconKey],\n        };\n    }, [isStudentView, studentTodayFocus]);\n",
  'student readiness decision derivation block',
);

if (!roleContract.includes(readinessRoleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/studentSkillRowsViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/studentSkillRowsViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role readiness ownership list',
  );
}

if (!globalJourney.includes(readinessGlobalOwnership)) {
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/studentSkillRowsViewModel.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/studentSkillRowsViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/studentReadinessViewModel.ts', import.meta.url), 'utf8'),\n",
    'global journey readiness ownership list',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'student-readiness',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
