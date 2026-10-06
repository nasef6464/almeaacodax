import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { isQuestionContentUsable, sanitizeQuestionForLearner, toQuestionSummaryText } from "../modules/quizzes/presentation/questionPresentation.js";';
const analyticsImport = 'import { buildRecommendedAction, buildResultSkillStatus, buildSkillRecommendation, buildSkillStatus } from "../modules/quizzes/analytics/skillAnalytics.js";';
const rangeStart = 'const buildRecommendedAction = (mastery: number, attemptCount: number) => {';
const rangeEnd = 'const matchesContentScope = (';

const localDeclarations = [
  rangeStart,
  'const buildSkillStatus = (mastery: number) => {',
  'const buildResultSkillStatus = (mastery: number) => {',
  'const buildSkillRecommendation = (mastery: number) => {',
];

const alreadyApplied = source.includes(analyticsImport) && localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-skill-analytics-helpers' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Quiz analytics helper import anchor not found.');
if (source.includes(analyticsImport)) throw new Error('Quiz analytics helper import exists while local declarations remain.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Quiz analytics helper range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Recommended action helper anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const declaration of localDeclarations) {
  if (!range.includes(declaration)) throw new Error(`Quiz analytics helper range lost ${declaration}`);
}
for (const forbidden of [
  'const MIN_ANALYTICS_SKILL_EVIDENCE_COUNT = 3;',
  rangeEnd,
  'SkillProgressModel.findOne(',
  'QuestionAttemptModel.find(',
  'QuizResultModel.find(',
]) {
  if (range.includes(forbidden)) throw new Error(`Quiz analytics helper extraction crossed ownership boundary: ${forbidden}`);
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${analyticsImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-skill-analytics-helpers',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
