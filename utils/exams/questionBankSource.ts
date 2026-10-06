import { useCallback, useEffect, useState } from 'react';
import { Question } from '../../types';
import { assessmentQuestionSource } from './assessmentQuestionSource';

export const EXAM_QUESTION_BANK_EMPTY_MESSAGE =
  'لا توجد أسئلة مطابقة لهذا المسار/المادة/القسم. راجع الفلاتر أو تصنيف الأسئلة.';

export type ExamQuestionBankFilters = {
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  skillId?: string;
  search?: string;
  enabled?: boolean;
};

/**
 * Legacy compatibility adapter.
 * Runtime callers keep the same API while the real fetching/pagination logic
 * lives in assessmentQuestionSource. Remove this wrapper only after all callers
 * migrate to paginated source APIs directly.
 */
export const loadExamQuestionBank = async (filters: ExamQuestionBankFilters) =>
  assessmentQuestionSource.loadAll({
    pathId: filters.pathId,
    subjectId: filters.subjectId,
    sectionId: filters.sectionId,
    skillId: filters.skillId,
    search: filters.search,
    // لا نُرسل approvalStatus — Backend يُطبق الصلاحيات حسب دور المستخدم تلقائياً
  });

export const useExamQuestionBank = (filters: ExamQuestionBankFilters) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const enabled = filters.enabled !== false && Boolean(filters.pathId || filters.subjectId);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setQuestions([]);
      setTotal(0);
      setError('');
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError('');

    void loadExamQuestionBank(filters)
      .then((result) => {
        if (!active) return;
        setQuestions(result.questions);
        setTotal(result.total);
      })
      .catch((loadError) => {
        if (!active) return;
        setQuestions([]);
        setTotal(0);
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل أسئلة بنك المنصة الآن.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    enabled,
    filters.pathId,
    filters.search,
    filters.sectionId,
    filters.skillId,
    filters.subjectId,
    refreshKey,
  ]);

  return { questions, total, isLoading, error, refresh };
};
