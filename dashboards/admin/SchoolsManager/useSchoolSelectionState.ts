import { useState } from 'react';
import type { Group } from '../../../types';

export function useSchoolSelectionState() {
    const [selectedSchool, setSelectedSchool] = useState<Group | null>(null);
    const [activeSchoolActionsId, setActiveSchoolActionsId] = useState<string | null>(null);

    const toggleSchoolActions = (schoolId: string) => {
        setActiveSchoolActionsId((current) => (current === schoolId ? null : schoolId));
    };

    const closeSchoolActions = () => {
        setActiveSchoolActionsId(null);
    };

    return {
        selectedSchool,
        setSelectedSchool,
        activeSchoolActionsId,
        toggleSchoolActions,
        closeSchoolActions,
    };
}
