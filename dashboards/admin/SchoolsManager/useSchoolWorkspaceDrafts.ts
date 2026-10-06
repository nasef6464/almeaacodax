import { useState } from 'react';
import type {
    ImportResponse,
    ImportRow,
    ImportSummary,
    QuickSupervisorDraft,
    RelationCredential,
    RelationImportRow,
    RelationImportSummary,
    SingleStudentDraft,
} from './contracts';

const emptySingleStudent: SingleStudentDraft = { name: '', email: '', className: '', password: '' };
const emptyQuickSupervisor: QuickSupervisorDraft = { name: '', email: '', password: '', targetGroupId: '' };

export function useSchoolWorkspaceDrafts() {
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [importCredentials, setImportCredentials] = useState<ImportResponse['credentials']>([]);
    const [relationError, setRelationError] = useState<string | null>(null);
    const [isApplyingRelations, setIsApplyingRelations] = useState(false);
    const [createMissingRelationUsers, setCreateMissingRelationUsers] = useState(true);
    const [relationRows, setRelationRows] = useState<RelationImportRow[]>([]);
    const [relationSummary, setRelationSummary] = useState<RelationImportSummary | null>(null);
    const [relationCredentials, setRelationCredentials] = useState<RelationCredential[]>([]);
    const [bulkClassNames, setBulkClassNames] = useState('');
    const [isSingleStudentOpen, setIsSingleStudentOpen] = useState(false);
    const [singleStudent, setSingleStudent] = useState<SingleStudentDraft>(emptySingleStudent);
    const [quickSupervisor, setQuickSupervisor] = useState<QuickSupervisorDraft>(emptyQuickSupervisor);

    const resetWorkspaceDrafts = () => {
        setImportError(null);
        setImportRows([]);
        setImportSummary(null);
        setImportCredentials([]);
        setRelationError(null);
        setRelationRows([]);
        setRelationSummary(null);
        setRelationCredentials([]);
        setIsSingleStudentOpen(false);
        setSingleStudent(emptySingleStudent);
        setQuickSupervisor(emptyQuickSupervisor);
    };

    return {
        isImporting,
        setIsImporting,
        importError,
        setImportError,
        importRows,
        setImportRows,
        importSummary,
        setImportSummary,
        importCredentials,
        setImportCredentials,
        relationError,
        setRelationError,
        isApplyingRelations,
        setIsApplyingRelations,
        createMissingRelationUsers,
        setCreateMissingRelationUsers,
        relationRows,
        setRelationRows,
        relationSummary,
        setRelationSummary,
        relationCredentials,
        setRelationCredentials,
        bulkClassNames,
        setBulkClassNames,
        isSingleStudentOpen,
        setIsSingleStudentOpen,
        singleStudent,
        setSingleStudent,
        quickSupervisor,
        setQuickSupervisor,
        resetWorkspaceDrafts,
    };
}
