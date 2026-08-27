import { useState } from 'react';
import type { SchoolListMode } from './contracts';

export function useSchoolListState() {
    const [schoolSearch, setSchoolSearch] = useState('');
    const [schoolListMode, setSchoolListMode] = useState<SchoolListMode>('active');
    const [newSchoolName, setNewSchoolName] = useState('');

    return {
        schoolSearch,
        setSchoolSearch,
        schoolListMode,
        setSchoolListMode,
        newSchoolName,
        setNewSchoolName,
    };
}
