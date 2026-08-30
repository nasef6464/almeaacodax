export const QUIZ_PAGE_PROGRESS_PREFIX = 'almeaa-quiz-progress:';

export interface SavedQuizPageProgress {
  quizId: string;
  questionIds: string[];
  selectedOptions: Record<string, number>;
  currentQuestionIndex: number;
  timeLeft: number | null;
  savedAt: string;
}

export const getQuizProgressStorageKey = (quizId: string) => `${QUIZ_PAGE_PROGRESS_PREFIX}${quizId}`;

export const readQuizProgressDraft = (quizId: string): SavedQuizPageProgress | null => {
  if (typeof window === 'undefined') return null;

  const storageKey = getQuizProgressStorageKey(quizId);
  try {
    const rawProgress = window.localStorage.getItem(storageKey);
    return rawProgress ? (JSON.parse(rawProgress) as SavedQuizPageProgress) : null;
  } catch (error) {
    console.warn('Unable to restore quiz progress draft:', error);
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

export const writeQuizProgressDraft = (draft: SavedQuizPageProgress) => {
  if (typeof window === 'undefined') return false;
  window.localStorage.setItem(getQuizProgressStorageKey(draft.quizId), JSON.stringify(draft));
  return true;
};

export const removeQuizProgressDraft = (quizId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getQuizProgressStorageKey(quizId));
};
