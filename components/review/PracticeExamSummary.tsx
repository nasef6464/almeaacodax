import React, { useState } from "react";
import { Award, Bookmark, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { normalizeQuestionHtml } from "../../utils/questionHtml";
import { QuestionAssistantPanel } from "../results/QuestionAssistantPanel";

export type AnswerOutcome = {
  cardId: string;
  questionId: string;
  questionText: string;
  imageUrl?: string;
  imageAlt?: string;
  options: string[];
  optionsEmbeddedInImage?: boolean;
  selectedOptionIndex: number;
  isCorrect: boolean;
  correctOptionIndex?: number;
  explanation?: string;
  reviewType?: string;
};

interface PracticeExamSummaryProps {
  history: AnswerOutcome[];
  doneCount: number;
  onRetry: () => void;
  retryLabel?: string;
}

export const PracticeExamSummary: React.FC<PracticeExamSummaryProps> = ({
  history,
  doneCount,
  onRetry,
  retryLabel = "تدرّب على دفعة أخرى",
}) => {
  const [reviewedQuestionDetail, setReviewedQuestionDetail] = useState<string | null>(null);

  const correctCount = history.filter((h) => h.isCorrect).length;
  const totalAnswered = history.length;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6" dir="rtl">
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <Award size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-emerald-950">
                تمت المراجعة اليومية
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-800">
                {totalAnswered > 0
                  ? `اكتمل الاختبار التدريبي بنجاح! 🎯 أنهيت ${doneCount} سؤال في هذه الجلسة التدريبية.`
                  : "لا توجد أسئلة مستحقة للمراجعة في هذا النطاق حالياً."}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            تدريب حر غير مسجل رسمياً
          </span>
        </div>

        {totalAnswered > 0 && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
                <div className="mt-1 text-xs font-bold text-slate-500">نسبة الإتقان</div>
              </div>
              <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-emerald-100">
                <div className="text-2xl font-black text-emerald-700">{correctCount}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">إجابات صحيحة</div>
              </div>
              <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-emerald-100">
                <div className="text-2xl font-black text-rose-600">{totalAnswered - correctCount}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">تحتاج مراجعة</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-emerald-100/60 p-4 text-xs font-bold text-emerald-900 leading-6">
              {accuracy >= 80 ? (
                <span>🌟 رائع جداً! أظهرت فهماً متقدماً للمفاهيم التي راجعتها؛ تم تثبيت إتقانها في سجل تعلّمك.</span>
              ) : accuracy >= 50 ? (
                <span>👍 بداية طيبة! التدريب الذاتي المستمر يصحح الأخطاء السابقة دون التأثير على معدلك العام.</span>
              ) : (
                <span>💪 لا تقلق، هذا اختبار تدريبي حر غير مسجل! راجع الشروحات بالأسفل واستخدم السبورة الذكية لترسيخ المفاهيم.</span>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-xs"
          >
            <RefreshCw size={14} /> {retryLabel}
          </button>
          <Link
            to="/dashboard?tab=favorites"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            <Bookmark size={14} /> العودة لأسئلتي للمراجعة
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            لوحة الطالب
          </Link>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 mb-3">تفاصيل أسئلة الجلسة التدريبية:</h3>
          <div className="space-y-2">
            {history.map((record, i) => (
              <div
                key={`${record.questionId}-${i}`}
                className={`rounded-2xl border p-4 transition-all ${
                  record.isCorrect
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-rose-100 bg-rose-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {record.isCorrect ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={18} className="text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-black text-slate-900">السؤال {i + 1}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                    record.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {record.isCorrect ? "أتقنته بنجاح" : "أخطأت فيه"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-700 font-bold line-clamp-2" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(record.questionText) }} />

                <div className="mt-3 flex items-center justify-between border-t border-slate-100/80 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewedQuestionDetail(reviewedQuestionDetail === record.questionId ? null : record.questionId)}
                    className="text-[11px] font-black text-indigo-600 hover:text-indigo-800"
                  >
                    {reviewedQuestionDetail === record.questionId ? "إخفاء الشرح والمساعد" : "عرض الشرح والمساعد الذكي 💡"}
                  </button>
                </div>

                {reviewedQuestionDetail === record.questionId && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-slate-200/60">
                    {record.explanation && (
                      <div className="rounded-xl bg-white p-3 text-xs font-bold text-slate-700 leading-6 border border-slate-100">
                        <span className="font-black text-emerald-800">الشرح المعتمد: </span>
                        <div dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(record.explanation) }} />
                      </div>
                    )}
                    <QuestionAssistantPanel
                      key={`review-tutor-summary-${record.questionId}`}
                      questionId={record.questionId}
                      hasImage={Boolean(record.imageUrl)}
                      context="mistake_review"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
