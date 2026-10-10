import React from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { normalizeQuestionHtml } from "../../utils/questionHtml";
import { getLearnerOptionLabel } from "../../utils/quizPresentation";

interface PracticeQuestionFeedbackProps {
  isCorrect: boolean;
  question: {
    text: string;
    options: string[];
    correctOptionIndex?: number;
    explanation?: string;
    optionsEmbeddedInImage?: boolean;
    imageUrl?: string;
  };
  hasNext: boolean;
  onNext: () => void;
}

export const PracticeQuestionFeedback: React.FC<PracticeQuestionFeedbackProps> = ({
  isCorrect,
  question,
  hasNext,
  onNext,
}) => {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-xs transition-all ${
        isCorrect
          ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
          : "border-rose-200 bg-rose-50/90 text-rose-950"
      }`}
    >
      <div className="flex items-center gap-2 font-black text-base">
        {isCorrect ? (
          <>
            <CheckCircle2 size={22} className="text-emerald-600" />
            <span>إجابة صحيحة! أحسنت 🎯</span>
          </>
        ) : (
          <>
            <XCircle size={22} className="text-rose-600" />
            <span>إجابة غير صحيحة</span>
          </>
        )}
      </div>

      {!isCorrect &&
        question.correctOptionIndex !== undefined &&
        question.options?.[question.correctOptionIndex] && (
          <p className="mt-2 text-xs font-bold text-rose-800">
            الإجابة الصحيحة هي:{" "}
            <span className="underline" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(getLearnerOptionLabel(
              question, question.options[question.correctOptionIndex], question.correctOptionIndex,
            )) }} />
          </p>
        )}

      {question.explanation && (
        <div className="mt-3 rounded-2xl bg-white p-3.5 text-xs font-bold leading-6 text-slate-800 border border-slate-100">
          <span className="font-black text-emerald-800">الشرح المعتمد: </span>
          <div dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.explanation) }} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 shadow-xs"
        >
          {hasNext ? (
            <>
              السؤال التالي <ArrowLeft size={14} />
            </>
          ) : (
            <>عرض ملخص الاختبار التدريبي 📊</>
          )}
        </button>
      </div>
    </div>
  );
};
