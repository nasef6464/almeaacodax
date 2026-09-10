import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import type { TeacherWorkspaceData } from '../components/teacher/TeacherWorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

type ClassroomQuestion = { questionId: string; text: string; options: string[]; type: string };

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
  };
  const loadQuestions = async () => {
    try { const result = await api.getClassroomQuestions(schoolId); setQuestions(result.questions); setMessage('اختر من 1 إلى 10 أسئلة معتمدة.'); }
    catch { setMessage('تعذر تحميل بنك الأسئلة. تحقق من المدرسة وصلاحية الإسناد.'); }
  };
  const create = async () => {
    try { const result = await api.createClassroomSession({ schoolId, classId, questionIds: selectedIds }); setMessage(`تم إنشاء الحصة. رمز الانضمام: ${result.pin}`); navigate(`/classroom/${result.sessionId}/teacher`); }
    catch { setMessage('تعذر إنشاء الحصة. يجب اختيار فصل مسند وأسئلة معتمدة.'); }
  };
  const publish = async (index: number) => { try { await api.publishClassroomQuestion(sessionId, index); await load(); } catch { setMessage('تعذر نشر السؤال.'); } };
  const end = async () => {
    try { const result = await api.endClassroomSession(sessionId); setData((current: any) => ({ ...current, report: result.report, status: 'ended' })); setMessage('تم إنهاء الجلسة وتثبيت التقرير.'); }
    catch { setMessage('تعذر إنهاء الجلسة.'); }
  };

  if (!sessionId) return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6" dir="rtl">
      {user?.role === 'teacher' && <Link to="/school-teacher-dashboard" className="text-sm font-black text-indigo-700">العودة إلى لوحة معلم المدرسة</Link>}
      <h1 className="mt-4 text-3xl font-black">ابدأ فصلًا ذكيًا</h1>
      <p className="mt-2 text-slate-500">اختر من مدارس وفصول التكليف الفعلي؛ لا حاجة لإدخال أي معرّف يدويًا.</p>
      {workspace?.schools.length === 0 && <div className="mt-6 rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">لا يوجد تكليف مدرسي فعال لهذا الحساب.</div>}
      {user?.role === 'admin' && !workspace && <div className="mt-6 grid gap-3 sm:grid-cols-2"><input value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="rounded-xl border p-3" placeholder="معرّف المدرسة" /><input value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-xl border p-3" placeholder="معرّف الفصل" /><button type="button" onClick={() => void loadQuestions()} disabled={!schoolId || !classId} className="rounded-xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50">عرض الأسئلة المعتمدة</button></div>}
      {workspace && workspace.schools.length > 0 && <>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">المدرسة<select value={schoolId} onChange={(event) => chooseSchool(event.target.value)} className="mt-2 block w-full rounded-xl border p-3">{workspace.schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}</select></label>
          <label className="text-sm font-bold">الفصل<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-2 block w-full rounded-xl border p-3">{(selectedSchool?.assignments || []).map((assignment) => <option key={assignment.assignmentId} value={assignment.classId}>{assignment.className}{assignment.subjectId ? ` — ${assignment.subjectId}` : ''}</option>)}</select></label>
        </div>
        <button type="button" onClick={() => void loadQuestions()} disabled={!schoolId || !classId || !selectedSchool?.smartClassroomEnabled} className="mt-4 rounded-xl bg-slate-800 px-5 py-3 font-black text-white disabled:opacity-50">عرض الأسئلة المعتمدة</button>
        {!selectedSchool?.smartClassroomEnabled && <p className="mt-3 text-sm font-bold text-amber-700">وحدة الفصل الذكي غير مفعلة في عقد المدرسة.</p>}
        {questions.length > 0 && <div className="mt-6 space-y-3">{questions.map((question) => <label key={question.questionId} className="flex cursor-pointer gap-3 rounded-xl border p-4"><input type="checkbox" checked={selectedIds.includes(question.questionId)} onChange={() => setSelectedIds((ids) => ids.includes(question.questionId) ? ids.filter((id) => id !== question.questionId) : ids.length < 10 ? [...ids, question.questionId] : ids)} /><span><b>{question.text}</b><small className="mt-1 block text-slate-500">{question.type} · {question.options.length} خيارات</small></span></label>)}</div>}
        <button type="button" onClick={() => void create()} disabled={!schoolId || !classId || !selectedIds.length} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white disabled:opacity-50">إنشاء الحصة ({selectedIds.length}/10)</button>
      </>}
      {user?.role === 'admin' && !workspace && <>{questions.length > 0 && <div className="mt-6 space-y-3">{questions.map((question) => <label key={question.questionId} className="flex cursor-pointer gap-3 rounded-xl border p-4"><input type="checkbox" checked={selectedIds.includes(question.questionId)} onChange={() => setSelectedIds((ids) => ids.includes(question.questionId) ? ids.filter((id) => id !== question.questionId) : ids.length < 10 ? [...ids, question.questionId] : ids)} /><span><b>{question.text}</b><small className="mt-1 block text-slate-500">{question.type} · {question.options.length} خيارات</small></span></label>)}</div>}<button type="button" onClick={() => void create()} disabled={!schoolId || !classId || !selectedIds.length} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white disabled:opacity-50">إنشاء الحصة ({selectedIds.length}/10)</button></>}
      <p className="mt-4 text-sm text-slate-600">{message}</p>
    </main>
  );

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6" dir="rtl">
      <h1 className="text-3xl font-black">لوحة تحكم المعلم</h1><p className="mt-2 text-slate-500">الحالة: {data?.status || '...'}</p><p className="mt-2 text-sm text-slate-500">رابط الطلاب: /classroom/{sessionId} · رابط العرض: /classroom/{sessionId}/projector</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-100 p-5"><b>الإجابات</b><div className="text-3xl font-black">{data?.responseCount ?? 0}</div></div><div className="rounded-2xl bg-slate-100 p-5"><b>السؤال الحالي</b><div className="text-3xl font-black">{data?.activeQuestionIndex ?? '-'}</div></div><div className="rounded-2xl bg-slate-100 p-5"><b>التوزيع</b><div className="mt-2 text-sm">{JSON.stringify(data?.distribution || {})}</div></div></div>
      <section className="mt-6"><h2 className="text-xl font-black">أسئلة الحصة</h2><div className="mt-3 space-y-2">{(data?.questions || []).map((question: any) => <button key={question.questionId} type="button" onClick={() => void publish(question.index)} disabled={data?.status === 'ended'} className={`block w-full rounded-xl border p-4 text-right disabled:opacity-50 ${data?.activeQuestionIndex === question.index ? 'border-indigo-600 bg-indigo-50' : 'bg-white'}`}><b>سؤال {question.index + 1}: </b>{question.text}</button>)}</div></section>
      <div className="mt-6 flex gap-3"><button onClick={() => void end()} disabled={data?.status === 'ended'} className="rounded-xl bg-rose-600 px-5 py-3 font-black text-white disabled:opacity-50">إنهاء الجلسة</button></div><p className="mt-4 text-sm text-slate-600">{message}</p>
    </main>
  );
};
