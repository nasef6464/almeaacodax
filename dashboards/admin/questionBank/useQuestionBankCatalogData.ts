import { useEffect, useMemo, useState } from 'react';
import type { Question } from '../../../types';
import { api } from '../../../services/api';
import type { QuestionBankCoverage } from '../../../services/apiGroups/questionsApi';

export type QuestionPaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type SkillLinkFilter = 'all' | 'linked' | 'unlinked';
type VideoFilter = 'all' | 'with_video' | 'without_video';
type ExplanationFilter = 'all' | 'with' | 'without';

type QuestionBankCatalogFilters = {
  subjectId?: string;
  selectedPathId: string;
  selectedSubjectId: string;
  selectedSectionId: string;
  selectedSkillId: string;
  skillLinkFilter: SkillLinkFilter;
  searchTerm: string;
  selectedDifficulty: string;
  videoFilter: VideoFilter;
  explanationFilter: ExplanationFilter;
  fallbackQuestions: Question[];
};

export const useQuestionBankCatalogData = ({
  subjectId,
  selectedPathId,
  selectedSubjectId,
  selectedSectionId,
  selectedSkillId,
  skillLinkFilter,
  searchTerm,
  selectedDifficulty,
  videoFilter,
  explanationFilter,
  fallbackQuestions,
}: QuestionBankCatalogFilters) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pagedQuestions, setPagedQuestions] = useState<Question[] | null>(null);
  const [pagedPagination, setPagedPagination] = useState<QuestionPaginationMeta | null>(null);
  const [questionBankCoverage, setQuestionBankCoverage] = useState<QuestionBankCoverage | null>(null);
  const [pagedQuestionsError, setPagedQuestionsError] = useState<string | null>(null);
  const [isLoadingPagedQuestions, setIsLoadingPagedQuestions] = useState(false);
  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedPathId,
    selectedSubjectId,
    selectedSectionId,
    selectedSkillId,
    skillLinkFilter,
    searchTerm,
    subjectId,
    selectedDifficulty,
    videoFilter,
    explanationFilter,
  ]);

  useEffect(() => {
    let active = true;
    const loadPagedQuestions = async () => {
      setIsLoadingPagedQuestions(true);
      setPagedQuestionsError(null);
      try {
        const response = await api.getQuestionsPaginated({
          page: currentPage,
          limit: 100,
          summary: true,
          pathId: selectedPathId || undefined,
          subject: (subjectId || selectedSubjectId) || undefined,
          sectionId: selectedSectionId || undefined,
          skillId: selectedSkillId || undefined,
          skillLinkStatus: skillLinkFilter === 'all' ? undefined : skillLinkFilter,
          search: searchTerm || undefined,
          difficulty: selectedDifficulty || undefined,
          videoStatus: videoFilter === 'all' ? undefined : (videoFilter === 'with_video' ? 'with' : 'without'),
          explanationStatus: explanationFilter === 'all' ? undefined : explanationFilter,
        });

        if (!active) return;
        setPagedQuestions(Array.isArray(response?.data) ? (response.data as Question[]) : []);
        setPagedPagination(response?.pagination || null);
      } catch (error) {
        if (!active) return;
        setPagedQuestions(null);
        setPagedPagination(null);
        setPagedQuestionsError(error instanceof Error ? error.message : 'تعذر تحميل الأسئلة المرقمة الآن.');
      } finally {
        if (active) setIsLoadingPagedQuestions(false);
      }
    };

    void loadPagedQuestions();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    searchTerm,
    selectedPathId,
    selectedSectionId,
    selectedSkillId,
    selectedSubjectId,
    skillLinkFilter,
    subjectId,
    selectedDifficulty,
    videoFilter,
    explanationFilter,
    questionsRefreshKey,
  ]);

  useEffect(() => {
    let active = true;

    const loadQuestionCoverage = async () => {
      try {
        const response = await api.getQuestionsPaginated({
          page: 1,
          limit: 1,
          summary: true,
          noTotal: true,
          includeCoverage: true,
          pathId: selectedPathId || undefined,
          subject: (subjectId || selectedSubjectId) || undefined,
          sectionId: selectedSectionId || undefined,
          skillId: selectedSkillId || undefined,
          skillLinkStatus: skillLinkFilter === 'all' ? undefined : skillLinkFilter,
          search: searchTerm || undefined,
          difficulty: selectedDifficulty || undefined,
          videoStatus: videoFilter === 'all' ? undefined : (videoFilter === 'with_video' ? 'with' : 'without'),
          explanationStatus: explanationFilter === 'all' ? undefined : explanationFilter,
        });

        if (!active) return;
        setQuestionBankCoverage(response?.coverage || null);
      } catch {
        if (!active) return;
        setQuestionBankCoverage(null);
      }
    };

    void loadQuestionCoverage();
    return () => {
      active = false;
    };
  }, [
    searchTerm,
    selectedPathId,
    selectedSectionId,
    selectedSkillId,
    selectedSubjectId,
    skillLinkFilter,
    subjectId,
    selectedDifficulty,
    videoFilter,
    explanationFilter,
    questionsRefreshKey,
  ]);

  const displayedQuestions = useMemo(() => {
    const base = pagedQuestions ?? fallbackQuestions;
    return base.filter((question) => {
      if (videoFilter === 'with_video' && !Boolean(question.videoUrl && String(question.videoUrl).trim())) return false;
      if (videoFilter === 'without_video' && Boolean(question.videoUrl && String(question.videoUrl).trim())) return false;
      if (explanationFilter === 'with' && !String(question.explanation || '').trim()) return false;
      if (explanationFilter === 'without' && String(question.explanation || '').trim()) return false;
      if (skillLinkFilter === 'linked' && !(question.skillIds || []).length) return false;
      if (skillLinkFilter === 'unlinked' && (question.skillIds || []).length > 0) return false;
      if (selectedDifficulty && question.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [
    pagedQuestions,
    fallbackQuestions,
    videoFilter,
    selectedDifficulty,
    skillLinkFilter,
    explanationFilter,
  ]);

  return {
    currentPage,
    setCurrentPage,
    pagedPagination,
    questionBankCoverage,
    pagedQuestionsError,
    isLoadingPagedQuestions,
    displayedQuestions,
    refreshPagedQuestions: () => setQuestionsRefreshKey((key) => key + 1),
  };
};
