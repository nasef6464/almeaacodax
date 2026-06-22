import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Question } from '../../types';

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

type QuestionBankPage = {
  data?: unknown[];
  pagination?: {
    total?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
  };
};

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

const normalizeQuestion = (value: unknown): Question => {
  const question = (value || {}) as Record<string, unknown>;
  return {
    ...question,
    id: String(question.id || question._id || ''),
    text: String(question.text || ''),
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    correctOptionIndex: Number(question.correctOptionIndex ?? 0),
    explanation: question.explanation ? String(question.explanation) : '',
    videoUrl: question.videoUrl ? String(question.videoUrl) : undefined,
    imageUrl: question.imageUrl ? String(question.imageUrl) : undefined,
    skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
    pathId: question.pathId ? String(question.pathId) : undefined,
    subject: String(question.subject || ''),
    sectionId: question.sectionId ? String(question.sectionId) : undefined,
    difficulty: (question.difficulty || 'Medium') as Question['difficulty'],
    type: (question.type || 'mcq') as Question['type'],
  } as Question;
};

export const loadExamQuestionBank = async (filters: ExamQuestionBankFilters) => {
  const questions = new Map<string, Question>();
  let page = 1;
  let total = 0;
  let hasNext = true;

  while (hasNext && page <= MAX_PAGES) {
    const response = (await api.getQuestionsPaginated({
      page,
      limit: PAGE_LIMIT,
      pathId: filters.pathId,
      subject: filters.subjectId,
      sectionId: filters.sectionId,
      skillId: filters.skillId,
      search: filters.search,
      approvalStatus: 'approved',
    })) as QuestionBankPage;

    const items = Array.isArray(response?.data) ? response.data : [];
    items.map(normalizeQuestion).filter((question) => question.id).forEach((question) => questions.set(question.id, question));

    total = Number(response?.pagination?.total ?? questions.size);
    const totalPages = Math.max(1, Number(response?.pagination?.totalPages || 1));
    hasNext = Boolean(response?.pagination?.hasNext) && page < totalPages;
    page += 1;
  }

  return {
    questions: Array.from(questions.values()),
    total,
  };
};

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
