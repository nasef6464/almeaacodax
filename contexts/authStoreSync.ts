import { Role } from '../types';
import { useStore } from '../store/useStore';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { advanceAuthSession } from '../utils/authSessionLifetime';
import type { BackendRole, BackendAuthUser, SessionUser } from './authTypes';

const roleMap: Record<BackendRole, Role> = {
  admin: Role.ADMIN,
  teacher: Role.TEACHER,
  student: Role.STUDENT,
  supervisor: Role.SUPERVISOR,
  school_admin: Role.SCHOOL_ADMIN,
  parent: Role.PARENT,
};

const toArray = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export const syncStoreUser = (sessionUser: SessionUser | null, backendUser?: BackendAuthUser | null) => {
  if (!sessionUser) return;
  if (String(useStore.getState().user.id) !== sessionUser.id) resetStoreUser();
  const existing = useStore.getState().user;
  useStore.setState({
    user: {
      ...existing,
      id: sessionUser.id,
      name: sessionUser.displayName,
      email: sessionUser.email,
      avatar: sessionUser.photoURL,
      role: roleMap[sessionUser.role],
      points: backendUser?.points ?? existing.points,
      badges: backendUser?.badges ?? existing.badges,
      isActive: backendUser?.isActive ?? existing.isActive,
      schoolId: backendUser?.schoolId ?? sessionUser.schoolId ?? existing.schoolId,
      groupIds: backendUser?.groupIds ?? sessionUser.groupIds ?? existing.groupIds,
      linkedStudentIds: backendUser?.linkedStudentIds ?? existing.linkedStudentIds,
      managedPathIds: backendUser?.managedPathIds ?? existing.managedPathIds,
      managedSubjectIds: backendUser?.managedSubjectIds ?? existing.managedSubjectIds,
      pathStageSelections: backendUser?.pathStageSelections ?? existing.pathStageSelections,
      interactiveVideoProgress: backendUser?.interactiveVideoProgress ?? existing.interactiveVideoProgress,
      subscription: {
        ...existing?.subscription,
        plan: backendUser?.subscription?.plan ?? existing?.subscription?.plan ?? 'free',
        expiresAt: backendUser ? backendUser.subscription?.expiresAt : existing?.subscription?.expiresAt,
        purchasedCourses: backendUser
          ? toArray(backendUser?.subscription?.purchasedCourses)
          : (existing?.subscription?.purchasedCourses || []),
        purchasedPackages: backendUser
          ? toArray(backendUser?.subscription?.purchasedPackages)
          : (existing?.subscription?.purchasedPackages || []),
      },
    },
    favorites: backendUser ? (backendUser.favorites ?? useStore.getState().favorites) : useStore.getState().favorites,
    reviewLater: backendUser ? (backendUser.reviewLater ?? useStore.getState().reviewLater) : useStore.getState().reviewLater,
    enrolledCourses: backendUser ? (backendUser.enrolledCourses ?? useStore.getState().enrolledCourses) : useStore.getState().enrolledCourses,
    enrolledPaths: backendUser ? (backendUser.enrolledPaths ?? useStore.getState().enrolledPaths) : useStore.getState().enrolledPaths,
    pathStageSelections: backendUser ? (backendUser.pathStageSelections ?? []) : (useStore.getState().pathStageSelections ?? []),
    completedLessons: backendUser ? (backendUser.completedLessons ?? useStore.getState().completedLessons) : useStore.getState().completedLessons,
  });
};

export const resetStoreUser = () => {
  advanceAuthSession();
  const existing = useStore.getState().user;
  useStore.setState({
    user: {
      ...existing,
      id: 'guest',
      name: 'Guest User',
      email: undefined,
      avatar: DEFAULT_AVATAR,
      role: Role.STUDENT,
      schoolId: undefined,
      groupIds: [],
      linkedStudentIds: [],
      managedPathIds: [],
      managedSubjectIds: [],
      pathStageSelections: [],
      interactiveVideoProgress: [],
      points: 0,
      badges: [],
      subscription: { plan: 'free', expiresAt: undefined, purchasedCourses: [], purchasedPackages: [] },
    },
    examResults: [],
    questionAttempts: [],
    favorites: [],
    reviewLater: [],
    recentActivity: [],
    enrolledCourses: [],
    enrolledPaths: [],
    pathStageSelections: [],
    completedLessons: [],
    cartItems: [],
  });
};
