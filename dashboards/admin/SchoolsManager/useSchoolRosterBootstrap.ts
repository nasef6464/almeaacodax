import { useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import { Role, User } from '../../../types';
import type { ContentBootstrapPayload } from './contracts';
import { loadSchoolAdminUsers, mergeUsersById } from './dataAdapters';

type UseSchoolRosterBootstrapInput = {
    role: Role;
    users: User[];
    hydrateUsers: (users: User[]) => void;
    hydrateContentBootstrap: (payload: ContentBootstrapPayload) => void;
};

/** Owns the one-time admin roster/bootstrap refresh, not school commands. */
export function useSchoolRosterBootstrap({ role, users, hydrateUsers, hydrateContentBootstrap }: UseSchoolRosterBootstrapInput) {
    const hasLoadedRef = useRef(false);

    const refreshUsers = async () => {
        if (role !== Role.ADMIN) return;
        try {
            hydrateUsers(mergeUsersById(users, await loadSchoolAdminUsers()));
        } catch (error) {
            console.warn('Failed to refresh users after school updates:', error);
        }
    };

    useEffect(() => {
        if (role !== Role.ADMIN || hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        void (async () => {
            try {
                api.clearContentBootstrapCache();
                const [bootstrap, loadedUsers] = await Promise.all([
                    api.getOperationalBootstrapFresh(),
                    loadSchoolAdminUsers(),
                ]);
                hydrateContentBootstrap(bootstrap as ContentBootstrapPayload);
                hydrateUsers(mergeUsersById(users, loadedUsers));
            } catch (error) {
                console.warn('Failed to refresh school list data:', error);
            }
        })();
    }, [role]);

    return { refreshUsers };
}
