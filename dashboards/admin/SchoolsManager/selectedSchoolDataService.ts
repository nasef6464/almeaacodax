import type { AccessCode, B2BPackage, Course, Group, User } from '../../../types';
import type { PagedAccessCode } from './contracts';
import { getStudentsForSchool } from './readinessViewModel';

type BuildSelectedSchoolDataInput = {
    selectedSchool: Group;
    b2bPackages: B2BPackage[];
    accessCodes: AccessCode[];
    classes: Group[];
    students: User[];
    publishedCourses: Course[];
    pagedAccessCodes: PagedAccessCode[];
    selectedPackageIdForCode: string;
    now?: number;
};

export const buildSelectedSchoolData = ({
    selectedSchool,
    b2bPackages,
    accessCodes,
    classes,
    students,
    publishedCourses,
    pagedAccessCodes,
    selectedPackageIdForCode,
    now = Date.now(),
}: BuildSelectedSchoolDataInput) => {
    const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === selectedSchool.id);
    const schoolCodes = accessCodes.filter((code) => code.schoolId === selectedSchool.id);
    const schoolClasses = classes.filter((group) => group.parentId === selectedSchool.id);
    const schoolScopeGroups = [selectedSchool, ...schoolClasses];
    const schoolStudents = getStudentsForSchool(selectedSchool, schoolClasses, students);
    const schoolCourses = publishedCourses.filter((course) => selectedSchool.courseIds.includes(course.id));
    const activeSchoolPackages = schoolPackages.filter((pkg) => pkg.status === 'active');
    const activeSchoolCodes = schoolCodes.filter((code) => code.expiresAt > now);
    const tableSchoolCodes = pagedAccessCodes.length > 0 ? pagedAccessCodes : schoolCodes;
    const selectedPackageForCode = schoolPackages.find((pkg) => pkg.id === selectedPackageIdForCode);
    const totalSeats = activeSchoolPackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
    const usedSeats = schoolCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);

    return {
        schoolPackages,
        schoolCodes,
        schoolClasses,
        schoolScopeGroups,
        schoolStudents,
        schoolCourses,
        activeSchoolPackages,
        activeSchoolCodes,
        tableSchoolCodes,
        selectedPackageForCode,
        totalSeats,
        usedSeats,
    };
};

export const addCourseIdToSelectedSchool = (school: Group, courseId: string): Group => ({
    ...school,
    courseIds: school.courseIds.includes(courseId)
        ? school.courseIds
        : [...school.courseIds, courseId],
});

export const removeCourseIdFromSelectedSchool = (school: Group, courseId: string): Group => ({
    ...school,
    courseIds: school.courseIds.filter((id) => id !== courseId),
});
