import { Question, QuizQuestionReview, QuizSettings } from '../types';
import { normalizeQuestionHtml } from './questionHtml';

type QuestionLike = Pick<Question, 'id'>;

export const stripQuestionHtml = (value?: string | null) =>
  normalizeQuestionHtml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getQuizOptionGridClass = (
  options: Array<string | undefined> = [],
  optionLayout: QuizSettings['optionLayout'] = 'auto',
) => {
  const longestOptionLength = options.reduce(
    (max, option) => Math.max(max, stripQuestionHtml(option).length),
    0,
  );

  if (optionLayout === 'two_columns' && longestOptionLength > 72) return 'grid-cols-1 sm:grid-cols-2';
  if (optionLayout === 'horizontal') return 'grid-cols-2 sm:grid-cols-4';

  return longestOptionLength > 72 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4';
};

export const getQuizOptionButtonHeightClass = (
  options: Array<string | undefined> = [],
  optionLayout: QuizSettings['optionLayout'] = 'auto',
) => {
  const longestOptionLength = options.reduce(
    (max, option) => Math.max(max, stripQuestionHtml(option).length),
    0,
  );

  if (optionLayout === 'two_columns' || longestOptionLength > 72) {
    return 'min-h-[44px] sm:min-h-[50px]';
  }

  return 'min-h-[34px] sm:min-h-[38px]';
};

export const resolveQuestionFromBank = <T extends QuestionLike>(
  questionBank: T[],
  questionId: string | number,
) => {
  const normalizedId = String(questionId || '');
  const exact = questionBank.find((question) => String(question.id) === normalizedId);
  if (exact) return exact;

  const withoutCopySuffix = normalizedId.replace(/_copy(?:_\d+)?$/i, '');
  if (withoutCopySuffix && withoutCopySuffix !== normalizedId) {
    return questionBank.find((question) => String(question.id) === withoutCopySuffix);
  }

  return undefined;
};

export const toQuestionReviewFromBank = (
  sourceQuestion: Question,
  savedReview?: QuizQuestionReview,
): QuizQuestionReview => ({
  questionId: savedReview?.questionId || sourceQuestion.id,
  text: savedReview?.text || sourceQuestion.text,
  options: savedReview?.options?.length ? savedReview.options : sourceQuestion.options,
  correctOptionIndex:
    typeof savedReview?.correctOptionIndex === 'number'
      ? savedReview.correctOptionIndex
      : sourceQuestion.correctOptionIndex,
  selectedOptionIndex: savedReview?.selectedOptionIndex,
  explanation: savedReview?.explanation || sourceQuestion.explanation,
  videoUrl: savedReview?.videoUrl || sourceQuestion.videoUrl,
  imageUrl: savedReview?.imageUrl || sourceQuestion.imageUrl,
  isCorrect: savedReview?.isCorrect === true,
});
