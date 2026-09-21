const QUIZ_RESULTS_CACHE_TTL_MS = 5 * 1000;
const QUIZ_RESULTS_CACHE_MAX_ENTRIES = 300;

const quizResultsCache = new Map<
  string,
  {
    expiresAt: number;
    payload: unknown;
  }
>();

export const clearQuizResultsCache = () => {
  quizResultsCache.clear();
};

export const getCachedQuizResults = (key: string) => {
  const cached = quizResultsCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    quizResultsCache.delete(key);
    return undefined;
  }
  return cached.payload;
};

export const setCachedQuizResults = (key: string, payload: unknown) => {
  quizResultsCache.set(key, {
    expiresAt: Date.now() + QUIZ_RESULTS_CACHE_TTL_MS,
    payload,
  });
  if (quizResultsCache.size <= QUIZ_RESULTS_CACHE_MAX_ENTRIES) return;
  const firstKey = quizResultsCache.keys().next().value;
  if (firstKey) quizResultsCache.delete(firstKey);
};
