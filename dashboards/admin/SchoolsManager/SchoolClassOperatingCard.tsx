import React from 'react';
import { Download, Edit2, Printer, Trash2, Users } from 'lucide-react';
import type { Course, Group, User } from '../../../types';

interface SchoolClassOperatingCardProps {
    classroom: Group;
    classStudentCount: number;
    studentsWithoutParentCount: number;
    classSupervisors: User[];
    classTeachers: User[];
    classCourses: Course[];
    publishedCourses: Course[];
    isSchoolWorkspaceBusy: boolean;
    onDownloadReport: () => void;
    onPrintReport: () => void;
    onRename: () => void;
    onDelete: () => void;
    onManageStudents: () => void;
    onManageTeachers: () => void;
    onManageSupervisors: () => void;
    onOpenPackages: () => void;
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
    publishedCourses,
    isSchoolWorkspaceBusy,
    onDownloadReport,
    onPrintReport,
    onRename,
    onDelete,
    onManageStudents,
    onManageTeachers,
    onManageSupervisors,
    onOpenPackages,
    onAssignCourse,
    onRemoveCourse,
}) => {
    const availableCourses = publishedCourses.filter((course) => !classroom.courseIds.includes(course.id));

    return (
        <div
            data-testid="school-class-card"
            data-school-class-id={classroom.id}
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3 border-b border-blue-800/30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg shadow-2xs backdrop-blur-xs">
                        🏫
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                                فصل دراسي
                            </span>
                            <h4 className="text-base font-black leading-snug tracking-tight text-white md:text-lg">
                                {classroom.name}
                            </h4>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-blue-100">
                            <span>{classStudentCount} طالب</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classSupervisors.length} مشرف</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classTeachers.length} معلم</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classCourses.length} دورة</span>
                        </p>
                        {studentsWithoutParentCount > 0 && (
                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold text-amber-950 shadow-2xs">
                                ⚠️ {studentsWithoutParentCount} طالب بلا ولي أمر
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={onDownloadReport} className="cursor-pointer rounded-xl bg-white/10 p-2 text-white shadow-2xs transition-all hover:bg-white/25" title="تصدير تقرير الفصل">
                        <Download size={15} />
                    </button>
                    <button type="button" onClick={onPrintReport} className="cursor-pointer rounded-xl bg-white/10 p-2 text-white shadow-2xs transition-all hover:bg-white/25" title="طباعة تقرير الفصل">
                        <Printer size={15} />
                    </button>
                    <button type="button" onClick={onRename} disabled={isSchoolWorkspaceBusy} className="cursor-pointer rounded-xl bg-white/10 p-2 text-white shadow-2xs transition-all hover:bg-white/25 disabled:opacity-40" title="تعديل اسم الفصل">
                        <Edit2 size={15} />
                    </button>
                    <button type="button" onClick={onDelete} disabled={isSchoolWorkspaceBusy} className="cursor-pointer rounded-xl bg-white/10 p-2 text-white shadow-2xs transition-all hover:bg-red-500 disabled:opacity-40" title="حذف الفصل">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 p-4">
                <div data-testid="school-class-operating-actions" className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-4">
                    <button
                        type="button"
                        data-testid="school-class-manage-students"
                        onClick={onManageStudents}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 shadow-2xs transition-colors hover:bg-emerald-600 hover:text-white"
                    >
                        إدارة الطلاب
                    </button>
                    <button
                        type="button"
                        data-testid="school-class-manage-teachers"
                        onClick={onManageTeachers}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 shadow-2xs transition-colors hover:bg-blue-600 hover:text-white"
                    >
                        إدارة المعلمين
                    </button>
                    <button
                        type="button"
                        data-testid="school-class-manage-supervisors"
                        onClick={onManageSupervisors}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 shadow-2xs transition-colors hover:bg-purple-600 hover:text-white"
                    >
                        إدارة المشرفين
                    </button>
                    <button
                        type="button"
                        data-testid="school-class-access"
                        onClick={onOpenPackages}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 shadow-2xs transition-colors hover:bg-gray-900 hover:text-white"
                    >
                        محتوى وأكواد
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={onManageTeachers}
                        className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-right transition-colors hover:bg-blue-100"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-xs font-black text-blue-800">المعلمون</div>
                                <p className="mt-1 text-xs font-bold text-slate-600">
                                    {classTeachers.length === 0 ? 'لا يوجد معلم مرتبط' : classTeachers.map((teacher) => teacher.name).slice(0, 3).join('، ')}
                                </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">{classTeachers.length}</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onManageSupervisors}
                        className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-right transition-colors hover:bg-purple-100"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-xs font-black text-purple-800">المشرفون</div>
                                <p className="mt-1 text-xs font-bold text-slate-600">
                                    {classSupervisors.length === 0 ? 'لا يوجد مشرف مرتبط' : classSupervisors.map((supervisor) => supervisor.name).slice(0, 3).join('، ')}
                                </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-purple-700">{classSupervisors.length}</span>
                        </div>
                    </button>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-black text-emerald-800">
                            <Users size={14} />
                            الدورات المخصصة ({classCourses.length})
                        </label>
                    </div>
                    <select
                        className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    <div className="mt-2 flex flex-wrap gap-2">
                        {classCourses.length === 0 ? (
                            <span className="text-xs text-gray-400">لا توجد دورات مرتبطة بهذا الفصل.</span>
                        ) : classCourses.map((course) => (
                            <button
                                key={course.id}
                                type="button"
                                onClick={() => onRemoveCourse(course.id)}
                                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
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
