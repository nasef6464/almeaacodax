import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Flame, Maximize, Minimize, Presentation, Send, Sparkles, Users } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

export const ClassroomProjectorView: React.FC = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  useEffect(() => {
    const isPresenter = user?.role && ['teacher', 'school_admin', 'supervisor', 'admin'].includes(user.role);
    if (user && !isPresenter) {
      navigate(`/classroom/${sessionId}`, { replace: true });
    }
  }, [user, sessionId, navigate]);

  const load = useCallback(async () => {
    try {
      const res = await api.getClassroomAggregate(sessionId);
      setData(res);
      if (typeof res?.activeQuestionIndex === 'number') {
        setSelectedQuestionIdx((prev) => (prev === null ? res.activeQuestionIndex : prev));
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useClassroomRealtime(sessionId, load);

  const questions = data?.questions || [];
  const activeQuestionIndex = data?.activeQuestionIndex ?? 0;
  const currentQ = questions[selectedQuestionIdx] || questions[activeQuestionIndex] || questions[0];
  const isCurrentActive = currentQ && currentQ.index === activeQuestionIndex;
  const totalResponses = currentQ?.responseCount ?? (isCurrentActive ? (data?.responseCount || 0) : 0);
  const distribution: Record<string, number> = currentQ?.distribution || (isCurrentActive ? (data?.distribution || {}) : {});

  const analytics = useMemo(() => {
    if (!currentQ || !currentQ.options) return { percentages: {}, maxWrongOption: null };
    const percentages: Record<number, number> = {};
    let maxWrongCount = 0;
    let maxWrongIndex: number | null = null;
    const correctIdx = typeof currentQ.correctOptionIndex === 'number' ? currentQ.correctOptionIndex : null;
    currentQ.options.forEach((_: any, idx: number) => {
      const count = distribution[String(idx)] || 0;
      percentages[idx] = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
      if (correctIdx !== null && idx !== correctIdx && count > maxWrongCount) {
        maxWrongCount = count;
        maxWrongIndex = idx;
      }
    });
    const maxWrongPercent = maxWrongIndex !== null ? percentages[maxWrongIndex] : 0;
    return {
      percentages,
      maxWrongOption: maxWrongIndex !== null && maxWrongPercent >= 20
        ? {
            index: maxWrongIndex,
            letter: OPTION_LETTERS[maxWrongIndex] || `${maxWrongIndex + 1}`,
            percent: maxWrongPercent,
            count: maxWrongCount,
          }
        : null,
    };
  }, [currentQ, distribution, totalResponses]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePublishCurrent = async () => {
    if (!currentQ || publishing) return;
    setPublishing(true);
    try {
      await api.publishClassroomQuestion(sessionId, currentQ.index);
      await load();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none" dir="rtl">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/classroom/${sessionId}`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft size={16} /> العودة للوحة المعلم
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400">
                <Presentation size={20} />
              </span>
              <div>
                <h1 className="text-base font-black text-white">السبورة الذكية التفاعلية</h1>
                <p className="text-[11px] text-slate-400">شاشة العرض والمناقشة الجماعية للفصل</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            {questions.map((q: any, idx: number) => {
              const isSelected = idx === selectedQuestionIdx;
              const isLive = idx === activeQuestionIndex;
              return (
                <button
                  key={q.questionId || idx}
                  type="button"
                  onClick={() => {
                    setSelectedQuestionIdx(idx);
                    setShowExplanation(false);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>س {idx + 1}</span>
                  {isLive && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 border border-slate-700">
              <Users size={16} className="text-indigo-400" />
              <span>إجابات الطلاب:</span>
              <span className="font-mono text-base font-black text-emerald-400">{totalResponses}</span>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full flex flex-col justify-between">
        {!currentQ ? (
          <div className="my-auto text-center p-12">
            <Presentation size={64} className="mx-auto text-slate-700 mb-4 animate-pulse" />
            <h2 className="text-3xl font-black text-white">بانتظار إطلاق الأسئلة</h2>
            <p className="mt-2 text-slate-400">لم يتم اختيار أو إرسال أسئلة في هذه الحصة بعد</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-indigo-500/20 px-3 py-1.5 text-xs font-black text-indigo-400 border border-indigo-500/30">
                  السؤال {currentQ.index + 1} من {questions.length}
                </span>
                {isCurrentActive ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 border border-emerald-500/30 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> معروض حالياً على تابلت الطلاب
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePublishCurrent()}
                    disabled={publishing}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-indigo-500 shadow-md transition-all active:scale-95"
                  >
                    <Send size={13} /> إرسال هذا السؤال الآن للطلاب
                  </button>
                )}
                {currentQ.type === 'challenge' && (
                  <span className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-300 border border-amber-500/30">
                    <Flame size={14} /> تحدي سرعة ⚡
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all shadow-md active:scale-95 ${
                    showExplanation
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'border border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-750'
                  }`}
                >
                  {showExplanation ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showExplanation ? 'إخفاء الشرح والحل النموذجي' : 'إظهار الشرح والحل النموذجي للسبورة 💡'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
              <h2 className="text-2xl sm:text-4xl font-black leading-relaxed sm:leading-loose text-white tracking-wide">
                {currentQ.text}
              </h2>
              {currentQ.imageUrl && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 max-h-80 flex items-center justify-center bg-black/40">
                  <img src={currentQ.imageUrl} alt="توضيح السؤال" className="max-h-80 object-contain" />
                </div>
              )}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentQ.options || []).map((option: string, idx: number) => {
                  const percent = analytics.percentages[idx] || 0;
                  const count = distribution[String(idx)] || 0;
                  const isCorrect = showExplanation && currentQ.correctOptionIndex === idx;
                  const isCommonMistake = showExplanation && analytics.maxWrongOption?.index === idx;
                  return (
                    <div
                      key={idx}
                      className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-950/40 shadow-xl shadow-emerald-500/10'
                          : isCommonMistake
                          ? 'border-rose-500/80 bg-rose-950/30 shadow-lg'
                          : 'border-slate-800 bg-slate-850/70 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`absolute inset-y-0 right-0 opacity-15 transition-all duration-700 ${
                          isCorrect ? 'bg-emerald-500' : isCommonMistake ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                              isCorrect
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {OPTION_LETTERS[idx] || idx + 1}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-white leading-normal">{option}</span>
                        </div>
                        <div className="flex items-center gap-2 text-left shrink-0">
                          {isCorrect && (
                            <span className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={14} /> صحيح ✓
                            </span>
                          )}
                          <span className="font-mono text-lg font-black text-slate-300">{percent}%</span>
                          <span className="text-xs text-slate-500">({count})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {analytics.maxWrongOption && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 text-rose-200 flex items-start gap-3 shadow-lg">
                <AlertTriangle size={24} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-base font-black text-rose-300">تشخيص الفصل: خطأ شائع ملحوظ في هذا السؤال!</h4>
                  <p className="text-sm mt-1 text-rose-200 leading-relaxed">
                    نسبة <strong className="text-rose-100 font-black">{analytics.maxWrongOption.percent}%</strong> من الطلاب اختاروا البديل ({analytics.maxWrongOption.letter})، وهو أكثر خيار خاطئ تم اختياره ({analytics.maxWrongOption.count} طالباً). يرجى توضيح سبب الخلل في هذا المفهوم على السبورة.
                  </p>
                </div>
              </div>
            )}

            {showExplanation && (
              <div className="rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-8 shadow-2xl text-right animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                    <Sparkles size={20} />
                    <span>المهارة المستهدفة والشرح النموذجي</span>
                  </div>
                  {currentQ.skillIds && currentQ.skillIds.length > 0 && (
                    <span className="rounded-xl bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-300 border border-indigo-500/30">
                      مهارة: {currentQ.skillIds.join(' • ')}
                    </span>
                  )}
                </div>
                <div className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed">
                  {currentQ.explanation ? (
                    <div className="whitespace-pre-line font-medium">{currentQ.explanation}</div>
                  ) : (
                    <p className="text-slate-400 italic">لا يوجد شرح مسجل مسبقاً لهذا السؤال في بنك الأسئلة.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            disabled={selectedQuestionIdx <= 0}
            onClick={() => {
              setSelectedQuestionIdx((p) => Math.max(0, p - 1));
              setShowExplanation(false);
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronRight size={18} /> السؤال السابق
          </button>
          <div className="text-center">
            <span className="text-xs text-slate-500 font-bold">استخدم أزرار التنقل أو الأسهم لاستعراض الأسئلة على السبورة</span>
          </div>
          <button
            type="button"
            disabled={selectedQuestionIdx >= questions.length - 1}
            onClick={() => {
              setSelectedQuestionIdx((p) => Math.min(questions.length - 1, p + 1));
              setShowExplanation(false);
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95"
          >
            السؤال التالي <ChevronLeft size={18} />
          </button>
        </footer>
      </main>
    </div>
  );
};
