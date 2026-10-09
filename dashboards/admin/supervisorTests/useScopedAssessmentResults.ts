import { useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api';
import type { QuizResult } from '../../../types';

export const useScopedAssessmentResults = (actorId: string, quizId?: string, includeReview = false) => {
  const identity = JSON.stringify([actorId, quizId, includeReview]);
  const [state, setState] = useState<{ identity: string; results: QuizResult[]; page: number; hasMore: boolean; truncatedScope: boolean; loading: boolean; error: boolean }>({ identity: '', results: [], page: 0, hasMore: false, truncatedScope: false, loading: true, error: false });
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(false);
  const generationRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const generation = ++generationRef.current;
    requestRef.current = true;
    setState({ identity, results: [], page: 0, hasMore: false, truncatedScope: false, loading: true, error: false });
    api.getScopedQuizResults({ page: 1, limit: 100, quizId, includeReview, sortBy: 'date', sortOrder: 'desc' })
      .then((response: any) => {
        if (!cancelled) setState({ identity, results: response.results || [], page: 1, hasMore: response.pagination?.page < response.pagination?.totalPages, truncatedScope: response.scope?.sampledStudentCount < response.scope?.studentCount, loading: false, error: false });
      })
      .catch(() => { if (!cancelled) setState(current => ({ ...current, loading: false, error: true })); })
      .finally(() => { if (!cancelled && generationRef.current === generation) requestRef.current = false; });
    return () => { cancelled = true; };
  }, [identity, revision]);
  const loadMore = async () => {
    if (requestRef.current || state.identity !== identity || !state.hasMore) return;
    requestRef.current = true;
    const generation = generationRef.current;
    setState(current => ({ ...current, loading: true, error: false }));
    try {
      const response: any = await api.getScopedQuizResults({ page: state.page + 1, limit: 100, quizId, includeReview, sortBy: 'date', sortOrder: 'desc' });
      if (generationRef.current === generation) setState(current => current.identity !== identity ? current : ({ ...current, results: [...current.results, ...(response.results || [])], page: current.page + 1, hasMore: response.pagination?.page < response.pagination?.totalPages, loading: false }));
    } catch { if (generationRef.current === generation) setState(current => current.identity !== identity ? current : ({ ...current, loading: false, error: true })); }
    finally { if (generationRef.current === generation) requestRef.current = false; }
  };
  return { ...state, results: state.identity === identity ? state.results : [], loading: state.identity !== identity || state.loading, reload: () => setRevision(value => value + 1), loadMore };
};
