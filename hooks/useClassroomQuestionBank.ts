import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export function useClassroomQuestionBank(schoolId: string, showPushModal: boolean, ended: boolean) {
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const cache = useRef<{ schoolId: string; questions: any[] } | null>(null);
  const pending = useRef<{ schoolId: string; generation: number; promise: Promise<any[]> } | null>(null);
  const generation = useRef(0);
  const currentSchool = useRef(schoolId);
  const mounted = useRef(false);
  currentSchool.current = schoolId;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { generation.current++; cache.current = null; setBankQuestions([]); setBankError(''); setLoadingBank(false); }, [schoolId]);

  const ensureBankQuestions = useCallback((): Promise<any[]> => {
    if (!schoolId || ended) return Promise.resolve([]);
    if (cache.current?.schoolId === schoolId) return Promise.resolve(cache.current.questions);
    const requestGeneration = generation.current;
    if (pending.current?.schoolId === schoolId && pending.current.generation === requestGeneration) return pending.current.promise;
    const isCurrent = () => mounted.current && currentSchool.current === schoolId && generation.current === requestGeneration;
    setLoadingBank(true);
    setBankError('');
    const promise: Promise<any[]> = (async () => {
      try {
        const result = await api.getClassroomQuestions(schoolId);
        let list = Array.isArray(result?.questions) ? result.questions : [];
        if (list.filter((q: any) => q.text && String(q.text).trim()).length < 10) {
          try {
            const fallback = await api.getClassroomQuestions(schoolId, { pathId: 'p_1777779639431' });
            if (Array.isArray(fallback?.questions)) list = [...list, ...fallback.questions];
          } catch {}
        }
        list = [...new Map(list.map((q: any) => [String(q.questionId || q.id), q])).values()];
        if (isCurrent()) { cache.current = { schoolId, questions: list }; setBankQuestions(list); }
        return list;
      } catch (error) {
        if (isCurrent()) setBankError('تعذر تحميل بنك الأسئلة المصرح لهذه المدرسة. حاول إرسال النشاط مجددًا.');
        throw error;
      } finally {
        if (isCurrent()) setLoadingBank(false);
        if (pending.current?.promise === promise) pending.current = null;
      }
    })();
    pending.current = { schoolId, generation: requestGeneration, promise };
    return promise;
  }, [schoolId, ended]);

  useEffect(() => { if (showPushModal) void ensureBankQuestions().catch(() => {}); }, [showPushModal, ensureBankQuestions]);
  return { bankQuestions, loadingBank, bankError, ensureBankQuestions, bankReady: cache.current?.schoolId === schoolId };
}
