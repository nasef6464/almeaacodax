import { useState } from 'react';
import type { SaveVerificationState, SchoolWorkspaceStep, SchoolWorkspaceTab } from './contracts';

export function useSchoolManagementUiState() {
    const [activeTab, setActiveTab] = useState<SchoolWorkspaceTab>('dashboard');
    const [managementError, setManagementError] = useState<string | null>(null);
    const [managementNotice, setManagementNotice] = useState<string | null>(null);
    const [schoolActionPending, setSchoolActionPending] = useState<string | null>(null);
    const [packageActionPending, setPackageActionPending] = useState<string | null>(null);
    const [accessCodeActionPending, setAccessCodeActionPending] = useState<string | null>(null);
    const [rosterActionPending, setRosterActionPending] = useState<string | null>(null);
    const [saveVerificationState, setSaveVerificationState] = useState<SaveVerificationState>('idle');
    const [saveVerificationMessage, setSaveVerificationMessage] = useState<string | null>(null);
    const [isDeleteSchoolConfirmOpen, setIsDeleteSchoolConfirmOpen] = useState(false);
    const [expandedSchoolStep, setExpandedSchoolStep] = useState<SchoolWorkspaceStep>(null);

    const clearManagementFeedback = () => {
        setManagementError(null);
        setManagementNotice(null);
    };

    return {
        activeTab,
        setActiveTab,
        managementError,
        setManagementError,
        managementNotice,
        setManagementNotice,
        schoolActionPending,
        setSchoolActionPending,
        packageActionPending,
        setPackageActionPending,
        accessCodeActionPending,
        setAccessCodeActionPending,
        rosterActionPending,
        setRosterActionPending,
        saveVerificationState,
        setSaveVerificationState,
        saveVerificationMessage,
        setSaveVerificationMessage,
        isDeleteSchoolConfirmOpen,
        setIsDeleteSchoolConfirmOpen,
        expandedSchoolStep,
        setExpandedSchoolStep,
        clearManagementFeedback,
    };
}
