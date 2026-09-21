import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

type ReviewItem = {
  cardId: string;
  questionId: string;
  skillId?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  reviewType?: "error_recovery" | "mastery_review";
  question: {
    id: string;
    text: string;
    options: string[];
    imageUrl?: string;
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

const ReviewSession: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pathId = String(searchParams.get("pathId") || "").trim();
  const subjectId = String(searchParams.get("subjectId") || "").trim();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const eventIdsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getReviewDue({
      limit: 20,
      ...(pathId ? { pathId } : {}),
      ...(subjectId ? { subjectId } : {}),
    })
      .then((payload) => {
        if (!mounted) return;
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setIndex(0);
        setDoneCount(0);
        setSelectedOptionIndex(null);
        eventIdsRef.current = {};
      })
      .catch((err) => {
        console.error("Failed to load review due cards", err);
        if (mounted) setError("تعذر تحميل أسئلة المراجعة الآن.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathId, subjectId]);

  const current = useMemo(() => items[index] || null, [items, index]);
  const isFinished = !loading && (items.length === 0 || index >= items.length);

  const answer = async (quality?: number) => {
    if (!current || saving) return;
    if (current.question.options?.length && selectedOptionIndex === null) {
      setError("اختر إجابتك أولًا.");
      return;
    }

    const existingEventId = eventIdsRef.current[current.cardId];
    const eventId = existingEventId || createEventId(current.cardId);
    eventIdsRef.current[current.cardId] = eventId;

    setSaving(true);
    setError(null);
    try {
      await api.answerReviewCard(
        current.cardId,
        current.question.options?.length
          ? { selectedOptionIndex: selectedOptionIndex ?? -1, eventId }
          : { quality: quality ?? 3, eventId },
      );
      delete eventIdsRef.current[current.cardId];
      setDoneCount((prev) => prev + 1);
      setIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
    } catch (err) {
      console.error("Failed to answer review card", err);
      setError("تعذر حفظ نتيجة المراجعة. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-center text-gray-600">جاري تحميل جلسة المراجعة...</div>;
  }

  if (isFinished) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
          <h1 className="text-2xl font-black text-emerald-700">تمت المراجعة اليومية</h1>
          <p className="mt-2 text-sm text-emerald-700">أنهيت {doneCount} سؤال في هذه الجلسة.</p>
          <Link to="/dashboard" className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">
            العودة للوحة الطالب
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
          <span>السؤال {index + 1} من {items.length}</span>
          {current?.reviewType === "mastery_review" ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">تثبيت إتقان</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">استعادة خطأ</span>
          )}
        </div>
        <h1 className="text-xl font-black text-gray-900">{current?.question?.text || "سؤال مراجعة"}</h1>
        {current?.question?.imageUrl ? (
          <img
            src={current.question.imageUrl}
            alt="صورة السؤال"
            loading="lazy"
            className="my-3 mx-auto max-h-64 rounded-lg object-contain"
          />
        ) : null}
        {Array.isArray(current?.question?.options) && current?.question?.options.length > 0 ? (
          <div className="mt-4 space-y-2">
            {current?.question?.options.map((option, i) => (
              <button
                type="button"
                key={`${current.question.id}-opt-${i}`}
                onClick={() => setSelectedOptionIndex(i)}
                className={`w-full rounded-xl border px-3 py-2 text-right text-sm transition ${
                  selectedOptionIndex === i
                    ? "border-indigo-400 bg-indigo-50 font-black text-indigo-800"
                    : "border-gray-100 bg-gray-50 text-gray-700 hover:border-indigo-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        {current?.question?.options?.length ? (
          <>
            <div className="mb-3 text-sm font-bold text-indigo-800">اختر الإجابة ثم سجّل نتيجة المراجعة.</div>
            <button
              type="button"
              disabled={saving || selectedOptionIndex === null}
              onClick={() => void answer()}
              className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              تحقق وسجّل المراجعة
            </button>
          </>
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
        {error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
};

export default ReviewSession;
