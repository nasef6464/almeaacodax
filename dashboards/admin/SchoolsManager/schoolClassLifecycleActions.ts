import type { Group } from '../../../types';
import type { SaveVerificationState } from './contracts';
import { getErrorMessage } from './errorMessageService';
import { buildNewClassGroup } from './groupFactory';

type SchoolClassLifecycleActionsInput = {
    selectedSchool: Group;
    ownerId: string;
    createGroupAsync: (group: Group) => Promise<unknown>;
    deleteGroupAsync: (groupId: string) => Promise<void>;
    refreshSchoolWorkspace: (schoolId: string) => Promise<unknown>;
    setSchoolActionPending: (value: string | null) => void;
    setManagementError: (value: string | null) => void;
    setManagementNotice: (value: string | null) => void;
    setSaveVerificationState: (value: SaveVerificationState) => void;
    setSaveVerificationMessage: (value: string) => void;
};

type SchoolClassRenameActionInput = {
    selectedSchool: Group;
    classroom: Group;
    updateGroupAsync: (groupId: string, data: Partial<Group>) => Promise<unknown>;
    refreshSchoolWorkspace: (schoolId: string) => Promise<unknown>;
    setSchoolActionPending: (value: string | null) => void;
    setManagementError: (value: string | null) => void;
    setManagementNotice: (value: string | null) => void;
    setSaveVerificationState: (value: SaveVerificationState) => void;
    setSaveVerificationMessage: (value: string) => void;
};

export const createSchoolClassLifecycleActions = ({
    selectedSchool,
    ownerId,
    createGroupAsync,
    deleteGroupAsync,
    refreshSchoolWorkspace,
    setSchoolActionPending,
    setManagementError,
    setManagementNotice,
    setSaveVerificationState,
    setSaveVerificationMessage,
}: SchoolClassLifecycleActionsInput) => {
    const handleCreateSingleClass = async (notice = 'تم إنشاء فصل جديد. يمكنك تغيير اسمه وربط الطلاب والمشرفين من بطاقة الفصل.') => {
        const now = Date.now();
        setSchoolActionPending('create-class');
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حفظ الفصل...');
        setManagementError(null);
        setManagementNotice(null);
        try {
            await createGroupAsync(buildNewClassGroup({
                name: `فصل جديد - ${selectedSchool.name}`,
                parentId: selectedSchool.id,
                ownerId,
                now,
            }));
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من الفصل من الخادم.');
            setManagementNotice(notice);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إنشاء الفصل الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setSchoolActionPending(null);
        }
    };

    const handleDeleteClass = async (classroom: Group) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;

        setSchoolActionPending(`delete-class-${classroom.id}`);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حذف الفصل...');
        setManagementError(null);
        setManagementNotice(null);
        try {
            await deleteGroupAsync(classroom.id);
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم حذف الفصل والتأكد منه من الخادم.');
            setManagementNotice('تم حذف الفصل بعد التحقق من الخادم.');
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر حذف الفصل الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setSchoolActionPending(null);
        }
    };

    return {
        handleCreateSingleClass,
        handleDeleteClass,
    };
};

export const createSchoolClassRenameAction = ({
    selectedSchool,
    classroom,
    updateGroupAsync,
    refreshSchoolWorkspace,
    setSchoolActionPending,
    setManagementError,
    setManagementNotice,
    setSaveVerificationState,
    setSaveVerificationMessage,
}: SchoolClassRenameActionInput) => async (newName: string) => {
    if (!newName.trim() || newName.trim() === classroom.name) return;

    setSchoolActionPending(`rename-class-${classroom.id}`);
    setSaveVerificationState('saving');
    setSaveVerificationMessage('جاري حفظ اسم الفصل...');
    setManagementError(null);
    setManagementNotice(null);
    try {
        await updateGroupAsync(classroom.id, { name: newName.trim() });
        await refreshSchoolWorkspace(selectedSchool.id);
        setSaveVerificationState('success');
        setSaveVerificationMessage('تم حفظ اسم الفصل والتأكد منه من الخادم.');
        setManagementNotice('تم حفظ اسم الفصل بعد التحقق من الخادم.');
    } catch (error) {
        const message = getErrorMessage(error, 'تعذر تعديل اسم الفصل الآن.');
        setSaveVerificationState('error');
        setSaveVerificationMessage(message);
        setManagementError(message);
        throw error;
    } finally {
        setSchoolActionPending(null);
    }
};
