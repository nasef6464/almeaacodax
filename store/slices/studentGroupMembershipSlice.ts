import { Group, User } from '../../types';

export interface StudentGroupMembershipSliceState {
    user: User;
    users: User[];
    groups: Group[];
}

export interface StudentGroupMembershipSliceActions {
    assignStudentToGroup: (userId: string, groupId: string) => void;
    assignStudentToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeStudentFromGroup: (userId: string, groupId: string) => void;
    removeStudentFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

interface StudentGroupMembershipApi {
    updateAdminUser: (id: string, payload: { schoolId?: string | null; groupIds?: string[] }) => Promise<unknown>;
    updateGroup: (id: string, payload: Partial<Group>) => Promise<unknown>;
}

export const createStudentGroupMembershipSlice = <TState extends StudentGroupMembershipSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: StudentGroupMembershipApi,
): StudentGroupMembershipSliceActions => ({
assignStudentToGroup: (userId, groupId) => set((state) => {
    const targetGroup = state.groups.find(g => g.id === groupId);
    const currentUser = state.users.find(u => u.id === userId);
    if (!targetGroup || !currentUser) return state;

    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];
    let groupsToPersist = new Set<string>();
    let newGroups = [...state.groups];

    const removeUserFromGroup = (targetId: string, student = true) => {
        newGroups = newGroups.map(group => {
            if (group.id !== targetId) return group;
            groupsToPersist.add(group.id);
            return student
                ? { ...group, studentIds: group.studentIds.filter(id => id !== userId), totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1) }
                : { ...group, supervisorIds: group.supervisorIds.filter(id => id !== userId), totalSupervisors: Math.max(0, (group.totalSupervisors || group.supervisorIds.length || 1) - 1) };
        });
    };

    const addUserToGroup = (targetId: string, student = true) => {
        newGroups = newGroups.map(group => {
            if (group.id !== targetId) return group;
            if (student && group.studentIds.includes(userId)) return group;
            if (!student && group.supervisorIds.includes(userId)) return group;
            groupsToPersist.add(group.id);
            return student
                ? { ...group, studentIds: [...group.studentIds, userId], totalStudents: (group.totalStudents || group.studentIds.length || 0) + 1 }
                : { ...group, supervisorIds: [...group.supervisorIds, userId], totalSupervisors: (group.totalSupervisors || group.supervisorIds.length || 0) + 1 };
        });
    };

    const getSchoolClassIds = (schoolId?: string) => {
        if (!schoolId) return [];
        return state.groups
            .filter(group => group.type === 'CLASS' && group.parentId === schoolId)
            .map(group => group.id);
    };

    const clearSchoolClassMemberships = (schoolId?: string) => {
        if (!schoolId) return;
        const schoolClassIds = getSchoolClassIds(schoolId);

        schoolClassIds.forEach(classId => removeUserFromGroup(classId, true));
        nextGroupIds = nextGroupIds.filter(id => !schoolClassIds.includes(id));
    };

    if (targetGroup.type === 'SCHOOL') {
        if (currentUser.schoolId && currentUser.schoolId !== targetGroup.id) {
            removeUserFromGroup(currentUser.schoolId, true);
            clearSchoolClassMemberships(currentUser.schoolId);
        }

        nextSchoolId = targetGroup.id;
        addUserToGroup(targetGroup.id, true);
    } else {
        if (targetGroup.parentId && currentUser.schoolId !== targetGroup.parentId) {
            if (currentUser.schoolId) {
                removeUserFromGroup(currentUser.schoolId, true);
                clearSchoolClassMemberships(currentUser.schoolId);
            }
            nextSchoolId = targetGroup.parentId;
            addUserToGroup(targetGroup.parentId, true);
        }

        if (targetGroup.type === 'CLASS' && targetGroup.parentId) {
            getSchoolClassIds(targetGroup.parentId)
                .filter(classId => classId !== targetGroup.id)
                .forEach(classId => removeUserFromGroup(classId, true));
            nextGroupIds = nextGroupIds.filter(id => !getSchoolClassIds(targetGroup.parentId).includes(id) || id === targetGroup.id);
            addUserToGroup(targetGroup.parentId, true);
            nextSchoolId = targetGroup.parentId;
        }

        if (!nextGroupIds.includes(targetGroup.id)) {
            nextGroupIds = [...nextGroupIds, targetGroup.id];
        }
        addUserToGroup(targetGroup.id, true);
    }

    const normalizedGroupIds = Array.from(new Set(nextGroupIds));
    api.updateAdminUser(userId, {
        schoolId: nextSchoolId || null,
        groupIds: normalizedGroupIds,
    }).catch(console.error);

    Array.from(groupsToPersist).forEach(persistedGroupId => {
        const persistedGroup = newGroups.find(group => group.id === persistedGroupId);
        if (persistedGroup) {
            api.updateGroup(persistedGroup.id, {
                studentIds: persistedGroup.studentIds,
                totalStudents: persistedGroup.totalStudents,
                supervisorIds: persistedGroup.supervisorIds,
                totalSupervisors: persistedGroup.totalSupervisors,
            }).catch(console.error);
        }
    });

    const newUsers = state.users.map(existingUser => {
        if (existingUser.id !== userId) return existingUser;
        return {
            ...existingUser,
            schoolId: nextSchoolId,
            groupIds: normalizedGroupIds,
        };
    });

    return {
        groups: newGroups,
        users: newUsers,
        user: newUsers.find(u => u.id === state.user.id) || state.user
    };
}),

