import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript/lib/typescript.js');
const source = fs.readFileSync(path.join(root, 'utils/quizBuilderDraft.ts'), 'utf8');
const manager = fs.readFileSync(path.join(root, 'dashboards/admin/QuizzesManager.tsx'), 'utf8');
const classroom = fs.readFileSync(path.join(root, 'pages/ClassroomStudentLive.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const storage = new Map();
const fakeWindow = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};
const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports, window: fakeWindow }, { filename: 'quizBuilderDraft.js' });
const { getQuizBuilderDraftKey, readQuizBuilderDraft, writeQuizBuilderDraft, removeQuizBuilderDraft } = module.exports;

const draft = {
  version: 1,
  step: 3,
  kind: 'mock',
  title: 'اختبار استعادة كامل',
  description: 'يبقى بعد التحديث',
  pathId: 'path-1',
  subjectId: 'subject-1',
  questionIds: ['q1', 'q2'],
  qiyasCategory: 'tahsili',
  presentationMode: 'flexible',
  mockSections: [{ id: 'section-1', title: 'قسم 1', subjectId: 'subject-1', questionIds: ['q1'], timeLimit: 25, order: 0, domain: 'math' }],
  activeSectionIdx: 0,
  timeLimit: 40,
  maxAttempts: 2,
  passingScore: 70,
  showAnswers: false,
  showExplanations: true,
  shuffleQuestions: true,
  shuffleOptions: true,
  targetGroupIds: ['group-1'],
  dueDate: '2026-12-01',
  isPublished: false,
  showOnPlatform: false,
  accessType: 'paid',
  price: 30,
  slots: ['tests', 'training'],
  savedAt: '2026-09-14T00:00:00.000Z',
};
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('draft key is scoped, so creators do not overwrite one another', () => {
  assert.equal(getQuizBuilderDraftKey('create:teacher:quizzes:regular'), 'almeaa-quiz-builder-draft:create:teacher:quizzes:regular');
});
check('builder draft round-trips every author-controlled field', () => {
  assert.equal(writeQuizBuilderDraft('scope-a', draft), true);
  assert.equal(JSON.stringify(readQuizBuilderDraft('scope-a')), JSON.stringify(draft));
});
check('invalid draft data is rejected without breaking the builder', () => {
  storage.set(getQuizBuilderDraftKey('broken'), '{bad-json');
  assert.equal(readQuizBuilderDraft('broken'), null);
  assert.equal(storage.has(getQuizBuilderDraftKey('broken')), false);
});
check('successful save removes only its corresponding draft', () => {
  writeQuizBuilderDraft('scope-b', draft);
  removeQuizBuilderDraft('scope-a');
  assert.equal(readQuizBuilderDraft('scope-a'), null);
  assert.equal(readQuizBuilderDraft('scope-b')?.title, draft.title);
});
check('quiz builder uses route-backed create/edit state and route-backed wizard step', () => {
  assert.ok(manager.includes("params.set('builder', builder)"));
  assert.ok(manager.includes("params.set('quizId', options.quizId)"));
  assert.ok(manager.includes("params.set('builderStep', String(options.step))"));
  assert.ok(manager.includes("params.set('builderMode', options.mode)"));
  assert.ok(manager.includes('React.useEffect(() => {\n    const params = new URLSearchParams(location.search);'));
  assert.ok(manager.includes("initialManagerParams.get('quizView')"));
});
check('student classroom refresh re-establishes server-authorized participation', () => {
  assert.ok(classroom.includes('api.instantJoinClassroomSession(sessionId)'));
  assert.ok(classroom.includes("sessionStorage.setItem('classroom_joined', 'true')"));
  assert.ok(classroom.includes('await loadCurrent()'));
});
check('classroom is private in metadata and Vercel response headers', () => {
  assert.ok(app.includes("  '/classroom',"));
  assert.ok(app.includes("title: 'الحصة الذكية المباشرة | منصة المئة'"));
  const privateRouteHeader = vercel.headers.find((entry) => String(entry.source || '').includes('classroom'));
  assert.ok(privateRouteHeader);
  assert.equal(privateRouteHeader.headers.find((header) => header.key === 'X-Robots-Tag')?.value, 'noindex, nofollow');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'performance-p1', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
