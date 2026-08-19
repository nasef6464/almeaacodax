import React from 'react';
import type { SchoolReport } from './contracts';
import type { SchoolWorkspaceReadinessCheck, SchoolWorkspaceTab } from './workspaceViewModel';
import { SchoolHandoverReportSummary } from './SchoolHandoverReportSummary';
import { SchoolPerformanceReportPanel } from './SchoolPerformanceReportPanel';

type NamedEntity = { id: string; name: string };

interface SchoolReportsPanelProps {
    readinessScore: number;
    readinessTotal: number;
    readinessStatusLabel: string;
    readinessNextStep: string;
    readinessPercent: number;
    schoolClassCount: number;
    schoolStudentCount: number;
    schoolSupervisorCount: number;
    activePackageCount: number;
    activeCodeCount: number;
    handoverBlockingGaps: SchoolWorkspaceReadinessCheck[];
    onNavigateTab: (tab: SchoolWorkspaceTab) => void;
    downloadSchoolHandover: () => void;
    downloadSchoolGapReport: () => void;
    printSchoolReport: () => void;
    isLoadingReport: boolean;
    reportError: string | null;
    schoolReport: SchoolReport | null;
    subjects: NamedEntity[];
    sections: NamedEntity[];
    downloadSchoolPerformanceReport: () => void;
}

export const SchoolReportsPanel: React.FC<SchoolReportsPanelProps> = ({
    readinessScore,
    readinessTotal,
    readinessStatusLabel,
    readinessNextStep,
    readinessPercent,
    schoolClassCount,
    schoolStudentCount,
    schoolSupervisorCount,
    activePackageCount,
    activeCodeCount,
    handoverBlockingGaps,
    onNavigateTab,
    downloadSchoolHandover,
    downloadSchoolGapReport,
    printSchoolReport,
    isLoadingReport,
    reportError,
    schoolReport,
    subjects,
    sections,
    downloadSchoolPerformanceReport,
}) => (
    <div data-testid="school-reports-panel" className="space-y-6">
        <SchoolHandoverReportSummary
            readinessScore={readinessScore}
            readinessTotal={readinessTotal}
            readinessStatusLabel={readinessStatusLabel}
            readinessNextStep={readinessNextStep}
            readinessPercent={readinessPercent}
            schoolClassCount={schoolClassCount}
            schoolStudentCount={schoolStudentCount}
            schoolSupervisorCount={schoolSupervisorCount}
            activePackageCount={activePackageCount}
            activeCodeCount={activeCodeCount}
            handoverBlockingGaps={handoverBlockingGaps}
            onNavigateTab={onNavigateTab}
            downloadSchoolHandover={downloadSchoolHandover}
            downloadSchoolGapReport={downloadSchoolGapReport}
            printSchoolReport={printSchoolReport}
        />

        <SchoolPerformanceReportPanel
            isLoadingReport={isLoadingReport}
            reportError={reportError}
            schoolReport={schoolReport}
            subjects={subjects}
            sections={sections}
            downloadSchoolPerformanceReport={downloadSchoolPerformanceReport}
        />
    </div>
);
