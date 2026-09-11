import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Copy, ExternalLink, Presentation, RefreshCw, Users, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import type { TeacherWorkspaceData } from '../components/teacher/TeacherWorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { ClassroomTeacherLiveRadar } from '../components/classroom/ClassroomTeacherLiveRadar';
import type { ClassroomSavedReport } from '../components/classroom/SmartClassroomReportsSection';

type ClassroomQuestion = { questionId: string; text: string; options: string[]; type: string; isChallenge?: boolean };

export const ClassroomTeacherConsole: React.FC = () => {
  const { sessionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [workspace, setWorkspace] = useState<TeacherWorkspaceData | null>(null);
  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') || '');
  const [classId, setClassId] = useState(searchParams.get('classId') || '');
  const [questions, setQuestions] = useState<ClassroomQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [challengeIds, setChallengeIds] = useState<string[]>([]);
  const selectedSchool = useMemo(() => workspace?.schools.find((school) => school.schoolId === schoolId), [schoolId, workspace]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try { setData(await api.getClassroomAggregate(sessionId)); }
    catch { setMessage('تعذر قراءة حالة الجلسة.'); }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);
  useClassroomRealtime(sessionId, load);

  useEffect(() => {
    if (sessionId) return;
    let active = true;
    api.getSchoolTeacherWorkspace().then((result) => {
      if (!active) return;
      setWorkspace(result);
      const initialSchool = result.schools.find((school) => school.schoolId === schoolId) || result.schools[0];
      if (!initialSchool) return;
      setSchoolId(initialSchool.schoolId);
      if (!initialSchool.assignments.some((assignment) => assignment.classId === classId)) setClassId(initialSchool.assignments[0]?.classId || '');
    }).catch(() => setMessage('تعذر تحميل الفصول المسندة لك.'));
    return () => { active = false; };
  }, [classId, schoolId, sessionId]);

  const chooseSchool = (nextSchoolId: string) => {
    setSchoolId(nextSchoolId);
    const school = workspace?.schools.find((entry) => entry.schoolId === nextSchoolId);
    setClassId(school?.assignments[0]?.classId || '');
    setQuestions([]);
    setSelectedIds([]);
    setChallengeIds([]);
  };

  const loadQuestions = async () => {
    try {
      const result = await api.getClassroomQuestions(schoolId);
      setQuestions(result.questions);
      setMessage('اختر من 1 إلى 10 أسئلة معتمدة للحصة الذكية.');
    } catch {
      setMessage('تعذر تحميل بنك الأسئلة. تحقق من المدرسة وصلاحية الإسناد.');
    }
  };

  const toggleChallenge = (id: string) => {
    setChallengeIds((prev) => prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]);
  };

  const create = async () => {
    try {
      const result = await api.createClassroomSession({ schoolId, classId, questionIds: selectedIds });
      setMessage(`تم إنشاء الحصة. رمز الانضمام: ${result.pin}`);
      sessionStorage.setItem(`classroom_pin_${result.sessionId}`, result.pin);
      sessionStorage.setItem(`classroom_challenges_${result.sessionId}`, JSON.stringify(challengeIds));
      navigate(`/classroom/${result.sessionId}/teacher`);
    } catch {
      setMessage('تعذر إنشاء الحصة. يجب اختيار فصل مسند وأسئلة معتمدة.');
    }
  };

  const publish = async (index: number) => {
    try {
      await api.publishClassroomQuestion(sessionId, index);
      await load();
      setMessage(`تم نشر السؤال ${index + 1} مباشرة لجميع الطلاب.`);
    } catch {
      setMessage('تعذر نشر السؤال.');
    }
  };

  const end = async () => {
    try {
      const result = await api.endClassroomSession(sessionId);
      const report = result.report;
      setData((current: any) => ({ ...current, report, status: 'ended' }));
      setMessage('تم إنهاء الجلسة وتثبيت التقرير بنجاح.');
      
      // Save report in persistent teacher archive
      if (report && schoolId) {
        try {
          const currentReports: ClassroomSavedReport[] = JSON.parse(localStorage.getItem(`smart_classroom_reports_${schoolId}`) || '[]');
          const newReport: ClassroomSavedReport = {
            sessionId,
            schoolId,
            classId,
            participantCount: report.participantCount || 0,
            responseCount: report.responseCount || 0,
            correctCount: report.correctCount || 0,
            endedAt: report.endedAt || new Date().toISOString(),
            questions: (data?.questions || []).map((q: any) => ({
              questionId: q.questionId,
              text: q.text,
              options: q.options || [],
              isChallenge: challengeIds.includes(q.questionId),
            })),
          };
          localStorage.setItem(`smart_classroom_reports_${schoolId}`, JSON.stringify([newReport, ...currentReports.filter((r) => r.sessionId !== sessionId)].slice(0, 30)));
        } catch {
          // ignore
        }
      }
    } catch {
      setMessage('تعذر إنهاء الجلسة.');
    }
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const storedPin = sessionId ? sessionStorage.getItem(`classroom_pin_${sessionId}`) : '';
  const currentQIndex = data?.activeQuestionIndex;
  const currentQuestion = (data?.questions || []).find((q: any) => q.index === currentQIndex);

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6" dir="rtl">
        {user?.role === 'teacher' && (
          <Link to="/school-teacher-dashboard" className="text-sm font-black text-indigo-700">
            ← العودة إلى لوحة معلم المدرسة
          </Link>
        )}
        <h1 className="mt-4 text-3xl font-black">ابدأ فصلًا ذكيًا</h1>
        <p className="mt-2 text-slate-500">اختر من مدارس وفصول التكليف الفعلي؛ لا حاجة لإدخال أي معرّف يدويًا.</p>
        
        {workspace?.schools.length === 0 && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">
            لا يوجد تكليف مدرسي فعال لهذا الحساب.
          </div>
        )}

        {user?.role === 'admin' && !workspace && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-xl border p-3" placeholder="معرّف المدرسة" />
            <input value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-xl border p-3" placeholder="معرّف الفصل" />
            <button type="button" onClick={() => void loadQuestions()} disabled={!schoolId || !classId} className="rounded-xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50">
              عرض الأسئلة المعتمدة
            </button>
          </div>
        )}

        {workspace && workspace.schools.length > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                المدرسة
                <select value={schoolId} onChange={(e) => chooseSchool(e.target.value)} className="mt-2 block w-full rounded-xl border p-3">
                  {workspace.schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">
                الفصل
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-2 block w-full rounded-xl border p-3">
                  {(selectedSchool?.assignments || []).map((assignment) => (
                    <option key={assignment.assignmentId} value={assignment.classId}>
                      {assignment.className}{assignment.subjectId ? ` — ${assignment.subjectId}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void loadQuestions()}
              disabled={!schoolId || !classId || !selectedSchool?.smartClassroomEnabled}
              className="mt-4 rounded-xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              عرض الأسئلة المعتمدة
            </button>
            {!selectedSchool?.smartClassroomEnabled && (
              <p className="mt-3 text-sm font-bold text-amber-700">وحدة الفصل الذكي غير مفعلة في عقد المدرسة.</p>
            )}

            {questions.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">اختر من 1 إلى 10 أسئلة ({selectedIds.length}/10):</span>
                  <span className="text-xs text-slate-500">يمكنك وسم أي سؤال كـ "سؤال تحدي ⚡"</span>
                </div>
                {questions.map((question) => {
                  const isChecked = selectedIds.includes(question.questionId);
                  const isChallenge = challengeIds.includes(question.questionId);
                  return (
                    <div key={question.questionId} className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                      isChecked ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-white'
                    }`}>
                      <label className="flex flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedIds((ids) => ids.includes(question.questionId) ? ids.filter((id) => id !== question.questionId) : ids.length < 10 ? [...ids, question.questionId] : ids)}
                          className="mt-1"
                        />
                        <span>
                          <b className="text-slate-900">{question.text}</b>
                          <small className="mt-1 block text-slate-500">{question.type} · {question.options.length} خيارات</small>
                        </span>
                      </label>
                      {isChecked && (
                        <button
                          type="button"
                          onClick={() => toggleChallenge(question.questionId)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                            isChallenge ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <Zap size={13} /> {isChallenge ? 'سؤال تحدي ⚡' : 'تعيين كتحدي'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => void create()}
              disabled={!schoolId || !classId || !selectedIds.length}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              إنشاء الحصة ({selectedIds.length}/10)
            </button>
          </>
        )}
        <p className="mt-4 text-sm text-slate-600">{message}</p>
      </main>
    );
  }

  // Active Session Live Console
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
          activeQuestion={currentQuestion ? {
            ...currentQuestion,
            isChallenge: challengeIds.includes(currentQuestion.questionId),
          } : null}
          onToggleChallenge={currentQuestion ? () => toggleChallenge(currentQuestion.questionId) : undefined}
        />
      </div>

      {/* Questions Carousel / List */}
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
                onClick={() => void publish(question.index)}
                disabled={data?.status === 'ended'}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-right transition-all disabled:opacity-50 ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
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
          onClick={() => void end()}
          disabled={data?.status === 'ended'}
          className="rounded-xl bg-rose-600 px-6 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة' : 'إنهاء الجلسة وتثبيت التقرير'}
        </button>

        {user?.role === 'teacher' && (
          <Link to="/school-teacher-dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800">
            العودة للوحة معلم المدرسة →
          </Link>
        )}
      </div>

      {message && <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>}
    </main>
  );
};
