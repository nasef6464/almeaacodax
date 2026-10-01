import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Search, UserPlus, Users, X } from 'lucide-react';
import type { Group, User } from '../../../types';

export type ClassPersonDraft = {
    name: string;
    email: string;
    password: string;
};

interface SchoolClassPeopleManagerProps {
    classroom: Group;
    isOpen: boolean;
    onClose: () => void;
    schoolStudents: User[];
    classStudents: User[];
    teachers: User[];
    classTeachers: User[];
    supervisors: User[];
    classSupervisors: User[];
    isBusy: boolean;
    onAssignStudents: (studentIds: string[]) => Promise<void>;
    onRemoveStudent: (student: User) => Promise<void>;
    onCreateStudent: (draft: ClassPersonDraft) => Promise<void>;
    onOpenImport: () => void;
    onAssignTeacher: (teacherId: string) => Promise<void>;
    onCreateTeacher: (draft: ClassPersonDraft) => Promise<void>;
    onRemoveTeacher: (teacher: User) => Promise<void>;
    onAssignSupervisor: (supervisorId: string) => Promise<void>;
    onCreateSupervisor: (draft: ClassPersonDraft) => Promise<void>;
    onRemoveSupervisor: (supervisor: User) => void;
}

type ActiveSection = 'students' | 'teachers' | 'supervisors';

const emptyDraft: ClassPersonDraft = { name: '', email: '', password: '' };

