import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';

/** Own plans are private data; never load them through the shared content cache. */
export function useStudentStudyPlans(actorId?: string) {
  const [state, setState] = useState({ actorId, loading: Boolean(actorId && actorId !== 'guest'), error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    if (!actorId || actorId === 'guest') {
      setState({ actorId, loading: false, error: '' });
      return;
    }
    setState({ actorId, loading: true, error: '' });
    api.getMyStudyPlans().then(({ studyPlans }) => {
      if (!current || useStore.getState().user?.id !== actorId) return;
      useStore.getState().hydrateContentBootstrap({ studyPlans: studyPlans.filter(plan => plan.userId === actorId) });
      setState({ actorId, loading: false, error: '' });
    }).catch(() => {
      if (current) setState({ actorId, loading: false, error: 'تعذر تحميل خططك المحفوظة. أعد المحاولة قبل إنشاء خطة جديدة.' });
    });
    return () => { current = false; };
  }, [actorId, revision]);
  return { loading: state.actorId !== actorId || state.loading, error: state.actorId === actorId ? state.error : '', retry: () => setRevision(value => value + 1) };
}
