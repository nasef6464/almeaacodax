import React from 'react';
import { Building2, Download, Plus } from 'lucide-react';
import type { Course, Group, User } from '../../../types';
import { SchoolClassOperatingCard } from './SchoolClassOperatingCard';

interface SchoolClassesPanelProps {
    schoolClasses: Group[];
    schoolStudents: User[];
    parents: User[];
    supervisors: User[];
    publishedCourses: Course[];
    bulkClassNames: string;
    setBulkClassNames: (value: string) => void;
    schoolActionPending: string | null;
    isSchoolWorkspaceBusy: boolean;
    rosterActionPending: string | null;
    onDownloadSchoolRoster: () => void;
    onCreateSingleClass: () => void;
    onCreateBulkClasses: () => void;
    onDownloadClassReport: (classroom: Group) => void;
    onPrintClassReport: (classroom: Group) => void;
    onRenameClass: (classroom: Group) => void;
    onDeleteClass: (classroom: Group) => void;
    onFocusClassStudentForm: (classroom: Group) => void;
    onFocusClassRoster: (classroom: Group) => void;
    onOpenImport: () => void;
    onOpenPackages: () => void;
    onAssignSupervisor: (userId: string, classId: string) => Promise<void>;
    onCreateSupervisor: (classroom: Group) => void;
    onRemoveSupervisor: (classroom: Group, user: User) => void;
    onAssignCourse: (courseId: string, classId: string) => void;
    onRemoveCourse: (courseId: string, classId: string) => void;
}

export const SchoolClassesPanel: React.FC<SchoolClassesPanelProps> = ({
    schoolClasses,
    schoolStudents,
    parents,
    supervisors,
    publishedCourses,
    bulkClassNames,
    setBulkClassNames,
    schoolActionPending,
    isSchoolWorkspaceBusy,
    rosterActionPending,
    onDownloadSchoolRoster,
    onCreateSingleClass,
    onCreateBulkClasses,
    onDownloadClassReport,
    onPrintClassReport,
    onRenameClass,
    onDeleteClass,
    onFocusClassStudentForm,
    onFocusClassRoster,
    onOpenImport,
    onOpenPackages,
    onAssignSupervisor,
    onCreateSupervisor,
    onRemoveSupervisor,
    onAssignCourse,
    onRemoveCourse,
}) => (
    <div data-testid="school-classes-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">الفصول الدراسية</h3>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onDownloadSchoolRoster}
                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <Download size={16} /> تصدير كشف الطلاب
                </button>
                <button
                    disabled={isSchoolWorkspaceBusy}
                    onClick={onCreateSingleClass}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> إضافة فصل
                </button>
            </div>
        </div>

        <div data-testid="school-class-creation-panel" className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <label className="mb-2 block text-sm font-bold text-amber-900">
                        إنشاء عدة فصول مرة واحدة
                    </label>
                    <textarea
                        value={bulkClassNames}
                        onChange={(event) => setBulkClassNames(event.target.value)}
                        placeholder="مثال: أول ثانوي أ&#10;أول ثانوي ب&#10;ثاني ثانوي قدرات"
                        rows={3}
                        className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <p className="mt-2 text-xs leading-6 text-amber-800">
                        اكتب كل فصل في سطر، أو افصل بينها بفاصلة. النظام يتجنب تكرار أسماء الفصول الموجودة.
                    </p>
                </div>
                <button
                    onClick={onCreateBulkClasses}
                    disabled={Boolean(schoolActionPending)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                >
                    <Plus size={16} />
                    إنشاء الفصول
                </button>
            </div>
        </div>

        {schoolClasses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد فصول دراسية مضافة حتى الآن.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schoolClasses.map((classroom) => {
                    const classSupervisors = supervisors.filter((currentUser) => classroom.supervisorIds.includes(currentUser.id));
                    const classCourses = publishedCourses.filter((course) => classroom.courseIds.includes(course.id));
                    const classStudents = schoolStudents.filter((student) => classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id));
                    const classStudentsWithoutParent = classStudents.filter((student) => !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id)));

                    return (
                        <SchoolClassOperatingCard
                            key={classroom.id}
                            classroom={classroom}
                            classStudentCount={classStudents.length}
                            studentsWithoutParentCount={classStudentsWithoutParent.length}
                            classSupervisors={classSupervisors}
                            classCourses={classCourses}
                            supervisors={supervisors}
                            publishedCourses={publishedCourses}
                            rosterActionPending={rosterActionPending}
                            isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                            onDownloadReport={() => onDownloadClassReport(classroom)}
                            onPrintReport={() => onPrintClassReport(classroom)}
                            onRename={() => onRenameClass(classroom)}
                            onDelete={() => onDeleteClass(classroom)}
                            onFocusStudentForm={() => onFocusClassStudentForm(classroom)}
                            onFocusRoster={() => onFocusClassRoster(classroom)}
                            onOpenImport={onOpenImport}
                            onOpenPackages={onOpenPackages}
                            onAssignSupervisor={(userId) => onAssignSupervisor(userId, classroom.id)}
                            onCreateSupervisor={() => onCreateSupervisor(classroom)}
                            onRemoveSupervisor={(currentUser) => onRemoveSupervisor(classroom, currentUser)}
                            onAssignCourse={(courseId) => onAssignCourse(courseId, classroom.id)}
                            onRemoveCourse={(courseId) => onRemoveCourse(courseId, classroom.id)}
                        />
                    );
                })}
            </div>
        )}
    </div>
);
