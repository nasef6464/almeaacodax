import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark, Filter, Presentation, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import type { TeacherWorkspaceData } from '../components/teacher/TeacherWorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { ClassroomQuestionFilterBar, ClassroomFilterState } from '../components/classroom/ClassroomQuestionFilterBar';
import { ClassroomPreparedTemplatesManager, ClassroomPreparedTemplate } from '../components/classroom/ClassroomPreparedTemplatesManager';
import { ClassroomActiveSessionPanel } from '../components/classroom/ClassroomActiveSessionPanel';
import { QuestionContentRenderer } from '../components/classroom/QuestionContentRenderer';

type ClassroomQuestion = {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: string[];
  type: string;
  isChallenge?: boolean;
  pathId?: string;
  subject?: string;
  sectionId?: string;
  difficulty?: string;
  examType?: string;
};

export const ClassroomTeacherConsole: React.FC = () => {
  const { sessionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [workspace, setWorkspace] = useState<TeacherWorkspaceData | null>(null);
  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') || '');
  const [classId, setClassId] = useState(searchParams.get('classId') || '');
  const [questions, setQuestions] = useState<ClassroomQuestion[]>([]);
  const [questionPage, setQuestionPage] = useState(0);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(false);
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [challengeIds, setChallengeIds] = useState<string[]>([]);
  const [creationTab, setCreationTab] = useState<'templates' | 'bank'>('templates');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [filters, setFilters] = useState<ClassroomFilterState>({ track: '', subject: '', difficulty: '', search: '' });
  const liveRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedSchool = useMemo(() => workspace?.schools.find((school) => school.schoolId === schoolId), [schoolId, workspace]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try { setData(await api.getClassroomAggregate(sessionId)); }
    catch { setMessage('تعذر قراءة حالة الجلسة.'); }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    if (liveRefreshTimerRef.current) clearTimeout(liveRefreshTimerRef.current);
  }, []);

  const applyRealtimeEvent = useCallback((event: string) => {
    if (event !== 'response:updated' || !sessionId) return false;
    if (liveRefreshTimerRef.current) return true;
    // Coalesce answer storms into one small, active-question-only read. The
    // full aggregate remains for initial load and teacher actions, not answers.
    liveRefreshTimerRef.current = setTimeout(() => {
      liveRefreshTimerRef.current = null;
      api.get<any>(`/classroom/sessions/${encodeURIComponent(sessionId)}/aggregate?view=live`)
        .then((live) => setData((current: any) => current ? {
          ...current,
          status: live.status,
          activeQuestionIndex: live.activeQuestionIndex,
          activeBatchId: live.activeBatchId,
          responseCount: live.responseCount,
          correctCount: live.correctCount,
          distribution: live.distribution,
          joinedCount: live.joinedCount,
        } : current))
        .catch(() => setMessage('تعذر تحديث الحالة الحية للحصة.'));
    }, 250);
    return true;
  }, [sessionId]);

  useClassroomRealtime(sessionId, load, undefined, applyRealtimeEvent);

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

  const filteredQuestions = useMemo(() => questions.filter((q: any) => {
    if (filters.track && q.examType !== filters.track && q.pathId !== filters.track) return false;
    if (filters.subject && q.subject !== filters.subject) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.search && !q.text?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [questions, filters]);

  const handleApplyTemplate = (tpl: ClassroomPreparedTemplate) => {
    setSelectedIds(tpl.questionIds);
    setChallengeIds(tpl.challengeIds);
    setActiveTemplateId(tpl.id);
    setMessage(`تم تفعيل حزمة "${tpl.title}" (${tpl.questionIds.length} أسئلة). جاهز لإطلاقها لهذا الفصل.`);
  };

  const chooseSchool = (nextSchoolId: string) => {
    setSchoolId(nextSchoolId);
    const school = workspace?.schools.find((entry) => entry.schoolId === nextSchoolId);
    setClassId(school?.assignments[0]?.classId || '');
    setQuestions([]);
    setQuestionPage(0);
    setHasMoreQuestions(false);
    setSelectedIds([]);
    setChallengeIds([]);
    setActiveTemplateId('');
  };

  const loadQuestions = async (page = 1) => {
    if (loadingMoreQuestions) return;
    setLoadingMoreQuestions(true);
    try {
      const result = await api.getClassroomQuestions(schoolId, { page, limit: 50 });
      setQuestions((current) => page === 1 ? result.questions : [...current, ...result.questions]);
      setQuestionPage(result.page);
      setHasMoreQuestions(result.hasMore);
      if (page === 1) setMessage('تم استعراض بنك الأسئلة المعتمد. يمكنك الفلترة والاختيار أو بدء الحصة فارغة.');
    } catch {
      setMessage('تعذر تحميل بنك الأسئلة. تحقق من المدرسة وصلاحية الإسناد.');
    } finally {
      setLoadingMoreQuestions(false);
    }
  };

  const toggleChallenge = (id: string) => {
    setChallengeIds((prev) => prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]);
  };

  const create = async () => {
    try {
      const result = await api.createClassroomSession({
        schoolId,
        classId,
        questionIds: selectedIds,
        publishedMode: 'batch',
        autoStart: true,
      });
      setMessage(selectedIds.length > 0
        ? `تم بدء الحصة مباشرة بـ ${selectedIds.length} أسئلة. رمز الانضمام: ${result.pin}`
        : `تم بدء الحصة فارغة. رمز الانضمام: ${result.pin}`);
      sessionStorage.setItem(`classroom_pin_${result.sessionId}`, result.pin);
      sessionStorage.setItem(`classroom_challenges_${result.sessionId}`, JSON.stringify(challengeIds));
      navigate(`/classroom/${result.sessionId}/teacher`);
    } catch {
      setMessage('تعذر بدء الحصة. تحقق من الفصل المسند وتفعيل الفصل الذكي في عقد المدرسة.');
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
      setData((current: any) => ({ ...current, report: result.report, status: 'ended' }));
      setMessage('تم إنهاء الجلسة وتثبيت التقرير بنجاح.');
    } catch {
      setMessage('تعذر إنهاء الجلسة.');
    }
  };

  const storedPin = sessionId ? sessionStorage.getItem(`classroom_pin_${sessionId}`) : '';

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6" dir="rtl">
        {user?.role === 'teacher' && <Link to="/school-teacher-dashboard" className="text-sm font-black text-indigo-700">← العودة إلى لوحة معلم المدرسة</Link>}
        <h1 className="mt-4 text-3xl font-black">ابدأ فصلًا ذكيًا</h1>
        <p className="mt-2 text-slate-500">اختر الفصل ثم ابدأ مباشرة فارغًا، أو جهز أسئلة أولية وأرسل دفعات أخرى أثناء الشرح.</p>

        {workspace?.schools.length === 0 && <div className="mt-6 rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">لا يوجد تكليف مدرسي فعال لهذا الحساب.</div>}

        {user?.role === 'admin' && !workspace && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-xl border p-3" placeholder="معرّف المدرسة" />
            <input value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-xl border p-3" placeholder="معرّف الفصل" />
            <button type="button" onClick={() => void loadQuestions()} disabled={!schoolId || !classId} className="rounded-xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50">عرض الأسئلة المعتمدة</button>
          </div>
        )}

        {workspace && workspace.schools.length > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">المدرسة
                <select value={schoolId} onChange={(e) => chooseSchool(e.target.value)} className="mt-2 block w-full rounded-xl border p-3">
                  {workspace.schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">الفصل
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-2 block w-full rounded-xl border p-3">
                  {(selectedSchool?.assignments || []).map((assignment) => <option key={assignment.assignmentId} value={assignment.classId}>{assignment.className}{assignment.subjectId ? ` — ${assignment.subjectId}` : ''}</option>)}
                </select>
              </label>
            </div>

            {!selectedSchool?.smartClassroomEnabled && <p className="mt-3 text-sm font-bold text-amber-700">وحدة الفصل الذكي غير مفعلة في عقد المدرسة.</p>}

            <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setCreationTab('templates')} className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-black transition-colors ${creationTab === 'templates' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                <Bookmark size={16} /> الحزم المحضرة مسبقاً
              </button>
              <button type="button" onClick={() => { setCreationTab('bank'); if (questions.length === 0) void loadQuestions(); }} className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-black transition-colors ${creationTab === 'bank' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                <Filter size={16} /> بنك الأسئلة والفلترة الذكية
              </button>
            </div>

            {creationTab === 'templates' && (
              <div className="mt-4">
                <ClassroomPreparedTemplatesManager schoolId={schoolId} teacherId={user?.id} selectedIds={selectedIds} challengeIds={challengeIds} onApplyTemplate={handleApplyTemplate} activeTemplateId={activeTemplateId} />
              </div>
            )}

            {creationTab === 'bank' && (
              <div className="mt-4 space-y-4">
                <ClassroomQuestionFilterBar filters={filters} onChange={setFilters} onReset={() => setFilters({ track: '', subject: '', difficulty: '', search: '' })} totalCount={questions.length} filteredCount={filteredQuestions.length} />
                {questions.length === 0 ? (
                  <button type="button" onClick={() => void loadQuestions()} disabled={!schoolId || !classId || !selectedSchool?.smartClassroomEnabled} className="w-full rounded-xl bg-slate-800 py-3 text-xs font-black text-white hover:bg-slate-700 disabled:opacity-50">عرض وتحميل أسئلة بنك المنصة</button>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>اختياري: حدد حتى 10 أسئلة كبداية ({selectedIds.length}/10)</span><span>يمكن بدء الحصة بدون أي سؤال</span></div>
                    {filteredQuestions.map((question) => {
                      const isChecked = selectedIds.includes(question.questionId);
                      const isChallenge = challengeIds.includes(question.questionId);
                      return (
                        <div key={question.questionId} className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedIds((ids) => ids.includes(question.questionId) ? ids.filter((id) => id !== question.questionId) : ids.length < 10 ? [...ids, question.questionId] : ids)} className="mt-1" />
                            <div className="min-w-0 flex-1">
                              <QuestionContentRenderer content={question.text} className="block max-h-24 overflow-hidden text-sm font-bold text-slate-900 dark:text-white" />
                              {question.imageUrl && <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950"><img src={question.imageUrl} alt="صورة السؤال" className="mx-auto max-h-40 w-auto max-w-full object-contain" loading="lazy" /></div>}
                              <small className="mt-1 block text-slate-500">{question.subject || question.type} · {question.difficulty || 'متوسط'} · {question.options.length} خيارات</small>
                            </div>
                          </label>
                          {isChecked && <button type="button" onClick={() => toggleChallenge(question.questionId)} className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all ${isChallenge ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><Zap size={13} /> {isChallenge ? 'سؤال تحدي ⚡' : 'تعيين كتحدي'}</button>}
                        </div>
                      );
                    })}
                    {hasMoreQuestions && <button type="button" onClick={() => void loadQuestions(questionPage + 1)} disabled={loadingMoreQuestions} className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-xs font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">{loadingMoreQuestions ? 'جارٍ تحميل المزيد…' : 'تحميل أسئلة إضافية'}</button>}
                  </div>
                )}
              </div>
            )}

            <button type="button" onClick={() => void create()} disabled={!schoolId || !classId || !selectedSchool?.smartClassroomEnabled} className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 text-sm sm:text-base font-black text-white shadow-xl hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-40">
              <Presentation size={18} />
              {selectedIds.length > 0 ? `ابدأ الحصة الآن بـ ${selectedIds.length} أسئلة` : 'ابدأ الحصة فارغة الآن'}
            </button>
          </>
        )}
        <p className="mt-4 text-sm text-slate-600">{message}</p>
      </main>
    );
  }

  return (
    <ClassroomActiveSessionPanel
      sessionId={sessionId}
      data={data}
      storedPin={storedPin}
      challengeIds={challengeIds}
      onToggleChallenge={toggleChallenge}
      onPublish={(index) => { void publish(index); }}
      onEnd={() => void end()}
      onReload={() => void load()}
      message={message}
      isTeacher={user?.role === 'teacher'}
    />
  );
};
