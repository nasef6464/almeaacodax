import { Role } from '../../../types';
import type {
    AccessCode,
    AnnouncementAd,
    B2BPackage,
    Group,
    Lesson,
    LibraryItem,
    PackageContentType,
    StudyPlan,
    Topic,
} from '../../../types';

/**
 * Stable contracts for the SchoolsManager feature and its sub-panels.
 *
 * Keeping these outside SchoolsManager.tsx avoids child -> parent imports and
 * gives future hooks/services a single dependency-neutral contract surface.
 */
export type AdminUserPayload = {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
    role: Role;
    points?: number;
    badges?: string[];
    isActive?: boolean;
    schoolId?: string | null;
    groupIds?: string[];
    linkedStudentIds?: string[];
    managedPathIds?: string[];
    managedSubjectIds?: string[];
    subscription?: {
        plan?: 'free' | 'premium';
        purchasedCourses?: string[];
        purchasedPackages?: string[];
    };
};

export type QuickSupervisorDraft = {
    name: string;
    email: string;
    password?: string;
    targetGroupId: string;
};

export type ImportRow = {
    name: string;
    email: string;
    className?: string;
    password?: string;
};

export type ImportSummary = {
    totalRows: number;
    imported: number;
    classesTouched: number;
};

export type ImportResponse = {
    summary: ImportSummary;
    credentials: Array<{ name: string; email: string; password: string; className?: string }>;
    users?: AdminUserPayload[];
    groups?: Group[];
};

export type RelationImportRow = {
    studentEmail: string;
    parentEmail?: string;
    parentName?: string;
    supervisorEmail?: string;
    supervisorName?: string;
    className?: string;
};

export type RelationImportSummary = {
    rows: number;
    createdParents: number;
    createdSupervisors: number;
    linkedParents: number;
    linkedSupervisors: number;
    assignedClasses: number;
    missingStudents: number;
    missingParents: number;
    missingSupervisors: number;
    missingClasses: number;
    skippedRows: number;
};

export type RelationCredential = {
    role: Role.PARENT | Role.SUPERVISOR;
    name: string;
    email: string;
    password: string;
    linkedTo: string;
};

export type RelationResponse = {
    summary: RelationImportSummary;
    credentials: RelationCredential[];
    users?: AdminUserPayload[];
    groups?: Group[];
};

export type SchoolReport = {
    school: {
        id: string;
        name: string;
    };
    metrics: {
        totalStudents: number;
        activeStudents: number;
        totalClasses: number;
        activePackages: number;
        activeCodes: number;
        quizAttempts: number;
        averageScore: number;
    };
    classSummaries: Array<{
        id: string;
        name: string;
        studentCount: number;
        supervisorCount: number;
        quizAttempts: number;
        averageScore: number;
    }>;
    weakestSkills: Array<{
        skillId?: string;
        skill: string;
        subjectId?: string;
        sectionId?: string;
        attempts: number;
        mastery: number;
    }>;
};

export type AccessCodesPagination = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};

export type AccessCodesListResponse = {
    data?: Array<{
        id?: string;
        _id?: string;
        code?: string;
        schoolId?: string;
        packageId?: string;
        maxUses?: number;
        currentUses?: number;
        expiresAt?: number;
        createdAt?: number;
    }>;
    pagination?: Partial<AccessCodesPagination>;
};

export type ContentBootstrapPayload = {
    topics?: Topic[];
    lessons?: Lesson[];
    libraryItems?: LibraryItem[];
    groups?: Group[];
    b2bPackages?: B2BPackage[];
    accessCodes?: AccessCode[];
    announcementAds?: AnnouncementAd[];
    studyPlans?: StudyPlan[];
};

export const PACKAGE_CONTENT_OPTIONS: Array<{ value: PackageContentType; label: string }> = [
    { value: 'all', label: 'شاملة' },
    { value: 'courses', label: 'الدورات' },
    { value: 'foundation', label: 'التأسيس' },
    { value: 'banks', label: 'التدريبات' },
    { value: 'tests', label: 'الاختبارات' },
    { value: 'mockExams', label: 'الاختبارات المحاكية' },
    { value: 'library', label: 'المكتبة' },
];
