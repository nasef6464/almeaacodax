import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/QuestionBankManager.tsx');
const aiApi = read('services/apiGroups/aiApi.ts');
const aiRoutes = read('server/src/routes/ai.routes.ts');

const checks = [];

const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

const includes = (source, fragment) => {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
};

const excludes = (source, fragment) => {
  if (source.includes(fragment)) throw new Error(`Unexpected fragment: ${fragment}`);
};

check('question bank does not advertise the removed fake file/PDF AI action', () => {
  excludes(manager, "alert('تم رفع الملف بنجاح.. جاري استخراج الأسئلة وتصنيفها آلياً!')");
  excludes(manager, 'توليد ذكي من ملف (AI)');
  excludes(manager, 'توليدها تلقائياً من الملازم وملفات PDF باستخدام الذكاء الاصطناعي');
});

check('question bank uses the existing authorized AI question API', () => {
  includes(aiApi, 'aiQuestion: (payload: { topic: string }');
  includes(aiApi, '"/ai/question"');
  includes(aiRoutes, 'requireRole(["admin", "teacher", "supervisor"])');
  includes(manager, 'await api.aiQuestion({ topic }) as AiQuestionDraft');
});

check('AI generation is review-first and never auto-persists the generated payload', () => {
  includes(manager, 'data-testid="question-bank-ai-topic"');
  includes(manager, 'data-testid="question-bank-ai-generate"');
  includes(manager, "approvalStatus: user.role === 'admin' ? 'draft' : 'pending_review'");
  includes(manager, 'setCurrentQuestion({');
  includes(manager, 'setIsEditing(true);');

  const handlerStart = manager.indexOf('const handleGenerateAiQuestion = async () => {');
  const handlerEnd = manager.indexOf('const handleImportQuestions = async', handlerStart);
  if (handlerStart < 0 || handlerEnd < 0) throw new Error('AI generation handler boundaries not found');
  const handler = manager.slice(handlerStart, handlerEnd);
  excludes(handler, 'addQuestion(');
  excludes(handler, 'updateQuestion(');
});

check('AI draft inherits only the selected taxonomy context', () => {
  includes(manager, "const activeSubjectId = subjectId || selectedSubjectId;");
  includes(manager, "pathId: selectedPathId || selectedSubject.pathId || ''");
  includes(manager, 'subject: selectedSubject.id');
  includes(manager, "sectionId: selectedSectionId || ''");
  includes(manager, 'skillIds: selectedSkillId ? [selectedSkillId] : []');
});

check('malformed provider output is rejected before opening the editor', () => {
  includes(manager, 'options.length < 2');
  includes(manager, '!Number.isInteger(correctOptionIndex)');
  includes(manager, 'correctOptionIndex >= options.length');
  includes(manager, 'مزود الذكاء الاصطناعي لم يرجع سؤالًا صالحًا للمراجعة');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'gate6-question-ai-authoring',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
