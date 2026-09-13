import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Award, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Copy, ExternalLink, Filter, Presentation, RefreshCw, Users, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import type { TeacherWorkspaceData } from '../components/teacher/TeacherWorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { ClassroomTeacherLiveRadar } from '../components/classroom/ClassroomTeacherLiveRadar';
import { ClassroomQuestionFilterBar, ClassroomFilterState } from '../components/classroom/ClassroomQuestionFilterBar';
import { ClassroomPreparedTemplatesManager, ClassroomPreparedTemplate } from '../components/classroom/ClassroomPreparedTemplatesManager';
import { ClassroomActiveSessionPanel } from '../components/classroom/ClassroomActiveSessionPanel';
import { QuestionContentRenderer } from '../components/classroom/QuestionContentRenderer';

type ClassroomQuestion = { questionId: string; text: string; options: string[]; type: string; isChallenge?: boolean; pathId?: string; subject?: string; sectionId?: string; difficulty?: string; examType?: string };

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
  const [creationTab, setCreationTab] = useState<'templates' | 'bank'>('templates');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [filters, setFilters] = useState<ClassroomFilterState>({ track: '', subject: '', difficulty: '', search: '' });
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

  const filteredQuestions = useMemo(() => {
    return questions.filter((q: any) => {
      if (filters.track && q.examType !== filters.track && q.pathId !== filters.track) return false;
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
      if (filters.search && !q.text?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [questions, filters]);

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
    setSelectedIds([]);
    setChallengeIds([]);
    setActiveTemplateId('');
  };

  const loadQuestions = async () => {
    try {
      const result = await api.getClassroomQuestions(schoolId);
      setQuestions(result.questions);
      setMessage('تم استعراض بنك الأسئلة المعتمد. يمكنك الفلترة والاختيار وحفظ الحزم.');
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

            {!selectedSchool?.smartClassroomEnabled && (
              <p className="mt-3 text-sm font-bold text-amber-700">وحدة الفصل الذكي غير مفعلة في عقد المدرسة.</p>
            )}

            {/* Preparation Tabs */}
            <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreationTab('templates')}
                className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-black transition-colors ${
                  creationTab === 'templates'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Bookmark size={16} /> الحزم المحضرة مسبقاً (إطلاق فوري)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationTab('bank');
                  if (questions.length === 0) void loadQuestions();
                }}
                className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-black transition-colors ${
                  creationTab === 'bank'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Filter size={16} /> بنك الأسئلة والفلترة الذكية
              </button>
            </div>

            {/* Tab 1: Prepared Templates */}
            {creationTab === 'templates' && (
              <div className="mt-4">
                <ClassroomPreparedTemplatesManager
                  schoolId={schoolId}
                  teacherId={user?.id}
                  selectedIds={selectedIds}
                  challengeIds={challengeIds}
                  onApplyTemplate={handleApplyTemplate}
                  activeTemplateId={activeTemplateId}
                />
              </div>
            )}

            {/* Tab 2: Question Bank with Multi-Level Filters */}
            {creationTab === 'bank' && (
              <div className="mt-4 space-y-4">
                <ClassroomQuestionFilterBar
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters({ track: '', subject: '', difficulty: '', search: '' })}
                  totalCount={questions.length}
                  filteredCount={filteredQuestions.length}
                />

                {questions.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => void loadQuestions()}
                    disabled={!schoolId || !classId || !selectedSchool?.smartClassroomEnabled}
                    className="w-full rounded-xl bg-slate-800 py-3 text-xs font-black text-white hover:bg-slate-700"
                  >
                    عرض وتحميل أسئلة بنك المنصة
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>اختر من 1 إلى 10 أسئلة ({selectedIds.length}/10):</span>
                      <span>يمكنك تعيين أي سؤال كـ "سؤال تحدي ⚡"</span>
                    </div>
                    {filteredQuestions.map((question) => {
                      const isChecked = selectedIds.includes(question.questionId);
                      const isChallenge = challengeIds.includes(question.questionId);
                      return (
                        <div
                          key={question.questionId}
                          className={`flex items-start justify-between rounded-xl border p-3.5 transition-all ${
                            isChecked
                              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40'
                              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <label className="flex flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setSelectedIds((ids) =>
                                  ids.includes(question.questionId)
                                    ? ids.filter((id) => id !== question.questionId)
                                    : ids.length < 10
                                    ? [...ids, question.questionId]
                                    : ids
                                )
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <QuestionContentRenderer content={question.text} className="text-slate-900 dark:text-white text-sm font-bold block max-h-24 overflow-hidden" />
                              <small className="mt-1 block text-slate-500">
                                {question.subject || question.type} · {question.difficulty || 'متوسط'} · {question.options.length} خيارات
                              </small>
                            </div>
                          </label>
                          {isChecked && (
                            <button
                              type="button"
                              onClick={() => toggleChallenge(question.questionId)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                                isChallenge
                                  ? 'bg-amber-500 text-white'
                                  : 'border border-slate-300 bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
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
              </div>
            )}

            {/* Launch Session Button */}
            <button
              type="button"
              onClick={() => void create()}
              disabled={!schoolId || !classId || !selectedIds.length}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 text-sm sm:text-base font-black text-white shadow-xl hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-40"
            >
              <Presentation size={18} />
              إطلاق الحصة لهذا الفصل ({selectedIds.length}/10 أسئلة) 🚀
            </button>
          </>
        )}
        <p className="mt-4 text-sm text-slate-600">{message}</p>
      </main>
    );
  }

  // Active Session Live Console
  return (
    <ClassroomActiveSessionPanel
      sessionId={sessionId}
      data={data}
      storedPin={storedPin}
      challengeIds={challengeIds}
      onToggleChallenge={toggleChallenge}
      onPublish={(index) => {
        const question = (data?.questions || []).find((q: any) => q.index === index) || { index };
        void publish(question.index);
      }}
      onEnd={() => void end()}
      onReload={() => void load()}
      message={message}
      isTeacher={user?.role === 'teacher'}
    />
  );
};
