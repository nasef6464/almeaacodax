import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { QuestionAssistantPanel } from "../components/results/QuestionAssistantPanel";
import { QuestionVoiceExplanationPlayer } from "../components/results/QuestionVoiceExplanationPlayer";
import { PracticeExamSummary, type AnswerOutcome } from "../components/review/PracticeExamSummary";
import { PracticeQuestionFeedback } from "../components/review/PracticeQuestionFeedback";
import { normalizeQuestionHtml } from "../utils/questionHtml";
import type { QuestionVoiceExplanation } from "../types";
import { getLearnerOptionLabel, usesImageEmbeddedOptions } from "../utils/quizPresentation";

type ReviewItem = {
  cardId: string;
  questionId: string;
  skillId?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  reviewType?: "error_recovery" | "mastery_review" | "saved_review";
  question: {
    id: string;
    text: string;
    options: string[];
    imageUrl?: string;
    imageAlt?: string;
    optionsEmbeddedInImage?: boolean;
    voiceExplanation?: QuestionVoiceExplanation;
    explanation?: string;
    correctOptionIndex?: number;
  };
};

const QUALITY_OPTIONS: Array<{ value: number; label: string; className: string }> = [
  { value: 1, label: "مرة أخرى", className: "bg-rose-600 hover:bg-rose-700" },
  { value: 2, label: "صعب", className: "bg-amber-600 hover:bg-amber-700" },
  { value: 4, label: "جيد", className: "bg-indigo-600 hover:bg-indigo-700" },
  { value: 5, label: "سهل", className: "bg-emerald-600 hover:bg-emerald-700" },
];

const createEventId = (cardId: string) => {
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `review-${cardId}-${randomPart}`;
};

