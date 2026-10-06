import type { AccessCode, B2BPackage } from '../../../types';

export interface SchoolAccessCodeRow {
    id: string;
    code: string;
    packageId: string;
    packageName: string;
    currentUses: number;
    maxUses: number;
    usagePercent: number;
    expiresAt: number;
}

export const buildSchoolAccessCodeRows = (
    tableSchoolCodes: AccessCode[],
    schoolPackages: B2BPackage[],
): SchoolAccessCodeRow[] => {
    const packageNameById = new Map(schoolPackages.map((pkg) => [pkg.id, pkg.name]));

    return tableSchoolCodes.map((code) => ({
        id: code.id,
        code: code.code,
        packageId: code.packageId,
        packageName: packageNameById.get(code.packageId) || 'باقة غير معروفة',
        currentUses: code.currentUses,
        maxUses: code.maxUses,
        usagePercent: Math.min(100, (code.currentUses / Math.max(code.maxUses, 1)) * 100),
        expiresAt: code.expiresAt,
    }));
};
