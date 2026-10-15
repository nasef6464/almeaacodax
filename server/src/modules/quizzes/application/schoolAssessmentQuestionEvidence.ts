import { QuizModel } from '../../../models/Quiz.js';
import { schoolAssessmentContentLocked } from './schoolAssessmentEditing.js';

// Bank corrections remain live in published and active exams. Destructive
// removal must not silently cascade away a published question reference.
export async function assertSchoolQuestionBankWrite(question: any, deleting = false) {
  if (!deleting) return;
  const ids = [...new Set([question.id, question._id].filter(Boolean).map(String))];
  const aliases = ids.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).map(id => new RegExp('^' + id + '(?:_copy(?:_\\d+)?)?$'));
  const cursor = QuizModel.find({ $or: [{ questionIds: { $in: aliases } }, { 'mockExam.sections.questionIds': { $in: aliases } }] }).lean().cursor({ batchSize: 100 });
  for await (const quiz of cursor) {
    const directed = quiz.mode === 'central' || quiz.targetGroupIds?.length || quiz.targetUserIds?.length;
    if (directed && await schoolAssessmentContentLocked(quiz))
      throw Object.assign(new Error('السؤال مرتبط باختبار مدرسي منشور أو بدأه الطلاب؛ صحح السؤال بدل حذفه.'), { statusCode: 409 });
  }
}
