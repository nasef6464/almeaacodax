import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { buildRecommendedAction, buildResultSkillStatus, buildSkillRecommendation, buildSkillStatus } from "../modules/quizzes/analytics/skillAnalytics.js";';
const utilitiesImport = 'import { buildQuizResultsCacheKey, escapeRegex, parseDateFilter } from "../modules/quizzes/http/queryUtilities.js";';
const blocks = [
  `const buildQuizResultsCacheKey = (\n  userId: string,\n  originalUrl: string,\n  includeReview: boolean,\n) => \`${'${userId}:${includeReview ? "review" : "list"}:${originalUrl}'}\`;\n\n`,
  `const escapeRegex = (value: string) => value.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");\n\n`,
  `const parseDateFilter = (value?: string) => {\n  const raw = String(value || "").trim();\n  if (!raw) return null;\n  const parsed = new Date(raw);\n  if (Number.isNaN(parsed.getTime())) return null;\n  return parsed;\n};\n\n`,
];

const declarations = [
  'const buildQuizResultsCacheKey = (',
  'const escapeRegex = (value: string) =>',
  'const parseDateFilter = (value?: string) => {',
];
const alreadyApplied = source.includes(utilitiesImport) && declarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-query-utilities' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Quiz query utilities import anchor not found.');
if (source.includes(utilitiesImport)) throw new Error('Quiz query utilities import exists while local declarations remain.');

for (const declaration of declarations) {
  const count = source.split(declaration).length - 1;
  if (count !== 1) throw new Error(`Expected one local query utility declaration for ${declaration}; found ${count}`);
}
for (const block of blocks) {
  if (!source.includes(block)) throw new Error(`Exact query utility block not found:\n${block}`);
  source = source.replace(block, '');
}

for (const forbidden of [
  'const trimQuizResultsCacheIfNeeded = () => {',
  'const resolveAuthUserByAuthId = async',
  'const buildQuestionSummaryCacheKey =',
  'quizResultsCache.delete(firstKey)',
]) {
  if (!source.includes(forbidden)) throw new Error(`Route unexpectedly lost state/database behavior: ${forbidden}`);
}

source = source.replace(importAnchor, `${importAnchor}\n${utilitiesImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-query-utilities',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
