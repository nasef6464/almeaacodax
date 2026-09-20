import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, RefreshCw, AlertCircle, Video, Image as ImageIcon } from 'lucide-react';
import { api } from '../../../services/api';
import { Question } from '../../../types';
import { normalizeQuestionHtml } from '../../../utils/questionHtml';

interface SubSkillQuestionsPreviewProps {
  subSkillId: string;
  subSkillName: string;
  fallbackQuestions?: Question[];
  onTotalCountChange?: (count: number) => void;
}

export const SubSkillQuestionsPreview: React.FC<SubSkillQuestionsPreviewProps> = ({
  subSkillId,
  subSkillName,
  fallbackQuestions = [],
  onTotalCountChange,
}) => {
  const [questions, setQuestions] = useState<Question[]>(fallbackQuestions.slice(0, 8));
  const [totalCount, setTotalCount] = useState<number>(fallbackQuestions.length);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!subSkillId) {
      setQuestions([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getQuestionsPaginated({
        skillId: subSkillId,
        limit: 8,
        summary: true,
      });

      const items = Array.isArray(response?.data) ? (response.data as Question[]) : [];
      const count = response?.pagination?.total ?? items.length;

      setQuestions(items);
      setTotalCount(count);
      onTotalCountChange?.(count);
    } catch (err) {
      if (fallbackQuestions.length > 0) {
        setQuestions(fallbackQuestions.slice(0, 8));
        setTotalCount(fallbackQuestions.length);
      } else {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الأسئلة المرتبطة بالمهارة.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [subSkillId, fallbackQuestions, onTotalCountChange]);

  useEffect(() => {
    let active = true;
    void loadQuestions();
    return () => {
      active = false;
    };
  }, [loadQuestions]);

  const getDifficultyBadge = (difficulty?: string) => {
    if (!difficulty) return null;
    const lower = difficulty.toLowerCase();
    if (lower === 'easy') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">سهل</span>;
    }
    if (lower === 'medium') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">متوسط</span>;
    }
    if (lower === 'hard') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">صعب</span>;
    }
    return null;
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h6 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <HelpCircle size={16} className="text-amber-500" />
          الأسئلة المرتبطة ({subSkillName})
        </h6>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-5 w-14 bg-amber-100/60 animate-pulse rounded-full" />
          ) : (
            <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              {totalCount} سؤال
            </div>
          )}
          <button
            onClick={loadQuestions}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
            title="تحديث الأسئلة"
            aria-label="تحديث الأسئلة"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && questions.length === 0 ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 animate-pulse space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error && questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-gray-500 border border-dashed border-red-200 rounded-lg bg-red-50/30 p-4">
            <AlertCircle size={20} className="text-rose-500 mb-1" />
            <span className="text-xs text-rose-700 mb-2">{error}</span>
            <button
              onClick={loadQuestions}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white px-3 py-1 rounded-md border border-indigo-200 shadow-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : questions.length > 0 ? (
          <>
            {questions.map((question) => {
              const cleanHtml = normalizeQuestionHtml(question.text);
              return (
                <div key={question.id} className="p-2.5 bg-gray-50/80 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                  {question.imageUrl && (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        <ImageIcon size={12} /> صورة سؤال
                      </span>
                    </div>
                  )}
                  {cleanHtml ? (
                    <div
                      className="question-html text-xs text-gray-800 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: cleanHtml }}
                    />
                  ) : question.imageUrl ? (
                    <div className="text-xs text-gray-500 italic">سؤال بصري (انظر الصورة في بنك الأسئلة)</div>
                  ) : (
                    <div className="text-xs text-gray-400">سؤال بدون نص معروض</div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-gray-200/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span>كود: {question.id.slice(-6)}</span>
                      {question.videoUrl && (
                        <span className="text-indigo-500 flex items-center gap-0.5" title="يتضمن فيديو شرح">
                          <Video size={12} />
                        </span>
                      )}
                    </div>
                    {getDifficultyBadge(question.difficulty)}
                  </div>
                </div>
              );
            })}
            {totalCount > questions.length && (
              <div className="text-xs text-gray-500 text-center py-1 font-medium">
                + {totalCount - questions.length} سؤال إضافي مسجل في بنك الأسئلة
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            لا توجد أسئلة مرتبطة بهذه المهارة حتى الآن.
          </div>
        )}
      </div>
    </div>
  );
};
