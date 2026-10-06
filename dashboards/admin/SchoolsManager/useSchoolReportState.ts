import { useCallback, useState } from 'react';
import { api } from '../../../services/api';
import type { SchoolReport } from './contracts';

export function useSchoolReportState() {
    const [schoolReport, setSchoolReport] = useState<SchoolReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const clearSchoolReport = useCallback(() => {
        setSchoolReport(null);
        setReportError(null);
    }, []);

    const loadSchoolReport = useCallback(async (schoolId: string) => {
        setIsLoadingReport(true);
        setReportError(null);
        try {
            const response = await api.getSchoolReport(schoolId) as SchoolReport;
            setSchoolReport(response);
        } catch (error) {
            setReportError(error instanceof Error ? error.message : 'تعذر تحميل تقرير المدرسة الآن.');
        } finally {
            setIsLoadingReport(false);
        }
    }, []);

    return {
        schoolReport,
        isLoadingReport,
        reportError,
        clearSchoolReport,
        loadSchoolReport,
    };
}