export const SchoolClassPeopleManager: React.FC<SchoolClassPeopleManagerProps> = ({
    classroom,
    isOpen,
    onClose,
    schoolStudents,
    classStudents,
    teachers,
    classTeachers,
    supervisors,
    classSupervisors,
    isBusy,
    onAssignStudents,
    onRemoveStudent,
    onCreateStudent,
    onOpenImport,
    onAssignTeacher,
    onCreateTeacher,
    onRemoveTeacher,
    onAssignSupervisor,
    onCreateSupervisor,
    onRemoveSupervisor,
}) => {
    const [activeSection, setActiveSection] = useState<ActiveSection>('students');
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentDraft, setStudentDraft] = useState<ClassPersonDraft>(emptyDraft);
    const [teacherDraft, setTeacherDraft] = useState<ClassPersonDraft>(emptyDraft);
    const [supervisorDraft, setSupervisorDraft] = useState<ClassPersonDraft>(emptyDraft);
    const [teacherId, setTeacherId] = useState('');
    const [supervisorId, setSupervisorId] = useState('');
    const [localNotice, setLocalNotice] = useState('');

    const classStudentIds = useMemo(() => new Set(classStudents.map((student) => student.id)), [classStudents]);
    const availableStudents = useMemo(() => {
        const query = studentSearch.trim().toLowerCase();
        return schoolStudents
            .filter((student) => !classStudentIds.has(student.id))
            .filter((student) => {
                if (!query) return true;
                return (student.name || '').toLowerCase().includes(query) || (student.email || '').toLowerCase().includes(query);
            });
    }, [schoolStudents, classStudentIds, studentSearch]);

    const availableTeachers = useMemo(
        () => teachers.filter((teacher) => !classTeachers.some((current) => current.id === teacher.id)),
        [teachers, classTeachers],
    );
    const availableSupervisors = useMemo(
        () => supervisors.filter((supervisor) => !classSupervisors.some((current) => current.id === supervisor.id)),
        [supervisors, classSupervisors],
    );

    if (!isOpen) return null;

    const runCreate = async (
        draft: ClassPersonDraft,
        create: (value: ClassPersonDraft) => Promise<void>,
        reset: React.Dispatch<React.SetStateAction<ClassPersonDraft>>,
        successText: string,
    ) => {
        if (!draft.name.trim() || !draft.email.trim()) {
            setLocalNotice('اكتب الاسم والبريد الإلكتروني أولًا.');
            return;
        }
        await create({
            name: draft.name.trim(),
            email: draft.email.trim().toLowerCase(),
            password: draft.password.trim(),
        });
        reset(emptyDraft);
        setLocalNotice(successText);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/35 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label={`إدارة فصل ${classroom.name}`}>
            <button type="button" aria-label="إغلاق إدارة الفصل" className="absolute inset-0 cursor-default" onClick={onClose} />
            <div className="relative z-10 flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl" dir="rtl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-indigo-700 to-blue-600 px-5 py-4 text-white">
                    <div>
                        <p className="text-[11px] font-black text-blue-100">إدارة الفصل من مكان واحد</p>
                        <h3 className="mt-1 text-lg font-black">{classroom.name}</h3>
                        <p className="mt-1 text-xs font-bold text-blue-100">
                            {classStudents.length} طالب · {classTeachers.length} معلم · {classSupervisors.length} مشرف
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl bg-white/15 p-2 transition hover:bg-white/25" aria-label="إغلاق">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50 p-3">
                    {([
                        ['students', `الطلاب (${classStudents.length})`],
                        ['teachers', `المعلمون (${classTeachers.length})`],
                        ['supervisors', `المشرفون (${classSupervisors.length})`],
                    ] as Array<[ActiveSection, string]>).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => { setActiveSection(id); setLocalNotice(''); }}
                            className={`rounded-xl px-3 py-2 text-xs font-black transition ${activeSection === id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {localNotice && (
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
                            {localNotice}
                        </div>
                    )}

                    {activeSection === 'students' && (
                        <div className="space-y-5" data-testid="school-class-student-manager">
                            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">إضافة طلاب موجودين في المدرسة</h4>
                                        <p className="mt-1 text-xs text-slate-600">ابحث وحدد أكثر من طالب ثم أضفهم للفصل دفعة واحدة.</p>
                                    </div>
                                    <Users size={20} className="text-emerald-600" />
                                </div>
                                <div className="relative mt-3">
                                    <Search size={15} className="absolute right-3 top-3 text-slate-400" />
                                    <input
                                        value={studentSearch}
                                        onChange={(event) => setStudentSearch(event.target.value)}
                                        placeholder="بحث بالاسم أو البريد..."
                                        className="w-full rounded-xl border border-emerald-100 bg-white py-2.5 pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                                    />
                                </div>
                                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-2">
                                    {availableStudents.length === 0 ? (
                                        <p className="p-3 text-center text-xs font-bold text-slate-400">لا يوجد طلاب متاحون وفق البحث الحالي.</p>
                                    ) : availableStudents.map((student) => {
                                        const checked = selectedStudentIds.includes(student.id);
                                        return (
                                            <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => setSelectedStudentIds((current) => checked ? current.filter((id) => id !== student.id) : [...current, student.id])}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-black text-slate-800">{student.name}</span>
                                                    <span className="block truncate text-[11px] text-slate-500">{student.email}</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    disabled={isBusy || selectedStudentIds.length === 0}
                                    onClick={() => void onAssignStudents(selectedStudentIds).then(() => {
                                        setSelectedStudentIds([]);
                                        setLocalNotice('تم ربط الطلاب المحددين بالفصل والتحقق من الحفظ.');
                                    })}
                                    className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                                >
                                    إضافة المحددين للفصل ({selectedStudentIds.length})
                                </button>
                            </section>

                            <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                                <h4 className="text-sm font-black text-slate-900">إنشاء طالب جديد داخل هذا الفصل</h4>
                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                    <input value={studentDraft.name} onChange={(e) => setStudentDraft((d) => ({ ...d, name: e.target.value }))} placeholder="اسم الطالب" className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={studentDraft.email} onChange={(e) => setStudentDraft((d) => ({ ...d, email: e.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={studentDraft.password} onChange={(e) => setStudentDraft((d) => ({ ...d, password: e.target.value }))} placeholder="كلمة مرور اختيارية" className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm" />
                                </div>
                                <button type="button" disabled={isBusy} onClick={() => void runCreate(studentDraft, onCreateStudent, setStudentDraft, 'تم إنشاء الطالب وربطه بهذا الفصل.')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                                    <UserPlus size={16} /> إنشاء الطالب وإضافته
                                </button>
                            </section>

                            <button type="button" onClick={onOpenImport} className="flex w-full items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-right transition hover:bg-amber-100">
                                <span>
                                    <span className="block text-sm font-black text-amber-900">إضافة مجموعة طلاب / كشف Excel</span>
                                    <span className="mt-1 block text-xs font-bold text-amber-700">يمكن للملف أن يحتوي طلاب المدرسة كلها وأسماء الفصول؛ النظام ينشئ الفصول غير الموجودة ويربط الطلاب بها.</span>
                                </span>
                                <FileSpreadsheet size={22} className="shrink-0 text-amber-600" />
                            </button>

                            <section>
                                <h4 className="mb-2 text-sm font-black text-slate-900">طلاب الفصل الحاليون</h4>
                                <div className="flex flex-wrap gap-2">
                                    {classStudents.length === 0 ? <span className="text-xs text-slate-400">لا يوجد طلاب في الفصل.</span> : classStudents.map((student) => (
                                        <button key={student.id} type="button" disabled={isBusy} onClick={() => void onRemoveStudent(student)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                                            {student.name} ×
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSection === 'teachers' && (
                        <div className="space-y-5" data-testid="school-class-teacher-manager">
                            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                                <h4 className="text-sm font-black text-slate-900">إضافة معلم مسجل في الموقع</h4>
                                <div className="mt-3 flex gap-2">
                                    <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm">
                                        <option value="">اختر معلمًا...</option>
                                        {availableTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                                    </select>
                                    <button type="button" disabled={isBusy || !teacherId} onClick={() => void onAssignTeacher(teacherId).then(() => { setTeacherId(''); setLocalNotice('تم إسناد المعلم للفصل والتحقق من الحفظ.'); })} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">إضافة</button>
                                </div>
                            </section>
                            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                                <h4 className="text-sm font-black text-slate-900">إنشاء معلم جديد</h4>
                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                    <input value={teacherDraft.name} onChange={(e) => setTeacherDraft((d) => ({ ...d, name: e.target.value }))} placeholder="اسم المعلم" className="rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={teacherDraft.email} onChange={(e) => setTeacherDraft((d) => ({ ...d, email: e.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={teacherDraft.password} onChange={(e) => setTeacherDraft((d) => ({ ...d, password: e.target.value }))} placeholder="كلمة مرور اختيارية" className="rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm" />
                                </div>
                                <button type="button" disabled={isBusy} onClick={() => void runCreate(teacherDraft, onCreateTeacher, setTeacherDraft, 'تم إنشاء المعلم وربطه وإسناده لهذا الفصل.')} className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">إنشاء المعلم وإسناده</button>
                            </section>
                            <section>
                                <h4 className="mb-2 text-sm font-black text-slate-900">معلمو الفصل</h4>
                                <div className="flex flex-wrap gap-2">{classTeachers.length === 0 ? <span className="text-xs text-slate-400">لا يوجد معلمون.</span> : classTeachers.map((teacher) => <button key={teacher.id} type="button" disabled={isBusy} onClick={() => void onRemoveTeacher(teacher)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">{teacher.name} ×</button>)}</div>
                            </section>
                        </div>
                    )}

                    {activeSection === 'supervisors' && (
                        <div className="space-y-5" data-testid="school-class-supervisor-manager">
                            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                                <h4 className="text-sm font-black text-slate-900">إضافة مشرف مسجل في الموقع</h4>
                                <div className="mt-3 flex gap-2">
                                    <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm">
                                        <option value="">اختر مشرفًا...</option>
                                        {availableSupervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}
                                    </select>
                                    <button type="button" disabled={isBusy || !supervisorId} onClick={() => void onAssignSupervisor(supervisorId).then(() => { setSupervisorId(''); setLocalNotice('تم ربط المشرف بالفصل والتحقق من الحفظ.'); })} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">إضافة</button>
                                </div>
                            </section>
                            <section className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                                <h4 className="text-sm font-black text-slate-900">إنشاء مشرف جديد لهذا الفصل</h4>
                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                    <input value={supervisorDraft.name} onChange={(e) => setSupervisorDraft((d) => ({ ...d, name: e.target.value }))} placeholder="اسم المشرف" className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={supervisorDraft.email} onChange={(e) => setSupervisorDraft((d) => ({ ...d, email: e.target.value }))} placeholder="البريد الإلكتروني" className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm" />
                                    <input value={supervisorDraft.password} onChange={(e) => setSupervisorDraft((d) => ({ ...d, password: e.target.value }))} placeholder="كلمة مرور اختيارية" className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm" />
                                </div>
                                <button type="button" disabled={isBusy} onClick={() => void runCreate(supervisorDraft, onCreateSupervisor, setSupervisorDraft, 'تم إنشاء المشرف وربطه بهذا الفصل.')} className="mt-3 w-full rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">إنشاء المشرف وربطه</button>
                            </section>
                            <section>
                                <h4 className="mb-2 text-sm font-black text-slate-900">مشرفو الفصل</h4>
                                <div className="flex flex-wrap gap-2">{classSupervisors.length === 0 ? <span className="text-xs text-slate-400">لا يوجد مشرفون.</span> : classSupervisors.map((supervisor) => <button key={supervisor.id} type="button" disabled={isBusy} onClick={() => onRemoveSupervisor(supervisor)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">{supervisor.name} ×</button>)}</div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
