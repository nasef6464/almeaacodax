import React from 'react';
import { Award, CheckCircle2, TrendingUp, Users, Zap } from 'lucide-react';

interface ClassroomTeacherLiveRadarProps {
  responseCount: number;
  expectedCount?: number;
  distribution: Record<string, number>;
  activeQuestion?: {
    questionId: string;
    text: string;
    options: string[];
    correctOptionIndex?: number;
    isChallenge?: boolean;
  } | null;
  onToggleChallenge?: () => void;
}

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

export const ClassroomTeacherLiveRadar: React.FC<ClassroomTeacherLiveRadarProps> = ({
  responseCount,
  expectedCount = 0,
  distribution,
  activeQuestion,
  onToggleChallenge,
}) => {
  const options = activeQuestion?.options || [];
  const totalResponses = responseCount || 0;
  const correctIdx = activeQuestion?.correctOptionIndex;
  const isChallenge = Boolean(activeQuestion?.isChallenge);

  // Find most frequent wrong option (distractor)
  let distractorIdx: number | null = null;
  let maxWrongCount = 0;
  options.forEach((_, idx) => {
    if (correctIdx !== undefined && idx === correctIdx) return;
    const count = distribution[String(idx)] || 0;
    if (count > maxWrongCount) {
      maxWrongCount = count;
      distractorIdx = idx;
    }
  });

  const correctCount = correctIdx !== undefined ? (distribution[String(correctIdx)] || 0) : 0;
  const accuracyRate = totalResponses > 0 && correctIdx !== undefined
    ? Math.round((correctCount / totalResponses) * 100)
    : null;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isChallenge
        ? 'border-amber-400/80 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-slate-900/5 dark:bg-amber-950/20'
        : 'border-indigo-100 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900'
    }`}>
      {/* Header and Challenge Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
            isChallenge ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-indigo-600 text-white'
          }`}>
            {isChallenge ? <Zap size={20} className="animate-pulse" /> : <TrendingUp size={20} />}
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              رادار التفاعل والتحليل الحي
              {isChallenge && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  ⚡ سؤال تحدي ذكي
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">متابعة دقيقة لاستجابات الطلاب وتحديد المشتتات المفهومية</p>
          </div>
        </div>

        {onToggleChallenge && (
          <button
            type="button"
            onClick={onToggleChallenge}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
              isChallenge
                ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Zap size={14} />
            {isChallenge ? 'إلغاء وضع التحدي' : '⚡ تعيين كسؤال تحدي'}
          </button>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
          <span className="text-xs font-bold text-slate-500">إجمالي الإجابات</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{totalResponses}</div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
          <span className="text-xs font-bold text-slate-500">المتوقع / المسجل</span>
          <div className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {expectedCount > 0 ? `${totalResponses}/${expectedCount}` : `${totalResponses}`}
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50/70 p-3 text-center dark:bg-emerald-950/30">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">دقة الإجابات</span>
          <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {accuracyRate !== null ? `${accuracyRate}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl bg-purple-50/70 p-3 text-center dark:bg-purple-950/30">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-300">طبيعة السؤال</span>
          <div className="mt-1 text-base font-black text-purple-700 dark:text-purple-400">
            {isChallenge ? 'تحدي استثنائي' : 'سؤال تكويني'}
          </div>
        </div>
      </div>

      {/* Options Breakdown Bar Chart */}
      {options.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>توزيع اختيارات الطلاب على البدائل:</span>
            <span>{totalResponses} طالب شاركوا</span>
          </div>

          <div className="space-y-2">
            {options.map((option, idx) => {
              const count = distribution[String(idx)] || 0;
              const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
              const isCorrect = correctIdx !== undefined && idx === correctIdx;
              const isTopDistractor = distractorIdx === idx && maxWrongCount > 0;

              return (
                <div
                  key={idx}
                  className={`relative overflow-hidden rounded-xl border p-2.5 transition-all ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20'
                      : isTopDistractor
                      ? 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20'
                      : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  {/* Visual Fill Progress */}
                  <div
                    className={`absolute bottom-0 right-0 top-0 opacity-20 transition-all duration-500 ${
                      isCorrect ? 'bg-emerald-500' : isTopDistractor ? 'bg-amber-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg font-black ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isTopDistractor
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}>
                        {OPTION_LETTERS[idx] || idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{option}</span>
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                          <CheckCircle2 size={11} /> الخيار الصحيح
                        </span>
                      )}
                      {isTopDistractor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          الخطأ الشائع (المشتت)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-black">
                      <span className="text-slate-900 dark:text-white">{count} طالب</span>
                      <span className="text-slate-400">({percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distractor Tip for Teacher */}
      {distractorIdx !== null && maxWrongCount > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-black">
            💡 ملاحظة تدريسية للسبورة التفاعلية:
          </p>
          <p className="mt-1">
            اختار {maxWrongCount} طالباً البديل ({OPTION_LETTERS[distractorIdx] || distractorIdx + 1}). ركّز في الشرح الآن على توضيح الفرق بين هذا الخيار والخيار الصحيح لتصحيح المفهوم اللحظي.
          </p>
        </div>
      )}
    </div>
  );
};
