import fs from 'node:fs';

const path = 'server/src/routes/quiz.routes.ts';
const source = fs.readFileSync(path, 'utf8');

const from = '    if (willBePublished && hasQuestions) {';
const to = '    if (willBePublished) {';

const first = source.indexOf(from);
if (first === -1) {
  if (source.includes(to)) {
    console.log('[baseline-repair] quiz publish integrity guard is already repaired');
    process.exit(0);
  }
  throw new Error('[baseline-repair] expected quiz publish guard fragment was not found');
}

if (source.indexOf(from, first + from.length) !== -1) {
  throw new Error('[baseline-repair] quiz publish guard fragment is ambiguous');
}

const contextStart = Math.max(0, first - 500);
const contextEnd = Math.min(source.length, first + from.length + 700);
const context = source.slice(contextStart, contextEnd);

for (const required of [
  'const willBePublished =',
  'const integrity = await validateQuizQuestionIntegrity(payload);',
  'Cannot publish quiz: some referenced questions are missing or have incomplete content',
]) {
  if (!source.includes(required)) {
    throw new Error(`[baseline-repair] refusing repair because required integrity fragment is missing: ${required}`);
  }
}

if (!context.includes('const integrity = await validateQuizQuestionIntegrity(payload);')) {
  throw new Error('[baseline-repair] refusing repair because validation is not adjacent to the publish guard');
}

fs.writeFileSync(
  path,
  `${source.slice(0, first)}${to}${source.slice(first + from.length)}`,
  'utf8',
);

console.log('[baseline-repair] restored quiz publish integrity validation for empty and non-empty published quizzes');
