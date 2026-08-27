import { useState } from 'react';
import type { SchoolStudentClassFilter } from './contracts';

const schoolStudentPageSize = 80;

export function useSchoolRosterFilters() {
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState<SchoolStudentClassFilter>('all');
    const [schoolStudentPage, setSchoolStudentPage] = useState(1);

    const resetSchoolRosterFilters = () => {
        setStudentSearch('');
        setSelectedClassFilter('all');
        setSchoolStudentPage(1);
    };

    return {
        studentSearch,
        setStudentSearch,
        selectedClassFilter,
        setSelectedClassFilter,
        schoolStudentPage,
        setSchoolStudentPage,
        schoolStudentPageSize,
        resetSchoolRosterFilters,
    };
}
