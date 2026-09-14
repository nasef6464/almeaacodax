import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Edit2, Eye, FilePlus2, Send, StickyNote, Trash2 } from 'lucide-react';
import { Course } from '../../types';
import { useStore } from '../../store/useStore';
import { AdvancedCourseBuilder } from './AdvancedCourseBuilder';
import { api } from '../../services/api';

const status = (value?: Course['approvalStatus']) => {
  const labels = {
    draft: 'مسودة',
    pending_review: 'بانتظار المراجعة',
    approved: 'معتمدة',
    rejected: 'تحتاج تعديل',
  } as const;
  return labels[value || 'draft'];
};

/** Platform-trainer workspace.  The server is the final ownership authority. */
export const TrainerCoursesManager: React.FC = () => {
  const { courses, user, addCourse, updateCourse, deleteCourse } = useStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Course | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [performance, setPerformance] = useState<any>(null);

  useEffect(() => {
    let active = true;
    api.getTrainerPerformance()
      .then((response: any) => { if (active) setPerformance(response.performance); })
      .catch(() => { if (active) setPerformance(null); });
    return () => { active = false; };
  }, []);

  const myCourses = useMemo(() => courses
    .filter((course) => [course.ownerId, course.createdBy, course.assignedTeacherId].includes(user.id))
    .filter((course) => course.title.toLowerCase().includes(search.trim().toLowerCase())), [courses, search, user.id]);

  const save = async (patch: Partial<Course>) => {
    setSaving(true); setError('');
    try {
      if (editing?.id) await updateCourse(editing.id, { ...patch, isPublished: false, showOnPlatform: false });
      else await addCourse({ ...patch, id: `course_${Date.now()}`, isPublished: false, showOnPlatform: false, approvalStatus: 'draft' } as Course);
      setEditing(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الدورة على الخادم.');
    } finally { setSaving(false); }
  };

  if (editing) return <div className="space-y-4" dir="rtl">
    {error ? <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
    {saving ? <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-bold text-indigo-700">جارٍ الحفظ…</div> : null}
    <AdvancedCourseBuilder initialCourse={editing} onSave={save} onCancel={() => setEditing(undefined)} canControlPublication={false} />
  </div>;

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h2 className="text-2xl font-black text-gray-900">دوراتي</h2><p className="mt-1 text-sm text-gray-500">أنشئ مسودة داخل نطاقك، أرسلها للمراجعة، ثم راجع ملاحظات المدير. النشر والاعتماد بيد الإدارة فقط.</p></div>
      <button onClick={() => setEditing({ id: '', title: '', instructor: user.name || 'مدرب المنصة', thumbnail: '', price: 0, currency: 'SAR', duration: 0, level: 'Beginner', rating: 0, progress: 0, category: 'دورة تعليمية', features: [], approvalStatus: 'draft', isPublished: false, showOnPlatform: false })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white"><FilePlus2 size={17}/>إنشاء مسودة</button>
    </div>
    {performance ? <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="mb-3 flex items-center gap-2 font-black text-indigo-950"><BarChart3 size={18}/>أداء موثّق من بيانات التعلّم</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['طلاب مسجلون', performance.enrolledStudents],
          ['إكمال قابل للقياس', performance.completionRate == null ? 'لا توجد دروس مكتملة القياس بعد' : `${performance.completionRate}%`],
          ['محاولات الاختبارات', performance.quizAttempts],
          ['متوسط نتيجة الاختبارات', performance.averageQuizScore == null ? 'لا توجد نتائج بعد' : `${performance.averageQuizScore}%`],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white p-3 text-sm"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 font-black text-gray-900">{value}</div></div>)}
      </div>
      <p className="mt-3 text-xs text-gray-600">{performance.revenue?.reason || 'لا تتوفر بيانات مستحقات.'}</p>
    </section> : null}
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في دوراتك" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
    {error ? <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
    <div className="grid gap-4 lg:grid-cols-2">
      {myCourses.map((course) => <article key={course.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-gray-900">{course.title}</h3><p className="mt-1 text-xs text-gray-500">{course.category || 'دورة تعليمية'}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{status(course.approvalStatus)}</span></div>
        {course.reviewerNotes ? <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><StickyNote size={17} className="shrink-0"/><span><strong>ملاحظة المراجع:</strong> {course.reviewerNotes}</span></div> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setEditing(course)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Edit2 size={14}/>تعديل</button>
          <button onClick={() => window.open(`/#/course/${course.id}`, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Eye size={14}/>معاينة الطالب</button>
          {course.approvalStatus !== 'pending_review' && course.approvalStatus !== 'approved' ? <button onClick={() => void updateCourse(course.id, { approvalStatus: 'pending_review', isPublished: false, showOnPlatform: false })} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white"><Send size={14}/>إرسال للمراجعة</button> : null}
          <button onClick={() => { if (confirm('حذف هذه المسودة أو الدورة؟')) void deleteCourse(course.id); }} className="inline-flex items-center gap-1 rounded-lg text-red-600 hover:bg-red-50 px-3 py-2 text-xs font-bold"><Trash2 size={14}/>حذف</button>
        </div>
      </article>)}
      {!myCourses.length ? <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm font-bold text-gray-500 lg:col-span-2"><BookOpen className="mx-auto mb-3 text-indigo-400"/>لا توجد دورات مطابقة بعد.</div> : null}
    </div>
  </div>;
};
