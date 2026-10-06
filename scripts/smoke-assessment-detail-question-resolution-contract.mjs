import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript/lib/typescript.js');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const routeSource = read('server/src/routes/quiz.routes.ts');
const selectionSource = read('server/src/modules/quizzes/application/quizQuestionSelection.ts');
const transpiledSelection = ts.transpileModule(selectionSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const selectionModule = { exports: {} };
vm.runInNewContext(transpiledSelection, {
  module: selectionModule,
  exports: selectionModule.exports,
  require: (id) => {
    if (id === '../../../models/Question.js') return { QuestionModel: {} };
    throw new Error(`Unexpected runtime dependency: ${id}`);
  },
}, { filename: 'quizQuestionSelection.js' });

const { getQuizQuestionIds } = selectionModule.exports;
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('quiz detail uses the shared question-ID resolver', () => {
  assert.ok(routeSource.includes('const questionIds = getQuizQuestionIds(quiz);'));
});

check('normal quiz keeps root question order and removes duplicates', () => {
  assert.equal(JSON.stringify(getQuizQuestionIds({ questionIds: ['q-1', 'q-2', 'q-1'] })), JSON.stringify(['q-1', 'q-2']));
});

check('mock quiz resolves section question IDs when root IDs are empty', () => {
  assert.equal(JSON.stringify(getQuizQuestionIds({
    questionIds: [],
    mockExam: {
      enabled: true,
      sections: [{ questionIds: ['q-a', 'q-b'] }, { questionIds: ['q-b', 'q-c'] }],
    },
  })), JSON.stringify(['q-a', 'q-b', 'q-c']));
});

check('mock sections remain the source of truth over legacy root IDs', () => {
  assert.equal(JSON.stringify(getQuizQuestionIds({
    questionIds: ['legacy-root'],
    mockExam: { enabled: true, sections: [{ questionIds: ['section-question'] }] },
  })), JSON.stringify(['section-question']));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-detail-question-resolution', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
