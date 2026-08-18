import type { AccessCode, B2BPackage, Group, User } from '../../../types';

export type SchoolReadinessTab = 'overview' | 'relations' | 'packages';

export interface SchoolReadinessCheck {
    key: 'classes' | 'students' | 'supervisors' | 'packages' | 'codes';
    label: string;
    isReady: boolean;
    tab: SchoolReadinessTab;
    hint: string;
}

export interface SchoolReadinessContext {
    classes: Group[];
    students: User[];
    b2bPackages: B2BPackage[];
    accessCodes: AccessCode[];
    now?: number;
}

export interface SchoolOperationalSnapshot {
    schoolClasses: Group[];
    schoolStudents: User[];
    activePackageCount: number;
    activeCodeCount: number;
    readinessScore: number;
    isEmptyDraft: boolean;
    isLikelyDemoSchool: boolean;
    isCommerciallyHiddenDraft: boolean;
}

export interface SchoolPortfolioRow {
    school: Group;
    classCount: number;
    studentCount: number;
    supervisorCount: number;
    activePackageCount: number;
    activeCodeCount: number;
    readinessScore: number;
    readinessTotal: number;
    status: 'جاهزة للبيع/التسليم' | 'قريبة من التسليم' | 'تحتاج تجهيز';
    nextAction?: SchoolReadinessCheck;
}

export interface SchoolPortfolioSummary {
    ready: number;
    nearReady: number;
    needsSetup: number;
    totalStudents: number;
    totalActivePackages: number;
    nextPriority?: SchoolPortfolioRow;
}

export const getStudentsForSchool = (
    school: Group,
    schoolClasses: Group[],
    students: User[],
) => {
    const schoolClassIds = new Set(schoolClasses.map((group) => group.id));
    const linkedStudentIds = new Set<string>([
        ...(school.studentIds || []),
        ...schoolClasses.flatMap((classroom) => classroom.studentIds || []),
    ]);

    return students.filter((student) => (
        student.schoolId === school.id
        || linkedStudentIds.has(student.id)
        || (student.groupIds || []).some((groupId) => groupId === school.id || schoolClassIds.has(groupId))
    ));
};

const isLikelyDemoSchoolName = (schoolName: string) =>
    /(^|\s|-)(تجريبي|تجربة|اختبار|نموذج|demo|test|sample|trial)(\s|$|-)/i.test(
        schoolName.trim().toLowerCase(),
    );

export const getSchoolOperationalSnapshot = (
    school: Group,
    context: SchoolReadinessContext,
): SchoolOperationalSnapshot => {
    const now = context.now ?? Date.now();
    const schoolClasses = context.classes.filter((group) => group.parentId === school.id);
    const schoolStudents = getStudentsForSchool(school, schoolClasses, context.students);
    const activePackageCount = context.b2bPackages.filter(
        (pkg) => pkg.schoolId === school.id && pkg.status === 'active',
    ).length;
    const activeCodeCount = context.accessCodes.filter(
        (code) => code.schoolId === school.id && code.expiresAt > now,
    ).length;
    const readinessScore = [
        schoolClasses.length > 0,
        schoolStudents.length > 0,
        school.supervisorIds.length > 0,
        activePackageCount > 0,
        activeCodeCount > 0,
    ].filter(Boolean).length;
    const hasRealOperation = readinessScore > 0 || schoolClasses.length > 0 || schoolStudents.length > 0;
    const isLikelyDemoSchool = isLikelyDemoSchoolName(school.name);
    const isEmptyDraft =
        !hasRealOperation
        && (/^مدرسة جديدة(?:\s|$|-)/.test(school.name.trim()) || isLikelyDemoSchool);
    const isCommerciallyHiddenDraft =
        isEmptyDraft
        || (isLikelyDemoSchool && readinessScore < 2 && schoolStudents.length === 0);

    return {
        schoolClasses,
        schoolStudents,
        activePackageCount,
        activeCodeCount,
        readinessScore,
        isEmptyDraft,
        isLikelyDemoSchool,
        isCommerciallyHiddenDraft,
    };
};

export const buildSchoolReadinessChecks = (
    school: Group,
    snapshot: Pick<SchoolOperationalSnapshot, 'schoolClasses' | 'schoolStudents' | 'activePackageCount' | 'activeCodeCount'>,
): SchoolReadinessCheck[] => [
    {
        key: 'classes',
        label: 'الفصول',
        isReady: snapshot.schoolClasses.length > 0,
        tab: 'overview',
        hint: 'أضف فصول المدرسة',
    },
    {
        key: 'students',
        label: 'الطلاب',
        isReady: snapshot.schoolStudents.length > 0,
        tab: 'overview',
        hint: 'أضف الطلاب أو استورد كشف المدرسة',
    },
    {
        key: 'supervisors',
        label: 'المشرفون',
        isReady: school.supervisorIds.length > 0,
        tab: 'relations',
        hint: 'اربط مدير المدرسة أو المشرفين',
    },
    {
        key: 'packages',
        label: 'الباقة/المسارات',
        isReady: snapshot.activePackageCount > 0,
        tab: 'packages',
        hint: 'فعّل باقة مدرسية مرتبطة بالمسارات',
    },
    {
        key: 'codes',
        label: 'الأكواد',
        isReady: snapshot.activeCodeCount > 0,
        tab: 'packages',
        hint: 'ولّد كود دخول صالح',
    },
];

export const buildSchoolPortfolioRows = (
    schools: Group[],
    context: SchoolReadinessContext,
): SchoolPortfolioRow[] => schools.map((school) => {
    const snapshot = getSchoolOperationalSnapshot(school, context);
    const readinessChecks = buildSchoolReadinessChecks(school, snapshot);
    const readinessScore = readinessChecks.filter((check) => check.isReady).length;
    const nextAction = readinessChecks.find((check) => !check.isReady);
    const status: SchoolPortfolioRow['status'] = readinessScore === readinessChecks.length
        ? 'جاهزة للبيع/التسليم'
        : readinessScore >= 2
            ? 'قريبة من التسليم'
            : 'تحتاج تجهيز';

    return {
        school,
        classCount: snapshot.schoolClasses.length,
        studentCount: snapshot.schoolStudents.length,
        supervisorCount: school.supervisorIds.length,
        activePackageCount: snapshot.activePackageCount,
        activeCodeCount: snapshot.activeCodeCount,
        readinessScore,
        readinessTotal: readinessChecks.length,
        status,
        nextAction,
    };
});

export const summarizeSchoolPortfolio = (
    rows: SchoolPortfolioRow[],
): SchoolPortfolioSummary => {
    const ready = rows.filter((row) => row.readinessScore === row.readinessTotal).length;
    const nearReady = rows.filter(
        (row) => row.readinessScore >= 2 && row.readinessScore < row.readinessTotal,
    ).length;
    const needsSetup = rows.filter((row) => row.readinessScore < 2).length;
    const nextPriority = [...rows].sort(
        (a, b) => a.readinessScore - b.readinessScore || b.studentCount - a.studentCount,
    )[0];

    return {
        ready,
        nearReady,
        needsSetup,
        totalStudents: rows.reduce((sum, row) => sum + row.studentCount, 0),
        totalActivePackages: rows.reduce((sum, row) => sum + row.activePackageCount, 0),
        nextPriority,
    };
};
