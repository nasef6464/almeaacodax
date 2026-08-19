import type { SchoolPortfolioRow, SchoolReadinessTab } from './readinessViewModel';

export interface SchoolCardReadinessAction {
    id: 'classes' | 'students' | 'supervisors' | 'packages' | 'codes';
    label: string;
    isReady: boolean;
    tab: SchoolReadinessTab;
    hint: string;
}

export const buildSchoolCardReadinessActions = (
    row: SchoolPortfolioRow,
): SchoolCardReadinessAction[] => [
    {
        id: 'classes',
        label: 'الفصول',
        isReady: row.classCount > 0,
        tab: 'overview',
        hint: row.classCount > 0 ? `${row.classCount} فصل` : 'أضف فصولًا',
    },
    {
        id: 'students',
        label: 'الطلاب',
        isReady: row.studentCount > 0,
        tab: 'overview',
        hint: row.studentCount > 0 ? `${row.studentCount} طالب` : 'أضف الطلاب',
    },
    {
        id: 'supervisors',
        label: 'المشرفون',
        isReady: row.supervisorCount > 0,
        tab: 'relations',
        hint: row.supervisorCount > 0 ? `${row.supervisorCount} مشرف` : 'اربط مشرفًا',
    },
    {
        id: 'packages',
        label: 'الباقة/المسارات',
        isReady: row.activePackageCount > 0,
        tab: 'packages',
        hint: row.activePackageCount > 0 ? `${row.activePackageCount} باقة` : 'فعّل باقة ومسارات',
    },
    {
        id: 'codes',
        label: 'الأكواد',
        isReady: row.activeCodeCount > 0,
        tab: 'packages',
        hint: row.activeCodeCount > 0 ? `${row.activeCodeCount} كود` : 'ولّد كودًا',
    },
];
