import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { QuizResult } from '../types';

/** Fetch one owned result on demand, including attempts outside bootstrap history. */
export const useStudentResultDetail = (listed: QuizResult | undefined, listedId: string, requested: string | null, userId: string) => {
  const resultId = listedId || (/^[a-f\d]{24}$/i.test(requested || '') ? requested! : '');
  const reviewCount = listed?.questionReview?.length || 0;
  const key = `${userId}:${resultId}:${reviewCount}`;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; result?: QuizResult; loading: boolean; error: string }>({ key: '', loading: false, error: '' });
  const shouldRead = !!resultId && !reviewCount && !!userId && userId !== 'guest';
  useEffect(() => {
    let active = true;
    setState({ key, loading: shouldRead, error: '' });
    if (shouldRead) void api.getQuizResultDetails(resultId).then(response => {
      if (!active) return;
      if (!response?.result) throw new Error('Missing result');
      setState({ key, result: response.result as QuizResult, loading: false, error: '' });
    }).catch(() => {
      if (active) setState({ key, loading: false, error: 'تعذر فتح هذه النتيجة. حاول مرة أخرى.' });
    });
    return () => { active = false; };
  }, [key, resultId, retry, shouldRead]);
  const visible = state.key === key ? state : { loading: shouldRead, error: '', result: undefined };
  const result = useMemo(() => visible.result ? { ...listed, ...visible.result } : listed, [listed, visible.result]);
  return {
    result,
    loading: visible.loading,
    error: visible.error,
    retry: () => setRetry(value => value + 1),
  };
};