assignStudentToGroupAsync: async (userId, groupId) => {
    const state = get();
    const targetGroup = state.groups.find(g => g.id === groupId);
    const currentUser = state.users.find(u => u.id === userId);
    if (!targetGroup || !currentUser) return;

    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];
    const groupsToPersist = new Set<string>();
    let newGroups = [...state.groups];

    const removeUserFromGroup = (targetId: string, student = true) => {
        newGroups = newGroups.map(group => {
            if (group.id !== targetId) return group;
            groupsToPersist.add(group.id);
            return student
                ? { ...group, studentIds: group.studentIds.filter(id => id !== userId), totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1) }
                : { ...group, supervisorIds: group.supervisorIds.filter(id => id !== userId), totalSupervisors: Math.max(0, (group.totalSupervisors || group.supervisorIds.length || 1) - 1) };
        });
    };

    const addUserToGroup = (targetId: string, student = true) => {
        newGroups = newGroups.map(group => {
            if (group.id !== targetId) return group;
            if (student && group.studentIds.includes(userId)) return group;
            if (!student && group.supervisorIds.includes(userId)) return group;
            groupsToPersist.add(group.id);
            return student
                ? { ...group, studentIds: [...group.studentIds, userId], totalStudents: (group.totalStudents || group.studentIds.length || 0) + 1 }
                : { ...group, supervisorIds: [...group.supervisorIds, userId], totalSupervisors: (group.totalSupervisors || group.supervisorIds.length || 0) + 1 };
        });
    };

    const getSchoolClassIds = (schoolId?: string) => {
        if (!schoolId) return [];
        return state.groups
            .filter(group => group.type === 'CLASS' && group.parentId === schoolId)
            .map(group => group.id);
    };

    const clearSchoolClassMemberships = (schoolId?: string) => {
        if (!schoolId) return;
        const schoolClassIds = getSchoolClassIds(schoolId);

        schoolClassIds.forEach(classId => removeUserFromGroup(classId, true));
        nextGroupIds = nextGroupIds.filter(id => !schoolClassIds.includes(id));
    };

    if (targetGroup.type === 'SCHOOL') {
        if (currentUser.schoolId && currentUser.schoolId !== targetGroup.id) {
            removeUserFromGroup(currentUser.schoolId, true);
            clearSchoolClassMemberships(currentUser.schoolId);
        }

        nextSchoolId = targetGroup.id;
        addUserToGroup(targetGroup.id, true);
    } else {
        if (targetGroup.parentId && currentUser.schoolId !== targetGroup.parentId) {
            if (currentUser.schoolId) {
                removeUserFromGroup(currentUser.schoolId, true);
                clearSchoolClassMemberships(currentUser.schoolId);
            }
            nextSchoolId = targetGroup.parentId;
            addUserToGroup(targetGroup.parentId, true);
        }

        if (targetGroup.type === 'CLASS' && targetGroup.parentId) {
            getSchoolClassIds(targetGroup.parentId)
                .filter(classId => classId !== targetGroup.id)
                .forEach(classId => removeUserFromGroup(classId, true));
            nextGroupIds = nextGroupIds.filter(id => !getSchoolClassIds(targetGroup.parentId).includes(id) || id === targetGroup.id);
            addUserToGroup(targetGroup.parentId, true);
            nextSchoolId = targetGroup.parentId;
        }

        if (!nextGroupIds.includes(targetGroup.id)) {
            nextGroupIds = [...nextGroupIds, targetGroup.id];
        }
        addUserToGroup(targetGroup.id, true);
    }

    const normalizedGroupIds = Array.from(new Set(nextGroupIds));
    await Promise.all([
        api.updateAdminUser(userId, {
            schoolId: nextSchoolId || null,
            groupIds: normalizedGroupIds,
        }),
        ...Array.from(groupsToPersist).map((persistedGroupId) => {
            const persistedGroup = newGroups.find(group => group.id === persistedGroupId);
            if (!persistedGroup) return Promise.resolve();
            return api.updateGroup(persistedGroup.id, {
                studentIds: persistedGroup.studentIds,
                totalStudents: persistedGroup.totalStudents,
                supervisorIds: persistedGroup.supervisorIds,
                totalSupervisors: persistedGroup.totalSupervisors,
            });
        }),
    ]);

    const newUsers = state.users.map(existingUser => {
        if (existingUser.id !== userId) return existingUser;
        return {
            ...existingUser,
            schoolId: nextSchoolId,
            groupIds: normalizedGroupIds,
        };
    });

    set({
        groups: newGroups,
        users: newUsers,
        user: newUsers.find(u => u.id === state.user.id) || state.user,
    });
},

