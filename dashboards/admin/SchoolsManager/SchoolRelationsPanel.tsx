import React from 'react';
import type { Group, User } from '../../../types';
import type {
    QuickSupervisorDraft,
    RelationCredential,
    RelationImportRow,
    RelationImportSummary,
} from './contracts';
import { SchoolQuickSupervisorCard } from './SchoolQuickSupervisorCard';
import { SchoolRelationsImportPanel } from './SchoolRelationsImportPanel';
import { SchoolRelationsReportPanel } from './SchoolRelationsReportPanel';
import { SchoolRelationsStatusPanel } from './SchoolRelationsStatusPanel';

interface SchoolRelationsPanelProps {
    schoolLevelSupervisors: User[];
    classScopedSupervisors: User[];
    schoolParentUsers: User[];
    schoolSupervisors: User[];
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];

    quickSupervisor: QuickSupervisorDraft;
    setQuickSupervisor: React.Dispatch<React.SetStateAction<QuickSupervisorDraft>>;
    schoolClasses: Group[];

    handleCreateQuickSupervisor: () => Promise<void>;
    rosterActionPending: string | null;

    downloadRelationsTemplate: () => void;
    relationRows: RelationImportRow[];
    handleRelationFile: (file: File) => Promise<void>;
    relationError: string | null;
    createMissingRelationUsers: boolean;
    setCreateMissingRelationUsers: React.Dispatch<React.SetStateAction<boolean>>;
    isApplyingRelations: boolean;
    handleApplyRelationImport: () => Promise<void>;
    relationSummary: RelationImportSummary | null;
    relationCredentials: RelationCredential[];
    downloadRelationCredentials: () => void;
    downloadRelationsReport: () => void;
}

export const SchoolRelationsPanel: React.FC<SchoolRelationsPanelProps> = ({
    schoolLevelSupervisors,
    classScopedSupervisors,
    schoolParentUsers,
    schoolSupervisors,
    studentsWithoutParent,
    studentsWithoutClass,
    quickSupervisor,
    setQuickSupervisor,
    schoolClasses,
    handleCreateQuickSupervisor,
    rosterActionPending,
    downloadRelationsTemplate,
    relationRows,
    handleRelationFile,
    relationError,
    createMissingRelationUsers,
    setCreateMissingRelationUsers,
    isApplyingRelations,
    handleApplyRelationImport,
    relationSummary,
    relationCredentials,
    downloadRelationCredentials,
    downloadRelationsReport,
}) => (
    <div data-testid="school-supervisors-panel" className="space-y-8">
        <SchoolRelationsStatusPanel
            schoolLevelSupervisors={schoolLevelSupervisors}
            classScopedSupervisors={classScopedSupervisors}
            schoolParentUsers={schoolParentUsers}
            schoolSupervisors={schoolSupervisors}
            studentsWithoutParent={studentsWithoutParent}
            studentsWithoutClass={studentsWithoutClass}
        />

        <SchoolQuickSupervisorCard
            quickSupervisor={quickSupervisor}
            setQuickSupervisor={setQuickSupervisor}
            schoolClasses={schoolClasses}
            handleCreateQuickSupervisor={handleCreateQuickSupervisor}
            rosterActionPending={rosterActionPending}
        />

        <SchoolRelationsImportPanel
            downloadRelationsTemplate={downloadRelationsTemplate}
            relationRows={relationRows}
            handleRelationFile={handleRelationFile}
            relationError={relationError}
            createMissingRelationUsers={createMissingRelationUsers}
            setCreateMissingRelationUsers={setCreateMissingRelationUsers}
            isApplyingRelations={isApplyingRelations}
            handleApplyRelationImport={handleApplyRelationImport}
            relationSummary={relationSummary}
            relationCredentials={relationCredentials}
            downloadRelationCredentials={downloadRelationCredentials}
        />

        <SchoolRelationsReportPanel
            studentsWithoutParent={studentsWithoutParent}
            studentsWithoutClass={studentsWithoutClass}
            downloadRelationsReport={downloadRelationsReport}
        />
    </div>
);
