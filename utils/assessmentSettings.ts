export type AssessmentOptionLayout = 'auto' | 'horizontal' | 'two_columns';

export interface CanonicalAssessmentSettings {
  showExplanations: boolean;
  showAnswers: boolean;
  showResultsReport?: boolean;
  returnToSourceOnFinish?: boolean;
  maxAttempts: number;
  passingScore: number;
  timeLimit?: number;
  randomizeQuestions?: boolean;
  /** Canonical name. `shuffleOptions` is legacy read compatibility only. */
  randomizeOptions?: boolean;
  showProgressBar?: boolean;
  requireAnswerBeforeNext?: boolean;
  allowQuestionReview?: boolean;
  optionLayout?: AssessmentOptionLayout;
}

export type LegacyAssessmentSettings = Partial<CanonicalAssessmentSettings> & {
  showCorrectAnswers?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};

const pickBoolean = (...values: Array<boolean | undefined>) =>
  values.find((value): value is boolean => typeof value === 'boolean');

/**
 * يحول settings القديمة/الحديثة إلى عقد واحد للقراءة.
 *
 * precedence:
 * canonical field > legacy alias > supplied defaults.
 *
 * هذه الدالة لا تقوم بMigration ولا تحذف legacy data؛ هدفها منع اختلاف السلوك
 * بين الشاشات أثناء الانتقال التدريجي.
 */
export const resolveAssessmentSettings = (
  input: LegacyAssessmentSettings | null | undefined,
  defaults: CanonicalAssessmentSettings,
): CanonicalAssessmentSettings => {
  const source = input || {};

  return {
    ...defaults,
    ...source,
    showExplanations: pickBoolean(source.showExplanations, defaults.showExplanations) ?? true,
    showAnswers: pickBoolean(source.showAnswers, source.showCorrectAnswers, defaults.showAnswers) ?? true,
    showResultsReport: pickBoolean(source.showResultsReport, defaults.showResultsReport),
    returnToSourceOnFinish: pickBoolean(source.returnToSourceOnFinish, defaults.returnToSourceOnFinish),
    maxAttempts: Number.isFinite(Number(source.maxAttempts)) ? Number(source.maxAttempts) : defaults.maxAttempts,
    passingScore: Number.isFinite(Number(source.passingScore)) ? Number(source.passingScore) : defaults.passingScore,
    timeLimit: Number.isFinite(Number(source.timeLimit)) ? Number(source.timeLimit) : defaults.timeLimit,
    randomizeQuestions: pickBoolean(
      source.randomizeQuestions,
      source.shuffleQuestions,
      defaults.randomizeQuestions,
    ),
    randomizeOptions: pickBoolean(
      source.randomizeOptions,
      source.shuffleOptions,
      defaults.randomizeOptions,
    ),
    showProgressBar: pickBoolean(source.showProgressBar, defaults.showProgressBar),
    requireAnswerBeforeNext: pickBoolean(source.requireAnswerBeforeNext, defaults.requireAnswerBeforeNext),
    allowQuestionReview: pickBoolean(source.allowQuestionReview, defaults.allowQuestionReview),
    optionLayout: source.optionLayout ?? defaults.optionLayout,
  };
};

/**
 * Payload قانوني للكتابة الجديدة. لا ينسخ legacy aliases إلى المصدر الجديد.
 */
export const toCanonicalAssessmentSettingsPayload = (
  input: LegacyAssessmentSettings | null | undefined,
  defaults: CanonicalAssessmentSettings,
): CanonicalAssessmentSettings => {
  const resolved = resolveAssessmentSettings(input, defaults);
  return {
    showExplanations: resolved.showExplanations,
    showAnswers: resolved.showAnswers,
    showResultsReport: resolved.showResultsReport,
    returnToSourceOnFinish: resolved.returnToSourceOnFinish,
    maxAttempts: resolved.maxAttempts,
    passingScore: resolved.passingScore,
    timeLimit: resolved.timeLimit,
    randomizeQuestions: resolved.randomizeQuestions,
    randomizeOptions: resolved.randomizeOptions,
    showProgressBar: resolved.showProgressBar,
    requireAnswerBeforeNext: resolved.requireAnswerBeforeNext,
    allowQuestionReview: resolved.allowQuestionReview,
    optionLayout: resolved.optionLayout,
  };
};
