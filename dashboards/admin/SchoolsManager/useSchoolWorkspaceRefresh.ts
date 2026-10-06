import { api } from '../../../services/api';
import { Group, Role, User } from '../../../types';
import type { ContentBootstrapPayload, SaveVerificationState, SchoolWorkspaceTab } from './contracts';
import { loadSchoolAdminUsers, mergeUsersById, normalizeStoreGroups } from './dataAdapters';

type UseSchoolWorkspaceRefreshInput = {
    role: Role;
    users: User[];
    activeTab: SchoolWorkspaceTab;
    hydrateUsers: (users: User[]) => void;
    hydrateContentBootstrap: (payload: ContentBootstrapPayload) => void;
    setSelectedSchool: (school: Group) => void;
    loadSchoolReport: (schoolId: string) => Promise<unknown>;
    setSaveVerificationState: (state: SaveVerificationState) => void;
    setSaveVerificationMessage: (message: string) => void;
};

/** Owns the server-backed refresh used to verify one selected school workspace. */
export function useSchoolWorkspaceRefresh({
    role,
    users,
    activeTab,
    hydrateUsers,
    hydrateContentBootstrap,
    setSelectedSchool,
    loadSchoolReport,
    setSaveVerificationState,
    setSaveVerificationMessage,
}: UseSchoolWorkspaceRefreshInput) {
    const refreshSchoolWorkspace = async (schoolId: string, mode: 'silent' | 'manual' = 'silent') => {
        if (mode === 'manual') {
            setSaveVerificationState('verifying');
            setSaveVerificationMessage('جاري التحقق من البيانات المحفوظة...');
        }

        api.clearContentBootstrapCache();
        const [bootstrap, adminUsersResponse] = await Promise.all([
            api.getOperationalBootstrapFresh(),
            role === Role.ADMIN ? loadSchoolAdminUsers() : Promise.resolve(null),
        ]);

        const contentBootstrap = bootstrap as ContentBootstrapPayload;
        hydrateContentBootstrap(contentBootstrap);
        if (adminUsersResponse && Array.isArray(adminUsersResponse)) {
            hydrateUsers(mergeUsersById(users, adminUsersResponse));
        }

        const freshSchool = normalizeStoreGroups(contentBootstrap.groups)
            .find((group) => group.id === schoolId && group.type === 'SCHOOL');
        if (!freshSchool) {
            throw new Error('فشل التحقق: لم ترجع المدرسة من الخادم بعد الحفظ.');
        }

        setSelectedSchool(freshSchool);
        if (activeTab === 'reports') {
            await loadSchoolReport(freshSchool.id);
        }

        if (mode === 'manual') {
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من البيانات من الخادم.');
        }

        return freshSchool;
    };

    return { refreshSchoolWorkspace };
}
