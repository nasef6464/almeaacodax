import { Group, User } from '../../types';
import {
    assignStudentMembership,
    removeStudentMembership,
    StudentMembershipTransition,
} from './studentGroupMembershipTransitions';

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
    partial: Partial<TState> | TState | ((state: TState) => Partial<TState> | TState),
) => void;
type StoreGet<TState> = () => TState;

interface StudentGroupMembershipApi {
    updateAdminUser: (id: string, payload: { schoolId?: string | null; groupIds?: string[] }) => Promise<unknown>;
    updateGroup: (id: string, payload: Partial<Group>) => Promise<unknown>;
}

const buildStatePatch = <TState extends StudentGroupMembershipSliceState>(
    state: TState,
    userId: string,
    transition: StudentMembershipTransition,
): Partial<TState> => {
    const users = state.users.map((existingUser) => existingUser.id === userId
        ? { ...existingUser, schoolId: transition.schoolId, groupIds: transition.groupIds }
        : existingUser);
    return {
        groups: transition.groups,
        users,
        user: users.find((user) => user.id === state.user.id) || state.user,
    } as Partial<TState>;
};

const persistTransition = (
    api: StudentGroupMembershipApi,
    userId: string,
    transition: StudentMembershipTransition,
    includeSupervisorMetadata = false,
) => Promise.all([
    api.updateAdminUser(userId, {
        schoolId: transition.schoolId || null,
        groupIds: transition.groupIds,
    }),
    ...transition.groupIdsToPersist.map((groupId) => {
        const group = transition.groups.find((item) => item.id === groupId);
        if (!group) return Promise.resolve();
        const payload: Partial<Group> = {
            studentIds: group.studentIds,
            totalStudents: group.totalStudents,
        };
        if (includeSupervisorMetadata) {
            payload.supervisorIds = group.supervisorIds;
            payload.totalSupervisors = group.totalSupervisors;
        }
        return api.updateGroup(group.id, payload);
    }),
]);

const persistTransitionInBackground = (
    api: StudentGroupMembershipApi,
    userId: string,
    transition: StudentMembershipTransition,
    includeSupervisorMetadata = false,
) => {
    persistTransition(api, userId, transition, includeSupervisorMetadata).catch(console.error);
};

export const createStudentGroupMembershipSlice = <TState extends StudentGroupMembershipSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: StudentGroupMembershipApi,
): StudentGroupMembershipSliceActions => ({
    assignStudentToGroup: (userId, groupId) => set((state) => {
        const targetGroup = state.groups.find((group) => group.id === groupId);
        const currentUser = state.users.find((user) => user.id === userId);
        if (!targetGroup || !currentUser) return state;
        const transition = assignStudentMembership(state.groups, currentUser, targetGroup);
        persistTransitionInBackground(api, userId, transition, true);
        return buildStatePatch(state, userId, transition);
    }),

    assignStudentToGroupAsync: async (userId, groupId) => {
        const state = get();
        const targetGroup = state.groups.find((group) => group.id === groupId);
        const currentUser = state.users.find((user) => user.id === userId);
        if (!targetGroup || !currentUser) return;
        const transition = assignStudentMembership(state.groups, currentUser, targetGroup);
        await persistTransition(api, userId, transition, true);
        set(buildStatePatch(state, userId, transition));
    },

    removeStudentFromGroup: (userId, groupId) => set((state) => {
        const targetGroup = state.groups.find((group) => group.id === groupId);
        const currentUser = state.users.find((user) => user.id === userId);
        if (!targetGroup || !currentUser) return state;
        const transition = removeStudentMembership(state.groups, currentUser, targetGroup);
        persistTransitionInBackground(api, userId, transition);
        return buildStatePatch(state, userId, transition);
    }),

    removeStudentFromGroupAsync: async (userId, groupId) => {
        const state = get();
        const targetGroup = state.groups.find((group) => group.id === groupId);
        const currentUser = state.users.find((user) => user.id === userId);
        if (!targetGroup || !currentUser) return;
        const transition = removeStudentMembership(state.groups, currentUser, targetGroup);
        await persistTransition(api, userId, transition);
        set(buildStatePatch(state, userId, transition));
    },
});