removeStudentFromGroup: (userId, groupId) => set((state) => {
    const targetGroup = state.groups.find(group => group.id === groupId);
    const currentUser = state.users.find(user => user.id === userId);
    if (!targetGroup || !currentUser) return state;

    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];
    let groupsToPersist = new Set<string>();

    const newGroups = state.groups.map(group => {
        if (group.id !== groupId) return group;
        groupsToPersist.add(group.id);
        return {
            ...group,
            studentIds: group.studentIds.filter(id => id !== userId),
            totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
        };
    }).map(group => {
        if (targetGroup.type === 'SCHOOL' && group.type === 'CLASS' && group.parentId === groupId && group.studentIds.includes(userId)) {
            groupsToPersist.add(group.id);
            return {
                ...group,
                studentIds: group.studentIds.filter(id => id !== userId),
                totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
            };
        }
        return group;
    });

    if (targetGroup.type === 'SCHOOL') {
        nextSchoolId = undefined;
        const relatedClassIds = state.groups.filter(group => group.type === 'CLASS' && group.parentId === groupId).map(group => group.id);
        nextGroupIds = nextGroupIds.filter(id => id !== groupId && !relatedClassIds.includes(id));
    } else {
        nextGroupIds = nextGroupIds.filter(id => id !== groupId);
    }

    api.updateAdminUser(userId, {
        schoolId: nextSchoolId || null,
        groupIds: nextGroupIds,
    }).catch(console.error);

    Array.from(groupsToPersist).forEach(persistedGroupId => {
        const persistedGroup = newGroups.find(group => group.id === persistedGroupId);
        if (persistedGroup) {
            api.updateGroup(persistedGroup.id, {
                studentIds: persistedGroup.studentIds,
                totalStudents: persistedGroup.totalStudents,
            }).catch(console.error);
        }
    });

    const newUsers = state.users.map(existingUser => {
        if (existingUser.id !== userId) return existingUser;
        return {
            ...existingUser,
            schoolId: nextSchoolId,
            groupIds: nextGroupIds,
        };
    });

    return {
        groups: newGroups,
        users: newUsers,
        user: newUsers.find(u => u.id === state.user.id) || state.user
    };
}),

removeStudentFromGroupAsync: async (userId, groupId) => {
    const state = get();
    const targetGroup = state.groups.find(group => group.id === groupId);
    const currentUser = state.users.find(user => user.id === userId);
    if (!targetGroup || !currentUser) return;

    let nextSchoolId = currentUser.schoolId;
    let nextGroupIds = [...(currentUser.groupIds || [])];
    const groupsToPersist = new Set<string>();

    const newGroups = state.groups.map(group => {
        if (group.id !== groupId) return group;
        groupsToPersist.add(group.id);
        return {
            ...group,
            studentIds: group.studentIds.filter(id => id !== userId),
            totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
        };
    }).map(group => {
        if (targetGroup.type === 'SCHOOL' && group.type === 'CLASS' && group.parentId === groupId && group.studentIds.includes(userId)) {
            groupsToPersist.add(group.id);
            return {
                ...group,
                studentIds: group.studentIds.filter(id => id !== userId),
                totalStudents: Math.max(0, (group.totalStudents || group.studentIds.length || 1) - 1),
            };
        }
        return group;
    });

    if (targetGroup.type === 'SCHOOL') {
        nextSchoolId = undefined;
        const relatedClassIds = state.groups.filter(group => group.type === 'CLASS' && group.parentId === groupId).map(group => group.id);
        nextGroupIds = nextGroupIds.filter(id => id !== groupId && !relatedClassIds.includes(id));
    } else {
        nextGroupIds = nextGroupIds.filter(id => id !== groupId);
    }

    await Promise.all([
        api.updateAdminUser(userId, {
            schoolId: nextSchoolId || null,
            groupIds: nextGroupIds,
        }),
        ...Array.from(groupsToPersist).map((persistedGroupId) => {
            const persistedGroup = newGroups.find(group => group.id === persistedGroupId);
            if (!persistedGroup) return Promise.resolve();
            return api.updateGroup(persistedGroup.id, {
                studentIds: persistedGroup.studentIds,
                totalStudents: persistedGroup.totalStudents,
            });
        }),
    ]);

    const newUsers = state.users.map(existingUser => {
        if (existingUser.id !== userId) return existingUser;
        return {
            ...existingUser,
            schoolId: nextSchoolId,
            groupIds: nextGroupIds,
        };
    });

    set({
        groups: newGroups,
        users: newUsers,
        user: newUsers.find(u => u.id === state.user.id) || state.user,
    });
},
});
