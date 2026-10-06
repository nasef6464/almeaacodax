import { Group, User } from '../../types';

export interface StudentMembershipTransition {
    groups: Group[];
    schoolId?: string;
    groupIds: string[];
    groupIdsToPersist: string[];
}

export const assignStudentMembership = (
    groups: Group[],
    currentUser: User,
    targetGroup: Group,
): StudentMembershipTransition => {
    const userId = currentUser.id;
    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];
    const groupsToPersist = new Set<string>();
    let nextGroups = [...groups];

    const removeStudentFromGroup = (targetId: string) => {
        nextGroups = nextGroups.map((group) => {
            if (group.id !== targetId) return group;
            groupsToPersist.add(group.id);
            return {
                ...group,
                studentIds: group.studentIds.filter((id) => id !== userId),
                totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
            };
        });
    };

    const addStudentToGroup = (targetId: string) => {
        nextGroups = nextGroups.map((group) => {
            if (group.id !== targetId || group.studentIds.includes(userId)) return group;
            groupsToPersist.add(group.id);
            return {
                ...group,
                studentIds: [...group.studentIds, userId],
                totalStudents: (group.totalStudents || group.studentIds.length || 0) + 1,
            };
        });
    };

    const getSchoolClassIds = (schoolId?: string) => {
        if (!schoolId) return [];
        return groups
            .filter((group) => group.type === 'CLASS' && group.parentId === schoolId)
            .map((group) => group.id);
    };

    const clearSchoolClassMemberships = (schoolId?: string) => {
        if (!schoolId) return;
        const schoolClassIds = getSchoolClassIds(schoolId);
        schoolClassIds.forEach(removeStudentFromGroup);
        nextGroupIds = nextGroupIds.filter((id) => !schoolClassIds.includes(id));
    };

    if (targetGroup.type === 'SCHOOL') {
        if (currentUser.schoolId && currentUser.schoolId !== targetGroup.id) {
            removeStudentFromGroup(currentUser.schoolId);
            clearSchoolClassMemberships(currentUser.schoolId);
        }
        nextSchoolId = targetGroup.id;
        addStudentToGroup(targetGroup.id);
    } else {
        if (targetGroup.parentId && currentUser.schoolId !== targetGroup.parentId) {
            if (currentUser.schoolId) {
                removeStudentFromGroup(currentUser.schoolId);
                clearSchoolClassMemberships(currentUser.schoolId);
            }
            nextSchoolId = targetGroup.parentId;
            addStudentToGroup(targetGroup.parentId);
        }

        if (targetGroup.type === 'CLASS' && targetGroup.parentId) {
            getSchoolClassIds(targetGroup.parentId)
                .filter((classId) => classId !== targetGroup.id)
                .forEach(removeStudentFromGroup);
            nextGroupIds = nextGroupIds.filter(
                (id) => !getSchoolClassIds(targetGroup.parentId).includes(id) || id === targetGroup.id,
            );
            addStudentToGroup(targetGroup.parentId);
            nextSchoolId = targetGroup.parentId;
        }

        if (!nextGroupIds.includes(targetGroup.id)) nextGroupIds.push(targetGroup.id);
        addStudentToGroup(targetGroup.id);
    }

    return {
        groups: nextGroups,
        schoolId: nextSchoolId,
        groupIds: Array.from(new Set(nextGroupIds)),
        groupIdsToPersist: Array.from(groupsToPersist),
    };
};

export const removeStudentMembership = (
    groups: Group[],
    currentUser: User,
    targetGroup: Group,
): StudentMembershipTransition => {
    const userId = currentUser.id;
    const groupsToPersist = new Set<string>();
    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];

    const nextGroups = groups.map((group) => {
        const removingTarget = group.id === targetGroup.id;
        const removingChildClass = targetGroup.type === 'SCHOOL'
            && group.type === 'CLASS'
            && group.parentId === targetGroup.id
            && group.studentIds.includes(userId);
        if (!removingTarget && !removingChildClass) return group;
        groupsToPersist.add(group.id);
        return {
            ...group,
            studentIds: group.studentIds.filter((id) => id !== userId),
            totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
        };
    });

    if (targetGroup.type === 'SCHOOL') {
        nextSchoolId = undefined;
        const relatedClassIds = groups
            .filter((group) => group.type === 'CLASS' && group.parentId === targetGroup.id)
            .map((group) => group.id);
        nextGroupIds = nextGroupIds.filter(
            (id) => id !== targetGroup.id && !relatedClassIds.includes(id),
        );
    } else {
        nextGroupIds = nextGroupIds.filter((id) => id !== targetGroup.id);
    }

    return {
        groups: nextGroups,
        schoolId: nextSchoolId,
        groupIds: nextGroupIds,
        groupIdsToPersist: Array.from(groupsToPersist),
    };
};
