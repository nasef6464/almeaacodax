import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Presentation } from 'lucide-react';
import { ClassroomTeacherLiveRadar } from './ClassroomTeacherLiveRadar';

interface ClassroomActiveSessionPanelProps {
  sessionId: string;
  data: any;
  storedPin: string;
  challengeIds: string[];
  onToggleChallenge: (questionId: string) => void;
  onPublish: (index: number) => void;
  onEnd: () => void;
  message: string;
  isTeacher: boolean;
}

export const ClassroomActiveSessionPanel: React.FC<ClassroomActiveSessionPanelProps> = ({
  sessionId,
  data,
  storedPin,
  challengeIds,
  onToggleChallenge,
  onPublish,
  onEnd,
  message,
  isTeacher,
}) => {
  const [copied, setCopied] = useState(false);

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentQIndex = data?.activeQuestionIndex;
  const currentQuestion = (data?.questions || []).find((q: any) => q.index === currentQIndex);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-400">
            {data?.status === 'ended' ? 'حصة منتهية ومؤرشفة' : 'حصة ذكية مباشرة 🟢'}
          </span>
          <h1 className="mt-2 text-3xl font-black">لوحة تحكم المعلم</h1>
          <p className="mt-1 text-xs text-slate-400">
            الحالة: {data?.status || '...'} · رابط الطلاب: /classroom/{sessionId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {storedPin && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white">
              <span className="text-xs text-slate-300">رمز الانضمام:</span>
              <span className="font-mono text-xl font-black tracking-wider text-amber-400">{storedPin}</span>
              <button type="button" onClick={() => copyPin(storedPin)} className="rounded-lg p-1 hover:bg-white/20 text-xs">
                {copied ? 'تم النسخ!' : <Copy size={16} />}
              </button>
            </div>
          )}
          <Link
            to={`/classroom/${sessionId}/projector`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700"
          >
            <Presentation size={16} /> شاشة السبورة التفاعلية <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Live Radar Analysis Component */}
      <div className="mt-6">
        <ClassroomTeacherLiveRadar
          responseCount={data?.responseCount ?? 0}
          distribution={data?.distribution || {}}
          activeQuestion={
            currentQuestion
              ? {
                  ...currentQuestion,
                  isChallenge: challengeIds.includes(currentQuestion.questionId),
                }
              : null
          }
          onToggleChallenge={currentQuestion ? () => onToggleChallenge(currentQuestion.questionId) : undefined}
        />
      </div>

      {/* Questions List */}
      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">أسئلة الحصة</h2>
          <span className="text-xs text-slate-500">اضغط على أي سؤال لنشره فوراً للطلاب على أجهزتهم</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {(data?.questions || []).map((question: any) => {
            const isActive = data?.activeQuestionIndex === question.index;
            const isChallenge = challengeIds.includes(question.questionId);
            return (
              <button
                key={question.questionId}
                type="button"
                onClick={() => onPublish(question.index)}
                disabled={data?.status === 'ended'}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-right transition-all disabled:opacity-50 ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {question.index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      سؤال {question.index + 1}: {question.text}
                    </span>
                    {isChallenge && (
                      <span className="mr-2 inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                        ⚡ سؤال تحدي
                      </span>
                    )}
                  </div>
                </div>

                <span className={`text-xs font-black ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400'}`}>
                  {isActive ? 'منشور حالياً 🟢' : 'انقر للنشر'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Control Actions & End Session */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onEnd}
          disabled={data?.status === 'ended'}
          className="rounded-xl bg-rose-600 px-6 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة' : 'إنهاء الجلسة وتثبيت التقرير'}
        </button>

        {isTeacher && (
          <Link to="/school-teacher-dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800">
            العودة للوحة معلم المدرسة →
          </Link>
        )}
      </div>

      {message && <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>}
    </main>
  );
};
