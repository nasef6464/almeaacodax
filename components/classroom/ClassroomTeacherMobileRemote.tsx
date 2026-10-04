import React from 'react';

interface ClassroomTeacherMobileRemoteProps {
  currentQIndex?: number;
  totalQuestions: number;
  responseCount: number;
  expectedCount: number;
  showInlineExplanation: boolean;
  onToggleExplanation: () => void;
  onPublishNext?: () => void;
  hasActiveBatch: boolean;
  endingBatch: boolean;
  onEndBatch: () => void;
  onOpenPushModal: () => void;
  isEnded: boolean;
}

export const ClassroomTeacherMobileRemote: React.FC<ClassroomTeacherMobileRemoteProps> = ({
  currentQIndex,
  totalQuestions,
  responseCount,
  expectedCount,
  showInlineExplanation,
  onToggleExplanation,
  onPublishNext,
  hasActiveBatch,
  endingBatch,
  onEndBatch,
  onOpenPushModal,
  isEnded,
}) => {
  return (
    <aside
      aria-label="شريط ريموت المعلم المتنقل"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800 p-3 text-white backdrop-blur-md shadow-2xl"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-black text-indigo-400 truncate">
            سؤال {(currentQIndex ?? 0) + 1} من {totalQuestions || 1}
          </span>
          <span className="text-[10px] text-slate-300">
            أجاب: <strong className="text-emerald-400">{responseCount}</strong> / {expectedCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleExplanation}
            className={`rounded-xl px-2.5 py-2 text-xs font-black transition-all ${
              showInlineExplanation
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {showInlineExplanation ? 'إخفاء' : 'كشف الحل'}
          </button>
          {currentQIndex !== undefined && onPublishNext ? (
            <button
              type="button"
              onClick={onPublishNext}
              disabled={isEnded}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              التالي ⏭
            </button>
          ) : hasActiveBatch ? (
            <button
              type="button"
              onClick={onEndBatch}
              disabled={endingBatch}
              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
            >
              إنهاء الدفعة
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPushModal}
              disabled={isEnded}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
            >
              + إرسال
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
