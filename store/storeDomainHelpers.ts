import { B2BPackage, Course, Group, PackageContentType, QuizResult, Role, User } from '../types';

export const createGuestUser = (): User => ({
    id: 'guest',
    name: 'حساب ضيف',
    avatar: 'https://i.pravatar.cc/150?u=guest',
    role: Role.STUDENT,
    points: 0,
    badges: [],
    groupIds: [],
    subscription: {
        plan: 'free',
        purchasedCourses: [],
        purchasedPackages: []
    }
});

export const packageMatchesScope = (
    pkg: B2BPackage,
    contentType: PackageContentType,
    pathId?: string,
    subjectId?: string,
) => {
    if (pkg.status !== 'active') {
        return false;
    }

    const contentTypes = Array.isArray(pkg.contentTypes) && pkg.contentTypes.length ? pkg.contentTypes : ['all'];
    const matchesType = contentTypes.includes('all') || contentTypes.includes(contentType);
    if (!matchesType) {
        return false;
    }

    const pathIds = Array.isArray(pkg.pathIds) ? pkg.pathIds : [];
    const subjectIds = Array.isArray(pkg.subjectIds) ? pkg.subjectIds : [];
    const matchesPath = !pathId || pathIds.length === 0 || pathIds.includes(pathId);
    const matchesSubject = !subjectId || subjectIds.length === 0 || subjectIds.includes(subjectId);

    return matchesPath && matchesSubject;
};

export const isPublicPackageAvailable = (course: Course) =>
    Boolean(
        course.isPackage &&
        course.showOnPlatform !== false &&
        course.isPublished !== false &&
        (!course.approvalStatus || course.approvalStatus === 'approved'),
    );

export const getUserSchoolIds = (groups: Group[], userGroupIds: string[] = [], directSchoolId?: string) => {
    const ids = new Set<string>();

    if (directSchoolId) {
        ids.add(directSchoolId);
    }

    userGroupIds.forEach((groupId) => {
        const group = groups.find((item) => item.id === groupId);
        if (!group) {
            return;
        }

        if (group.type === 'SCHOOL') {
            ids.add(group.id);
        }

        if (group.parentId) {
            ids.add(group.parentId);
        }
    });

    return ids;
};

const getQuizResultIdentity = (result: Partial<QuizResult> | null | undefined) => {
    if (!result) return '';

    const date = String(result.date || '');
    const quizId = String(result.quizId || '');
    const userId = String(result.userId || '');
    if (date) {
        return [userId, quizId, date].filter(Boolean).join(':');
    }

    return [userId, quizId, result.quizTitle, result.score, result.timeSpent]
        .filter((item) => item !== undefined && item !== null && String(item) !== '')
        .map(String)
        .join(':');
};

const normalizeQuizResultForStore = (result: QuizResult): QuizResult => ({
    ...result,
    userId: result.userId ? String(result.userId) : result.userId,
    quizId: String(result.quizId || ''),
    quizTitle: String(result.quizTitle || 'اختبار'),
    date: String(result.date || new Date().toISOString()),
    source: result.source ? String(result.source) : result.source,
    returnTo: result.returnTo ? String(result.returnTo) : result.returnTo,
    score: Number(result.score || 0),
    totalQuestions: Number(result.totalQuestions || 0),
    correctAnswers: Number(result.correctAnswers || 0),
    wrongAnswers: Number(result.wrongAnswers || 0),
    unanswered: Number(result.unanswered || 0),
    timeSpent: String(result.timeSpent || '0 دقيقة'),
});

export const mergeQuizResultsForStore = (
    existingResults: QuizResult[],
    incomingResults: QuizResult[],
    currentUserId?: string,
) => {
    const merged = new Map<string, QuizResult>();

    [...incomingResults, ...existingResults]
        .filter(Boolean)
        .map(normalizeQuizResultForStore)
        .filter((result) => result.quizId && result.date)
        .forEach((result) => {
            const belongsToCurrentUser =
                !currentUserId ||
                currentUserId === 'guest' ||
                currentUserId.startsWith('dev-') ||
                !result.userId ||
                result.userId === currentUserId;

            if (!belongsToCurrentUser) {
                return;
            }

            const identity = getQuizResultIdentity(result);
            if (identity && !merged.has(identity)) {
                merged.set(identity, result);
            }
        });

    return Array.from(merged.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 250);
};

export const isRegisteredUser = (user?: User | null) =>
    Boolean(user && user.id && user.id !== 'guest' && user.email);

export const resolveEntityId = (entity: { id?: unknown; _id?: unknown }, fallback = '') =>
    String(entity?.id || entity?._id || fallback || '');

const toOptionalFiniteNumber = (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

export const normalizeCourseForStore = (course: any) => {
    const normalizedId = resolveEntityId(course);
    return {
        ...course,
        id: normalizedId,
        _id: normalizedId,
        price: Number(course?.price || 0),
        rating: Number(course?.rating || 0),
        progress: Number(course?.progress || 0),
        originalPrice: toOptionalFiniteNumber(course?.originalPrice),
        studentCount: toOptionalFiniteNumber(course?.studentCount),
        fakeStudentsCount: toOptionalFiniteNumber(course?.fakeStudentsCount),
        fakeRating: toOptionalFiniteNumber(course?.fakeRating),
        showOnPlatform: typeof course?.showOnPlatform === 'boolean' ? course.showOnPlatform : false,
    } as Course;
};
