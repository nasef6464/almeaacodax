import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type ReviewItem = {
  cardId: string;
  questionId: string;
  question: {
    id: string;
    text: string;
    options: string[];
  };
};

const QUALITY_OPTIONS: Array<{ value: number; label: string; className: string }> = [
  { value: 1, label: "مرة أخرى", className: "bg-rose-600 hover:bg-rose-700" },
  { value: 2, label: "صعب", className: "bg-amber-600 hover:bg-amber-700" },
  { value: 4, label: "جيد", className: "bg-indigo-600 hover:bg-indigo-700" },
  { value: 5, label: "سهل", className: "bg-emerald-600 hover:bg-emerald-700" },
];

const ReviewSession: React.FC = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.getReviewDue(20)
      .then((payload) => {
        if (!mounted) return;
        setItems(Array.isArray(payload.items) ? payload.items : []);
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
  }, []);

  const current = useMemo(() => items[index] || null, [items, index]);
  const isFinished = !loading && (items.length === 0 || index >= items.length);

  const answer = async (quality: number) => {
    if (!current || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.answerReviewCard(current.cardId, quality);
      setDoneCount((prev) => prev + 1);
      setIndex((prev) => prev + 1);
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
        <div className="mb-3 text-sm text-gray-500">السؤال {index + 1} من {items.length}</div>
        <h1 className="text-xl font-black text-gray-900">{current?.question?.text || "سؤال مراجعة"}</h1>
        {Array.isArray(current?.question?.options) && current?.question?.options.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {current?.question?.options.map((option, i) => (
              <li key={`${current.question.id}-opt-${i}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {option}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
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
        {error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
};

export default ReviewSession;
