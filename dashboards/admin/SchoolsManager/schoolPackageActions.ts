import type { B2BPackage, Group } from '../../../types';
import { getErrorMessage } from './errorMessageService';

type SchoolPackageActionsInput = {
    selectedSchool: Group;
    schoolPackages: B2BPackage[];
    createB2BPackageAsync: (pkg: B2BPackage) => Promise<B2BPackage>;
    updateB2BPackageAsync: (packageId: string, data: Partial<B2BPackage>) => Promise<B2BPackage>;
    deleteB2BPackageAsync: (packageId: string) => Promise<void>;
    refreshSchoolWorkspace: (schoolId: string) => Promise<unknown>;
    setPackageActionPending: (value: string | null) => void;
    setManagementError: (value: string | null) => void;
    setManagementNotice: (value: string | null) => void;
};

export const createSchoolPackageActions = ({
    selectedSchool,
    schoolPackages,
    createB2BPackageAsync,
    updateB2BPackageAsync,
    deleteB2BPackageAsync,
    refreshSchoolWorkspace,
    setPackageActionPending,
    setManagementError,
    setManagementNotice,
}: SchoolPackageActionsInput) => {
    const handleCreateSchoolPackage = async (pkg: B2BPackage) => {
        setPackageActionPending(`create-${pkg.id}`);
        setManagementError(null);
        setManagementNotice(null);
        try {
            await createB2BPackageAsync(pkg);
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice('تم حفظ الباقة المدرسية وربطها بالمدرسة بعد التحقق من الخادم.');
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر حفظ الباقة المدرسية الآن.'));
        } finally {
            setPackageActionPending(null);
        }
    };

    const handleUpdateSchoolPackage = async (packageId: string, data: Partial<B2BPackage>) => {
        setPackageActionPending(`update-${packageId}`);
        setManagementError(null);
        setManagementNotice(null);
        try {
            await updateB2BPackageAsync(packageId, data);
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice('تم حفظ تعديل الباقة المدرسية بعد التحقق من الخادم.');
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر حفظ تعديل الباقة المدرسية الآن.'));
        } finally {
            setPackageActionPending(null);
        }
    };

    const handleDeleteSchoolPackage = async (packageId: string) => {
        setPackageActionPending(`delete-${packageId}`);
        setManagementError(null);
        setManagementNotice(null);
        try {
            await deleteB2BPackageAsync(packageId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice('تم حذف الباقة المدرسية وأكوادها المرتبطة بعد التحقق من الخادم.');
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر حذف الباقة المدرسية الآن.'));
        } finally {
            setPackageActionPending(null);
        }
    };

    const handleExpireAllSchoolPackages = async () => {
        setPackageActionPending('expire-all');
        setManagementError(null);
        setManagementNotice(null);
        try {
            await Promise.all(schoolPackages.map((pkg) => updateB2BPackageAsync(pkg.id, { status: 'expired' })));
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice('تم إيقاف كل باقات المدرسة بعد تأكيد الحفظ من الخادم.');
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر إيقاف كل الباقات الآن.'));
        } finally {
            setPackageActionPending(null);
        }
    };

    return {
        handleCreateSchoolPackage,
        handleUpdateSchoolPackage,
        handleDeleteSchoolPackage,
        handleExpireAllSchoolPackages,
    };
};
