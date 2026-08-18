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
  "import { buildScopedStudentFocusCards } from './Reports/scopedStudentFocusViewModel';\n",
  "import { buildScopedStudentFocusCards } from './Reports/scopedStudentFocusViewModel';\nimport { buildScopedSkillReportCards } from './Reports/scopedSkillReportViewModel';\n",
  'student focus import anchor',
);
reports = replaceRange(
  reports,
  '    const scopedSkillReportCards = useMemo(() => {',
  '    const scopedStudentFocusCards = useMemo(',
  "    const scopedSkillReportCards = useMemo(\n        () => buildScopedSkillReportCards(scopedAnalytics, {\n            allSkills: skills,\n            lessons,\n            quizzes,\n            libraryItems,\n            questions,\n            topics,\n            subjects,\n            sections,\n        }),\n        [lessons, libraryItems, questions, quizzes, scopedAnalytics, sections, skills, subjects, topics],\n    );\n",
  'scoped skill report card derivation block',
);
write(reportsPath, reports);

const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
let roleContract = read(roleContractPath);
roleContract = replaceOnce(
  roleContract,
  "  await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n",
  "  await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedSkillReportViewModel.ts', import.meta.url), 'utf8'),\n",
  'reports role scoped skill ownership list',
);
roleContract = replaceOnce(
  roleContract,
  "check('staff scoped reports keep intervention plan, summary, and smart remediation', () => {\n",
  "check('staff scoped reports keep intervention plan, summary, and smart remediation', () => {\n  assertIncludes(reportsSource, 'buildScopedSkillReportCards(scopedAnalytics, {');\n",
  'reports role scoped skill assertion',
);
write(roleContractPath, roleContract);

const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';
let globalJourney = read(globalJourneyPath);
globalJourney = replaceOnce(
  globalJourney,
  "    await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n",
  "    await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/scopedSkillReportViewModel.ts', import.meta.url), 'utf8'),\n",
  'global journey scoped skill ownership list',
);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
