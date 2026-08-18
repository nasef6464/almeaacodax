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
  "} from './Reports/scopedComparisonViewModel';\n",
  "} from './Reports/scopedComparisonViewModel';\nimport {\n    buildDirectedFollowUpOptions,\n    buildDirectedQuizAnalysisResults,\n    buildDirectedQuizSkillAnalysis,\n    buildDirectedQuizStudentAnalysis,\n    buildDirectedQuizSummary,\n    selectDirectedFollowUpQuiz,\n} from './Reports/directedQuizAnalyticsViewModel';\n",
  'scoped comparison import anchor',
);
reports = replaceRange(
  reports,
  '    const directedFollowUpOptions = useMemo(',
  '    const showScopedAggregatedSections =',
  "    const directedFollowUpOptions = useMemo(\n        () => buildDirectedFollowUpOptions(scopedAnalytics),\n        [scopedAnalytics],\n    );\n    useEffect(() => {\n        if (selectedFollowUpQuizId === 'all') return;\n        if (!directedFollowUpOptions.some((quiz) => quiz.id === selectedFollowUpQuizId)) {\n            setSelectedFollowUpQuizId('all');\n        }\n    }, [directedFollowUpOptions, selectedFollowUpQuizId]);\n    const selectedFollowUpQuiz = useMemo(\n        () => selectDirectedFollowUpQuiz(directedFollowUpOptions, selectedFollowUpQuizId),\n        [directedFollowUpOptions, selectedFollowUpQuizId],\n    );\n    const directedQuizAnalysisResults = useMemo(\n        () => buildDirectedQuizAnalysisResults({\n            scopedResults,\n            selectedFollowUpQuizId,\n            directedFollowUpOptions,\n            scopedGroupFilter,\n            scopedFilteredStudents,\n        }),\n        [directedFollowUpOptions, scopedFilteredStudents, scopedGroupFilter, scopedResults, selectedFollowUpQuizId],\n    );\n    const directedQuizSkillAnalysis = useMemo(\n        () => buildDirectedQuizSkillAnalysis(directedQuizAnalysisResults),\n        [directedQuizAnalysisResults],\n    );\n    const directedQuizStudentAnalysis = useMemo(\n        () => buildDirectedQuizStudentAnalysis(directedQuizAnalysisResults),\n        [directedQuizAnalysisResults],\n    );\n    const directedQuizSummary = useMemo(\n        () => buildDirectedQuizSummary(directedQuizAnalysisResults, directedQuizSkillAnalysis, selectedFollowUpQuiz),\n        [directedQuizAnalysisResults, directedQuizSkillAnalysis, selectedFollowUpQuiz],\n    );\n",
  'directed quiz analytics derivation block',
);
write(reportsPath, reports);

const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
let roleContract = read(roleContractPath);
roleContract = replaceOnce(
  roleContract,
  "  await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n",
  "  await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  'reports role directed quiz ownership list',
);
roleContract = replaceOnce(
  roleContract,
  "  assertIncludes(reportsSource, 'const directedQuizSkillAnalysis = useMemo');\n",
  "  assertIncludes(reportsSource, 'const directedQuizSkillAnalysis = useMemo');\n  assertIncludes(reportsSource, 'buildDirectedQuizAnalysisResults({');\n  assertIncludes(reportsSource, 'buildDirectedQuizSkillAnalysis(directedQuizAnalysisResults)');\n",
  'reports role directed quiz builder assertions',
);
write(roleContractPath, roleContract);

const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';
let globalJourney = read(globalJourneyPath);
globalJourney = replaceOnce(
  globalJourney,
  "    await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n",
  "    await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
  'global journey directed quiz ownership list',
);
write(globalJourneyPath, globalJourney);

console.log(JSON.stringify({
  status: 'APPLIED',
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
