import { Question, QuizQuestionReview, QuizSettings } from '../types';
import { normalizeQuestionHtml } from './questionHtml';

type QuestionLike = Pick<Question, 'id'>;
export type QuizQuestionMapState = 'current' | 'answered' | 'review' | 'unanswered' | 'correct' | 'wrong';
export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard' | string | undefined | null;

export const getQuizDifficultyLabel = (difficulty: QuizDifficulty) => {
  if (difficulty === 'Easy') return 'سهل';
  if (difficulty === 'Medium') return 'متوسط';
  if (difficulty === 'Hard') return 'صعب';
  return difficulty || 'عام';
};

export const getQuizDifficultyBadgeClass = (difficulty: QuizDifficulty) => {
  if (difficulty === 'Easy') return 'bg-emerald-100 text-emerald-700';
  if (difficulty === 'Medium') return 'bg-amber-100 text-amber-700';
  if (difficulty === 'Hard') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

export const stripQuestionHtml = (value?: string | null) =>
  normalizeQuestionHtml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const QUIZ_OPTION_LABELS = ['أ', 'ب', 'ج', 'د'] as const;
export const LATIN_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export const getQuizOptionLabel = (index: number) =>
  QUIZ_OPTION_LABELS[index] || String(index + 1);

export const isTahsiliQuestion = (
  question?: {
    examType?: string;
    pathId?: string;
    subjectId?: string;
    subject?: string;
    questionCode?: string;
  } | null,
  quiz?: {
    examType?: string;
    pathId?: string;
    subjectId?: string;
    subject?: string;
  } | null,
) => {
  if (question?.examType === 'tahsili' || quiz?.examType === 'tahsili') return true;
  if (question?.pathId === 'p_1777779653351' || question?.pathId === 'p_tahsili') return true;
  if (quiz?.pathId === 'p_1777779653351' || quiz?.pathId === 'p_tahsili') return true;

  const tahsiliSubjectIds = [
    'sub_1784980706034', // Physics
    'sub_1784980728386', // Chemistry
    'sub_1777784609152', // Math
    'sub_tah_biology_bio26', // Biology
    'sub_physics',
    'sub_chemistry',
    'sub_math',
    'sub_biology',
  ];
  if (question?.subjectId && tahsiliSubjectIds.includes(question.subjectId)) return true;
  if (quiz?.subjectId && tahsiliSubjectIds.includes(quiz.subjectId)) return true;

  const subjectStr = String(question?.subject || quiz?.subject || '').toLowerCase();
  if (
    subjectStr.includes('tahsili') ||
    subjectStr.includes('phys') ||
    subjectStr.includes('chem') ||
    subjectStr.includes('bio') ||
    subjectStr.includes('math')
  ) return true;

  const codeStr = String(question?.questionCode || '').toUpperCase();
  if (
    codeStr.startsWith('TAH-') ||
    codeStr.includes('PHYS') ||
    codeStr.includes('CHEM') ||
    codeStr.includes('BIO') ||
    codeStr.includes('MATH')
  ) return true;

  return false;
};

export const usesImageEmbeddedOptions = (question?: {
  imageUrl?: string;
  optionsEmbeddedInImage?: boolean;
  options?: unknown[];
  examType?: string;
  pathId?: string;
  subjectId?: string;
  subject?: string;
  questionCode?: string;
} | null) => {
  if (!question?.imageUrl || !String(question.imageUrl).trim()) return false;
  if (question.optionsEmbeddedInImage === true) return true;

  // In all Tahsili subjects, questions with images embed the question stem and options
  if (isTahsiliQuestion(question)) return true;

  const opts = Array.isArray(question.options) ? question.options : [];
  if (opts.length === 0) return true;

  const isAllLettersOrEmpty = opts.every((opt) => {
    if (typeof opt === 'string') {
      const clean = stripQuestionHtml(opt);
      return clean === '' || /^[أ-يA-Za-z]$/.test(clean);
    }
    return false;
  });
  if (isAllLettersOrEmpty) return true;

  return question.optionsEmbeddedInImage !== false;
};

export const getLearnerOptionLabel = (
  question: {
    imageUrl?: string;
    optionsEmbeddedInImage?: boolean;
    examType?: string;
    pathId?: string;
    subjectId?: string;
    subject?: string;
    questionCode?: string;
    options?: unknown[];
  },
  option: unknown,
  index: number,
  quiz?: {
    examType?: string;
    pathId?: string;
    subjectId?: string;
    subject?: string;
  } | null,
) => {
  // All Tahsili subjects strictly use Latin A, B, C, D
  const isLatin = isTahsiliQuestion(question, quiz) ||
    (Array.isArray(question?.options) && question.options.some((opt) => typeof opt === 'string' && /^[A-D]$/i.test(opt.trim())));

  if (isLatin) {
    return LATIN_OPTION_LABELS[index] || String.fromCharCode(65 + index);
  }

  if (typeof option === 'string' && /^[A-D]$/i.test(option.trim())) {
    return option.trim().toUpperCase();
  }

  if (usesImageEmbeddedOptions(question)) {
    return getQuizOptionLabel(index);
  }
  if (typeof option === 'string') {
    const normalized = stripQuestionHtml(option);
    return normalized && normalized !== '[object Object]'
      ? normalized
      : getQuizOptionLabel(index);
  }
  return getQuizOptionLabel(index);
};

export const getQuizOptionGridClass = (
  options: Array<string | undefined> = [],
  optionLayout: QuizSettings['optionLayout'] = 'auto',
) => {
  const longestOptionLength = options.reduce(
    (max, option) => Math.max(max, stripQuestionHtml(option).length),
    0,
  );

  if (optionLayout === 'two_columns' && longestOptionLength > 72) return 'grid-cols-1 sm:grid-cols-2';
  if (optionLayout === 'horizontal') {
    if (options.length <= 4 && longestOptionLength <= 42) return 'grid-cols-2 sm:grid-cols-4';
    if (longestOptionLength > 72) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-4';
  }

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

  if (optionLayout === 'horizontal' && longestOptionLength <= 42) {
    return 'min-h-[26px] sm:min-h-[30px]';
  }

  return 'min-h-[28px] sm:min-h-[32px]';
};

export const getQuizQuestionMapButtonClass = (
  state: QuizQuestionMapState,
  isNightMode = false,
) => {
  if (state === 'current') {
    return isNightMode
      ? 'border-amber-300 bg-amber-500 text-white shadow-sm ring-2 ring-amber-900/60'
      : 'border-amber-600 bg-amber-500 text-white shadow-sm ring-2 ring-amber-200';
  }

  if (state === 'answered' || state === 'correct') {
    return isNightMode
      ? 'border-emerald-300 bg-emerald-500 text-white shadow-sm'
      : 'border-emerald-600 bg-emerald-500 text-white shadow-sm';
  }

  if (state === 'review') {
    return isNightMode
      ? 'border-purple-300 bg-purple-600 text-white shadow-sm shadow-purple-950/30'
      : 'border-purple-600 bg-purple-500 text-white shadow-sm';
  }

  if (state === 'wrong') {
    return isNightMode
      ? 'border-rose-300 bg-rose-500 text-white shadow-sm'
      : 'border-rose-600 bg-rose-500 text-white shadow-sm';
  }

  return isNightMode
    ? 'border-slate-600 bg-slate-950 text-slate-300 hover:border-amber-400 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50';
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
): QuizQuestionReview => {
  const selectedOptionIndex = savedReview?.selectedOptionIndex;

  return {
    questionId: savedReview?.questionId || sourceQuestion.id,
    text: savedReview?.text || sourceQuestion.text,
    options: savedReview?.options?.length ? savedReview.options : sourceQuestion.options,
    selectedOptionIndex,
    explanation: savedReview?.explanation,
    hint: savedReview?.hint,
    solvingStrategy: savedReview?.solvingStrategy,
    videoUrl: savedReview?.videoUrl || sourceQuestion.videoUrl,
    imageUrl: savedReview?.imageUrl || sourceQuestion.imageUrl,
    imageAlt: savedReview?.imageAlt || sourceQuestion.imageAlt,
    optionsEmbeddedInImage:
      typeof savedReview?.optionsEmbeddedInImage === 'boolean'
        ? savedReview.optionsEmbeddedInImage
        : sourceQuestion.optionsEmbeddedInImage,
    aiContext: savedReview?.aiContext,
    voiceExplanation: savedReview?.voiceExplanation || sourceQuestion.voiceExplanation,
    sourceMeta: savedReview?.sourceMeta || sourceQuestion.sourceMeta,
    isCorrect:
      typeof savedReview?.isCorrect === 'boolean'
        ? savedReview.isCorrect
        : false,
  };
};
