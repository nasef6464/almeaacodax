import { AccessCode, B2BPackage, Group, User } from '../../types';

export interface GroupCrudSliceState {
    user: User;
    users: User[];
    groups: Group[];
    b2bPackages: B2BPackage[];
    accessCodes: AccessCode[];
}

export interface GroupCrudSliceActions {
    createGroup: (group: Group) => void;
    createGroupAsync: (group: Group) => Promise<Group>;
    updateGroup: (groupId: string, data: Partial<Group>) => void;
    updateGroupAsync: (groupId: string, data: Partial<Group>) => Promise<Group>;
    deleteGroup: (groupId: string) => void;
    deleteGroupAsync: (groupId: string) => Promise<void>;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface GroupCrudApi {
    createGroup: (payload: Group) => Promise<unknown>;
    updateGroup: (id: string, payload: Partial<Group>) => Promise<unknown>;
    deleteGroup: (id: string) => Promise<unknown>;
}

const buildGroupDeletionState = <TState extends GroupCrudSliceState>(
    state: TState,
    groupId: string,
) => {
    const targetGroup = state.groups.find((group) => group.id === groupId);
    const deletedGroupIds = new Set<string>([
        groupId,
        ...(targetGroup?.type === 'SCHOOL'
            ? state.groups.filter((group) => group.parentId === groupId).map((group) => group.id)
            : []),
    ]);
    const deletedPackageIds = new Set(
        targetGroup?.type === 'SCHOOL'
            ? state.b2bPackages.filter((pkg) => pkg.schoolId === groupId).map((pkg) => pkg.id)
            : [],
    );

    const users = state.users.map((user) => ({
        ...user,
        schoolId: user.schoolId === groupId ? undefined : user.schoolId,
        groupIds: user.groupIds?.filter((id) => !deletedGroupIds.has(id)) || [],
    }));

    return {
        groups: state.groups.filter((group) => !deletedGroupIds.has(group.id)),
        b2bPackages: targetGroup?.type === 'SCHOOL'
            ? state.b2bPackages.filter((pkg) => pkg.schoolId !== groupId)
            : state.b2bPackages,
        accessCodes: targetGroup?.type === 'SCHOOL'
            ? state.accessCodes.filter(
                (code) => code.schoolId !== groupId && !deletedPackageIds.has(code.packageId),
            )
            : state.accessCodes,
        users,
        user: users.find((user) => user.id === state.user.id) || state.user,
    } as Partial<TState>;
};

export const createGroupCrudSlice = <TState extends GroupCrudSliceState>(
    set: StoreSet<TState>,
    api: GroupCrudApi,
): GroupCrudSliceActions => ({
    createGroup: (group) => set((state) => {
        api.createGroup(group).catch(console.error);
        return {
            groups: [...state.groups, group],
        } as Partial<TState>;
    }),

    createGroupAsync: async (group) => {
        const persisted = await api.createGroup(group);
        const nextGroup = {
            ...group,
            ...((persisted && typeof persisted === 'object') ? persisted as Partial<Group> : {}),
        };
        set((state) => ({
            groups: state.groups.some((existing) => existing.id === nextGroup.id)
                ? state.groups.map((existing) => existing.id === nextGroup.id ? nextGroup : existing)
                : [...state.groups, nextGroup],
        }) as Partial<TState>);
        return nextGroup;
    },

    updateGroup: (groupId, data) => set((state) => {
        api.updateGroup(groupId, data).catch(console.error);
        return {
            groups: state.groups.map((group) =>
                group.id === groupId ? { ...group, ...data } : group,
            ),
        } as Partial<TState>;
    }),

    updateGroupAsync: async (groupId, data) => {
        const persisted = await api.updateGroup(groupId, data);
        let nextGroup: Group | null = null;
        set((state) => ({
            groups: state.groups.map((group) => {
                if (group.id !== groupId) return group;
                nextGroup = {
                    ...group,
                    ...data,
                    ...((persisted && typeof persisted === 'object') ? persisted as Partial<Group> : {}),
                };
                return nextGroup;
            }),
        }) as Partial<TState>);

        if (!nextGroup) {
            throw new Error('تعذر العثور على المدرسة أو الفصل بعد الحفظ.');
        }
        return nextGroup;
    },

    deleteGroup: (groupId) => set((state) => {
        api.deleteGroup(groupId).catch(console.error);
        return buildGroupDeletionState(state, groupId);
    }),

    deleteGroupAsync: async (groupId) => {
        await api.deleteGroup(groupId);
        set((state) => buildGroupDeletionState(state, groupId));
    },
});
