import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const quizPage = read('pages/QuizPage.tsx');
const html = read('utils/questionHtml.ts');
const css = read('styles/main.css');
const questionModel = read('server/src/models/Question.ts');
const passageModel = read('server/src/models/QuestionPassage.ts');
const bankRoutes = read('server/src/modules/quizzes/http/questionBankRoutes.ts');
const quizRoutes = read('server/src/routes/quiz.routes.ts');
const taxonomy = read('server/src/scripts/deployVerbalTaxonomy22.ts');
const importer = read('server/src/scripts/deployVerbalEcosystem.ts');

const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, ok: false, error });
    console.error(`FAIL ${name}`);
    console.error(error);
  }
};

check('canonical taxonomy remains 22 main / 76 subskills', () => {
  assert.equal((taxonomy.match(/id:\s*"skill_verbal_\d{2}"/g) || []).length, 22);
  assert.equal((taxonomy.match(/id:\s*"sub_verbal_\d{2}_\d+"/g) || []).length, 76);
});

check('learner verbal surface is explicit Arabic RTL', () => {
  assert.match(quizPage, /data-testid="quiz-current-question"[\s\S]*?dir="rtl"[\s\S]*?lang="ar"/);
  assert.match(quizPage, /verbal-question-text/);
  assert.match(quizPage, /quiz-option-label/);
  assert.match(quizPage, /verbal-option-text/);
  assert.match(quizPage, /fallbackLetter/);
});

check('completion blanks are presentation-only and visually emphasized', () => {
  assert.match(html, /formatQuestionHtmlForDisplay/);
  assert.match(html, /question-blank/);
  assert.match(css, /\.question-blank/);
  assert.match(css, /border-bottom:\s*3px solid #2563eb/);
  assert.match(css, /background:\s*#fff7cc/);
});

check('reading passages are canonical shared records', () => {
  assert.match(questionModel, /passageId:/);
  assert.match(passageModel, /canonicalFingerprint/);
  assert.match(passageModel, /QuestionPassage/);
});

check('question and quiz reads hydrate passage references', () => {
  assert.match(bankRoutes, /hydrateQuestionPassages/);
  assert.match(quizRoutes, /hydrateQuestionPassages/);
});

check('VERBAL26 importer persists schema-safe provenance', () => {
  assert.match(importer, /source:\s*"imported"/);
  assert.match(importer, /questionCode:\s*q\.canonicalId/);
  assert.match(importer, /sourceMeta:/);
  assert.match(importer, /importBatchId:\s*"VERBAL26"/);
  assert.match(importer, /sourceItemId:\s*q\.canonicalId/);
});

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`\nVERBAL26 runtime contract PASS (${checks.length}/${checks.length}).`);
}
