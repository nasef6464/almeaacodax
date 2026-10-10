import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, ListChecks, Target } from 'lucide-react';
import type { Quiz, QuizResult } from '../types';
import { buildQuizRouteWithContext } from '../utils/quizLinks';
import { StudentListPager } from './StudentListPager';
import { getQuizAvailability } from '../utils/quizAvailability';
import { useQuizWindowClock } from '../hooks/useQuizWindowClock';

export const SchoolTestsPanel: React.FC<{
  quizzes: Quiz[];
  examResults: QuizResult[];
  getPathName: (pathId?: string) => string;
  formatQuizDate: (date?: string | number) => string;
}> = ({ quizzes, examResults, getPathName, formatQuizDate }) => {
  const [status, setStatus] = useState<'pending' | 'upcoming' | 'closed' | 'completed'>('pending');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(4);
  useEffect(() => setLimit(4), [status, query]);
  const safeQuizzes = quizzes || [];
  const safeResults = examResults || [];
  const now = useQuizWindowClock(safeQuizzes);
  const isCompleted = (quiz: Quiz) => {
    const attempts = safeResults.filter(result => result?.quizId === (quiz.id || (quiz as any)._id)).length;
    const hasRetake = quiz.viewerRetakeGranted && getQuizAvailability(quiz, now) !== 'closed' && attempts < (quiz.settings?.maxAttempts ?? 1);
    return attempts > 0 && !hasRetake;
  };
  const completedCount = safeQuizzes.filter(isCompleted).length;
  const getStatus = (quiz: Quiz) => isCompleted(quiz) ? 'completed' : getQuizAvailability(quiz, now) === 'available' ? 'pending' : getQuizAvailability(quiz, now);
  const pendingCount = safeQuizzes.filter(q => getStatus(q) === 'pending').length;
  const upcomingCount = safeQuizzes.filter(q => getStatus(q) === 'upcoming').length;
  const closedCount = safeQuizzes.filter(q => getStatus(q) === 'closed').length;
  useEffect(() => { if (status === 'upcoming' && upcomingCount === 0) setStatus('pending'); }, [status, upcomingCount]);
  const filteredQuizzes = safeQuizzes.filter(quiz => {
    return getStatus(quiz) === status && (quiz.title || '').includes(query.trim());
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Target size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">اختبارات المدرسة</h1>
                <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-black text-indigo-700">توجيه مباشر</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-bold text-gray-500">ابدأ بالمطلوب منك. الاختبارات التي حللتها موجودة في «تم حلها».</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-2.5 text-center shadow-xs">
              <div className="text-lg font-black text-indigo-600">{safeQuizzes.length}</div>
              <div className="text-[10px] font-bold text-gray-400">إجمالي الموجه</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-center shadow-xs">
              <div className="text-lg font-black text-emerald-700">{completedCount}</div>
              <div className="text-[10px] font-bold text-emerald-600">تم حلها</div>
            </div>
            {pendingCount > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-2.5 text-center shadow-xs">
                <div className="text-lg font-black text-amber-700">{pendingCount}</div>
                <div className="text-[10px] font-bold text-amber-600">بانتظارك</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="حالة اختبارات المدرسة">
        <button type="button" aria-pressed={status === 'pending'} onClick={() => setStatus('pending')} className={'rounded-xl px-4 py-2 text-sm font-bold ' + (status === 'pending' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border')}>المطلوب مني ({pendingCount})</button>
        <button type="button" aria-pressed={status === 'completed'} onClick={() => setStatus('completed')} className={'rounded-xl px-4 py-2 text-sm font-bold ' + (status === 'completed' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border')}>تم حلها ({completedCount})</button>
        {upcomingCount > 0 && <button type="button" aria-pressed={status === 'upcoming'} onClick={() => setStatus('upcoming')} className={'rounded-xl px-4 py-2 text-sm font-bold ' + (status === 'upcoming' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border')}>قادمة ({upcomingCount})</button>}
        {closedCount > 0 && <button type="button" aria-pressed={status === 'closed'} onClick={() => setStatus('closed')} className={'rounded-xl px-4 py-2 text-sm font-bold ' + (status === 'closed' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border')}>انتهت إتاحتها ({closedCount})</button>}
      </div>
      {status === 'completed' ? <Link to="/my-quizzes?context=school_assessment" className="inline-block text-sm font-bold text-indigo-700 underline">كل نتائج المدرسة السابقة</Link> : null}
      {safeQuizzes.length > 4 ? <label className="block text-sm font-bold text-slate-600">ابحث عن اختبار<input value={query} onChange={e => setQuery(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" /></label> : null}
      <section data-testid="student-directed-tests" className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-gray-900">{status === 'pending' ? 'المطلوب منك الآن' : status === 'completed' ? 'اختبارات حللتها' : status === 'upcoming' ? 'اختبارات قادمة' : 'اختبارات انتهت إتاحتها'}</h2>
            {status === 'pending' && pendingCount > 0 ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-700 animate-pulse">
                {pendingCount} في انتظار الحل
              </span>
            ) : null}
          </div>
          <span className="rounded-full border border-indigo-100 bg-white px-3.5 py-1 text-xs font-black text-indigo-700 shadow-2xs">
            {safeQuizzes.length} اختبار مدرسي
          </span>
        </div>

        {filteredQuizzes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredQuizzes.slice(0, limit).map((quiz, index) => {
              if (!quiz) return null;
              const quizId = quiz.id || (quiz as any)._id || `school-quiz-${index}`;
              const completedResult = safeResults.find((result) => result?.quizId === quizId);
              const availability = getQuizAvailability(quiz, now);
              const attemptsUsed = safeResults.filter(result => result?.quizId === quizId).length;
              const canStart = availability === 'available' && attemptsUsed < (quiz.settings?.maxAttempts ?? 1);
              const route = buildQuizRouteWithContext(quizId, { returnTo: '/dashboard?tab=school-tests', source: 'tests' });
              const questionCount = quiz.quizKind === 'mock'
                ? (quiz.mockExam?.sections?.reduce((sum, section) => sum + (section.questionIds?.length || 0), 0) || (quiz.questionIds || []).length)
                : (quiz.questionIds || []).length;
              return (
                <article
                  key={quizId}
                  data-testid={`student-directed-test-${quizId}`}
                  className="flex flex-col rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-gray-900 leading-tight">
                        <span className="inline-block px-3 py-0.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100 font-extrabold shadow-2xs">
                          {quiz.title}
                        </span>
                      </h3>
                      <p className="mt-1.5 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-black text-indigo-700">
                        {getPathName(quiz.pathId)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                        completedResult
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {quiz.viewerRetakeGranted && attemptsUsed < (quiz.settings?.maxAttempts ?? 1) ? (availability === 'upcoming' ? 'إعادة قادمة' : availability === 'closed' ? 'انتهت إتاحة الإعادة' : 'إعادة متاحة') : completedResult ? (completedResult.score != null ? `تم الحل (${completedResult.score}%)` : 'تم الحل') : availability === 'upcoming' ? 'قادم' : availability === 'closed' ? 'انتهت الإتاحة' : 'متاح الآن'}
                    </span>
                  </div>

                  <div className="mt-3.5 flex-1 rounded-xl bg-gray-50/80 p-3 text-xs font-bold leading-relaxed text-gray-600 border border-gray-100">
                    <span className="text-indigo-600 font-black ml-1">💬 رسالة المشرف:</span>
                    {typeof quiz.supervisorMessage === 'string' && quiz.supervisorMessage
                      ? quiz.supervisorMessage
                      : typeof quiz.description === 'string' && quiz.description
                        ? quiz.description
                        : 'اختبار موجه من المدرسة للمتابعة والقياس.'}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1">
                      <ListChecks size={13} /> {questionCount} سؤال
                    </span>
                    {quiz.opensAt ? <span className="rounded-lg bg-indigo-50 px-2.5 py-1">يبدأ {new Date(quiz.opensAt).toLocaleString('ar-SA')}</span> : null}
                    {quiz.closesAt || quiz.dueDate ? (
                      <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700 border border-amber-100">
                        <Clock size={13} /> حتى {quiz.closesAt ? new Date(quiz.closesAt).toLocaleString('ar-SA') : formatQuizDate(quiz.dueDate)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3.5">
                    {completedResult ? (
                      <Link
                        to={`/results?attempt=${encodeURIComponent(completedResult.date || '')}`}
                        className="text-xs font-black text-emerald-700 hover:underline"
                      >
                        عرض التقرير الكامل {completedResult.score != null ? `(${completedResult.score}%)` : ''}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">لم يؤدَ بعد</span>
                    )}

                    {canStart ? <Link
                      to={route}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white transition-colors ${
                        completedResult ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                      }`}
                    >
                      {completedResult ? 'محاولة أخرى' : 'دخول الاختبار الآن'} <ArrowRight size={14} />
                    </Link> : <span className="text-xs font-bold text-gray-500">{availability === 'upcoming' ? 'يفتح في موعده' : availability === 'closed' ? 'انتهت الإتاحة' : 'تم التسليم'}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/90 px-6 py-12 text-center shadow-xs">
            <CheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
            <h2 className="mt-2 text-lg font-black text-gray-900">{query ? 'لا يوجد اختبار بهذا الاسم' : status === 'completed' ? 'لم تحل اختبارًا مدرسيًا بعد' : 'لا توجد اختبارات مدرسية مطلوبة منك الآن'}</h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm font-bold text-gray-500 leading-relaxed">
              يمكنك الرجوع إلى المطلوب منك أو متابعة التعلم. نتائجك السابقة تبقى محفوظة.
            </p>
          </div>
        )}
      <StudentListPager shown={limit} total={filteredQuizzes.length} onMore={() => setLimit(n => n + 4)} onLess={() => setLimit(4)} />
      </section>
    </div>
  );
};
