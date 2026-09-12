import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Presentation, Sparkles } from 'lucide-react';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

interface ClassroomQuestionReviewPanelProps {
  sessionId: string;
  currentQuestion: any;
  currentQAnalytics: any;
  distribution: Record<string, number>;
  showInlineExplanation: boolean;
  onToggleExplanation: () => void;
}

export const ClassroomQuestionReviewPanel: React.FC<ClassroomQuestionReviewPanelProps> = ({
  sessionId,
  currentQuestion,
  currentQAnalytics,
  distribution,
  showInlineExplanation,
  onToggleExplanation,
}) => (
  <div className="mt-6 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <Presentation size={18} />
        </span>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            وضع استعراض وشرح السؤال للسبورة الذكية (السؤال {currentQuestion.index + 1})
          </h3>
          <p className="text-xs text-slate-500">تحليل استجابات الطلاب، كشف الخيارات المضللة، وعرض الشرح النموذجي للمناقشة</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExplanation}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all shadow-xs active:scale-95 ${showInlineExplanation ? 'bg-amber-500 text-slate-950 font-black' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
        >
          {showInlineExplanation ? <EyeOff size={14} /> : <Eye size={14} />}
          {showInlineExplanation ? 'إخفاء الشرح والحل' : 'عرض الحل النموذجي والمهارة 💡'}
        </button>
        <Link
          to={`/classroom/${sessionId}/projector`}
          target="_blank"
          className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
        >
          <ExternalLink size={13} /> فتح البروجكتور
        </Link>
      </div>
    </div>

    <div className="mt-4">
      <p className="text-base sm:text-lg font-black leading-relaxed text-slate-900 dark:text-white">{currentQuestion.text}</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {(currentQuestion.options || []).map((opt: string, idx: number) => {
          const percent = currentQAnalytics.percentages[idx] || 0;
          const count = distribution[String(idx)] || 0;
          const isCorrect = showInlineExplanation && currentQuestion.correctOptionIndex === idx;
          const isCommonWrong = showInlineExplanation && currentQAnalytics.maxWrongOption?.index === idx;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border p-3 transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200' : isCommonWrong ? 'border-rose-400 bg-rose-50/70 text-rose-950 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-850'}`}
            >
              <div
                className={`absolute inset-y-0 right-0 opacity-15 transition-all duration-500 ${isCorrect ? 'bg-emerald-500' : isCommonWrong ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${percent}%` }}
              />
              <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-bold">
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                    {OPTION_LETTERS[idx] || idx + 1}
                  </span>
                  <span>{opt}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isCorrect && <CheckCircle2 size={13} className="text-emerald-600" />}
                  <span className="font-mono font-black">{percent}%</span>
                  <span className="text-[11px] text-slate-400">({count})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentQAnalytics.maxWrongOption && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-black">تنبيه المعلم لخطأ شائع:</strong> نسبة <strong className="font-black">{currentQAnalytics.maxWrongOption.percent}%</strong> من الطلاب اختاروا البديل ({currentQAnalytics.maxWrongOption.letter})، وهو أكثر خيار خاطئ تم تسليمه. يرجى توضيح هذا المفهوم على السبورة.
          </div>
        </div>
      )}

      {showInlineExplanation && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 dark:border-amber-800/40">
            <span className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300"><Sparkles size={14} /> الشرح والحل النموذجي للمناقشة</span>
            {currentQuestion.skillIds?.length > 0 && (
              <span className="rounded-md bg-amber-200/50 px-2 py-0.5 font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">مهارة: {currentQuestion.skillIds.join(' • ')}</span>
            )}
          </div>
          <div className="mt-2.5 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {currentQuestion.explanation || 'لا يوجد شرح مسبق مسجل لهذا السؤال في بنك الأسئلة.'}
          </div>
        </div>
      )}
    </div>
  </div>
);
