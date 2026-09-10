import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpenCheck, Building2, GraduationCap, Loader2, Plus, Search, ShieldCheck, Sparkles, Users, UsersRound } from 'lucide-react';
import { api } from '../services/api';

type DirectorSchool = { schoolId: string; schoolName: string; permissions: string[]; status: string };
type Overview = Awaited<ReturnType<typeof api.getSchoolDirectorOverview>>;
type Student = Awaited<ReturnType<typeof api.getSchoolDirectorStudents>>['students'][number];

const metricCards = (overview: Overview) => [
  { label: 'الطلاب', value: overview.metrics.students, icon: Users, tone: 'text-indigo-700 bg-indigo-50' },
  { label: 'الفصول', value: overview.metrics.classes, icon: Building2, tone: 'text-sky-700 bg-sky-50' },
  { label: 'المعلمون', value: overview.metrics.teachers, icon: GraduationCap, tone: 'text-amber-700 bg-amber-50' },
  { label: 'المشرفون', value: overview.metrics.supervisors, icon: UsersRound, tone: 'text-purple-700 bg-purple-50' },
  { label: 'اختبارات المدرسة', value: overview.metrics.schoolAssessments, icon: BookOpenCheck, tone: 'text-emerald-700 bg-emerald-50' },
  { label: 'فصول ذكية مكتملة', value: overview.metrics.completedSmartClasses, icon: Sparkles, tone: 'text-rose-700 bg-rose-50' },
];

