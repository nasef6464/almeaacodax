import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, Download, FileText, Loader2, Pencil, Plus, UserCheck } from 'lucide-react';
import { api } from '../services/api';

type School = { schoolId: string; schoolName: string; permissions: string[]; modules: string[] };
type Classroom = { classId: string; className: string };
type TeacherWorkspace = Awaited<ReturnType<typeof api.getSchoolDirectorTeachers>>;

export const SchoolDirectorDelegatedOperations: React.FC<{
  school: School;
  classes: Classroom[];
  onRefresh: () => Promise<void>;
}> = ({ school, classes, onRefresh }) => {
  const can = (permission: string, module: string) => school.permissions.includes(permission) && school.modules.includes(module);
  const canClasses = can('SCHOOL_CLASSES_MANAGE', 'SCHOOL_CORE');
  const canTeachers = can('SCHOOL_TEACHERS_ASSIGN', 'SCHOOL_CORE');
  const canDetailedReport = can('SCHOOL_REPORTS_DETAILED_VIEW', 'SCHOOL_INTELLIGENCE');
  const canExport = can('SCHOOL_REPORTS_EXPORT', 'EXECUTIVE_ANALYTICS');
  const [teachers, setTeachers] = useState<TeacherWorkspace>({ teachers: [], assignments: [] });
  const [newClassName, setNewClassName] = useState('');
  const [rename, setRename] = useState({ classId: '', name: '' });
  const [assignment, setAssignment] = useState({ teacherId: '', classId: '', subjectId: '', status: 'active' as 'active' | 'inactive' });
  const [report, setReport] = useState<any>(null);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setReport(null); setMessage(''); setTeachers({ teachers: [], assignments: [] });
    setAssignment({ teacherId: '', classId: classes[0]?.classId || '', subjectId: '', status: 'active' });
    if (canTeachers) void api.getSchoolDirectorTeachers(school.schoolId).then(setTeachers).catch((error) => setMessage(error instanceof Error ? error.message : 'تعذر تحميل المعلمين.'));
  }, [school.schoolId, canTeachers]);

  if (!canClasses && !canTeachers && !canDetailedReport && !canExport) return null;

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setPending(key); setMessage('');
    try { await action(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر تنفيذ العملية.'); }
    finally { setPending(''); }
  };

  const exportStudents = () => run('export', async () => {
    const result = await api.downloadSchoolDirectorStudentsCsv(school.schoolId);
    const url = URL.createObjectURL(new Blob([result.text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `طلاب-${school.schoolName}.csv`; link.click(); URL.revokeObjectURL(url);
  }, 'تم تجهيز ملف الطلاب وتنزيله ضمن نطاق المدرسة.');

  return <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" data-testid="director-delegated-operations">
    <div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><UserCheck size={22} /></div><div><p className="text-xs font-black text-violet-600">صلاحيات حسب العقد</p><h2 className="text-xl font-black">مركز التشغيل المفوض</h2><p className="mt-1 text-xs text-slate-500">لا تظهر إلا الأدوات التي جمع لها مدير المنصة بين الصلاحية ووحدة العقد.</p></div></div>
    {message && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{message}</p>}
    <div className="mt-5 grid gap-4 xl:grid-cols-3">
      {canClasses && <article className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4"><h3 className="flex items-center gap-2 font-black text-sky-950"><Building2 size={18} /> إدارة الفصول</h3><div className="mt-3 flex gap-2"><input value={newClassName} onChange={(event) => setNewClassName(event.target.value)} placeholder="اسم فصل جديد" className="min-w-0 flex-1 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm" /><button disabled={!newClassName.trim() || pending === 'class'} onClick={() => void run('class', async () => { await api.createSchoolDirectorClass(school.schoolId, newClassName); setNewClassName(''); await onRefresh(); }, 'تم إنشاء الفصل داخل المدرسة.')} className="rounded-xl bg-sky-700 px-3 text-white disabled:opacity-40"><Plus size={17} /></button></div><div className="mt-3 space-y-2">{classes.map((classroom) => <div key={classroom.classId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">{rename.classId === classroom.classId ? <><input value={rename.name} onChange={(event) => setRename({ ...rename, name: event.target.value })} className="min-w-0 flex-1 rounded-lg border px-2 py-1" /><button onClick={() => void run(`rename-${classroom.classId}`, async () => { await api.updateSchoolDirectorClass(school.schoolId, classroom.classId, rename.name); setRename({ classId: '', name: '' }); await onRefresh(); }, 'تم تحديث اسم الفصل.')} className="font-black text-sky-700">حفظ</button></> : <><span className="flex-1 font-bold">{classroom.className}</span><button onClick={() => setRename({ classId: classroom.classId, name: classroom.className })} aria-label={`تعديل ${classroom.className}`} className="text-slate-500"><Pencil size={15} /></button></>}</div>)}</div></article>}
      {canTeachers && <article className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"><h3 className="flex items-center gap-2 font-black text-emerald-950"><UserCheck size={18} /> تكليف المعلمين</h3><div className="mt-3 grid gap-2"><select value={assignment.teacherId} onChange={(event) => setAssignment({ ...assignment, teacherId: event.target.value })} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"><option value="">اختر معلم المدرسة</option>{teachers.teachers.map((teacher) => <option key={teacher.teacherId} value={teacher.teacherId}>{teacher.name}</option>)}</select><select value={assignment.classId} onChange={(event) => setAssignment({ ...assignment, classId: event.target.value })} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"><option value="">اختر الفصل</option>{classes.map((classroom) => <option key={classroom.classId} value={classroom.classId}>{classroom.className}</option>)}</select><input value={assignment.subjectId} onChange={(event) => setAssignment({ ...assignment, subjectId: event.target.value })} placeholder="معرّف المادة (اختياري)" className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm" /><div className="flex gap-2"><select value={assignment.status} onChange={(event) => setAssignment({ ...assignment, status: event.target.value as 'active' | 'inactive' })} className="flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"><option value="active">تكليف فعال</option><option value="inactive">إيقاف التكليف</option></select><button disabled={!assignment.teacherId || !assignment.classId || pending === 'assignment'} onClick={() => void run('assignment', async () => { await api.updateSchoolDirectorTeachingAssignment(school.schoolId, assignment); setTeachers(await api.getSchoolDirectorTeachers(school.schoolId)); }, 'تم حفظ التكليف الخادمي.')} className="rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-40">حفظ</button></div></div><p className="mt-3 text-xs text-emerald-800">التكليفات المسجلة: {teachers.assignments.filter((item) => item.status === 'active').length}</p></article>}
      {(canDetailedReport || canExport) && <article className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4"><h3 className="flex items-center gap-2 font-black text-amber-950"><BarChart3 size={18} /> التقارير والتصدير</h3><div className="mt-3 grid gap-2">{canDetailedReport && <button disabled={pending === 'report'} onClick={() => void run('report', async () => setReport((await api.getSchoolDirectorDetailedReport(school.schoolId)).intelligence), 'تم تحديث التقرير من البيانات الحالية.')} className="flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white"><FileText size={16} /> عرض التقرير التفصيلي</button>}{canExport && <button disabled={pending === 'export'} onClick={() => void exportStudents()} className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-800"><Download size={16} /> تصدير الطلاب CSV</button>}</div>{pending === 'report' && <Loader2 className="mx-auto mt-4 animate-spin text-amber-700" />}{report && <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-xl bg-white p-2">جلسات<br /><b>{report.schoolPerformance?.smartClassroom?.sessions ?? 0}</b></span><span className="rounded-xl bg-white p-2">دقة<br /><b>{report.schoolPerformance?.smartClassroom?.accuracy ?? '—'}%</b></span><span className="rounded-xl bg-white p-2">اختبارات<br /><b>{report.schoolPerformance?.officialAssessments?.attempts ?? 0}</b></span></div>}</article>}
    </div>
  </section>;
};
