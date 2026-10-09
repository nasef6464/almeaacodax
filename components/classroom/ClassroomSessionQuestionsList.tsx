import React from 'react';
import { PlusCircle, Zap, SkipForward } from 'lucide-react';
import { QuestionContentRenderer } from './QuestionContentRenderer';

interface ClassroomSessionQuestionsListProps {
  data: any;
  hasActiveBatch: boolean;
  endingBatch: boolean;
  onEndBatch: () => void;
  availablePushQuestionsCount: number;
  bankReady?: boolean;
  onDirectSendPreset: (count: number) => void;
  pushingQuestions: boolean;
  loadingBank: boolean;
  bankError: string | null;
  openPushModal: (mode: 'normal' | 'challenge') => void;
  pushChallengeSeconds: number;
  onChangePushChallengeSeconds: (sec: number) => void;
  currentQIndex: number | undefined;
  onPublish: (index: number) => void;
  canonicalChallengeIds: string[];
  challengeIds: string[];
  showPushModal: boolean;
  pushMode: 'normal' | 'challenge';
}

export const ClassroomSessionQuestionsList: React.FC<ClassroomSessionQuestionsListProps> = ({
  data,
  hasActiveBatch,
  endingBatch,
  onEndBatch,
  availablePushQuestionsCount,
  bankReady = true,
  onDirectSendPreset,
  pushingQuestions,
  loadingBank,
  bankError,
  openPushModal,
  pushChallengeSeconds,
  onChangePushChallengeSeconds,
  currentQIndex,
  onPublish,
  canonicalChallengeIds,
  challengeIds,
  showPushModal,
  pushMode,
}) => {
  const isEnded = data?.status === 'ended';

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">أسئلة الحصة التفاعلية</h2>
          <p className="text-xs text-slate-500">الترتيب: أرسل دفعة، تابع التسليم، أنهِ الدفعة واعرض ملخصها، ثم ابدأ التالية.</p>
          {bankError && <p className="mt-2 text-xs font-bold text-rose-600">{bankError}</p>}
          {loadingBank && <p className="mt-2 text-xs font-bold text-indigo-600">جارٍ تحديث بنك الأسئلة المصرح من الخادم…</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveBatch && (
            <button
              type="button"
              onClick={onEndBatch}
              disabled={isEnded || endingBatch}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {endingBatch ? 'جارٍ إنهاء الدفعة…' : 'إنهاء الدفعة وعرض ملخصها'}
            </button>
          )}
          {!hasActiveBatch && (!bankReady || availablePushQuestionsCount >= 5) && (
            <button
              type="button"
              onClick={() => onDirectSendPreset(5)}
              disabled={isEnded || pushingQuestions || loadingBank}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50"
            >
              ⚡ إرسال 5 أسئلة فوراً
            </button>
          )}
          {!hasActiveBatch && (!bankReady || availablePushQuestionsCount >= 10) && (
            <button
              type="button"
              onClick={() => onDirectSendPreset(10)}
              disabled={isEnded || pushingQuestions || loadingBank}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-700 shadow-xs disabled:opacity-50"
            >
              ⚡ إرسال 10 أسئلة فوراً
            </button>
          )}
          <button
            type="button"
            onClick={() => openPushModal('normal')}
            disabled={isEnded || hasActiveBatch || loadingBank}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            <PlusCircle size={14} /> تخصيص حزمة مهارة
          </button>
          <select
            value={pushChallengeSeconds}
            onChange={(event) => onChangePushChallengeSeconds(Number(event.target.value))}
            disabled={isEnded || hasActiveBatch}
            className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-800"
          >
            <option value={30}>30 ث</option>
            <option value={45}>45 ث</option>
            <option value={60}>60 ث</option>
            <option value={90}>90 ث</option>
          </select>
          <button
            type="button"
            onClick={() => openPushModal('challenge')}
            disabled={isEnded || hasActiveBatch || loadingBank}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            <Zap size={14} /> إنشاء دفعة تحدي مستقلة
          </button>
          {currentQIndex !== undefined && currentQIndex < (data?.questions || []).length - 1 && (
            <button
              type="button"
              onClick={() => onPublish(currentQIndex + 1)}
              disabled={isEnded}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100"
            >
              <SkipForward size={14} /> الانتقال للسؤال التالي
            </button>
          )}
        </div>
      </div>
      {showPushModal && pushMode === 'challenge' && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          وضع التحدي مفعل: الأسئلة التي ستحددها ستصبح دفعة جديدة مستقلة لمدة {pushChallengeSeconds} ثانية، ويبدأ المؤقت والترتيب فور الإرسال.
        </div>
      )}
      <div className="mt-4 space-y-3">
        {(data?.questions || []).map((question: any) => {
          const isActive = data?.activeQuestionIndex === question.index;
          const isChallenge = canonicalChallengeIds.includes(question.questionId) || challengeIds.includes(question.questionId);
          return (
            <div
              key={question.questionId}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 ${
                isActive ? 'border-indigo-600 bg-indigo-50/70' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {question.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm">
                    <span className="text-indigo-600 ml-1 font-black">سؤال {question.index + 1}:</span>
                    <QuestionContentRenderer content={question.text} className="inline-block align-middle max-h-24 overflow-hidden" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{question.options?.length || 4} خيارات</span>
                    {isChallenge && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-800">
                        ⚡ تحدي سريع
                      </span>
                    )}
                    {isActive && <span className="font-black text-emerald-600">● معروض على أجهزة الطلاب</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onPublish(question.index)}
                  disabled={isEnded}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isActive ? 'منشور حالياً ✓' : 'نشر اعتيادي'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
