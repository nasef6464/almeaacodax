import { Quiz } from '../types';
import {
  isAssessmentMock,
  isAssessmentPractice,
  resolveCanonicalQuizKind,
} from './assessmentClassification';

type QuizPlacementSource = Pick<Quiz, 'type' | 'placement' | 'showInTraining' | 'showInMock'>;

export const getQuizPlacementDefaults = (type: Quiz['type'] = 'quiz') => {
  const isTraining = type === 'bank';

  return {
    type,
    placement: isTraining ? 'training' : 'mock',
    showInTraining: isTraining,
    showInMock: !isTraining,
  } satisfies Pick<Quiz, 'type' | 'placement' | 'showInTraining' | 'showInMock'>;
};

export const isTrainingQuiz = (quiz: QuizPlacementSource) => {
  if (typeof quiz.showInTraining === 'boolean') return quiz.showInTraining;
  if (quiz.placement) return quiz.placement === 'training' || quiz.placement === 'both';
  return quiz.type === 'bank';
};

/**
 * Legacy placement visibility helper.
 *
 * IMPORTANT: هذا لا يعني أن الاختبار محاكي حقيقي. الاسم محفوظ للتوافق مع
 * الاستدعاءات القديمة التي تقصد "يظهر في مساحة الاختبارات".
 * استخدم isTrueMockExam/resolveAssessmentClassification لتحديد المحاكي الحقيقي.
 */
export const isMockQuiz = (quiz: QuizPlacementSource) => {
  if (typeof quiz.showInMock === 'boolean') return quiz.showInMock;
  if (quiz.placement) return quiz.placement === 'mock' || quiz.placement === 'both';
  return (quiz.type || 'quiz') === 'quiz';
};

/**
 * يحدد ما إذا كان الاختبار محاكيًا حقيقيًا (على غرار قياس) بأقسام.
 * المصدر القانوني الآن هو assessmentClassification.ts.
 */
export const isTrueMockExam = (quiz: Partial<Quiz>) => isAssessmentMock(quiz);

export const isDrill = (quiz: Partial<Quiz>) => isAssessmentPractice(quiz);

/**
 * يستنتج quizKind من الحقول القديمة للاختبارات التي لا تملك quizKind صريحاً.
 * يستخدم للتوافق العكسي عند فتح اختبارات قديمة في UnifiedQuizBuilder.
 */
export const inferQuizKind = (quiz: Partial<Quiz>): NonNullable<Quiz['quizKind']> =>
  resolveCanonicalQuizKind(quiz);

export const getQuizPlacementLabel = (quiz: QuizPlacementSource) => {
  const training = isTrainingQuiz(quiz);
  const mock = isMockQuiz(quiz);

  if (training && mock) return 'تدريب واختبار';
  if (training) return 'تدريب';
  if (mock) return 'اختبار';
  return 'مخزن فقط';
};

export const getPlacementFromFlags = (quiz: QuizPlacementSource): Quiz['placement'] => {
  const training = isTrainingQuiz(quiz);
  const mock = isMockQuiz(quiz);

  if (training && mock) return 'both';
  if (training) return 'training';
  return 'mock';
};

export const normalizeQuizPlacement = <T extends Partial<Quiz>>(quiz: T, fallbackType: Quiz['type'] = 'quiz'): T => {
  // أولويًا: استنتاج من quizKind إن وُجد (المصدر الحديث من UnifiedQuizBuilder)
  const qk = quiz.quizKind;
  if (qk === 'mock') {
    return {
      ...quiz,
      type: 'quiz' as Quiz['type'],
      placement: 'mock' as Quiz['placement'],
      showInTraining: false,
      showInMock: true,
      mockExam: { ...(quiz.mockExam || {}), enabled: true } as Quiz['mockExam'],
    };
  }
  if (qk === 'drill') {
    return {
      ...quiz,
      type: 'bank' as Quiz['type'],
      placement: 'training' as Quiz['placement'],
      showInTraining: true,
      showInMock: false,
    };
  }
  if (qk === 'test') {
    return {
      ...quiz,
      type: 'quiz' as Quiz['type'],
      placement: 'both' as Quiz['placement'],
      showInTraining: true,
      showInMock: true,
    };
  }

  // fallback: الاستنتاج من الحقول القديمة (placement/type/showInTraining/showInMock)
  const inferredType = quiz.type || fallbackType;
  const showInTraining =
    typeof quiz.showInTraining === 'boolean'
      ? quiz.showInTraining
      : quiz.placement
        ? quiz.placement === 'training' || quiz.placement === 'both'
        : inferredType === 'bank';
  const showInMock =
    typeof quiz.showInMock === 'boolean'
      ? quiz.showInMock
      : quiz.placement
        ? quiz.placement === 'mock' || quiz.placement === 'both'
        : inferredType !== 'bank';
  const placement = showInTraining && showInMock ? 'both' : showInTraining ? 'training' : 'mock';

  return {
    ...quiz,
    type: showInTraining && !showInMock ? 'bank' : 'quiz',
    placement,
    showInTraining,
    showInMock,
  };
};