export const ReviewSession: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pathId = String(searchParams.get("pathId") || "").trim();
  const subjectId = String(searchParams.get("subjectId") || "").trim();
  const mode = String(searchParams.get("mode") || "").trim();
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<{
    isCorrect: boolean;
    selectedOptionIndex: number;
    correctOptionIndex?: number;
    explanation?: string;
  } | null>(null);
  const [history, setHistory] = useState<AnswerOutcome[]>([]);
  const eventIdsRef = useRef<Record<string, string>>({});

  const loadSequenceRef = useRef(0);
  const restartPractice = React.useCallback(() => {
    setIndex(0);
    setSaving(false);
    setDoneCount(0);
    setSelectedOptionIndex(null);
    setCurrentFeedback(null);
    setHistory([]);
    setError(null);
    eventIdsRef.current = {};
  }, []);

  const loadItems = React.useCallback(() => {
    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    setError(null);
    const sourcePromise = mode === "saved" || mode === "mistakes"
      ? api.getStudentReviewLibrary({
          tab: mode,
          limit: 20,
          page,
          ...(pathId ? { pathId } : {}),
          ...(subjectId ? { subjectId } : {}),
        })
      : api.getReviewDue({
          limit: 20,
          ...(pathId ? { pathId } : {}),
          ...(subjectId ? { subjectId } : {}),
        });
    sourcePromise
      .then((payload) => {
        if (sequence !== loadSequenceRef.current) return;
        setItems(Array.isArray(payload.items) ? payload.items.map((item: any) => ({
          ...item,
          reviewType: item.reviewType || (item.reasons?.mistake ? "error_recovery" : "saved_review"),
        })) : []);
        restartPractice();
      })
      .catch((err) => {
        if (sequence !== loadSequenceRef.current) return;
        setItems([]);
        console.error("Failed to load review due cards", err);
        setError("تعذر تحميل أسئلة المراجعة الآن.");
      })
      .finally(() => {
        if (sequence === loadSequenceRef.current) setLoading(false);
      });
  }, [mode, page, pathId, subjectId, restartPractice]);

  useEffect(() => {
    loadItems();
    return () => { loadSequenceRef.current++; };
  }, [loadItems]);

  const current = useMemo(() => items[index] || null, [items, index]);
  const imageQuestion = usesImageEmbeddedOptions(current?.question);
  const isFinished = !loading && (items.length === 0 || index >= items.length);

  const answer = async (quality?: number) => {
    if (!current || saving || currentFeedback !== null) return;
    if (current.question.options?.length && selectedOptionIndex === null) {
      setError("اختر إجابتك أولًا قبل التسجيل.");
      return;
    }

    const sequence = loadSequenceRef.current;
    const existingEventId = eventIdsRef.current[current.cardId];
    const eventId = existingEventId || createEventId(current.cardId);
    eventIdsRef.current[current.cardId] = eventId;

    setSaving(true);
    setError(null);
    try {
      const response = await api.answerReviewCard(
        current.cardId,
        current.question.options?.length
          ? { selectedOptionIndex: selectedOptionIndex ?? -1, eventId }
          : { quality: quality ?? 3, eventId },
      );
      if (sequence !== loadSequenceRef.current) return;
      delete eventIdsRef.current[current.cardId];

      const isCorrectAnswer = Boolean(response?.isCorrect ?? (selectedOptionIndex !== null && current.question.correctOptionIndex !== undefined && selectedOptionIndex === current.question.correctOptionIndex));

      setCurrentFeedback({
        isCorrect: isCorrectAnswer,
        selectedOptionIndex: selectedOptionIndex ?? -1,
        correctOptionIndex: current.question.correctOptionIndex,
        explanation: current.question.explanation,
      });

      setHistory((prev) => [
        ...prev,
        {
          cardId: current.cardId,
          questionId: current.questionId,
          questionText: current.question.text,
          imageUrl: current.question.imageUrl,
          imageAlt: current.question.imageAlt,
          options: current.question.options || [],
          optionsEmbeddedInImage: current.question.optionsEmbeddedInImage,
          selectedOptionIndex: selectedOptionIndex ?? -1,
          isCorrect: isCorrectAnswer,
          correctOptionIndex: current.question.correctOptionIndex,
          explanation: current.question.explanation,
          reviewType: current.reviewType,
        },
      ]);
      setDoneCount((prev) => prev + 1);
    } catch (err) {
      if (sequence !== loadSequenceRef.current) return;
      console.error("Failed to answer review card", err);
      setError("تعذر حفظ نتيجة المراجعة. حاول مرة أخرى.");
    } finally {
      if (sequence === loadSequenceRef.current) setSaving(false);
    }
  };

  const nextQuestion = () => {
    setCurrentFeedback(null);
    setSelectedOptionIndex(null);
    setError(null);
    setIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-gray-600" dir="rtl">
        <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-emerald-600" />
        <p className="font-bold">جاري تجهيز جلسة الاختبار التدريبي...</p>
      </div>
    );
  }

  if (!items.length && error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-5 text-center" dir="rtl">
        <p role="alert" className="font-bold text-rose-700">{error}</p>
        <button type="button" onClick={loadItems} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white">إعادة المحاولة</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <PracticeExamSummary
        history={history}
        doneCount={doneCount}
        onRetry={items.length ? restartPractice : loadItems}
        retryLabel={items.length ? "أعد التدريب على نفس الأسئلة" : "إعادة تحميل الأسئلة"}
      />
    );
  }

  const feedbackActive = currentFeedback !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5" dir="rtl">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-black text-indigo-950">
                {mode === "mistakes" ? "اختبار تدريبي: تصحيح الأخطاء السابقة" : mode === "saved" ? "اختبار تدريبي: الأسئلة المحفوظة" : "جلسة تدريب حر وتثبيت إتقان"}
              </h2>
              <p className="text-[11px] font-bold text-indigo-700/80">اختبار تدريبي غير مسجل رسمياً — لا يؤثر على معدلك التراكمي.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
              السؤال {index + 1} من {items.length}
            </span>
            <Link to="/dashboard?tab=favorites" className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">
              خروج
            </Link>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100/60">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.round(((index + 1) / items.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-500">
          <span>السؤال {index + 1} من {items.length}</span>
          {current?.reviewType === "mastery_review" ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">تثبيت إتقان</span>
          ) : current?.reviewType === "saved_review" ? (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">محفوظ للمراجعة</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">استعادة خطأ</span>
          )}
        </div>

        {!imageQuestion ? <h1 className="text-base sm:text-lg font-black text-gray-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(current?.question?.text || "سؤال مراجعة") }} /> : null}

        {current?.question?.imageUrl ? (
          <img
            src={current.question.imageUrl}
            alt={current.question.imageAlt || "صورة السؤال"}
            loading="lazy"
            className="my-3 mx-auto max-h-[340px] w-full rounded-2xl object-contain border border-slate-100"
          />
        ) : null}

        {Array.isArray(current?.question?.options) && current?.question?.options.length > 0 ? (
          <div className={`mt-4 grid ${imageQuestion ? "grid-cols-4" : "grid-cols-1 sm:grid-cols-2"} gap-2.5`}>
            {current?.question?.options.map((option, i) => {
              const isSelected = selectedOptionIndex === i;
              const isCorrectOpt = feedbackActive && current.question.correctOptionIndex !== undefined && i === current.question.correctOptionIndex;
              const isWrongSelected = feedbackActive && isSelected && !currentFeedback.isCorrect;

              let style = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30";
              if (feedbackActive) {
                if (isCorrectOpt) {
                  style = "border-emerald-500 bg-emerald-50 text-emerald-900 font-black shadow-xs ring-2 ring-emerald-400";
                } else if (isWrongSelected) {
                  style = "border-rose-500 bg-rose-50 text-rose-900 font-black";
                } else {
                  style = "border-gray-100 bg-gray-50 text-gray-400 opacity-60";
                }
              } else if (isSelected) {
                style = "border-indigo-600 bg-indigo-50/80 font-black text-indigo-900 shadow-xs ring-2 ring-indigo-500";
              }

              return (
                <button
                  type="button"
                  key={`${current.question.id}-opt-${i}`}
                  disabled={feedbackActive || saving}
                  onClick={() => setSelectedOptionIndex(i)}
                  className={`relative w-full rounded-2xl border p-3.5 transition-all text-right ${imageQuestion ? "text-center text-lg font-black" : "text-sm"} ${style}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(getLearnerOptionLabel(current.question, option, i)) }} />
                    {feedbackActive && isCorrectOpt && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                    {feedbackActive && isWrongSelected && <XCircle size={16} className="text-rose-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {feedbackActive && (
        <PracticeQuestionFeedback
          isCorrect={currentFeedback.isCorrect}
          question={{
            text: current?.question?.text || "",
            options: current?.question?.options || [],
            correctOptionIndex: current?.question?.correctOptionIndex,
            explanation: current?.question?.explanation,
            optionsEmbeddedInImage: current?.question?.optionsEmbeddedInImage,
            imageUrl: current?.question?.imageUrl,
          }}
          hasNext={index < items.length - 1}
          onNext={nextQuestion}
        />
      )}

      {current?.questionId ? (
        <QuestionVoiceExplanationPlayer
          key={`review-teacher-voice-${current.questionId}`}
          voiceExplanation={current.question?.voiceExplanation}
        />
      ) : null}

      {current?.questionId ? (
        <QuestionAssistantPanel
          key={`review-tutor-${current.reviewType || "review"}-${current.questionId}`}
          questionId={current.questionId}
          hasImage={Boolean(current.question?.imageUrl)}
          context={
            current.reviewType === "mastery_review"
              ? "mastery_review"
              : current.reviewType === "saved_review"
                ? "saved_review"
                : "mistake_review"
          }
        />
      ) : null}

      {!feedbackActive && (
        <div className="rounded-3xl border border-indigo-100 bg-white p-4 shadow-xs">
          {current?.question?.options?.length ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">اختر إجابتك أولاً ثم أكّد للمعاينة الفورية.</span>
              <button
                type="button"
                disabled={saving || selectedOptionIndex === null}
                onClick={() => void answer()}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 shadow-xs"
              >
                {saving ? "جاري التحقق..." : "تحقق وسجّل المراجعة"}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm font-bold text-indigo-800">ما تقييمك لهذا السؤال بعد المراجعة؟</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {QUALITY_OPTIONS.map((item) => (
                  <button
                    key={`quality-${item.value}`}
                    type="button"
                    disabled={saving}
                    onClick={() => void answer(item.value)}
                    className={`rounded-xl px-3 py-2 text-sm font-black text-white transition-colors disabled:opacity-60 ${item.className}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {error ? <p className="mt-3 text-xs font-bold text-rose-700">{error}</p> : null}
        </div>
      )}
    </div>
  );
};

export default ReviewSession;
