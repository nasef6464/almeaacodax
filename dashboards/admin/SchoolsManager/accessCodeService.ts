import type { AccessCode, B2BPackage } from '../../../types';
import type { AccessCodesListResponse, AccessCodesPagination, PagedAccessCode } from './contracts';

type CreateSchoolAccessCodeInput = {
    schoolName: string;
    schoolId: string;
    packageId: string;
    maxUses: string;
    durationDays: string;
    now?: number;
};

type ValidateSchoolAccessCodeCreationInput = {
    activeSchoolPackages: B2BPackage[];
    selectedPackageIdForCode: string;
    selectedPackageForCode?: B2BPackage;
};

type ResolveSelectedPackageIdInput = {
    schoolId: string;
    packages: B2BPackage[];
    currentPackageId: string;
};

type SchoolAccessCodeListQuery = {
    schoolId: string;
    page: number;
    limit: number;
    sortBy: 'createdAt';
    sortOrder: 'desc';
};

export function getSchoolAccessCodeCreationError({
    activeSchoolPackages,
    selectedPackageIdForCode,
    selectedPackageForCode,
}: ValidateSchoolAccessCodeCreationInput): string | null {
    if (activeSchoolPackages.length === 0) {
        return 'يجب وجود باقة نشطة قبل توليد كود تفعيل.';
    }

    if (!selectedPackageIdForCode) {
        return 'اختر الباقة النشطة التي سيعمل عليها كود التفعيل أولًا.';
    }

    if (!selectedPackageForCode || selectedPackageForCode.status !== 'active') {
        return 'لا يمكن توليد كود على باقة موقوفة. فعّل الباقة أو اختر باقة نشطة.';
    }

    return null;
}

export function buildSchoolAccessCode({
    schoolName,
    schoolId,
    packageId,
    maxUses,
    durationDays,
    now = Date.now(),
}: CreateSchoolAccessCodeInput): AccessCode {
    return {
        id: `code_${now}`,
        code: `${schoolName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        schoolId,
        packageId,
        maxUses: Math.max(1, Number(maxUses) || 50),
        currentUses: 0,
        expiresAt: now + Math.max(1, Number(durationDays) || 30) * 24 * 60 * 60 * 1000,
        createdAt: now,
    };
}

export function resolveSelectedAccessCodePackageId({
    schoolId,
    packages,
    currentPackageId,
}: ResolveSelectedPackageIdInput): string {
    const activePackages = packages.filter((pkg) => pkg.schoolId === schoolId && pkg.status === 'active');

    return activePackages.some((pkg) => pkg.id === currentPackageId)
        ? currentPackageId
        : (activePackages[0]?.id || '');
}

export function buildSchoolAccessCodeListQuery(schoolId: string): SchoolAccessCodeListQuery {
    return {
        schoolId,
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    };
}

export function normalizePagedAccessCodes(response: AccessCodesListResponse): PagedAccessCode[] {
    const incoming = Array.isArray(response?.data) ? response.data : [];

    return incoming.map((code) => ({
        id: String(code.id || code._id || ''),
        code: String(code.code || ''),
        schoolId: String(code.schoolId || ''),
        packageId: String(code.packageId || ''),
        maxUses: Number(code.maxUses || 0),
        currentUses: Number(code.currentUses || 0),
        expiresAt: Number(code.expiresAt || 0),
        createdAt: Number(code.createdAt || 0),
    })).filter((code) => code.id && code.schoolId);
}

export function normalizeAccessCodesPagination(response: AccessCodesListResponse): AccessCodesPagination | null {
    const pagination = response?.pagination || {};

    if (typeof pagination.page !== 'number' || typeof pagination.limit !== 'number') {
        return null;
    }

    return {
        total: Number(pagination.total || 0),
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Number(pagination.totalPages || 1),
        hasNext: Boolean(pagination.hasNext),
        hasPrev: Boolean(pagination.hasPrev),
    };
}
