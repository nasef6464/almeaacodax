import React, { useState } from 'react';
import { Building2, Download, Plus } from 'lucide-react';
import type { Course, Group, User } from '../../../types';
import { SchoolClassOperatingCard } from './SchoolClassOperatingCard';
import { SchoolClassPeopleManager, type ClassPersonDraft } from './SchoolClassPeopleManager';

type PeopleSection = 'students' | 'teachers' | 'supervisors';

interface SchoolClassesPanelProps {
    schoolId: string;
    schoolClasses: Group[];
    schoolStudents: User[];
    parents: User[];
    supervisors: User[];
    teachers: User[];
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
    onOpenImport: () => void;
    onOpenPackages: () => void;
    onAssignStudents: (studentIds: string[], classId: string) => Promise<void>;
    onCreateStudent: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    onRemoveStudent: (classroom: Group, student: User) => Promise<void>;
    onAssignSupervisor: (userId: string, classId: string) => Promise<void>;
    onCreateSupervisor: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    onRemoveSupervisor: (classroom: Group, user: User) => void;
    onAssignTeacher: (userId: string, classId: string) => Promise<void>;
    onCreateTeacher: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    onRemoveTeacher: (classroom: Group, user: User) => Promise<void>;
    onAssignCourse: (courseId: string, classId: string) => void;
    onRemoveCourse: (courseId: string, classId: string) => void;
}

export const SchoolClassesPanel: React.FC<SchoolClassesPanelProps> = ({
    schoolId,
    schoolClasses,
    schoolStudents,
    parents,
    supervisors,
    teachers,
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
    onOpenImport,
    onOpenPackages,
    onAssignStudents,
    onCreateStudent,
    onRemoveStudent,
    onAssignSupervisor,
    onCreateSupervisor,
    onRemoveSupervisor,
    onAssignTeacher,
    onCreateTeacher,
    onRemoveTeacher,
    onAssignCourse,
    onRemoveCourse,
}) => {
    const [peopleManager, setPeopleManager] = useState<{ classId: string; section: PeopleSection } | null>(null);
    const managedClass = peopleManager ? schoolClasses.find((classroom) => classroom.id === peopleManager.classId) || null : null;

    const openPeopleManager = (classroom: Group, section: PeopleSection) => {
        setPeopleManager({ classId: classroom.id, section });
    };

    return (
        <div data-testid="school-classes-panel">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">الفصول الدراسية</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">كل بطاقة فصل تدير طلابها ومعلميها ومشرفيها من نفس المكان.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onDownloadSchoolRoster}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <Download size={16} /> تصدير كشف الطلاب
                    </button>
                    <button
                        disabled={isSchoolWorkspaceBusy}
                        onClick={onCreateSingleClass}
                        className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                    >
                        <Plus size={16} /> إضافة فصل
                    </button>
                </div>
            </div>

            <div data-testid="school-class-creation-panel" className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <label className="mb-2 block text-sm font-bold text-amber-900">إنشاء عدة فصول مرة واحدة</label>
                        <textarea
                            value={bulkClassNames}
                            onChange={(event) => setBulkClassNames(event.target.value)}
                            placeholder="مثال: أول ثانوي أ&#10;أول ثانوي ب&#10;ثاني ثانوي قدرات"
                            rows={3}
                            className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <p className="mt-2 text-xs leading-6 text-amber-800">
                            اكتب كل فصل في سطر أو افصل بينها بفاصلة. ولرفع الطلاب مع فصولهم استخدم «كشف الطلاب والفصول» من المجتمع المدرسي.
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
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                    <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">لا توجد فصول دراسية مضافة حتى الآن.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {schoolClasses.map((classroom) => {
                        const classSupervisors = supervisors.filter((currentUser) => classroom.supervisorIds.includes(currentUser.id));
                        const classTeachers = teachers.filter((currentUser) => (currentUser.groupIds || []).includes(classroom.id));
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
                                classTeachers={classTeachers}
                                classCourses={classCourses}
                                publishedCourses={publishedCourses}
                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                                onDownloadReport={() => onDownloadClassReport(classroom)}
                                onPrintReport={() => onPrintClassReport(classroom)}
                                onRename={() => onRenameClass(classroom)}
                                onDelete={() => onDeleteClass(classroom)}
                                onManageStudents={() => openPeopleManager(classroom, 'students')}
                                onManageTeachers={() => openPeopleManager(classroom, 'teachers')}
                                onManageSupervisors={() => openPeopleManager(classroom, 'supervisors')}
                                onOpenPackages={onOpenPackages}
                                onAssignCourse={(courseId) => onAssignCourse(courseId, classroom.id)}
                                onRemoveCourse={(courseId) => onRemoveCourse(courseId, classroom.id)}
                            />
                        );
                    })}
                </div>
            )}

            {managedClass && peopleManager && (
                <SchoolClassPeopleManager
                    key={`${managedClass.id}-${peopleManager.section}`}
                    schoolId={schoolId}
                    classroom={managedClass}
                    schoolStudents={schoolStudents}
                    teachers={teachers}
                    supervisors={supervisors}
                    initialSection={peopleManager.section}
                    isBusy={Boolean(rosterActionPending) || isSchoolWorkspaceBusy}
                    onClose={() => setPeopleManager(null)}
                    onAssignStudents={(studentIds) => onAssignStudents(studentIds, managedClass.id)}
                    onCreateStudent={(draft) => onCreateStudent(managedClass, draft)}
                    onRemoveStudent={(student) => onRemoveStudent(managedClass, student)}
                    onAssignTeacher={(teacherId) => onAssignTeacher(teacherId, managedClass.id)}
                    onCreateTeacher={(draft) => onCreateTeacher(managedClass, draft)}
                    onRemoveTeacher={(teacher) => onRemoveTeacher(managedClass, teacher)}
                    onAssignSupervisor={(supervisorId) => onAssignSupervisor(supervisorId, managedClass.id)}
                    onCreateSupervisor={(draft) => onCreateSupervisor(managedClass, draft)}
                    onRemoveSupervisor={(supervisor) => onRemoveSupervisor(managedClass, supervisor)}
                    onOpenImport={() => {
                        setPeopleManager(null);
                        onOpenImport();
                    }}
                />
            )}
        </div>
    );
};
