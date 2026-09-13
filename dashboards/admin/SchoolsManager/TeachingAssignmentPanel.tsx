import React, { useState } from 'react';
import type { Group, User } from '../../../types';
import { api } from '../../../services/api';

export const TeachingAssignmentPanel: React.FC<{ schoolId: string; classes: Group[]; teachers: User[]; onAssignmentSaved?: () => Promise<void> }> = ({ schoolId, classes, teachers, onAssignmentSaved }) => {
  const scopedTeachers = teachers.filter((teacher) => teacher.schoolId === schoolId);
  const [teacherId, setTeacherId] = useState(scopedTeachers[0]?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const save = async () => {
    if (!teacherId || !classId) return setNotice('اختر المعلم والفصل أولًا.');
    setIsSaving(true);
    setNotice('جارٍ حفظ الإسناد والتحقق منه...');
    try {
      await api.updateTeachingAssignment({ schoolId, teacherId, classId });
      await onAssignmentSaved?.();
      setNotice('تم إسناد المعلم للفصل وتحديث بيانات المدرسة من الخادم.');
    } catch {
      setNotice('تعذر حفظ الإسناد أو التحقق منه.');
    } finally {
      setIsSaving(false);
    }
  };
  return <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4" data-testid="school-teaching-assignment-panel"><h3 className="font-black text-slate-900">إسناد المعلم للفصل</h3><p className="mt-1 text-xs text-slate-600">اربط المعلم بالمدرسة أولًا من علاقات المدرسة، ثم أسنده إلى الفصل هنا. هذا الإسناد هو السلطة المطلوبة للفصول الذكية لاحقًا.</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={teacherId} disabled={isSaving} onChange={(event) => setTeacherId(event.target.value)} className="rounded-lg border bg-white p-2 text-sm"><option value="">اختر معلمًا</option>{scopedTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><select value={classId} disabled={isSaving} onChange={(event) => setClassId(event.target.value)} className="rounded-lg border bg-white p-2 text-sm"><option value="">اختر فصلًا</option>{classes.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button type="button" disabled={isSaving} onClick={() => void save()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white disabled:opacity-60">{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإسناد'}</button></div><p className="mt-2 text-xs text-slate-600" aria-live="polite">{notice}</p></section>;
};
