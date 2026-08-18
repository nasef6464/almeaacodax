import type { Group, User } from '../../../types';

export interface SupervisorScopeRow {
    user: User;
    scopeLabel: 'مدير/مشرف المدرسة كاملة' | 'مشرف فصول محددة';
    scopeDetails: string;
    isSchoolWide: boolean;
}

export interface ClassOperatingRow {
    classroom: Group;
    studentCount: number;
    supervisorCount: number;
    studentsWithoutParentCount: number;
    gaps: string[];
    isReady: boolean;
}

export interface SchoolRelationshipViewModelInput {
    school: Group;
    schoolClasses: Group[];
    schoolStudents: User[];
    supervisors: User[];
    parents: User[];
}

export interface SchoolRelationshipViewModel {
    schoolSupervisors: User[];
    schoolLevelSupervisors: User[];
    classScopedSupervisors: User[];
    supervisorScopeRows: SupervisorScopeRow[];
    schoolParentUsers: User[];
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];
    supervisorsWithoutClass: User[];
    classOperatingRows: ClassOperatingRow[];
}

const userBelongsToAnyClass = (user: User, schoolClasses: Group[]) =>
    (user.groupIds || []).some((groupId) => schoolClasses.some((classroom) => classroom.id === groupId));

const parentLinksStudent = (parent: User, studentId: string) =>
    (parent.linkedStudentIds || []).includes(studentId);

export const buildSchoolRelationshipViewModel = ({
    school,
    schoolClasses,
    schoolStudents,
    supervisors,
    parents,
}: SchoolRelationshipViewModelInput): SchoolRelationshipViewModel => {
    const schoolGroupIds = new Set([school.id, ...schoolClasses.map((classroom) => classroom.id)]);
    const schoolSupervisors = supervisors.filter((currentUser) => (
        school.supervisorIds.includes(currentUser.id)
        || schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
        || (currentUser.groupIds || []).some((groupId) => schoolGroupIds.has(groupId))
    ));

    const schoolLevelSupervisors = schoolSupervisors.filter((currentUser) => (
        school.supervisorIds.includes(currentUser.id)
        || (currentUser.groupIds || []).includes(school.id)
    ));
    const schoolLevelSupervisorIds = new Set(schoolLevelSupervisors.map((supervisor) => supervisor.id));

    const classScopedSupervisors = schoolSupervisors.filter((currentUser) => (
        !schoolLevelSupervisorIds.has(currentUser.id)
        && (
            schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
            || userBelongsToAnyClass(currentUser, schoolClasses)
        )
    ));

    const supervisorScopeRows = schoolSupervisors.map((currentUser): SupervisorScopeRow => {
        const schoolScope = school.supervisorIds.includes(currentUser.id)
            || (currentUser.groupIds || []).includes(school.id);
        const scopedClassNames = schoolClasses
            .filter((classroom) => (
                classroom.supervisorIds.includes(currentUser.id)
                || (currentUser.groupIds || []).includes(classroom.id)
            ))
            .map((classroom) => classroom.name);

        return {
            user: currentUser,
            scopeLabel: schoolScope ? 'مدير/مشرف المدرسة كاملة' : 'مشرف فصول محددة',
            scopeDetails: schoolScope ? school.name : scopedClassNames.join('، ') || 'بدون نطاق واضح',
            isSchoolWide: schoolScope,
        };
    });

    const schoolStudentIds = new Set(schoolStudents.map((student) => student.id));
    const schoolParentUsers = parents.filter((currentUser) => (
        (currentUser.linkedStudentIds || []).some((studentId) => schoolStudentIds.has(studentId))
    ));

    const studentsWithoutParent = schoolStudents.filter((student) => (
        !parents.some((parent) => parentLinksStudent(parent, student.id))
    ));
    const studentsWithoutClass = schoolStudents.filter((student) => !userBelongsToAnyClass(student, schoolClasses));
    const supervisorsWithoutClass = schoolSupervisors.filter((currentUser) => (
        !userBelongsToAnyClass(currentUser, schoolClasses)
        && !schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
    ));

    const classOperatingRows = schoolClasses.map((classroom): ClassOperatingRow => {
        const classStudents = schoolStudents.filter((student) => (
            classroom.studentIds.includes(student.id)
            || (student.groupIds || []).includes(classroom.id)
        ));
        const classSupervisors = schoolSupervisors.filter((currentUser) => (
            classroom.supervisorIds.includes(currentUser.id)
            || (currentUser.groupIds || []).includes(classroom.id)
        ));
        const classStudentsWithoutParent = classStudents.filter((student) => (
            !parents.some((parent) => parentLinksStudent(parent, student.id))
        ));
        const gaps = [
            classStudents.length === 0 ? 'لا يوجد طلاب' : '',
            classSupervisors.length === 0 ? 'لا يوجد مشرف فصل' : '',
            classStudentsWithoutParent.length > 0 ? `${classStudentsWithoutParent.length} بلا ولي أمر` : '',
        ].filter(Boolean);

        return {
            classroom,
            studentCount: classStudents.length,
            supervisorCount: classSupervisors.length,
            studentsWithoutParentCount: classStudentsWithoutParent.length,
            gaps,
            isReady: classStudents.length > 0 && classSupervisors.length > 0,
        };
    });

    return {
        schoolSupervisors,
        schoolLevelSupervisors,
        classScopedSupervisors,
        supervisorScopeRows,
        schoolParentUsers,
        studentsWithoutParent,
        studentsWithoutClass,
        supervisorsWithoutClass,
        classOperatingRows,
    };
};
