import React, { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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
  Flame, 
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';

export interface InteractiveWhiteboardCanvasProps {
  text: string;
  onAskAboutStep?: (stepPrompt: string) => void;
  onSpeakText?: (speechText: string) => void;
  isPending?: boolean;
}

interface ParsedStep {
  id: string;
  index: number;
  title: string;
  type: 'concept' | 'calc' | 'result' | 'flow';
  body: string;
  equations: string[];
}

/**
 * Render KaTeX math formula safely
 */
const renderKaTeX = (latex: string, isBlock = false): string => {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode: isBlock,
    });
  } catch {
    return latex;
  }
};

/**
 * Parses teacher explanation text into pedagogical chalkboard steps
 */
const parseChalkboardSteps = (rawText: string): ParsedStep[] => {
  const clean = rawText.trim();
  if (!clean) return [];

  // Match explicit steps or split into smart pedagogical chunks
  const stepDelimiters = /(?:^|\n)(?=(?:[*#\s]*الخطوة\s*[:\d]|[*#\s]*\d+[\.\)]\s*|[*#\s]*(?:📌|🔢|💡|📐|🎯|✅)|أولاً|ثانياً|ثالثاً|رابعاً|القاعدة\s*الذهبية|السر\s*الجبري|طريقة\s*الحل|الاستنتاج|النتيجة))/gi;
  let chunks = clean.split(stepDelimiters).map((c) => c.trim()).filter(Boolean);

  if (chunks.length <= 1) {
    const paragraphs = clean.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      chunks = paragraphs;
    } else {
      const sentences = clean.split(/(?<=[.!?؟])\s+/).filter(Boolean);
      if (sentences.length >= 3) {
        chunks = [
          sentences.slice(0, Math.ceil(sentences.length / 2)).join(' '),
          sentences.slice(Math.ceil(sentences.length / 2)).join(' '),
        ];
      } else {
        chunks = [clean];
      }
    }
  }

  return chunks.map((chunk, idx) => {
    let title = `الخطوة ${idx + 1}`;
    let type: ParsedStep['type'] = 'calc';

    if (/قاعدة|مفهوم|الفكرة|سر|ذهبية|📌/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: السر الجبري والقاعدة الذهبية`;
      type = 'concept';
    } else if (/حساب|تعويض|ضرب|قسمة|أس|معادلة|🔢|📐/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: خطوات التطبيق والحل`;
      type = 'calc';
    } else if (/خيار|إجابة|نتيجة|أخيراً|💡|🎯|✅/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: النتيجة والخيار النهائي`;
      type = 'result';
    } else if (idx === 0) {
      title = 'الخطوة 1: فكرة المسألة والمعطيات';
      type = 'concept';
    } else if (idx === chunks.length - 1) {
      title = `الخطوة ${idx + 1}: الاستنتاج النهائي`;
      type = 'result';
    }

    // Extract LaTeX equations ($$..$$ or $..$)
    const equations: string[] = [];
    const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
    let match: RegExpExecArray | null;
    while ((match = blockMathRegex.exec(chunk)) !== null) {
      if (match[1]) equations.push(match[1].trim());
    }
    const inlineMathRegex = /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g;
    while ((match = inlineMathRegex.exec(chunk)) !== null) {
      if (match[1] && !equations.includes(match[1].trim())) {
        equations.push(match[1].trim());
      }
    }

    return {
      id: `step-${idx}-${Date.now()}`,
      index: idx + 1,
      title,
      type,
      body: chunk,
      equations,
    };
  });
};

/**
 * Formats mathematical content into themed KaTeX blocks (Dark Slate or Whiteboard)
 */
export const ChalkboardMathContent: React.FC<{ content: string; isDark?: boolean }> = ({ content, isDark = true }) => {
  const parts = useMemo(() => {
    const tokens: Array<{ type: 'text' | 'inline-math' | 'block-math'; value: string }> = [];
    let remaining = content;

    while (remaining.length > 0) {
      const blockIdx = remaining.indexOf('$$');
      const inlineIdx = remaining.search(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/);

      if (blockIdx === -1 && inlineIdx === -1) {
        tokens.push({ type: 'text', value: remaining });
        break;
      }

      if (blockIdx !== -1 && (inlineIdx === -1 || blockIdx <= inlineIdx)) {
        if (blockIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, blockIdx) });
        const endBlock = remaining.indexOf('$$', blockIdx + 2);
        if (endBlock !== -1) {
          tokens.push({
            type: 'block-math',
            value: remaining.slice(blockIdx + 2, endBlock),
          });
          remaining = remaining.slice(endBlock + 2);
        } else {
          tokens.push({ type: 'text', value: remaining.slice(blockIdx) });
          break;
        }
      } else if (inlineIdx !== -1) {
        if (inlineIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, inlineIdx) });
        const match = remaining.slice(inlineIdx).match(/^\$([^\$\n]+?)\$/);
        if (match) {
          tokens.push({ type: 'inline-math', value: match[1] });
          remaining = remaining.slice(inlineIdx + match[0].length);
        } else {
          tokens.push({ type: 'text', value: remaining.slice(inlineIdx, inlineIdx + 1) });
          remaining = remaining.slice(inlineIdx + 1);
        }
      }
    }

    return tokens;
  }, [content]);

  return (
    <div className={`space-y-3 leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {parts.map((part, i) => {
        if (part.type === 'block-math') {
          return (
            <div
              key={i}
              dir="ltr"
              className={`my-3 overflow-x-auto rounded-2xl p-4 text-center text-xl font-bold shadow-inner ${
                isDark
                  ? 'border border-emerald-500/30 bg-slate-900/90 text-emerald-300'
                  : 'border border-violet-200 bg-violet-50/80 text-violet-900 shadow-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, true) }}
            />
          );
        }
        if (part.type === 'inline-math') {
          return (
            <span
              key={i}
              dir="ltr"
              className={`mx-1 inline-block rounded-lg px-2 py-0.5 font-bold ${
                isDark
                  ? 'border border-emerald-500/20 bg-emerald-950/40 text-emerald-300'
                  : 'border border-violet-200 bg-violet-100/80 text-violet-950'
              }`}
              dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, false) }}
            />
          );
        }
        return (
          <span key={i} className={`whitespace-pre-wrap leading-8 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
};

export const InteractiveWhiteboardCanvas: React.FC<InteractiveWhiteboardCanvasProps> = ({
  text,
  onAskAboutStep,
  onSpeakText,
  isPending = false,
}) => {
  const steps = useMemo(() => parseChalkboardSteps(text), [text]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'video_steps' | 'full_chalkboard'>('video_steps');
  const [boardTheme, setBoardTheme] = useState<'dark' | 'light'>('dark');
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = boardTheme === 'dark';
  const activeStep = steps[Math.min(currentStepIdx, Math.max(0, steps.length - 1))];

  // Auto-play steps simulation (video-like walkthrough)
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    // Read the current step audio when step transitions
    if (activeStep && onSpeakText) {
      onSpeakText(activeStep.body);
    }

    playTimerRef.current = setTimeout(() => {
      setCurrentStepIdx((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 7000); // 7 seconds per step in auto-walkthrough

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentStepIdx, steps.length, activeStep, onSpeakText]);

  // Extract all equations across steps for summary progression
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
      {/* Blackboard Control Bar */}
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

          {/* Theme Switcher Toggle: Black Chalkboard vs Whiteboard */}
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

        {/* Video Player Style Controls */}
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
                  setCurrentStepIdx((i) => Math.max(0, i - 1));
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
                  setCurrentStepIdx((i) => Math.min(steps.length - 1, i + 1));
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

      {/* Main Blackboard View */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === 'video_steps' ? (
          <div className="flex h-full flex-col justify-between space-y-3">
            {/* Themed Step Card */}
            <div className={`rounded-3xl p-5 shadow-2xl transition-all sm:p-7 ${
              isDark 
                ? 'border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900' 
                : 'border border-violet-200 bg-white shadow-lg'
            }`}>
              <div className={`mb-4 flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-violet-100 text-violet-700'
                  }`}>
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h4 className={`text-base font-black sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeStep.title}
                    </h4>
                    <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-violet-600'}`}>
                      سبورة ذكية تفاعلية • شرح رياضي بالخطوات
                    </span>
                  </div>
                </div>

                {onSpeakText && (
                  <button
                    type="button"
                    onClick={() => onSpeakText(activeStep.body)}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-black ${
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

              {/* Step Content */}
              <div className="text-base font-bold sm:text-lg">
                <ChalkboardMathContent content={activeStep.body} isDark={isDark} />
              </div>
            </div>

            {/* In-Step Interactive Pause & Inquire (NotebookLM Style) */}
            <div className={`rounded-2xl border p-3 sm:p-4 ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-400">
                <span className={`flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-violet-700'}`}>
                  <Flame size={14} />
                  أوقف الشرح واستفسر عن هذه النقطة:
                </span>
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  انقر على أي سؤال ليجيبك المعلم فوراً
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsPlaying(false);
                    onAskAboutStep?.(
                      `أوقف الشرح هنا: وضح لي "${activeStep.title}" بشكل أبسط، ولماذا قمنا بهذه الخطوة تحديداً؟`
                    );
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black shadow disabled:opacity-50 ${
                    isDark 
                      ? 'border-slate-700 bg-slate-800 text-emerald-300 hover:bg-slate-700' 
                      : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                  }`}
                >
                  <HelpCircle size={15} />
                  استفسر: لماذا قمنا بهذه الخطوة؟
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsPlaying(false);
                    onAskAboutStep?.(
                      `أعطني مثالاً مشابهاً على فكرة "${activeStep.title}" لأحلّه بنفسي للتأكد من فهمي.`
                    );
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black shadow disabled:opacity-50 ${
                    isDark 
                      ? 'border-slate-700 bg-slate-800 text-cyan-300 hover:bg-slate-700' 
                      : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <Sparkles size={15} />
                  أعطني مثالاً مشابهاً على هذه النقطة
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Full Chalkboard View (Timeline with Equations Flow) */
          <div className="space-y-4 pb-2">
            {/* Summary Equation Progression if equations exist */}
            {allEquations.length >= 2 && (
              <div className={`rounded-2xl border p-4 shadow-inner ${
                isDark ? 'border-emerald-500/30 bg-slate-950' : 'border-violet-200 bg-violet-50/50'
              }`}>
                <div className={`mb-3 flex items-center gap-2 text-xs font-black ${isDark ? 'text-emerald-400' : 'text-violet-700'}`}>
                  <ArrowDown size={14} />
                  تسلسل الحل الرياضي السريع (Recap Flow):
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

            {/* All Steps Stacked */}
            {steps.map((step) => (
              <div
                key={step.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`mb-3 flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-violet-100 text-violet-700'
                    }`}>
                      <CheckCircle2 size={16} />
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
