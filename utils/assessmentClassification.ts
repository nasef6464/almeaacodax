import type { Quiz } from '../types';

export type AssessmentKind = 'normal' | 'mock';
export type NormalAssessmentMode = 'practice' | 'exam';
export type AssessmentDeliveryMode = 'regular' | 'self' | 'directed';

export interface AssessmentClassification {
  /** نوع محتوى الاختبار نفسه. التوجيه وساهر ليسا أنواع Assessment مستقلة. */
  kind: AssessmentKind;
  /** موجود فقط للاختبارات العادية. */
  normalMode?: NormalAssessmentMode;
  /** طريقة/سياق التوزيع الحالي مع الحفاظ على mode القديم للتوافق. */
  deliveryMode: AssessmentDeliveryMode;
  /** القيمة المتوافقة مع نموذج Quiz الحالي. */
  quizKind: NonNullable<Quiz['quizKind']>;
  /** true عندما اضطررنا للاستنتاج من حقول legacy لعدم وجود quizKind صريح. */
  inferredFromLegacy: boolean;
}

/**
 * المصدر القانوني لتفسير نوع الاختبار على الواجهة.
 *
 * قواعد مهمة:
 * - المحاكي الحقيقي = quizKind: mock أو mockExam.enabled=true فقط.
 * - placement: mock و showInMock لا يعنيان محاكيًا حقيقيًا؛ هما حقول legacy للظهور.
 * - mode: central هو directed delivery، وmode: saher هو self delivery.
 * - البيانات القديمة التي لا تملك quizKind تبقى مدعومة بدون Migration فورية.
 */
export const resolveAssessmentClassification = (quiz: Partial<Quiz>): AssessmentClassification => {
  const explicitQuizKind = quiz.quizKind;
  const isTrueMock = explicitQuizKind === 'mock' || quiz.mockExam?.enabled === true;

  let quizKind: NonNullable<Quiz['quizKind']>;
  if (isTrueMock) {
    quizKind = 'mock';
  } else if (explicitQuizKind === 'drill') {
    quizKind = 'drill';
  } else if (explicitQuizKind === 'test') {
    quizKind = 'test';
  } else if (
    quiz.type === 'bank' ||
    quiz.placement === 'training' ||
    (quiz.showInTraining === true && quiz.showInMock === false)
  ) {
    quizKind = 'drill';
  } else {
    // Legacy quiz/placement=mock/both are normal exams unless mockExam.enabled proves otherwise.
    quizKind = 'test';
  }

  const deliveryMode: AssessmentDeliveryMode =
    quiz.mode === 'central' ? 'directed' : quiz.mode === 'saher' ? 'self' : 'regular';

  if (quizKind === 'mock') {
    return {
      kind: 'mock',
      deliveryMode,
      quizKind,
      inferredFromLegacy: explicitQuizKind === undefined,
    };
  }

  return {
    kind: 'normal',
    normalMode: quizKind === 'drill' ? 'practice' : 'exam',
    deliveryMode,
    quizKind,
    inferredFromLegacy: explicitQuizKind === undefined,
  };
};

export const isAssessmentMock = (quiz: Partial<Quiz>) =>
  resolveAssessmentClassification(quiz).kind === 'mock';

export const isAssessmentPractice = (quiz: Partial<Quiz>) => {
  const classification = resolveAssessmentClassification(quiz);
  return classification.kind === 'normal' && classification.normalMode === 'practice';
};

export const isAssessmentExam = (quiz: Partial<Quiz>) => {
  const classification = resolveAssessmentClassification(quiz);
  return classification.kind === 'normal' && classification.normalMode === 'exam';
};

export const resolveCanonicalQuizKind = (quiz: Partial<Quiz>): NonNullable<Quiz['quizKind']> =>
  resolveAssessmentClassification(quiz).quizKind;
