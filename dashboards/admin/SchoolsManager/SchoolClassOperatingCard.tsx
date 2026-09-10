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
    classroom, classStudentCount, studentsWithoutParentCount, classSupervisors, classTeachers,
    classCourses, supervisors, teachers, publishedCourses, rosterActionPending, isSchoolWorkspaceBusy,
    onDownloadReport, onPrintReport, onRename, onDelete, onFocusStudentForm, onFocusRoster,
    onOpenImport, onOpenPackages, onAssignSupervisor, onCreateSupervisor, onRemoveSupervisor,
    onAssignTeacher, onRemoveTeacher, onAssignCourse, onRemoveCourse,
}) => {
    const availableSupervisors = supervisors.filter((currentUser) => !classroom.supervisorIds.includes(currentUser.id));
    const availableTeachers = teachers.filter((currentUser) => !classTeachers.some((teacher) => teacher.id === currentUser.id));
    const availableCourses = publishedCourses.filter((course) => !classroom.courseIds.includes(course.id));

    return (
        <div data-testid="school-class-card" data-school-class-id={classroom.id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all">
            {/* ── رأس بطاقة الفصل المميز بخلفية زرقاء واضحة لتمييز بداية الفصل ── */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white flex justify-between items-start gap-3 border-b border-blue-800/30">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-lg shrink-0 mt-0.5 shadow-2xs">
                        🏫
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-md">
                                فصل دراسي
                            </span>
                            <h4 className="font-black text-base md:text-lg text-white tracking-tight leading-snug">
                                {classroom.name}
                            </h4>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-blue-100 flex items-center gap-1.5 flex-wrap">
                            <span>{classStudentCount} طالب</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classSupervisors.length} مشرف</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classTeachers.length} معلم</span>
                            <span className="text-blue-300/80">•</span>
                            <span>{classCourses.length} دورة</span>
                        </p>
                        {studentsWithoutParentCount > 0 && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-md shadow-2xs">
                                ⚠️ {studentsWithoutParentCount} طالب بلا ولي أمر
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={onDownloadReport} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer shadow-2xs" title="تصدير تقرير الفصل">
                        <Download size={15} />
                    </button>
                    <button type="button" onClick={onPrintReport} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer shadow-2xs" title="طباعة تقرير الفصل">
                        <Printer size={15} />
                    </button>
                    <button type="button" onClick={onRename} disabled={isSchoolWorkspaceBusy} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all disabled:opacity-40 cursor-pointer shadow-2xs" title="تعديل اسم الفصل">
                        <Edit2 size={15} />
                    </button>
                    <button type="button" onClick={onDelete} disabled={isSchoolWorkspaceBusy} className="p-2 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-all disabled:opacity-40 cursor-pointer shadow-2xs" title="حذف الفصل">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* ── محتوى وإجراءات الفصل التشغيلية ── */}
            <div className="p-4 space-y-4">
                <div data-testid="school-class-operating-actions" className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-4">
                    <button type="button" data-testid="school-class-add-students" onClick={onFocusStudentForm} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-indigo-600 hover:text-white cursor-pointer shadow-2xs">
                        إضافة طالب
                    </button>
                    <button type="button" data-testid="school-class-roster" onClick={onFocusRoster} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white cursor-pointer shadow-2xs">
                        طلاب الفصل
                    </button>
                    <button type="button" data-testid="school-class-import-students" onClick={onOpenImport} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-amber-500 hover:text-white cursor-pointer shadow-2xs">
                        Excel للفصل
                    </button>
                    <button type="button" data-testid="school-class-access" onClick={onOpenPackages} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-emerald-600 hover:text-white cursor-pointer shadow-2xs">
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
                                    <button key={teacher.id} type="button" data-testid="school-remove-class-teacher" onClick={() => void onRemoveTeacher(teacher)} disabled={Boolean(rosterActionPending)} className="flex items-center gap-1.5 rounded-full bg-white border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-800 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer" title="اضغط لإزالة المعلم">
                                        {teacher.name} ×
                                    </button>
                                ))}
                            </div>
                        )}
                        <select data-testid="school-assign-class-teacher" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" defaultValue="" onChange={(event) => {
                            const target = event.currentTarget;
                            const value = event.target.value;
                            if (!value) return;
                            void onAssignTeacher(value).finally(() => { target.value = ''; });
                        }} disabled={Boolean(rosterActionPending)}>
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
                                    <button key={currentUser.id} type="button" data-testid="school-remove-class-supervisor" onClick={() => onRemoveSupervisor(currentUser)} disabled={Boolean(rosterActionPending)} className="flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer" title="اضغط لإزالة المشرف">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
                                            {currentUser.name?.charAt(0) || '؟'}
                                        </span>
                                        {currentUser.name} ×
                                    </button>
                                ))}
                            </div>
                        )}
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer" defaultValue="" onChange={(event) => {
                            const target = event.currentTarget;
                            const value = event.target.value;
                            if (!value) return;
                            void onAssignSupervisor(value).finally(() => { target.value = ''; });
                        }} disabled={Boolean(rosterActionPending)}>
                            <option value="">إسناد مشرف موجود للفصل...</option>
                            {availableSupervisors.map((currentUser) => (
                                <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                            ))}
                        </select>
                        {availableSupervisors.length === 0 && classSupervisors.length === 0 && (
                            <p className="mt-1.5 text-xs text-amber-700">لا توجد حسابات مشرفين متاحة — أنشئ مشرفاً جديداً أدناه</p>
                        )}
                        <button type="button" data-testid="school-class-create-supervisor" onClick={onCreateSupervisor} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 transition-colors hover:bg-purple-100 cursor-pointer">
                            <UserPlus size={14} />
                            إنشاء مشرف جديد لهذا الفصل
                        </button>
                    </div>

                    {/* ── الدورات المخصصة ── */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">الدورات المخصصة</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer" defaultValue="" onChange={(event) => {
                            const value = event.target.value;
                            if (!value) return;
                            onAssignCourse(value);
                            event.target.value = '';
                        }}>
                            <option value="">إضافة دورة للفصل</option>
                            {availableCourses.map((course) => (
                                <option key={course.id} value={course.id}>{course.title}</option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {classCourses.length === 0 ? (
                                <span className="text-xs text-gray-400">لا توجد دورات مرتبطة بهذا الفصل.</span>
                            ) : classCourses.map((course) => (
                                <button key={course.id} type="button" onClick={() => onRemoveCourse(course.id)} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer">
                                    {course.title} ×
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
