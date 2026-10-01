import React, { useMemo, useState } from 'react';
import { Search, Upload, UserPlus, Users, X } from 'lucide-react';
import type { Group, User } from '../../../types';

export type ClassPersonDraft = {
    name: string;
    email: string;
    password: string;
};

type ActiveSection = 'students' | 'teachers' | 'supervisors';

interface SchoolClassPeopleManagerProps {
    schoolId: string;
    classroom: Group;
    schoolStudents: User[];
    teachers: User[];
    supervisors: User[];
    initialSection: ActiveSection;
    isBusy: boolean;
    onClose: () => void;
    onAssignStudents: (studentIds: string[]) => Promise<void>;
    onCreateStudent: (draft: ClassPersonDraft) => Promise<void>;
    onRemoveStudent: (student: User) => Promise<void>;
    onAssignTeacher: (teacherId: string) => Promise<void>;
    onCreateTeacher: (draft: ClassPersonDraft) => Promise<void>;
    onRemoveTeacher: (teacher: User) => Promise<void>;
    onAssignSupervisor: (supervisorId: string) => Promise<void>;
    onCreateSupervisor: (draft: ClassPersonDraft) => Promise<void>;
    onRemoveSupervisor: (supervisor: User) => void;
    onOpenImport: () => void;
}

const emptyDraft = (): ClassPersonDraft => ({ name: '', email: '', password: '' });

const isInClass = (user: User, classroom: Group) => (
    (user.groupIds || []).includes(classroom.id)
    || (classroom.studentIds || []).includes(user.id)
);

const canUseInSchool = (user: User, schoolId: string) => (
    !user.schoolId
    || user.schoolId === schoolId
    || (user.groupIds || []).includes(schoolId)
);

