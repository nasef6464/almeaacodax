import type { Group, User } from '../../../types';

export type SchoolRosterClassFilter = 'all' | 'unassigned' | string;

export interface SchoolRosterViewModelInput {
    schoolStudents: User[];
    schoolClasses: Group[];
    search: string;
    classFilter: SchoolRosterClassFilter;
    page: number;
    pageSize: number;
}

/**
 * Pure student-roster projection for the selected school workspace.
 *
 * The class-id Set keeps unassigned filtering O(students + classes) instead of
 * scanning every class for every student during render.
 */
export const buildSchoolRosterViewModel = ({
    schoolStudents,
    schoolClasses,
    search,
    classFilter,
    page,
    pageSize,
}: SchoolRosterViewModelInput) => {
    const query = search.trim().toLowerCase();
    const schoolClassIds = new Set(schoolClasses.map((classroom) => classroom.id));

    const visibleSchoolStudents = schoolStudents.filter((student) => {
        const matchesSearch = !query
            || student.name.toLowerCase().includes(query)
            || (student.email || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
        if (classFilter === 'all') return true;
        if (classFilter === 'unassigned') {
            return !(student.groupIds || []).some((groupId) => schoolClassIds.has(groupId));
        }
        return (student.groupIds || []).includes(classFilter);
    });

    const normalizedPageSize = Math.max(1, pageSize);
    const schoolStudentTotalPages = Math.max(1, Math.ceil(visibleSchoolStudents.length / normalizedPageSize));
    const safeSchoolStudentPage = Math.min(page, schoolStudentTotalPages);
    const schoolStudentStartIndex = (safeSchoolStudentPage - 1) * normalizedPageSize;
    const schoolStudentEndIndex = Math.min(
        schoolStudentStartIndex + normalizedPageSize,
        visibleSchoolStudents.length,
    );
    const pagedVisibleSchoolStudents = visibleSchoolStudents.slice(
        schoolStudentStartIndex,
        schoolStudentEndIndex,
    );

    return {
        visibleSchoolStudents,
        schoolStudentTotalPages,
        safeSchoolStudentPage,
        schoolStudentStartIndex,
        schoolStudentEndIndex,
        pagedVisibleSchoolStudents,
    };
};
