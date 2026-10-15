import { QuestionModel } from '../../../models/Question.js';
import { QuestionRevisionModel } from '../../../models/QuestionRevision.js';
import { QuizModel } from '../../../models/Quiz.js';
import { AssessmentVersionModel } from '../infrastructure/assessmentVersionModel.js';
import { buildDocumentsByIdsQuery } from '../infrastructure/quizDocumentQuery.js';
import { ensureQuestionRevisions } from '../../../services/questionRevision.js';
import { getQuizQuestionIds } from './quizQuestionSelection.js';
import { hydrateQuestionPassages } from './questionPassageHydration.js';
import { resolveOrderedQuizQuestions } from './quizSubmissionQuestions.js';
import { getCanonicalQuestionSkillIds } from './quizSubmissionReadModelContext.js';
import { schoolAssessmentContentLocked } from './schoolAssessmentEditing.js';

const directed = (quiz: any) => quiz.mode === 'central' || quiz.targetGroupIds?.length || quiz.targetUserIds?.length;
const fail = (message: string): never => { throw Object.assign(new Error(message), { statusCode: 409 }); };
const presentationKeys = ['passage','passageId','passageTitle','hint','solvingStrategy','aiContext','sourceMeta','skillId','subSkillId','subSkillIds','difficulty','type','subject','examType','source','year'];

// Reference the existing immutable revision store; only absent presentation fields
// are supplemented here. No historical questions or outcomes are rewritten.
export async function freezeSchoolAssessmentQuestions(definition: any, previous: any) {
  if (!directed(definition)) return definition;
  if (previous?.schoolQuestionEvidence) return { ...definition, schoolQuestionEvidence: previous.schoolQuestionEvidence };
  // Existing published definitions without evidence remain legacy. Never pretend
  // today's bank is the question originally served to an earlier learner.
  if (previous) return definition;
  const questionIds = getQuizQuestionIds(definition);
  const raw = await QuestionModel.find(buildDocumentsByIdsQuery(questionIds)).lean();
  const hydrated = await hydrateQuestionPassages(raw as any[]);
  const questions = resolveOrderedQuizQuestions(questionIds, hydrated).map(q => ({ ...q, skillIds: getCanonicalQuestionSkillIds(q) }));
  if (questions.length !== questionIds.length) fail('تعذر حفظ أسئلة الاختبار؛ راجع الأسئلة المفقودة قبل النشر.');
  const revisions = await ensureQuestionRevisions(questions);
  return { ...definition, schoolQuestionEvidence: { format: 1, questionIds, questions: questions.map((q, index) => ({
    questionId: questionIds[index], revisionId: revisions.get(String(q.id || q._id))!.revisionId,
    presentation: Object.fromEntries(presentationKeys.filter(key => q[key] !== undefined).map(key => [key, q[key]])),
  })) } };
}

export async function readSchoolAssessmentQuestions(quiz: any, suppliedVersion?: any) {
  const version = suppliedVersion === undefined
    ? await AssessmentVersionModel.findOne({ assessmentId: String(quiz.id || quiz._id), status: 'published' }).sort({ version: -1 }).lean()
    : suppliedVersion;
  const evidence = (version?.definition as any)?.schoolQuestionEvidence;
  if (!evidence) {
    const raw = await QuestionModel.find(buildDocumentsByIdsQuery(getQuizQuestionIds(quiz))).lean();
    return hydrateQuestionPassages(raw as any[]);
  }
  const ids = getQuizQuestionIds(quiz);
  if (evidence.format !== 1 || !Array.isArray(evidence.questions) ||
      JSON.stringify(evidence.questionIds) !== JSON.stringify(ids) || evidence.questions.length !== ids.length)
    fail('تعذر التحقق من نسخة أسئلة الاختبار المحفوظة.');
  const revisions = await QuestionRevisionModel.find({ _id: { $in: evidence.questions.map((q: any) => q.revisionId) } }).lean();
  const byId = new Map(revisions.map(q => [String(q._id), q]));
  return evidence.questions.map((entry: any, index: number) => {
    const revision = byId.get(String(entry.revisionId));
    if (!revision?.snapshot || entry.questionId !== ids[index]) fail('نسخة أحد أسئلة الاختبار غير متاحة.');
    const snapshot = revision!.snapshot as any;
    return { ...entry.presentation, ...snapshot, id: entry.questionId, _id: entry.questionId };
  });
}

export async function assertSchoolQuestionBankWrite(question: any, deleting = false) {
  const ids = [...new Set([question.id, question._id].filter(Boolean).map(String))];
  const aliases = ids.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).map(id => new RegExp('^' + id + '(?:_copy(?:_\\d+)?)?$'));
  const cursor = QuizModel.find({ $or: [{ questionIds: { $in: aliases } }, { 'mockExam.sections.questionIds': { $in: aliases } }] }).lean().cursor({ batchSize: 100 });
  for await (const quiz of cursor) {
    if (!directed(quiz) || !(await schoolAssessmentContentLocked(quiz))) continue;
    const version = await AssessmentVersionModel.findOne({ assessmentId: String(quiz.id || quiz._id), status: 'published' }).sort({ version: -1 }).lean();
    if (deleting || !(version?.definition as any)?.schoolQuestionEvidence)
      fail('السؤال مرتبط باختبار مدرسي منشور أو بدأه الطلاب؛ احتفظ به وأنشئ سؤالًا جديدًا للتعديل.');
  }
}