export const SchoolClassPeopleManager: React.FC<SchoolClassPeopleManagerProps> = ({
    schoolId,
    classroom,
    schoolStudents,
    teachers,
    supervisors,
    initialSection,
    isBusy,
    onClose,
    onAssignStudents,
    onCreateStudent,
    onRemoveStudent,
    onAssignTeacher,
    onCreateTeacher,
    onRemoveTeacher,
    onAssignSupervisor,
    onCreateSupervisor,
    onRemoveSupervisor,
    onOpenImport,
}) => {
    const [section, setSection] = useState<ActiveSection>(initialSection);
    const [search, setSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentDraft, setStudentDraft] = useState<ClassPersonDraft>(emptyDraft);
    const [teacherDraft, setTeacherDraft] = useState<ClassPersonDraft>(emptyDraft);
    const [supervisorDraft, setSupervisorDraft] = useState<ClassPersonDraft>(emptyDraft);

    const currentStudents = useMemo(
        () => schoolStudents.filter((student) => isInClass(student, classroom)),
        [schoolStudents, classroom],
    );
    const currentTeachers = useMemo(
        () => teachers.filter((teacher) => (teacher.groupIds || []).includes(classroom.id)),
        [teachers, classroom.id],
    );
    const currentSupervisors = useMemo(
        () => supervisors.filter((supervisor) => (classroom.supervisorIds || []).includes(supervisor.id)),
        [supervisors, classroom.supervisorIds],
    );

    const query = search.trim().toLowerCase();
    const availableStudents = schoolStudents.filter((student) => (
        !isInClass(student, classroom)
        && (!query || student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query))
    ));
    const availableTeachers = teachers.filter((teacher) => (
        canUseInSchool(teacher, schoolId)
        && !(teacher.groupIds || []).includes(classroom.id)
        && (!query || teacher.name.toLowerCase().includes(query) || teacher.email.toLowerCase().includes(query))
    ));
    const availableSupervisors = supervisors.filter((supervisor) => (
        canUseInSchool(supervisor, schoolId)
        && !(classroom.supervisorIds || []).includes(supervisor.id)
        && (!query || supervisor.name.toLowerCase().includes(query) || supervisor.email.toLowerCase().includes(query))
    ));

    const createFromDraft = async (
        draft: ClassPersonDraft,
        action: (payload: ClassPersonDraft) => Promise<void>,
        reset: React.Dispatch<React.SetStateAction<ClassPersonDraft>>,
    ) => {
        if (!draft.name.trim() || !draft.email.trim()) return;
        await action({
            name: draft.name.trim(),
            email: draft.email.trim(),
            password: draft.password,
        });
        reset(emptyDraft());
    };

    const renderCurrentPeople = (
        title: string,
        people: User[],
        onRemove: (user: User) => Promise<void> | void,
    ) => (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-black text-slate-600">{title} ({people.length})</div>
            {people.length === 0 ? (
                <p className="text-xs font-bold text-slate-400">لا يوجد أحد مرتبط بهذا الفصل حتى الآن.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {people.map((person) => (
                        <button
                            key={person.id}
                            type="button"
                            disabled={isBusy}
                            onClick={() => void onRemove(person)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            title="اضغط للإزالة من الفصل"
                        >
                            {person.name} ×
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderNewPersonForm = (
        title: string,
        draft: ClassPersonDraft,
        setDraft: React.Dispatch<React.SetStateAction<ClassPersonDraft>>,
        action: (payload: ClassPersonDraft) => Promise<void>,
    ) => (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
            <div className="mb-2 text-xs font-black text-indigo-800">{title}</div>
            <div className="grid gap-2 md:grid-cols-4">
                <input
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="الاسم"
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="البريد الإلكتروني"
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                    value={draft.password}
                    onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                    placeholder="كلمة مرور اختيارية"
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                    type="button"
                    disabled={isBusy || !draft.name.trim() || !draft.email.trim()}
                    onClick={() => void createFromDraft(draft, action, setDraft)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    <UserPlus size={15} />
                    إنشاء وربط
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3" data-testid="school-class-people-manager">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
                    <div>
                        <div className="text-xs font-black text-indigo-600">إدارة الفصل</div>
                        <h3 className="text-lg font-black text-slate-900">{classroom.name}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            الطلاب {currentStudents.length} • المعلمون {currentTeachers.length} • المشرفون {currentSupervisors.length}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="إغلاق">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1.5">
                        {([
                            ['students', 'الطلاب'],
                            ['teachers', 'المعلمون'],
                            ['supervisors', 'المشرفون'],
                        ] as Array<[ActiveSection, string]>).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => { setSection(id); setSearch(''); }}
                                className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${section === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <Search size={16} className="text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="ابحث بالاسم أو البريد..."
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </div>

                    {section === 'students' && (
                        <div className="space-y-4">
                            {renderCurrentPeople('طلاب الفصل الحاليون', currentStudents, onRemoveStudent)}
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-xs font-black text-emerald-800">طلاب موجودون في المدرسة</div>
                                        <p className="mt-1 text-[11px] font-bold text-emerald-700">حدد طالبًا واحدًا أو مجموعة ثم أضفهم للفصل دفعة واحدة.</p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isBusy || selectedStudentIds.length === 0}
                                        onClick={async () => {
                                            await onAssignStudents(selectedStudentIds);
                                            setSelectedStudentIds([]);
                                        }}
                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        إضافة المحددين ({selectedStudentIds.length})
                                    </button>
                                </div>
                                <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">
                                    {availableStudents.length === 0 ? (
                                        <p className="col-span-full py-4 text-center text-xs font-bold text-slate-400">لا يوجد طلاب آخرون مطابقون للبحث.</p>
                                    ) : availableStudents.map((student) => (
                                        <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.includes(student.id)}
                                                onChange={(event) => setSelectedStudentIds((current) => event.target.checked
                                                    ? Array.from(new Set([...current, student.id]))
                                                    : current.filter((id) => id !== student.id))}
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate">{student.name}</span>
                                                <span className="block truncate text-[10px] font-medium text-slate-400">{student.email}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {renderNewPersonForm('إنشاء طالب جديد وربطه بهذا الفصل', studentDraft, setStudentDraft, onCreateStudent)}
                            <button
                                type="button"
                                onClick={onOpenImport}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 hover:bg-amber-100"
                            >
                                <Upload size={16} />
                                رفع كشف Excel للطلاب والفصول
                            </button>
                        </div>
                    )}

                    {section === 'teachers' && (
                        <div className="space-y-4">
                            {renderCurrentPeople('معلمو الفصل الحاليون', currentTeachers, onRemoveTeacher)}
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                                <div className="mb-2 text-xs font-black text-blue-800">إضافة معلم مسجل على المنصة</div>
                                <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">
                                    {availableTeachers.length === 0 ? (
                                        <p className="col-span-full py-4 text-center text-xs font-bold text-slate-400">لا يوجد معلم متاح مطابق للبحث.</p>
                                    ) : availableTeachers.map((teacher) => (
                                        <button
                                            key={teacher.id}
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void onAssignTeacher(teacher.id)}
                                            className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-3 py-2 text-right text-xs font-bold text-slate-700 hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            <span>
                                                <span className="block">{teacher.name}</span>
                                                <span className="block text-[10px] font-medium text-slate-400">{teacher.email}</span>
                                            </span>
                                            <UserPlus size={15} className="text-blue-600" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {renderNewPersonForm('إنشاء معلم جديد وربطه بهذا الفصل', teacherDraft, setTeacherDraft, onCreateTeacher)}
                        </div>
                    )}

                    {section === 'supervisors' && (
                        <div className="space-y-4">
                            {renderCurrentPeople('مشرفو الفصل الحاليون', currentSupervisors, onRemoveSupervisor)}
                            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3">
                                <div className="mb-2 text-xs font-black text-purple-800">إضافة مشرف مسجل على المنصة</div>
                                <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">
                                    {availableSupervisors.length === 0 ? (
                                        <p className="col-span-full py-4 text-center text-xs font-bold text-slate-400">لا يوجد مشرف متاح مطابق للبحث.</p>
                                    ) : availableSupervisors.map((supervisor) => (
                                        <button
                                            key={supervisor.id}
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void onAssignSupervisor(supervisor.id)}
                                            className="flex items-center justify-between rounded-xl border border-purple-100 bg-white px-3 py-2 text-right text-xs font-bold text-slate-700 hover:bg-purple-100 disabled:opacity-50"
                                        >
                                            <span>
                                                <span className="block">{supervisor.name}</span>
                                                <span className="block text-[10px] font-medium text-slate-400">{supervisor.email}</span>
                                            </span>
                                            <Users size={15} className="text-purple-600" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {renderNewPersonForm('إنشاء مشرف جديد وربطه بهذا الفصل', supervisorDraft, setSupervisorDraft, onCreateSupervisor)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
