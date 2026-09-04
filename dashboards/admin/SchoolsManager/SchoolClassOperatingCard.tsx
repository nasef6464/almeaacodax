import React from 'react';
import { Download, Edit2, Printer, Trash2, UserPlus } from 'lucide-react';
import type { Course, Group, User } from '../../../types';

interface SchoolClassOperatingCardProps {
    classroom: Group;
    classStudentCount: number;
    studentsWithoutParentCount: number;
    classSupervisors: User[];
    classTeachers: User[];
    classCourses: Course[];
    supervisors: User[];
    teachers: User[];
    publishedCourses: Course[];
    rosterActionPending: string | null;
    isSchoolWorkspaceBusy: boolean;
    onDownloadReport: () => void;
    onPrintReport: () => void;
    onRename: () => void;
    onDelete: () => void;
    onFocusStudentForm: () => void;
    onFocusRoster: () => void;
    onOpenImport: () => void;
    onOpenPackages: () => void;
    onAssignSupervisor: (userId: string) => Promise<void>;
    onCreateSupervisor: () => void;
    onRemoveSupervisor: (user: User) => void;
    onAssignTeacher: (userId: string) => Promise<void>;
    onRemoveTeacher: (user: User) => Promise<void>;
    onAssignCourse: (courseId: string) => void;
    onRemoveCourse: (courseId: string) => void;
}