export const SchoolDirectorDashboard: React.FC = () => {
  const [schools, setSchools] = useState<DirectorSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', password: '', classId: '' });

  const selectedSchool = useMemo(() => schools.find((school) => school.schoolId === selectedSchoolId) || schools[0], [schools, selectedSchoolId]);
  const hasPermission = (permission: string) => Boolean(selectedSchool?.permissions.includes(permission));

  const refresh = async (school: DirectorSchool, query = search) => {
    const [nextOverview, nextStudents] = await Promise.all([
      school.permissions.includes('SCHOOL_OVERVIEW_VIEW') ? api.getSchoolDirectorOverview(school.schoolId) : Promise.resolve(null),
      school.permissions.includes('SCHOOL_STUDENTS_VIEW') ? api.getSchoolDirectorStudents(school.schoolId, query) : Promise.resolve({ students: [], total: 0 }),
    ]);
    setOverview(nextOverview);
    setStudents(nextStudents.students);
    setDraft((current) => ({ ...current, classId: current.classId || nextOverview?.classes[0]?.classId || '' }));
  };

  useEffect(() => {
    void api.getSchoolDirectorWorkspace().then(async (workspace) => {
      setSchools(workspace.schools);
      const first = workspace.schools[0];
      if (first) {
        setSelectedSchoolId(first.schoolId);
        await refresh(first, '');
      }
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل مساحة مدير المدرسة.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSchool || loading) return;
    setError('');
    setNotice('');
    setLoading(true);
    void refresh(selectedSchool, '').catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'تعذر تحديث المدرسة.')).finally(() => setLoading(false));
  }, [selectedSchoolId]);

  const addStudent = async () => {
    if (!selectedSchool || !draft.classId) return;
    setPending('add'); setError(''); setNotice('');
    try {
      const result = await api.addSchoolDirectorStudent(selectedSchool.schoolId, draft);
      setDraft({ name: '', email: '', password: '', classId: overview?.classes[0]?.classId || '' });
      setShowAdd(false);
      await refresh(selectedSchool, search);
      setNotice(result.created ? 'تم إنشاء الطالب وربطه بالمدرسة والفصل.' : 'الطالب موجود وتم تأكيد ربطه بالفصل المحدد.');
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'تعذر إضافة الطالب.'); }
    finally { setPending(''); }
  };

  const moveStudent = async (studentId: string, classId: string) => {
    if (!selectedSchool) return;
    setPending(studentId); setError(''); setNotice('');
    try {
      const result = await api.moveSchoolDirectorStudent(selectedSchool.schoolId, studentId, classId);
      setStudents((current) => current.map((student) => student.studentId === studentId ? result.student : student));
      setNotice(result.idempotent ? 'الطالب موجود بالفعل في هذا الفصل؛ لم تتكرر أي عضوية.' : 'تم نقل الطالب داخل المدرسة وحفظ الفصل الجديد.');
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'تعذر نقل الطالب.'); }
    finally { setPending(''); }
  };

  if (loading && schools.length === 0) return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={38} /></main>;

  if (!selectedSchool) return <main dir="rtl" className="min-h-screen bg-slate-50 p-6"><div className="mx-auto mt-20 max-w-xl rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShieldCheck className="mx-auto text-slate-400" size={40} /><h1 className="mt-4 text-xl font-black text-slate-900">لا توجد مدرسة مفوضة</h1><p className="mt-2 text-sm text-slate-500">اطلب من مدير المنصة ربط حسابك بمدرسة وتفعيل الصلاحيات المطلوبة.</p></div></main>;

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" data-testid="school-director-dashboard"><div className="mx-auto max-w-7xl">
    <header className="rounded-3xl bg-gradient-to-l from-indigo-700 via-indigo-800 to-slate-900 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-indigo-200"><ShieldCheck size={17} /> نطاق مفوض من مدير المنصة</p><h1 className="mt-2 text-3xl font-black">لوحة مدير المدرسة</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100">رؤية تنفيذية وعمليات الطلاب داخل المدارس المصرح بها فقط.</p></div><label className="text-sm font-bold">المدرسة<select value={selectedSchool.schoolId} onChange={(event) => setSelectedSchoolId(event.target.value)} className="mt-2 block w-full min-w-56 rounded-xl border-0 bg-white px-4 py-3 text-slate-900">{schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}</select></label></div></header>

    {(error || notice) && <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

    {overview && <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{metricCards(overview).map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></div><p className="mt-3 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>)}</section>}

    <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="flex items-center gap-2 text-xs font-black text-indigo-600"><BarChart3 size={16} /> تشغيل الطلاب</p><h2 className="mt-1 text-xl font-black">طلاب {selectedSchool.schoolName}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute right-3 top-2.5 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void refresh(selectedSchool, search)} placeholder="ابحث بالاسم أو البريد" className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm outline-none focus:border-indigo-500" /></div>{hasPermission('SCHOOL_STUDENTS_ADD') && <button type="button" onClick={() => setShowAdd((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white"><Plus size={17} /> إضافة طالب</button>}</div></div>

      {showAdd && <div className="mt-5 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 md:grid-cols-5"><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الطالب" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="كلمة مرور مؤقتة" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select value={draft.classId} onChange={(event) => setDraft((current) => ({ ...current, classId: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">اختر الفصل</option>{overview?.classes.map((classroom) => <option key={classroom.classId} value={classroom.classId}>{classroom.className}</option>)}</select><button type="button" disabled={pending === 'add'} onClick={() => void addStudent()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{pending === 'add' ? 'جار الحفظ…' : 'إنشاء وربط'}</button></div>}

      {!hasPermission('SCHOOL_STUDENTS_VIEW') ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">صلاحية عرض الطلاب غير مفعلة لهذا الربط.</div> : students.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">لا يوجد طلاب مطابقون حاليًا.</div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">الطالب</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">الفصل</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.studentId}><td className="px-4 py-3"><b className="block">{student.name}</b><span className="text-xs text-slate-500">{student.email}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{student.isActive ? 'نشط' : 'موقوف'}</span></td><td className="px-4 py-3">{hasPermission('SCHOOL_STUDENTS_MOVE_CLASS') ? <select value={student.classId || ''} disabled={pending === student.studentId} onChange={(event) => void moveStudent(student.studentId, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"><option value="">بدون فصل</option>{overview?.classes.map((classroom) => <option key={classroom.classId} value={classroom.classId}>{classroom.className}</option>)}</select> : <span className="font-bold text-slate-600">{student.className || 'بدون فصل'}</span>}</td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
};
