import { B2BPackage, Course, Group, PackageContentType, User } from '../../types';

export interface AccessEnrollmentSliceState {
    user: User;
    enrolledCourses: string[];
    enrolledPaths: string[];
    favorites: string[];
    reviewLater: string[];
    b2bPackages: B2BPackage[];
    courses: Course[];
    groups: Group[];
}

export interface AccessEnrollmentSliceActions {
    enrollCourse: (courseId: string) => void;
    redeemAccessCode: (code: string) => Promise<void>;
    enrollPath: (pathId: string) => void;
    unenrollPath: (pathId: string) => void;
    checkAccess: (contentId: string, isPremiumContent: boolean) => boolean;
    hasScopedPackageAccess: (contentType: PackageContentType, pathId?: string, subjectId?: string) => boolean;
    getMatchingPackage: (contentType: PackageContentType, pathId?: string, subjectId?: string) => B2BPackage | null;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

interface AccessEnrollmentApi {
    enrollCourse: (courseId: string) => Promise<{ courseId?: string; enrolled?: boolean; alreadyEnrolled?: boolean }>;
    redeemAccessCode: (payload: { code: string }) => Promise<{ user?: any }>;
    updateMyPreferences: (payload: {
        favorites?: string[];
        reviewLater?: string[];
        enrolledPaths?: string[];
        completedLessons?: string[];
    }) => Promise<unknown>;
}

interface AccessEnrollmentDependencies {
    getUserSchoolIds: (groups: Group[], groupIds: string[], schoolId?: string) => Set<string>;
    isPublicPackageAvailable: (course: Course) => boolean;
    isRegisteredUser: (user: User) => boolean;
    packageMatchesScope: (
        pkg: B2BPackage,
        contentType: PackageContentType,
        pathId?: string,
        subjectId?: string,
    ) => boolean;
    shouldSyncUserToApi: (user?: User | null) => boolean;
}

export const createAccessEnrollmentSlice = <TState extends AccessEnrollmentSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: AccessEnrollmentApi,
    {
        getUserSchoolIds,
        isPublicPackageAvailable,
        isRegisteredUser,
        packageMatchesScope,
        shouldSyncUserToApi,
    }: AccessEnrollmentDependencies,
): AccessEnrollmentSliceActions => ({
    enrollCourse: (courseId) => {
        const normalizedCourseId = String(courseId || '').trim();
        if (!normalizedCourseId || get().enrolledCourses.includes(normalizedCourseId)) return;

        set((current) => ({
            enrolledCourses: [...current.enrolledCourses, normalizedCourseId],
        }) as Partial<TState>);

        const currentUser = get().user;
        if (!shouldSyncUserToApi(currentUser)) {
            return;
        }

        void api.enrollCourse(normalizedCourseId)
            .then((response) => {
                const persistedCourseId = String(response?.courseId || normalizedCourseId).trim() || normalizedCourseId;
                set((state) => ({
                    enrolledCourses: Array.from(new Set([...state.enrolledCourses, persistedCourseId])),
                    user: {
                        ...state.user,
                        subscription: {
                            ...state.user.subscription,
                            purchasedCourses: Array.from(new Set([
                                ...(state.user.subscription?.purchasedCourses || []),
                                persistedCourseId,
                            ])),
                        },
                    },
                }) as Partial<TState>);
            })
            .catch((error) => {
                console.error('Failed to persist course enrollment:', error);
                set((state) => ({
                    enrolledCourses: state.enrolledCourses.filter((id) => id !== normalizedCourseId),
                }) as Partial<TState>);
            });
    },

    redeemAccessCode: async (code) => {
        const response = await api.redeemAccessCode({ code });
        const backendUser = response?.user;
        if (!backendUser) {
            return;
        }

        set((state) => ({
            user: {
                ...state.user,
                subscription: {
                    ...state.user.subscription,
                    plan: backendUser?.subscription?.plan ?? state.user.subscription?.plan ?? 'free',
                    expiresAt: backendUser?.subscription?.expiresAt ?? state.user.subscription?.expiresAt,
                    purchasedCourses: Array.isArray(backendUser?.subscription?.purchasedCourses)
                        ? backendUser.subscription.purchasedCourses.map(String)
                        : state.user.subscription?.purchasedCourses || [],
                    purchasedPackages: Array.isArray(backendUser?.subscription?.purchasedPackages)
                        ? backendUser.subscription.purchasedPackages.map(String)
                        : state.user.subscription?.purchasedPackages || [],
                },
            },
            enrolledCourses: Array.isArray(backendUser?.enrolledCourses)
                ? backendUser.enrolledCourses.map(String)
                : state.enrolledCourses,
        }) as Partial<TState>);
    },

    enrollPath: (pathId) => set((state) => {
        if (state.enrolledPaths?.includes(pathId)) return state;
        const nextEnrolledPaths = [...(state.enrolledPaths || []), pathId];
        if (shouldSyncUserToApi(state.user)) {
            api.updateMyPreferences({
                favorites: state.favorites,
                reviewLater: state.reviewLater,
                enrolledPaths: nextEnrolledPaths,
            }).catch(console.error);
        }
        return {
            enrolledPaths: nextEnrolledPaths,
        } as Partial<TState>;
    }),

    unenrollPath: (pathId) => set((state) => {
        const nextEnrolledPaths = (state.enrolledPaths || []).filter((id) => id !== pathId);
        if (shouldSyncUserToApi(state.user)) {
            api.updateMyPreferences({
                favorites: state.favorites,
                reviewLater: state.reviewLater,
                enrolledPaths: nextEnrolledPaths,
            }).catch(console.error);
        }
        return {
            enrolledPaths: nextEnrolledPaths,
        } as Partial<TState>;
    }),

    checkAccess: (contentId, isPremiumContent) => {
        const state = get();
        if (!isPremiumContent) return true;
        if (!isRegisteredUser(state.user)) return false;
        if (state.user.subscription.plan === 'premium') return true;
        if (state.enrolledCourses.includes(contentId)) return true;
        if (state.user.subscription.purchasedCourses.includes(contentId)) return true;
        if (state.user.subscription.purchasedPackages.includes(contentId)) return true;
        return false;
    },

    hasScopedPackageAccess: (contentType, pathId, subjectId) => {
        const state = get();
        if (!isRegisteredUser(state.user)) return false;
        if (state.user.subscription.plan === 'premium') return true;

        const purchasedPackageIds = new Set(state.user.subscription?.purchasedPackages || []);
        const hasDirectPackage = state.b2bPackages.some((pkg) =>
            purchasedPackageIds.has(pkg.id) && packageMatchesScope(pkg, contentType, pathId, subjectId),
        );
        if (hasDirectPackage) {
            return true;
        }

        const hasPublicPathPackage = state.courses.some((course) => {
            if (!isPublicPackageAvailable(course) || !purchasedPackageIds.has(course.id)) {
                return false;
            }

            const packagePathId = course.pathId || course.category;
            const packageSubjectId = course.subjectId || course.subject;
            const packageContentTypes = course.packageContentTypes?.length ? course.packageContentTypes : ['all'];
            const matchesType = packageContentTypes.includes('all') || packageContentTypes.includes(contentType);
            const matchesPath = !pathId || !packagePathId || packagePathId === pathId;
            const matchesSubject = !subjectId || !packageSubjectId || packageSubjectId === subjectId;

            return matchesType && matchesPath && matchesSubject;
        });
        if (hasPublicPathPackage) {
            return true;
        }

        // School membership identifies the learner's operational scope, but it
        // does not grant package access by itself. Access must be mirrored into
        // purchasedPackages by an active AccessGrant (access code/payment/admin).
        return false;
    },

    getMatchingPackage: (contentType, pathId, subjectId) => {
        const state = get();
        const schoolIds = getUserSchoolIds(state.groups, state.user.groupIds || [], state.user.schoolId);
        if (schoolIds.size === 0) {
            return null;
        }

        const prioritizedPackages = [...state.b2bPackages]
            .filter((pkg) => schoolIds.has(pkg.schoolId) && packageMatchesScope(pkg, contentType, pathId, subjectId))
            .sort((a, b) => {
                const aSpecificity = (a.subjectIds?.length || 0) * 4 + (a.pathIds?.length || 0) * 2 + (a.contentTypes?.includes('all') ? 0 : 1);
                const bSpecificity = (b.subjectIds?.length || 0) * 4 + (b.pathIds?.length || 0) * 2 + (b.contentTypes?.includes('all') ? 0 : 1);
                return bSpecificity - aSpecificity;
            });

        return prioritizedPackages[0] || null;
    },
});