export const SchoolClassOperatingCard: React.FC<SchoolClassOperatingCardProps> = ({
    classroom,
    classStudentCount,
    studentsWithoutParentCount,
    classSupervisors,
    classTeachers,
    classCourses,
    supervisors,
    teachers,
    publishedCourses,
    rosterActionPending,
    isSchoolWorkspaceBusy,
    onDownloadReport,
    onPrintReport,
    onRename,
    onDelete,
    onFocusStudentForm,
    onFocusRoster,
    onOpenImport,
    onOpenPackages,
    onAssignSupervisor,
    onCreateSupervisor,
    onRemoveSupervisor,
    onAssignTeacher,
    onRemoveTeacher,
    onAssignCourse,
    onRemoveCourse,
}) => {
    const availableSupervisors = supervisors.filter((currentUser) => !classroom.supervisorIds.includes(currentUser.id));
    const availableTeachers = teachers.filter((currentUser) => !classTeachers.some((teacher) => teacher.id === currentUser.id));
    const availableCourses = publishedCourses.filter((course) => !classroom.courseIds.includes(course.id));

    return (
        <div data-testid="school-class-card" data-school-class-id={classroom.id} className="border border-gray-100 p-4 rounded-xl hover:shadow-sm transition-shadow space-y-4">
            <div className="flex justify-between items-start gap-3">
                <div>
                    <h4 className="font-bold text-gray-900">{classroom.name}</h4>
                    <p className="text-sm text-gray-500">
                        {classStudentCount} طالب • {classSupervisors.length} مشرف • {classTeachers.length} معلم • {classCourses.length} دورة
                    </p>
                    {studentsWithoutParentCount > 0 && (
                        <p className="mt-1 text-xs font-bold text-amber-700">
                            {studentsWithoutParentCount} طالب بلا ولي أمر
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onDownloadReport}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                        title="تصدير تقرير الفصل"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={onPrintReport}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="طباعة تقرير الفصل"
                    >
                        <Printer size={18} />
                    </button>
                    <button
                        onClick={onRename}
                        disabled={isSchoolWorkspaceBusy}
                        className="text-gray-400 hover:text-amber-600 transition-colors"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={isSchoolWorkspaceBusy}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div data-testid="school-class-operating-actions" className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-4">
                <button
                    type="button"
                    data-testid="school-class-add-students"
                    onClick={onFocusStudentForm}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-indigo-600 hover:text-white"
                >
                    إضافة طالب
                </button>
                <button
                    type="button"
                    data-testid="school-class-roster"
                    onClick={onFocusRoster}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                >
                    طلاب الفصل
                </button>
                <button
                    type="button"
                    data-testid="school-class-import-students"
                    onClick={onOpenImport}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-amber-500 hover:text-white"
                >
                    Excel للفصل
                </button>
                <button
                    type="button"
                    data-testid="school-class-access"
                    onClick={onOpenPackages}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-emerald-600 hover:text-white"
                >
                    محتوى وأكواد
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* ── المعلمون المسؤولون ── */}
                <div className={`rounded-xl border p-3 ${classTeachers.length === 0 ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`} data-testid="school-class-teachers">
                    <div className="flex items-center justify-between mb-2">
                        <label className={`text-xs font-black ${classTeachers.length === 0 ? 'text-amber-800' : 'text-blue-800'}`}>
                            {classTeachers.length === 0 ? '⚠️ لا يوجد معلم للفصل' : `✅ معلمو الفصل (${classTeachers.length})`}
                        </label>
                    </div>
                    {classTeachers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {classTeachers.map((teacher) => (
                                <button
                                    key={teacher.id}
                                    type="button"
                                    data-testid="school-remove-class-teacher"
                                    onClick={() => void onRemoveTeacher(teacher)}
                                    disabled={Boolean(rosterActionPending)}
                                    className="flex items-center gap-1.5 rounded-full bg-white border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-800 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                                    title="اضغط لإزالة المعلم"
                                >
                                    {teacher.name} ×
                                </button>
                            ))}
                        </div>
                    )}
                    <select
                        data-testid="school-assign-class-teacher"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                        onChange={(event) => {
                            const target = event.currentTarget;
                            const value = event.target.value;
                            if (!value) return;
                            void onAssignTeacher(value).finally(() => { target.value = ''; });
                        }}
                        disabled={Boolean(rosterActionPending)}
                    >
                        <option value="">إسناد معلم موجود للفصل...</option>
                        {availableTeachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                    </select>
                    {availableTeachers.length === 0 && classTeachers.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-700">لا توجد حسابات معلمين متاحة — أضف معلمًا من المستخدمين أو ملف العلاقات.</p>
                    )}
                </div>

                {/* ── المشرف المسؤول ── */}
                <div className={`rounded-xl border p-3 ${classSupervisors.length === 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`text-xs font-black ${classSupervisors.length === 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                            {classSupervisors.length === 0 ? '⚠️ لا يوجد مشرف للفصل' : `✅ مشرفو الفصل (${classSupervisors.length})`}
                        </label>
                    </div>

                    {classSupervisors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {classSupervisors.map((currentUser) => (
                                <button
                                    key={currentUser.id}
                                    type="button"
                                    data-testid="school-remove-class-supervisor"
                                    onClick={() => onRemoveSupervisor(currentUser)}
                                    disabled={Boolean(rosterActionPending)}
                                    className="flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                                    title="اضغط لإزالة المشرف"
                                >
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
                                        {currentUser.name?.charAt(0) || '؟'}
                                    </span>
                                    {currentUser.name} ×
                                </button>
                            ))}
                        </div>
                    )}

                    <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        defaultValue=""
                        onChange={(event) => {
                            const target = event.currentTarget;
                            const value = event.target.value;
                            if (!value) return;
                            void onAssignSupervisor(value).finally(() => { target.value = ''; });
                        }}
                        disabled={Boolean(rosterActionPending)}
                    >
                        <option value="">إسناد مشرف موجود للفصل...</option>
                        {availableSupervisors.map((currentUser) => (
                            <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                        ))}
                    </select>

                    {availableSupervisors.length === 0 && classSupervisors.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-700">
                            لا توجد حسابات مشرفين متاحة — أنشئ مشرفاً جديداً أدناه
                        </p>
                    )}

                    <button
                        type="button"
                        data-testid="school-class-create-supervisor"
                        onClick={onCreateSupervisor}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 transition-colors hover:bg-purple-100"
                    >
                        <UserPlus size={14} />
                        إنشاء مشرف جديد لهذا الفصل
                    </button>
                </div>

                {/* ── الدورات المخصصة ── */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">الدورات المخصصة</label>
                    <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        defaultValue=""
                        onChange={(event) => {
                            const value = event.target.value;
                            if (!value) return;
                            onAssignCourse(value);
                            event.target.value = '';
                        }}
                    >
                        <option value="">إضافة دورة للفصل</option>
                        {availableCourses.map((course) => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {classCourses.length === 0 ? (
                            <span className="text-xs text-gray-400">لا توجد دورات مرتبطة بهذا الفصل.</span>
                        ) : classCourses.map((course) => (
                            <button
                                key={course.id}
                                onClick={() => onRemoveCourse(course.id)}
                                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                                {course.title} ×
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

    );
};
