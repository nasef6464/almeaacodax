import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { QuizResult } from '../types';
import type { StudentLearningContext } from '../utils/studentLearningContext';

type State = { key: string; results: QuizResult[]; page: number; total: number; hasNext: boolean; loading: boolean; error: string };
const empty = (key: string): State => ({ key, results: [], page: 0, total: 0, hasNext: false, loading: true, error: '' });

export const useStudentResultHistory = (userId: string, enabled: boolean, context: StudentLearningContext) => {
  const key = `${userId}:${context}`;
  const [state, setState] = useState<State>(() => empty(key));
  const generation = useRef(0);
  const lock = useRef(false);
  const read = useCallback(async (page: number, expectedGeneration: number) => {
    if (lock.current) return;
    lock.current = true;
    setState(previous => ({ ...(previous.key === key ? previous : empty(key)), loading: true, error: '' }));
    try {
      const payload = await api.getMyQuizResultsPage({ page, limit: 50, learningContext: context });
      if (generation.current !== expectedGeneration) return;
      setState(previous => {
        const rows = [...(page === 1 ? [] : previous.results), ...payload.data as QuizResult[]];
        const unique = new Map(rows.map(row => [String(row.id || row._id || `${row.quizId}:${row.date}`), row]));
        return { key, results: [...unique.values()], page, total: payload.pagination.total, hasNext: payload.pagination.hasNext, loading: false, error: '' };
      });
    } catch {
      if (generation.current === expectedGeneration) setState(previous => ({ ...previous, loading: false, error: 'تعذر تحميل السجل. حاول مرة أخرى.' }));
    } finally {
      if (generation.current === expectedGeneration) lock.current = false;
    }
  }, [context, key]);
  useEffect(() => {
    const current = ++generation.current;
    lock.current = false;
    setState(empty(key));
    if (enabled && userId && userId !== 'guest') void read(1, current);
    return () => { ++generation.current; };
  }, [enabled, key, read, userId]);
  const visible = state.key === key ? state : empty(key);
  return { ...visible, loadMore: () => read(visible.page + 1, generation.current), retry: () => read(visible.page ? visible.page + 1 : 1, generation.current) };
};
