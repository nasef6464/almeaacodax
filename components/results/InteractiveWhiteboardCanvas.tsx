import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Volume2,
  Layers,
  Sparkles,
  CheckCircle2,
  ArrowDown,
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';
import {
  InteractiveWhiteboardCanvasProps,
  parseChalkboardSteps,
  renderKaTeX,
  ChalkboardMathContent,
} from './whiteboardParser';

export { ChalkboardMathContent } from './whiteboardParser';
export type { InteractiveWhiteboardCanvasProps } from './whiteboardParser';

export const InteractiveWhiteboardCanvas: React.FC<InteractiveWhiteboardCanvasProps> = ({
  text,
  onAskAboutStep,
  onSpeakText,
  isPending = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  boardTheme: controlledBoardTheme,
  onBoardThemeChange,
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  currentStepIdx: controlledStepIdx,
  onStepChange,
  showInternalControls = true,
}) => {
  const steps = useMemo(() => parseChalkboardSteps(text), [text]);

  const [localStepIdx, setLocalStepIdx] = useState(0);
  const [localViewMode, setLocalViewMode] = useState<'video_steps' | 'full_chalkboard'>('video_steps');
  const [localBoardTheme, setLocalBoardTheme] = useState<'dark' | 'light'>('dark');
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  const viewMode = controlledViewMode ?? localViewMode;
  const boardTheme = controlledBoardTheme ?? localBoardTheme;
  const isPlaying = controlledIsPlaying ?? localIsPlaying;
  const currentStepIdx = controlledStepIdx ?? localStepIdx;

  const setViewMode = (mode: 'video_steps' | 'full_chalkboard') => {
    onViewModeChange ? onViewModeChange(mode) : setLocalViewMode(mode);
  };
  const setBoardTheme = (theme: 'dark' | 'light') => {
    onBoardThemeChange ? onBoardThemeChange(theme) : setLocalBoardTheme(theme);
  };
  const setIsPlaying = (playing: boolean) => {
    if (onTogglePlay) {
      if (playing !== isPlaying) onTogglePlay();
    } else {
      setLocalIsPlaying(playing);
    }
  };
  const setCurrentStepIdx = (idx: number | ((prev: number) => number)) => {
    const nextIdx = typeof idx === 'function' ? idx(currentStepIdx) : idx;
    onStepChange ? onStepChange(nextIdx) : setLocalStepIdx(nextIdx);
  };

  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = boardTheme === 'dark';
  const activeStep = steps[Math.min(currentStepIdx, Math.max(0, steps.length - 1))];

  // Auto-play steps simulation (video-like walkthrough)
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    if (activeStep && onSpeakText) {
      onSpeakText(activeStep.body);
    }

    playTimerRef.current = setTimeout(() => {
      if (currentStepIdx < steps.length - 1) {
        setCurrentStepIdx(currentStepIdx + 1);
      } else {
        setIsPlaying(false);
      }
    }, 7000);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentStepIdx, steps.length, activeStep, onSpeakText]);

  const allEquations = useMemo(() => {
    return steps.flatMap((s) => s.equations).filter(Boolean);
  }, [steps]);

  if (!steps.length) {
    return (
      <div className={`flex h-full min-h-64 flex-col items-center justify-center text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Sparkles size={42} className={isDark ? 'text-emerald-400' : 'text-violet-600'} />
        <h3 className={`mt-4 text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>السبورة الذكية جاهزة</h3>
        <p className="mt-2 text-sm font-bold">ابدأ الشرح لمشاهدة الحل التفاعلي خطوة بخطوة مثل الفيديو.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-3" dir="rtl">
      {/* Optional In-board Control Bar (only when not managed by parent modal header) */}
      {showInternalControls && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl p-2.5 shadow-md ${
          isDark ? 'border border-slate-700 bg-slate-900/90 text-white' : 'border border-slate-200 bg-white text-slate-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('video_steps')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                viewMode === 'video_steps'
                  ? isDark ? 'bg-emerald-600 text-white shadow' : 'bg-violet-600 text-white shadow'
                  : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen size={14} />
              شرح تفاعلي (مثل الفيديو)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setViewMode('full_chalkboard');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                viewMode === 'full_chalkboard'
                  ? isDark ? 'bg-emerald-600 text-white shadow' : 'bg-violet-600 text-white shadow'
                  : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers size={14} />
              عرض كامل السبورة
            </button>

            <button
              type="button"
              onClick={() => setBoardTheme(isDark ? 'light' : 'dark')}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-colors ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="تبديل مظهر السبورة (سوداء / بيضاء)"
            >
              {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-600" />}
              {isDark ? 'سبورة بيضاء' : 'سبورة سوداء'}
            </button>
          </div>

          {viewMode === 'video_steps' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                  isPlaying
                    ? 'bg-amber-600 text-white'
                    : isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-violet-600 text-white hover:bg-violet-500'
                }`}
                title={isPlaying ? 'إيقاف مؤقت للاستفسار' : 'تشغيل العرض التلقائي'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(0);
                }}
                className={`rounded-lg p-1.5 ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                title="إعادة الشرح من البداية"
              >
                <RotateCcw size={15} />
              </button>

              <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentStepIdx + 1} / {steps.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentStepIdx === 0}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx(Math.max(0, currentStepIdx - 1));
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border disabled:opacity-30 ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="الخطوة السابقة"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  disabled={currentStepIdx === steps.length - 1}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1));
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border disabled:opacity-30 ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="الخطوة التالية"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Blackboard View - Maximum space & direct chalkboard writing */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === 'video_steps' ? (
          <div className={`flex h-full min-h-[380px] flex-col justify-between rounded-3xl p-5 shadow-2xl transition-all sm:p-7 ${
            isDark
              ? 'border border-emerald-500/35 bg-gradient-to-b from-[#0c141f] via-slate-950 to-[#0c141f]'
              : 'border border-slate-200 bg-white shadow-lg'
          }`}>
            <div className="space-y-4">
              {/* Step Header on Blackboard */}
              <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${
                    isDark ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-violet-100 text-violet-700'
                  }`}>
                    {activeStep.index}
                  </span>
                  <div>
                    <h4 className={`text-base font-black sm:text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeStep.title}
                    </h4>
                    <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-violet-600'}`}>
                      سبورة ذكية تفاعلية • شرح تفصيلي بالخطوات
                    </span>
                  </div>
                </div>

                {onSpeakText && (
                  <button
                    type="button"
                    onClick={() => onSpeakText(activeStep.body)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="استمع للخطوة"
                  >
                    <Volume2 size={14} />
                    استمع
                  </button>
                )}
              </div>

              {/* Direct Chalkboard Mathematical Content */}
              <div className="text-base font-bold sm:text-lg">
                <ChalkboardMathContent content={activeStep.body} isDark={isDark} />
              </div>
            </div>

            {/* In-Step Interactive Inquire Bar */}
            <div className={`mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <span className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-violet-700'}`}>
                استفسر عن هذه الخطوة:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsPlaying(false);
                    onAskAboutStep?.(`لماذا قمنا بهذه الخطوة تحديداً: "${activeStep.title}"؟`);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black shadow-sm disabled:opacity-50 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-emerald-300 hover:bg-slate-700'
                      : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                  }`}
                >
                  <HelpCircle size={14} />
                  لماذا هذه الخطوة؟
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsPlaying(false);
                    onAskAboutStep?.(`أعطني مثالاً مشابهاً على فكرة "${activeStep.title}" لأتأكد من فهمي.`);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black shadow-sm disabled:opacity-50 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-cyan-300 hover:bg-slate-700'
                      : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <Sparkles size={14} />
                  مثال مشابه
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Full Chalkboard View (Timeline with Equations Flow) */
          <div className="space-y-4 pb-2">
            {allEquations.length >= 2 && (
              <div className={`rounded-2xl border p-4 shadow-inner ${
                isDark ? 'border-emerald-500/30 bg-slate-950' : 'border-violet-200 bg-violet-50/50'
              }`}>
                <div className={`mb-3 flex items-center gap-2 text-xs font-black ${isDark ? 'text-emerald-400' : 'text-violet-700'}`}>
                  <ArrowDown size={14} />
                  تسلسل الحل الرياضي السريع:
                </div>
                <div className="flex flex-col items-center gap-2 text-center" dir="ltr">
                  {allEquations.slice(0, 4).map((eq, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        className={`rounded-xl border px-4 py-2 text-base font-bold ${
                          isDark
                            ? 'border-emerald-500/20 bg-slate-900 text-emerald-300'
                            : 'border-violet-200 bg-white text-violet-900 shadow-sm'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderKaTeX(eq, false) }}
                      />
                      {idx < Math.min(allEquations.length - 1, 3) && (
                        <ArrowDown size={16} className={isDark ? 'text-emerald-500/60' : 'text-violet-400'} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {steps.map((step) => (
              <div
                key={step.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  isDark ? 'border-slate-800 bg-[#0c141f]' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`mb-3 flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                      isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {step.index}
                    </span>
                    <h4 className={`text-sm font-black sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {step.title}
                    </h4>
                  </div>
                  {onSpeakText && (
                    <button
                      type="button"
                      onClick={() => onSpeakText(step.body)}
                      className={`rounded-lg p-1.5 ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                      title="استمع للخطوة"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>
                <div className="text-base font-bold leading-8">
                  <ChalkboardMathContent content={step.body} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
