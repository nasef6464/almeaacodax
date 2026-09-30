import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const taxonomy = read('server/src/data/verbalTaxonomyV2.ts');
const quizPage = read('pages/QuizPage.tsx');
const html = read('utils/questionHtml.ts');
const css = read('styles/main.css');
const questionModel = read('server/src/models/Question.ts');
const passageModel = read('server/src/models/QuestionPassage.ts');
const bankRoutes = read('server/src/modules/quizzes/http/questionBankRoutes.ts');
const quizRoutes = read('server/src/routes/quiz.routes.ts');

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

check('taxonomy declares 22 main skills', () => {
  assert.equal((taxonomy.match(/\bid:\s*"skill_verbal_\d+"/g) || []).length, 22);
  assert.match(taxonomy, /mainSkills:\s*VERBAL_TAXONOMY_V2\.length/);
  assert.match(taxonomy, /VERBAL_TAXONOMY_V2_COUNTS\.mainSkills !== 22/);
});

check('taxonomy declares exactly 95 V2 subskills', () => {
  assert.equal((taxonomy.match(/\bid:\s*"sub_verbal_v2_\d{2}_\d{2}"/g) || []).length, 95);
  assert.match(taxonomy, /VERBAL_TAXONOMY_V2_COUNTS\.subSkills !== 95/);
});

check('learner question surface is explicit Arabic RTL', () => {
  assert.match(quizPage, /data-testid="quiz-current-question"[\s\S]*?dir="rtl"[\s\S]*?lang="ar"/);
  assert.match(quizPage, /verbal-question-text/);
  assert.match(quizPage, /quiz-option-label/);
  assert.match(quizPage, /verbal-option-text/);
  assert.match(quizPage, /fallbackLetter/);
});

check('question blanks are presentation-only and visually emphasized', () => {
  assert.match(html, /formatQuestionHtmlForDisplay/);
  assert.match(html, /question-blank/);
  assert.match(css, /\.question-blank/);
  assert.match(css, /border-bottom:\s*3px solid #2563eb/);
  assert.match(css, /background:\s*#fff7cc/);
});

check('reading passages are stored canonically by passageId', () => {
  assert.match(questionModel, /passageId:/);
  assert.match(passageModel, /canonicalFingerprint/);
  assert.match(passageModel, /QuestionPassage/);
});

check('question and quiz reads hydrate passage references for learners', () => {
  assert.match(bankRoutes, /hydrateQuestionPassages/);
  assert.match(quizRoutes, /hydrateQuestionPassages/);
});

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`\nVerbal foundation V2 contract PASS (${checks.length}/${checks.length}).`);
}
