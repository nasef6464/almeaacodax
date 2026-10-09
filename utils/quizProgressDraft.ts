export const QUIZ_PAGE_PROGRESS_PREFIX = 'almeaa-quiz-progress:';

export interface SavedQuizPageProgress {
  quizId: string;
  questionIds: string[];
  selectedOptions: Record<string, number>;
  currentQuestionIndex: number;
  timeLeft: number | null;
  savedAt: string;
  flaggedQuestionIds?: string[];
  strictSectionDeadlines?: Record<string, number>;
  lockedSectionIds?: string[];
}

// Deadlines survive reload without giving a started section its full time again.
// Old drafts have no such fields and retain their existing first-start behavior.
export const restoreStrictSectionProgress = (
  draft: SavedQuizPageProgress | null,
  sections: Array<{ id: string; timeLimit?: number }>,
  now = Date.now(),
) => {
  const deadlines: Record<string, number> = {};
  const allowedIds = new Set(sections.map((section) => section.id));
  for (const section of sections) {
    const deadline = draft?.strictSectionDeadlines?.[section.id];
    if (typeof deadline === 'number' && Number.isFinite(deadline) && deadline > 0 && section.timeLimit && section.timeLimit > 0) {
      deadlines[section.id] = Math.min(deadline, now + section.timeLimit * 60_000);
    }
  }
  const lockedIds = new Set<string>(
    (Array.isArray(draft?.lockedSectionIds) ? draft.lockedSectionIds : [])
      .filter((id) => typeof id === 'string' && allowedIds.has(id)),
  );
  return { deadlines, lockedIds };
};

export const getSectionDeadlineSeconds = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

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
