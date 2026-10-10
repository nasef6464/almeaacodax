import type { QuizResult } from '../types';

export type StudentLearningContext = NonNullable<QuizResult['learningContext']>;
export const studentLearningContextLabels: Record<StudentLearningContext, string> = {
  platform_self_study: 'اختبارات المنصة',
  school_assessment: 'اختبارات المدرسة الموجهة',
  legacy_unknown: 'سجل سابق غير مصنف',
};

// School membership and a client-supplied source are not evidence of assignment ownership.
export const studentResultContext = (result: Pick<QuizResult, 'learningContext'>): StudentLearningContext =>
  result.learningContext === 'school_assessment' || result.learningContext === 'platform_self_study'
    ? result.learningContext : 'legacy_unknown';

export const selectStudentContextResults = (results: QuizResult[], context: StudentLearningContext) =>
  results.filter(result => studentResultContext(result) === context);
