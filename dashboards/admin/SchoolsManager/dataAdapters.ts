import { api } from '../../../services/api';
import { Group, Role, User } from '../../../types';
import type { AdminUserPayload } from './contracts';

export const buildStoreUser = (user: AdminUserPayload): User => ({
    id: String(user.id || user._id || user.email),
    name: user.name,
    email: user.email,
    avatar: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
    role: user.role,
    points: user.points ?? 0,
    badges: user.badges ?? [],
    isActive: user.isActive ?? true,
    schoolId: user.schoolId ?? undefined,
    groupIds: user.groupIds ?? [],
    linkedStudentIds: user.linkedStudentIds ?? [],
    managedPathIds: user.managedPathIds ?? [],
    managedSubjectIds: user.managedSubjectIds ?? [],
    subscription: {
        plan: user.subscription?.plan ?? 'free',
        purchasedCourses: user.subscription?.purchasedCourses ?? [],
        purchasedPackages: user.subscription?.purchasedPackages ?? [],
    },
});

const loadAllUsersByRole = async (role: Role): Promise<User[]> => {
    const firstPage = await api.getAdminUsers({ role, page: 1, limit: 100 });
    const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages || 1));
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
    const remainingResponses = await Promise.all(
        remainingPages.map((page) => api.getAdminUsers({ role, page, limit: 100 })),
    );

    return [
        ...(firstPage.users || []),
        ...remainingResponses.flatMap((response) => response.users || []),
    ].map((user) => buildStoreUser(user as AdminUserPayload));
};

export const loadSchoolAdminUsers = async (): Promise<User[]> => {
    const [firstPage, students, parents, supervisors, teachers] = await Promise.all([
        api.getAdminUsers({ page: 1, limit: 100 }),
        loadAllUsersByRole(Role.STUDENT),
        loadAllUsersByRole(Role.PARENT),
        loadAllUsersByRole(Role.SUPERVISOR),
        loadAllUsersByRole(Role.TEACHER),
    ]);

    const usersById = new Map<string, User>();
    [
        ...(firstPage.users || []).map((user) => buildStoreUser(user as AdminUserPayload)),
        ...students,
        ...parents,
        ...supervisors,
        ...teachers,
    ].forEach((user) => {
        if (user.id) {
            usersById.set(user.id, user);
        }
    });

    return Array.from(usersById.values());
};

export const mergeUsersById = (currentUsers: User[], incomingUsers: User[]): User[] => {
    const usersById = new Map<string, User>();
    currentUsers.forEach((user) => {
        if (user.id) {
            usersById.set(user.id, user);
        }
    });
    incomingUsers.forEach((user) => {
        if (user.id) {
            usersById.set(user.id, user);
        }
    });
    return Array.from(usersById.values());
};

export const buildStoreGroup = (group: Group & { _id?: string; createdAt?: number | string }): Group => ({
    ...group,
    id: String(group.id || group._id || ''),
    parentId: group.parentId ? String(group.parentId) : undefined,
    ownerId: String(group.ownerId || ''),
    supervisorIds: Array.isArray(group.supervisorIds) ? group.supervisorIds.map(String) : [],
    studentIds: Array.isArray(group.studentIds) ? group.studentIds.map(String) : [],
    courseIds: Array.isArray(group.courseIds) ? group.courseIds.map(String) : [],
    createdAt: typeof group.createdAt === 'number' ? group.createdAt : Date.parse(String(group.createdAt || '')) || Date.now(),
});

export const generateTemporaryPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const random = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    return `Alm@${random}`;
};
