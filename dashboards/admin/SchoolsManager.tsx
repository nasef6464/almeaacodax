import React, { useEffect, useMemo, useRef } from 'react';
import {
    BookOpen,
    Building2,
    CheckCircle,
    ChevronDown,
    Clock3,
    Clipboard,
    Download,
    Edit2,
    FileSpreadsheet,
    Key,
    MoreVertical,
    Plus,
    Printer,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AnnouncementAd, B2BPackage, Group, Lesson, LibraryItem, PackageContentType, Role, StudyPlan, Topic, User } from '../../types';
import { api } from '../../services/api';
import { parseImportFile, parseRelationFile } from './SchoolsManager/importFileReaders';
import { getDuplicateImportEmails, getDuplicateImportEmailsError } from './SchoolsManager/importRowParsing';
import { EditNameModal } from './SchoolsManager/EditNameModal';
import { SchoolImportPanel } from './SchoolsManager/SchoolImportPanel';
import { SchoolPackagesPanel } from './SchoolsManager/SchoolPackagesPanel';
import { SchoolRelationsPanel } from './SchoolsManager/SchoolRelationsPanel';
import { SchoolReportsPanel } from './SchoolsManager/SchoolReportsPanel';
import { SchoolStudentRosterPanel } from './SchoolsManager/SchoolStudentRosterPanel';
import { SchoolCoursesPanel } from './SchoolsManager/SchoolCoursesPanel';
import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';
import { SchoolSingleStudentPanel } from './SchoolsManager/SchoolSingleStudentPanel';
import { SchoolWideSupervisorsPanel } from './SchoolsManager/SchoolWideSupervisorsPanel';
import { SchoolOverviewOperationsPanel } from './SchoolsManager/SchoolOverviewOperationsPanel';
import { SchoolCommandCenterPanel } from './SchoolsManager/SchoolCommandCenterPanel';
import { SchoolDashboardPanel } from './SchoolsManager/SchoolDashboardPanel';

import { SchoolPortfolioFilterPanel } from './SchoolsManager/SchoolPortfolioFilterPanel';
import { PACKAGE_CONTENT_OPTIONS } from './SchoolsManager/contracts';
import type {
    AccessCodesListResponse,
    AdminUserPayload,
    ContentBootstrapPayload,
    ImportResponse,
    RelationCredential,
    RelationImportSummary,
    RelationResponse,
} from './SchoolsManager/contracts';
import {
    buildStoreUser,
    generateTemporaryPassword,
    loadSchoolAdminUsers,
    mergeAdminUsersById,
    mergeGroupsById,
    mergeUsersById,
    normalizeStoreGroups,
} from './SchoolsManager/dataAdapters';
import {
    createWorkbookDownload,
    openPrintWindow,
} from './SchoolsManager/exportHelpers';
import {
    buildSchoolPortfolioRows,
    filterSchoolPortfolioRows,
    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,
    summarizeSchoolPortfolio,
} from './SchoolsManager/readinessViewModel';
import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';
import { SchoolWorkspaceControlsPanel } from './SchoolsManager/SchoolWorkspaceControlsPanel';
import { SchoolLaunchBoardPanel } from './SchoolsManager/SchoolLaunchBoardPanel';
import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';
import { buildSchoolWorkspaceViewModel } from './SchoolsManager/workspaceViewModel';
import { buildSchoolRosterViewModel } from './SchoolsManager/rosterViewModel';
import {
    buildSchoolAccessCode,
    buildSchoolAccessCodeListQuery,
    getSchoolAccessCodeCreationError,
    normalizeAccessCodesPagination,
    normalizePagedAccessCodes,
    resolveSelectedAccessCodePackageId,
} from './SchoolsManager/accessCodeService';
import { buildSchoolClassReportSheets } from './SchoolsManager/classReportService';
import { buildBulkClassGroups, filterNewClassNames, parseBulkClassNames } from './SchoolsManager/classService';
import { copyTextToClipboard } from './SchoolsManager/clipboardService';
import { buildQuickSupervisorPayload, buildSingleStudentImportRow } from './SchoolsManager/draftPayloadService';
import { getErrorMessage } from './SchoolsManager/errorMessageService';
import { buildNewClassGroup, buildNewSchoolGroup } from './SchoolsManager/groupFactory';
import {
    buildSchoolGapReportSheets,
    buildSchoolHandoverReportSheets,
    buildSchoolPackagesReportSheets,
    buildSchoolPerformanceReportSheets,
    buildSchoolPortfolioReadinessSheets,
    buildSchoolRelationsReportSheets,
    downloadSchoolImportTemplate,
    downloadSchoolRelationCredentials,
    downloadSchoolRelationsTemplate,
    downloadSchoolRoster,
    downloadStudentImportCredentials,
} from './SchoolsManager/importExportService';
import { buildClassPrintReportHtml, buildSchoolPrintReportHtml } from './SchoolsManager/printReportService';
import {
    addCourseIdToSelectedSchool,
    buildSelectedSchoolData,
    removeCourseIdFromSelectedSchool,
} from './SchoolsManager/selectedSchoolDataService';
import { useEditNameModalState } from './SchoolsManager/useEditNameModalState';
import { useAutoDismissMessage } from './SchoolsManager/useAutoDismissMessage';
import { useSchoolAccessCodeState } from './SchoolsManager/useSchoolAccessCodeState';
import { useSchoolListState } from './SchoolsManager/useSchoolListState';
import { useSchoolManagementUiState } from './SchoolsManager/useSchoolManagementUiState';
import { useSchoolReportState } from './SchoolsManager/useSchoolReportState';
import { useSchoolRosterFilters } from './SchoolsManager/useSchoolRosterFilters';
import { useSchoolSelectionState } from './SchoolsManager/useSchoolSelectionState';
import { useSchoolWorkspaceDrafts } from './SchoolsManager/useSchoolWorkspaceDrafts';

export { PACKAGE_CONTENT_OPTIONS } from './SchoolsManager/contracts';
export type {
    ImportResponse,
    ImportRow,
    ImportSummary,
    RelationCredential,
    RelationImportRow,
    RelationImportSummary,
} from './SchoolsManager/contracts';

export const SchoolsManager: React.FC = () => {
    const {
        user,
        users,
        groups,
        b2bPackages,
        accessCodes,
        courses,
        subjects,
        sections,
        paths,
        createGroupAsync,
        updateGroupAsync,
        deleteGroupAsync,
        addUser,
        updateUser,
        assignSupervisorToGroupAsync,
        removeSupervisorFromGroupAsync,
        assignCourseToGroup,
        removeCourseFromGroup,
        assignStudentToGroupAsync,
        removeStudentFromGroupAsync,
        createB2BPackageAsync,
        updateB2BPackageAsync,
        deleteB2BPackageAsync,
        createAccessCodeAsync,
        deleteAccessCodeAsync,
        hydrateUsers,
        hydrateContentBootstrap,
    } = useStore();

    const {
        selectedSchool,
        setSelectedSchool,
        activeSchoolActionsId,
        toggleSchoolActions,
        closeSchoolActions,
    } = useSchoolSelectionState();
    const {
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
    } = useSchoolManagementUiState();
    const {
        schoolSearch,
        setSchoolSearch,
        schoolListMode,
        setSchoolListMode,
        newSchoolName,
        setNewSchoolName,
    } = useSchoolListState();
    const {
        selectedPackageIdForCode,
        setSelectedPackageIdForCode,
        copiedCodeId,
        setCopiedCodeId,
        newCodeMaxUses,
        setNewCodeMaxUses,
        newCodeDurationDays,
        setNewCodeDurationDays,
        pagedAccessCodes,
        setPagedAccessCodes,
        pagedAccessCodesPagination,
        setPagedAccessCodesPagination,
        isLoadingPagedAccessCodes,
        setIsLoadingPagedAccessCodes,
        pagedAccessCodesError,
        setPagedAccessCodesError,
        resetPagedAccessCodes,
    } = useSchoolAccessCodeState();
    const {
        schoolReport,
        isLoadingReport,
        reportError,
        clearSchoolReport,
        loadSchoolReport,
    } = useSchoolReportState();
    const {
        studentSearch,
        setStudentSearch,
        selectedClassFilter,
        setSelectedClassFilter,
        schoolStudentPage,
        setSchoolStudentPage,
        schoolStudentPageSize,
        resetSchoolRosterFilters,
    } = useSchoolRosterFilters();

    const {
        editNameModalState,
        setEditNameModalState,
        closeEditNameModal,
    } = useEditNameModalState();
    const {
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
    } = useSchoolWorkspaceDrafts();

    useAutoDismissMessage(managementNotice, setManagementNotice);
    useAutoDismissMessage(managementError, setManagementError);
    const hasLoadedSchoolRosterUsersRef = useRef(false);

    const resetSchoolWorkspaceState = () => {
        resetWorkspaceDrafts();
        clearManagementFeedback();
        setSaveVerificationState(null);
        resetSchoolRosterFilters();
    };

    useEffect(() => {
        resetSchoolWorkspaceState();
    }, [selectedSchool?.id]);

    const schools = useMemo(() => groups.filter((group) => group.type === 'SCHOOL'), [groups]);
    const classes = useMemo(() => groups.filter((group) => group.type === 'CLASS'), [groups]);
    const students = useMemo(() => users.filter((currentUser) => currentUser.role === Role.STUDENT), [users]);
    const supervisors = useMemo(
        () => users.filter((currentUser) => currentUser.role === Role.SUPERVISOR || currentUser.role === Role.TEACHER),
        [users],
    );
    const teachers = useMemo(() => users.filter((currentUser) => currentUser.role === Role.TEACHER), [users]);
    const parents = useMemo(() => users.filter((currentUser) => currentUser.role === Role.PARENT), [users]);
    const publishedCourses = useMemo(() => courses.filter((course) => course.isPublished !== false), [courses]);
    const importPreviewStats = useMemo(() => {
        const duplicateEmails = getDuplicateImportEmails(importRows);
        const existingEmailSet = new Set(users.map((currentUser) => (currentUser.email || '').toLowerCase()).filter(Boolean));
        const existingEmails = importRows
            .map((row) => row.email.trim().toLowerCase())
            .filter((email) => email && existingEmailSet.has(email));
        const classNames = Array.from(new Set(importRows.map((row) => row.className?.trim()).filter(Boolean) as string[]));
        const rowsWithoutPassword = importRows.filter((row) => !row.password?.trim()).length;

        return {
            duplicateEmails,
            existingEmails,
            classNames,
            rowsWithoutPassword,
        };
    }, [importRows, users]);

    const getOperationalSnapshotForSchool = (school: Group) => calculateSchoolOperationalSnapshot(school, {
        classes,
        students,
        b2bPackages,
        accessCodes,
    });

    const schoolPortfolioRows = buildSchoolPortfolioRows(schools, {
        classes, students, b2bPackages, accessCodes, now: Date.now(),
    });
    const { filteredRows: filteredSchoolRows, filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } =
        filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode);
    const schoolPortfolioSummary = summarizeSchoolPortfolio(schoolPortfolioRows);

    const exportSchoolPortfolioReadiness = () => {
        createWorkbookDownload('schools-portfolio-readiness.xlsx', buildSchoolPortfolioReadinessSheets({
            schoolPortfolioRows,
            schoolPortfolioSummary,
        }));
        setManagementNotice('تم تجهيز ملف جاهزية محفظة المدارس للتنزيل.');
        setManagementError(null);
    };

    const refreshUsers = async () => {
        if (user.role !== Role.ADMIN) {
            return;
        }

        try {
            const loadedUsers = await loadSchoolAdminUsers();
            hydrateUsers(mergeUsersById(users, loadedUsers));
        } catch (error) {
            console.warn('Failed to refresh users after school updates:', error);
        }
    };

    const refreshSchoolListData = async () => {
        if (user.role !== Role.ADMIN) {
            return;
        }

        try {
            api.clearContentBootstrapCache();
            const [bootstrap, loadedUsers] = await Promise.all([
                api.getContentBootstrapFresh(),
                loadSchoolAdminUsers(),
            ]);
            hydrateContentBootstrap(bootstrap as ContentBootstrapPayload);
            hydrateUsers(mergeUsersById(users, loadedUsers));
        } catch (error) {
            console.warn('Failed to refresh school list data:', error);
        }
    };

    useEffect(() => {
        if (user.role !== Role.ADMIN || hasLoadedSchoolRosterUsersRef.current) {
            return;
        }

        hasLoadedSchoolRosterUsersRef.current = true;
        void refreshSchoolListData();
    }, [user.role]);

    const refreshSchoolWorkspace = async (schoolId: string, mode: 'silent' | 'manual' = 'silent') => {
        if (mode === 'manual') {
            setSaveVerificationState('verifying');
            setSaveVerificationMessage('جاري التحقق من البيانات المحفوظة...');
        }

        api.clearContentBootstrapCache();
        const [bootstrap, adminUsersResponse] = await Promise.all([
            api.getContentBootstrapFresh(),
            user.role === Role.ADMIN ? loadSchoolAdminUsers() : Promise.resolve(null),
        ]);

        const contentBootstrap = bootstrap as ContentBootstrapPayload;
        hydrateContentBootstrap(contentBootstrap);
        if (adminUsersResponse && Array.isArray(adminUsersResponse)) {
            hydrateUsers(mergeUsersById(users, adminUsersResponse));
        }

        const freshGroups = normalizeStoreGroups(contentBootstrap.groups);
        const freshSchool = freshGroups.find((group) => group.id === schoolId && group.type === 'SCHOOL');
        if (!freshSchool) {
            throw new Error('فشل التحقق: لم ترجع المدرسة من الخادم بعد الحفظ.');
        }

        setSelectedSchool(freshSchool);
        if (activeTab === 'reports') {
            await loadSchoolReport(freshSchool.id);
        }

        if (mode === 'manual') {
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من البيانات من الخادم.');
        }

        return freshSchool;
    };

    const handleSaveAndVerifySchool = async () => {
        if (!selectedSchool) return;
        if (saveVerificationState === 'saving' || saveVerificationState === 'verifying') return;

        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState('verifying');
        setSaveVerificationMessage('جاري التحقق من المدرسة والفصول والطلاب والمشرفين...');
        try {
            await refreshSchoolWorkspace(selectedSchool.id, 'manual');
        } catch (error) {
            const message = getErrorMessage(error, 'فشل الحفظ أو التحقق من البيانات.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        }
    };

    useEffect(() => {
        if (!selectedSchool?.id || user.role !== Role.ADMIN) {
            return;
        }

        void refreshSchoolWorkspace(selectedSchool.id).catch((error) => {
            setManagementError(getErrorMessage(error, 'تعذر تحديث بيانات المدرسة من الخادم.'));
        });
    }, [selectedSchool?.id, user.role]);

    const mergeSchoolUsers = (incomingUsers: AdminUserPayload[] | undefined) => {
        if (!incomingUsers?.length) {
            return;
        }

        hydrateUsers(mergeAdminUsersById(users, incomingUsers));
    };

    const mergeSchoolGroups = (incomingGroups: Group[] | undefined) => {
        const normalizedGroups = normalizeStoreGroups(incomingGroups);
        if (!normalizedGroups.length) {
            return;
        }

        hydrateContentBootstrap({ groups: mergeGroupsById(groups, normalizedGroups) });

        if (selectedSchool) {
            const updatedSelectedSchool = normalizedGroups.find((group) => group.id === selectedSchool.id);
            if (updatedSelectedSchool) {
                setSelectedSchool(updatedSelectedSchool);
            }
        }
    };

    useEffect(() => {
        if (!selectedSchool) {
            clearSchoolReport();
            return;
        }

        if (activeTab === 'reports') {
            void loadSchoolReport(selectedSchool.id);
        }
    }, [activeTab, clearSchoolReport, loadSchoolReport, selectedSchool]);

    useEffect(() => {
        if (!selectedSchool) {
            setSelectedPackageIdForCode('');
            return;
        }

        setSelectedPackageIdForCode((current) => (
            resolveSelectedAccessCodePackageId({
                schoolId: selectedSchool.id,
                packages: b2bPackages,
                currentPackageId: current,
            })
        ));
    }, [selectedSchool, b2bPackages]);

    useEffect(() => {
        setSchoolStudentPage(1);
    }, [selectedSchool?.id, studentSearch, selectedClassFilter]);

    useEffect(() => {
        let cancelled = false;
        if (!selectedSchool || activeTab !== 'packages') {
            resetPagedAccessCodes();
            return () => {
                cancelled = true;
            };
        }

        setIsLoadingPagedAccessCodes(true);
        setPagedAccessCodesError(null);
        void (async () => {
            try {
                const response = await api.getAccessCodes(
                    buildSchoolAccessCodeListQuery(selectedSchool.id),
                ) as AccessCodesListResponse;

                if (cancelled) return;
                setPagedAccessCodes(normalizePagedAccessCodes(response));
                setPagedAccessCodesPagination(normalizeAccessCodesPagination(response));
            } catch (error) {
                if (cancelled) return;
                setPagedAccessCodes([]);
                setPagedAccessCodesPagination(null);
                setPagedAccessCodesError(getErrorMessage(error, 'تعذّر تحميل أكواد التفعيل المرقّمة.'));
            } finally {
                if (!cancelled) {
                    setIsLoadingPagedAccessCodes(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedSchool?.id, activeTab, accessCodes.length]);

    const handleCreateSchool = async () => {
        const name = newSchoolName.trim();
        if (!name) {
            setManagementError('اكتب اسم المدرسة أو الجهة التعليمية قبل الإضافة.');
            return;
        }

        const newSchool = buildNewSchoolGroup({
            name,
            ownerId: user.id,
        });

        setSchoolActionPending('create-school');
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حفظ المدرسة...');
        setManagementError(null);
        setManagementNotice(null);
        try {
            const persistedSchool = await createGroupAsync(newSchool);
            const verifiedSchool = await refreshSchoolWorkspace(persistedSchool.id);
            setNewSchoolName('');
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من بيانات المدرسة.');
            setManagementNotice('تم إنشاء المدرسة والتأكد من حفظها. ابدأ بإضافة الفصول ثم الطلاب والمشرفين والباقات.');
            setSelectedSchool(verifiedSchool);
            setActiveTab('overview');
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إنشاء المدرسة الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setSchoolActionPending(null);
        }
    };

    const handleCreateBulkClasses = async () => {
        if (!selectedSchool) return;

        const classNames = parseBulkClassNames(bulkClassNames);

        if (classNames.length === 0) {
            setManagementError('اكتب اسم فصل واحد على الأقل، ويمكنك فصل الأسماء بسطر جديد أو فاصلة.');
            return;
        }

        const namesToCreate = filterNewClassNames(classNames, classes, selectedSchool.id);

        if (namesToCreate.length === 0) {
            setManagementError('كل الفصول المكتوبة موجودة بالفعل داخل هذه المدرسة.');
            return;
        }

        setSchoolActionPending('create-classes');
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حفظ الفصول...');
        setManagementError(null);
        setManagementNotice(null);
        try {
            await Promise.all(buildBulkClassGroups({
                classNames: namesToCreate,
                schoolId: selectedSchool.id,
                ownerId: user.id,
            }).map((classGroup) => createGroupAsync(classGroup)));

            await refreshSchoolWorkspace(selectedSchool.id);
            setBulkClassNames('');
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من الفصول من الخادم.');
            setManagementNotice(`تم إنشاء ${namesToCreate.length} فصل/فصول والتأكد من حفظها.`);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إنشاء الفصول الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setSchoolActionPending(null);
        }
    };

    const downloadTemplate = () => {
        downloadSchoolImportTemplate();
    };

    const downloadRelationsTemplate = () => {
        downloadSchoolRelationsTemplate();
    };

    const downloadCredentials = () => {
        downloadStudentImportCredentials(importCredentials);
    };

    const handleImportFile = async (file: File) => {
        setImportError(null);
        setImportSummary(null);
        setImportCredentials([]);
        try {
            const rows = await parseImportFile(file);
            if (!rows.length) {
                setImportRows([]);
                setImportError('لم أجد صفوفًا صالحة داخل الملف. تأكد من وجود البيانات تحت العناوين.');
                return;
            }

            setImportRows(rows);
        } catch (error) {
            setImportRows([]);
            setImportError(getErrorMessage(error, 'تعذر قراءة الملف. استخدم CSV أو TSV.'));
        }
    };

    const handleRelationFile = async (file: File) => {
        setRelationError(null);
        setRelationSummary(null);
        setRelationCredentials([]);
        try {
            const rows = await parseRelationFile(file);
            if (!rows.length) {
                setRelationRows([]);
                setRelationError('لم أجد صفوف ربط صالحة داخل الملف. تأكد من وجود عمود بريد الطالب.');
                return;
            }

            setRelationRows(rows);
        } catch (error) {
            setRelationRows([]);
            setRelationError(getErrorMessage(error, 'تعذر قراءة ملف الربط. استخدم Excel أو CSV أو TSV.'));
        }
    };

    const downloadRelationCredentials = () => {
        downloadSchoolRelationCredentials(relationCredentials);
    };

    const handleStartImport = async () => {
        if (!selectedSchool || !importRows.length) {
            return;
        }

        const duplicateEmailError = getDuplicateImportEmailsError(importRows);
        if (duplicateEmailError) {
            setImportError(duplicateEmailError);
            return;
        }

        setIsImporting(true);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري استيراد الطلاب...');
        setImportError(null);
        try {
            const response = await api.importSchoolStudents(selectedSchool.id, { rows: importRows }) as ImportResponse;
            setImportSummary(response.summary);
            setImportCredentials(response.credentials);
            if (response.users?.length) {
                mergeSchoolUsers(response.users);
            } else {
                await refreshUsers();
            }
            mergeSchoolGroups(response.groups);
            await refreshSchoolWorkspace(selectedSchool.id);
            await loadSchoolReport(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من ظهور الطلاب من الخادم.');
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر استيراد الطلاب الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setImportError(message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddSingleStudent = async () => {
        if (!selectedSchool) return;

        const studentPayload = buildSingleStudentImportRow(singleStudent);
        if (!studentPayload.ok) {
            setImportError((studentPayload as { ok: false; error: string }).error);
            return;
        }

        setIsImporting(true);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حفظ الطالب...');
        setImportError(null);
        try {
            const response = await api.importSchoolStudents(selectedSchool.id, {
                rows: [studentPayload.row],
            }) as ImportResponse;
            setImportSummary(response.summary);
            setImportCredentials(response.credentials);
            setSingleStudent({ name: '', email: '', className: '', password: '' });
            if (response.users?.length) {
                mergeSchoolUsers(response.users);
            } else {
                await refreshUsers();
            }
            mergeSchoolGroups(response.groups);
            await refreshSchoolWorkspace(selectedSchool.id);
            await loadSchoolReport(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من ظهور الطالب من الخادم.');
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إضافة الطالب الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setImportError(message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleCopyCode = async (code: string, codeId: string) => {
        try {
            await copyTextToClipboard(code);
            setCopiedCodeId(codeId);
            window.setTimeout(() => setCopiedCodeId((current) => (current === codeId ? null : current)), 1800);
        } catch (error) {
            console.warn('Failed to copy access code:', error);
        }
    };

    if (selectedSchool) {
        const {
            schoolPackages,
            schoolCodes,
            schoolClasses,
            schoolScopeGroups,
            schoolStudents,
            schoolCourses,
            activeSchoolPackages,
            activeSchoolCodes,
            tableSchoolCodes,
            selectedPackageForCode,
            totalSeats,
            usedSeats,
        } = buildSelectedSchoolData({
            selectedSchool,
            b2bPackages,
            accessCodes,
            classes,
            students,
            publishedCourses,
            pagedAccessCodes,
            selectedPackageIdForCode,
        });
        const {
            schoolSupervisors,
            schoolLevelSupervisors,
            classScopedSupervisors,
            supervisorScopeRows,
            schoolParentUsers,
            studentsWithoutParent,
            studentsWithoutClass,
            supervisorsWithoutClass,
            classOperatingRows,
        } = buildSchoolRelationshipViewModel({
            school: selectedSchool,
            schoolClasses,
            schoolStudents,
            supervisors,
            parents,
        });
        const {
            visibleSchoolStudents,
            schoolStudentTotalPages,
            safeSchoolStudentPage,
            schoolStudentStartIndex,
            schoolStudentEndIndex,
            pagedVisibleSchoolStudents,
        } = buildSchoolRosterViewModel({
            schoolStudents,
            schoolClasses,
            search: studentSearch,
            classFilter: selectedClassFilter,
            page: schoolStudentPage,
            pageSize: schoolStudentPageSize,
        });
        const focusClassStudentForm = (classroomName: string) => {
            setSingleStudent((current) => ({ ...current, className: classroomName }));
            setIsSingleStudentOpen(true);
            setManagementNotice(`تم اختيار فصل ${classroomName}. اكتب بيانات الطالب ثم اضغط إضافة الطالب.`);
            window.setTimeout(() => {
                document.querySelector('[data-testid="school-students-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        };
        const focusClassRoster = (classroomId: string) => {
            setSelectedClassFilter(classroomId);
            window.setTimeout(() => {
                document.querySelector('[data-testid="school-roster-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        };
        const handleDeleteSelectedSchool = () => {
            setManagementError(null);
            setManagementNotice(null);
            setIsDeleteSchoolConfirmOpen(true);
        };
        const confirmDeleteSelectedSchool = async () => {
            const deletedSchoolName = selectedSchool.name;

            setSchoolActionPending('delete-school');
            setManagementError(null);
            setManagementNotice(null);
            try {
                await deleteGroupAsync(selectedSchool.id);
                api.clearContentBootstrapCache();
                const bootstrap = await api.getContentBootstrapFresh();
                hydrateContentBootstrap(bootstrap as ContentBootstrapPayload);
                setManagementNotice(`تم حذف ${deletedSchoolName} من قائمة المدارس.`);
                setIsDeleteSchoolConfirmOpen(false);
                setSelectedSchool(null);
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر حذف المدرسة الآن.'));
            } finally {
                setSchoolActionPending(null);
            }
        };
        const handleCreateSingleClass = async (notice = 'تم إنشاء فصل جديد. يمكنك تغيير اسمه وربط الطلاب والمشرفين من بطاقة الفصل.') => {
            const now = Date.now();
            setSchoolActionPending('create-class');
            setSaveVerificationState('saving');
            setSaveVerificationMessage('جاري حفظ الفصل...');
            setManagementError(null);
            setManagementNotice(null);
            try {
                await createGroupAsync(buildNewClassGroup({
                    name: `فصل جديد - ${selectedSchool.name}`,
                    parentId: selectedSchool.id,
                    ownerId: user.id,
                    now,
                }));
                await refreshSchoolWorkspace(selectedSchool.id);
                setSaveVerificationState('success');
                setSaveVerificationMessage('تم الحفظ والتأكد من الفصل من الخادم.');
                setManagementNotice(notice);
            } catch (error) {
                const message = getErrorMessage(error, 'تعذر إنشاء الفصل الآن.');
                setSaveVerificationState('error');
                setSaveVerificationMessage(message);
                setManagementError(message);
            } finally {
                setSchoolActionPending(null);
            }
        };
        const handleAssignSchoolSupervisor = async (supervisorId: string, groupId: string) => {
            const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
            const targetSupervisor = supervisors.find((currentUser) => currentUser.id === supervisorId);
            setRosterActionPending(`supervisor-assign-${groupId}-${supervisorId}`);
            setManagementError(null);
            setManagementNotice(null);
            setSaveVerificationState('saving');
            setSaveVerificationMessage('جاري ربط المشرف وحفظ النطاق...');
            try {
                await assignSupervisorToGroupAsync(supervisorId, groupId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setSaveVerificationState('success');
                setSaveVerificationMessage('تم ربط المشرف والتأكد من حفظ النطاق.');
                setManagementNotice(`تم حفظ ربط ${targetSupervisor?.name || 'المشرف'} على ${targetGroup?.name || 'النطاق المحدد'}.`);
            } catch (error) {
                const message = getErrorMessage(error, 'تعذر ربط المشرف الآن.');
                setSaveVerificationState('error');
                setSaveVerificationMessage(message);
                setManagementError(message);
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleRemoveSchoolSupervisor = async (supervisorId: string, groupId: string) => {
            const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
            const targetSupervisor = supervisors.find((currentUser) => currentUser.id === supervisorId);
            setRosterActionPending(`supervisor-remove-${groupId}-${supervisorId}`);
            setManagementError(null);
            setManagementNotice(null);
            setSaveVerificationState('saving');
            setSaveVerificationMessage('جاري إزالة ربط المشرف وحفظ النطاق...');
            try {
                await removeSupervisorFromGroupAsync(supervisorId, groupId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setSaveVerificationState('success');
                setSaveVerificationMessage('تم إزالة ربط المشرف والتأكد من حفظ النطاق.');
                setManagementNotice(`تم حفظ إزالة ${targetSupervisor?.name || 'المشرف'} من ${targetGroup?.name || 'النطاق المحدد'}.`);
            } catch (error) {
                const message = getErrorMessage(error, 'تعذر إزالة المشرف الآن.');
                setSaveVerificationState('error');
                setSaveVerificationMessage(message);
                setManagementError(message);
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleRemoveSchoolWideSupervisor = (currentUser: User) => {
            if (!window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف ${selectedSchool.name}؟`)) {
                return;
            }
            void handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id);
        };

        const focusQuickSupervisorEntry = (targetGroupId: string, targetGroupName: string) => {
            setQuickSupervisor((current) => ({ ...current, targetGroupId }));
            setManagementNotice(`تم اختيار ${targetGroupName}. اكتب بيانات المشرف ثم اضغط إنشاء/ربط المشرف.`);
            setManagementError(null);
            setActiveTab('relations');
            window.setTimeout(() => {
                document.querySelector('[data-testid="school-relations-quick-supervisor-card"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const nameInput = document.querySelector<HTMLInputElement>('[data-testid="school-relations-supervisor-name"]');
                nameInput?.focus();
            }, 120);
        };
        const handleAssignStudentToClass = async (studentId: string, classId: string) => {
            const targetStudent = schoolStudents.find((student) => student.id === studentId);
            const targetClass = schoolClasses.find((classroom) => classroom.id === classId);
            setRosterActionPending(`student-assign-${classId}-${studentId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await assignStudentToGroupAsync(studentId, classId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice(`تم حفظ نقل ${targetStudent?.name || 'الطالب'} إلى ${targetClass?.name || 'الفصل المحدد'}.`);
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر نقل الطالب الآن.'));
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleRemoveStudentScope = async (studentId: string, groupId: string) => {
            const targetStudent = schoolStudents.find((student) => student.id === studentId);
            const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
            setRosterActionPending(`student-remove-${groupId}-${studentId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await removeStudentFromGroupAsync(studentId, groupId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice(`تم حفظ إخراج ${targetStudent?.name || 'الطالب'} من ${targetGroup?.name || 'النطاق المحدد'}.`);
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر إخراج الطالب الآن.'));
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleCreateQuickSupervisor = async (fallbackGroupId?: string) => {
            const supervisorPayload = buildQuickSupervisorPayload(
                quickSupervisor,
                selectedSchool,
                schoolClasses,
                fallbackGroupId,
            );
            if (!supervisorPayload.ok) {
                setManagementError((supervisorPayload as { ok: false; error: string }).error);
                setManagementNotice(null);
                return;
            }

            const existingSupervisor = supervisors.find((currentUser) => (currentUser.email || '').trim().toLowerCase() === supervisorPayload.email);
            const password = supervisorPayload.passwordDraft || generateTemporaryPassword();

            setRosterActionPending(`supervisor-quick-${supervisorPayload.targetGroupId}`);
            try {
                let supervisor = existingSupervisor;

                if (!supervisor) {
                    const response = await api.createAdminUser({
                        name: supervisorPayload.name,
                        email: supervisorPayload.email,
                        password,
                        role: Role.SUPERVISOR,
                        schoolId: selectedSchool.id,
                        groupIds: [supervisorPayload.targetGroupId],
                    }) as { user?: AdminUserPayload };

                    if (!response.user) {
                        throw new Error('لم يرجع الخادم حساب المشرف الجديد.');
                    }

                    supervisor = buildStoreUser(response.user);
                    addUser(supervisor);
                }

                await assignSupervisorToGroupAsync(supervisor.id, supervisorPayload.targetGroupId);

                await refreshSchoolWorkspace(selectedSchool.id);

                setQuickSupervisor({ name: '', email: '', password: '', targetGroupId: '' });
                setManagementError(null);
                setManagementNotice(
                    existingSupervisor
                        ? `تم ربط ${supervisor.name} على نطاق ${supervisorPayload.targetGroup.name}.`
                        : `تم إنشاء وربط ${supervisor.name} على نطاق ${supervisorPayload.targetGroup.name}. كلمة المرور المؤقتة: ${password}`,
                );
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر إنشاء أو ربط المشرف الآن.'));
                setManagementNotice(null);
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleCreateSchoolPackage = async (pkg: B2BPackage) => {
            setPackageActionPending(`create-${pkg.id}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await createB2BPackageAsync(pkg);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم حفظ الباقة المدرسية وربطها بالمدرسة بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر حفظ الباقة المدرسية الآن.'));
            } finally {
                setPackageActionPending(null);
            }
        };
        const handleUpdateSchoolPackage = async (packageId: string, data: Partial<B2BPackage>) => {
            setPackageActionPending(`update-${packageId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await updateB2BPackageAsync(packageId, data);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم حفظ تعديل الباقة المدرسية بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر حفظ تعديل الباقة المدرسية الآن.'));
            } finally {
                setPackageActionPending(null);
            }
        };
        const handleDeleteSchoolPackage = async (packageId: string) => {
            setPackageActionPending(`delete-${packageId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await deleteB2BPackageAsync(packageId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم حذف الباقة المدرسية وأكوادها المرتبطة بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر حذف الباقة المدرسية الآن.'));
            } finally {
                setPackageActionPending(null);
            }
        };
        const handleExpireAllSchoolPackages = async () => {
            setPackageActionPending('expire-all');
            setManagementError(null);
            setManagementNotice(null);
            try {
                await Promise.all(schoolPackages.map((pkg) => updateB2BPackageAsync(pkg.id, { status: 'expired' })));
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم إيقاف كل باقات المدرسة بعد تأكيد الحفظ من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر إيقاف كل الباقات الآن.'));
            } finally {
                setPackageActionPending(null);
            }
        };
        const handleCreateSchoolAccessCode = async () => {
            setManagementError(null);
            setManagementNotice(null);

            const accessCodeCreationError = getSchoolAccessCodeCreationError({
                activeSchoolPackages,
                selectedPackageIdForCode,
                selectedPackageForCode,
            });
            if (accessCodeCreationError) {
                setManagementError(accessCodeCreationError);
                return;
            }

            const accessCode = buildSchoolAccessCode({
                schoolName: selectedSchool.name,
                schoolId: selectedSchool.id,
                packageId: selectedPackageIdForCode,
                maxUses: newCodeMaxUses,
                durationDays: newCodeDurationDays,
            });

            setAccessCodeActionPending(`create-${accessCode.id}`);
            try {
                await createAccessCodeAsync(accessCode);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم توليد كود التفعيل وحفظه بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر توليد كود التفعيل الآن.'));
            } finally {
                setAccessCodeActionPending(null);
            }
        };
        const handleDeleteSchoolAccessCode = async (codeId: string) => {
            if (!window.confirm('هل أنت متأكد من حذف كود التفعيل؟ لن يمكن التراجع عن هذا الإجراء.')) return;
            setAccessCodeActionPending(`delete-${codeId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await deleteAccessCodeAsync(codeId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم حذف كود التفعيل بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(getErrorMessage(error, 'تعذر حذف كود التفعيل الآن.'));
            } finally {
                setAccessCodeActionPending(null);
            }
        };
        const {
            readinessChecks,
            readinessScore,
            handoverBlockingGaps,
            visibleReadinessGaps,
            operationalWarnings,
            readinessStatusLabel,
            readinessNextStep,
            commercialOperatingSteps,
            nextOperatingStep,
            currentOperatingStepIndex,
            readinessPercent,
            handoverDecisionTitle,
            handoverDecisionCopy,
            isSaveVerificationBusy,
            isSchoolWorkspaceBusy,
            saveVerificationButtonLabel,
            commercialDecisionCards,
            overviewFocusActions,
            schoolLaunchPlan,
            supervisorHandoverChecklist,
            schoolHandoverMessage,
        } = buildSchoolWorkspaceViewModel({
            school: selectedSchool,
            schoolClasses,
            schoolStudents,
            schoolSupervisors,
            studentsWithoutClass,
            studentsWithoutParent,
            activeSchoolPackages,
            activeSchoolCodes,
            totalSeats,
            usedSeats,
            schoolReport,
            saveVerificationState,
            schoolActionPending,
            rosterActionPending,
            packageActionPending,
            accessCodeActionPending,
            isImporting,
            isApplyingRelations,
        });
        const copySchoolHandoverMessage = async () => {
            await copyTextToClipboard(schoolHandoverMessage, { useTextareaFallback: true });
            setManagementNotice('تم نسخ رسالة تسليم المدرسة للإدارة.');
            setManagementError(null);
        };
        const downloadSchoolGapReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-readiness-gaps.xlsx`, buildSchoolGapReportSheets({
                selectedSchool,
                readinessStatusLabel,
                readinessScore,
                readinessChecks,
                readinessNextStep,
                operationalWarnings,
                studentsWithoutClass,
                studentsWithoutParent,
                supervisorsWithoutClass,
                schoolClasses,
                schoolSupervisors,
                groups,
            }));
        };
        const downloadSchoolHandover = () => {
            createWorkbookDownload(`${selectedSchool.name}-handover.xlsx`, buildSchoolHandoverReportSheets({
                selectedSchool,
                readinessScore,
                readinessChecks,
                schoolStudents,
                schoolClasses,
                schoolSupervisors,
                activeSchoolPackages,
                activeSchoolCodes,
                schoolPackages,
                schoolCodes,
                totalSeats,
                usedSeats,
                schoolLaunchPlan,
                supervisorHandoverChecklist,
                schoolHandoverMessage,
                paths,
                subjects,
            }));
        };

        const downloadSchoolPerformanceReport = () => {
            if (!schoolReport) return;

            createWorkbookDownload(`${selectedSchool.name}-performance-report.xlsx`, buildSchoolPerformanceReportSheets({
                schoolReport,
                subjects,
                sections,
            }));
        };

        const handleAssignCourseToSchool = (courseId: string) => {
            assignCourseToGroup(courseId, selectedSchool.id);
            setSelectedSchool((current) =>
                current ? addCourseIdToSelectedSchool(current, courseId) : current,
            );
        };

        const handleRemoveCourseFromSchool = (courseId: string) => {
            removeCourseFromGroup(courseId, selectedSchool.id);
            setSelectedSchool((current) =>
                current ? removeCourseIdFromSelectedSchool(current, courseId) : current,
            );
        };

        const openClassRenameModal = (classroom: Group) => {
            setEditNameModalState({
                isOpen: true,
                title: 'أدخل اسم الفصل الجديد',
                initialValue: classroom.name,
                onSave: async (newName: string) => {
                    if (!newName.trim() || newName.trim() === classroom.name) return;
                    setSchoolActionPending(`rename-class-${classroom.id}`);
                    setSaveVerificationState('saving');
                    setSaveVerificationMessage('جاري حفظ اسم الفصل...');
                    setManagementError(null);
                    setManagementNotice(null);
                    try {
                        await updateGroupAsync(classroom.id, { name: newName.trim() });
                        await refreshSchoolWorkspace(selectedSchool.id);
                        setSaveVerificationState('success');
                        setSaveVerificationMessage('تم حفظ اسم الفصل والتأكد منه من الخادم.');
                        setManagementNotice('تم حفظ اسم الفصل بعد التحقق من الخادم.');
                    } catch (error) {
                        const message = getErrorMessage(error, 'تعذر تعديل اسم الفصل الآن.');
                        setSaveVerificationState('error');
                        setSaveVerificationMessage(message);
                        setManagementError(message);
                        throw error;
                    } finally {
                        setSchoolActionPending(null);
                    }
                },
            });
        };

        const handleDeleteClass = async (classroom: Group) => {
            if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;

            setSchoolActionPending(`delete-class-${classroom.id}`);
            setSaveVerificationState('saving');
            setSaveVerificationMessage('جاري حذف الفصل...');
            setManagementError(null);
            setManagementNotice(null);
            try {
                await deleteGroupAsync(classroom.id);
                await refreshSchoolWorkspace(selectedSchool.id);
                setSaveVerificationState('success');
                setSaveVerificationMessage('تم حذف الفصل والتأكد منه من الخادم.');
                setManagementNotice('تم حذف الفصل بعد التحقق من الخادم.');
            } catch (error) {
                const message = getErrorMessage(error, 'تعذر حذف الفصل الآن.');
                setSaveVerificationState('error');
                setSaveVerificationMessage(message);
                setManagementError(message);
            } finally {
                setSchoolActionPending(null);
            }
        };

        const handleRemoveClassSupervisor = (classroom: Group, currentUser: User) => {
            if (window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف فصل ${classroom.name}؟`)) {
                void handleRemoveSchoolSupervisor(currentUser.id, classroom.id);
            }
        };

        const downloadClassReport = (classroom: Group) => {
            createWorkbookDownload(`${selectedSchool.name}-${classroom.name}-class-report.xlsx`, buildSchoolClassReportSheets({
                selectedSchool,
                classroom,
                schoolStudents,
                supervisors,
                publishedCourses,
                schoolReport,
                parents,
            }));
        };

        const printSchoolReport = () => {
            const bodyHtml = buildSchoolPrintReportHtml({
                selectedSchool,
                readinessChecks,
                readinessScore,
                schoolStudents,
                schoolClasses,
                activeSchoolPackages,
                activeSchoolCodes,
                totalSeats,
                usedSeats,
                schoolSupervisors,
                supervisors,
                schoolPackages,
                schoolCodes,
                operationalWarnings,
            });

            if (!openPrintWindow(`${selectedSchool.name} - تقرير المدرسة`, bodyHtml)) {
                setManagementError('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
            }
        };

        const printClassReport = (classroom: Group) => {
            const bodyHtml = buildClassPrintReportHtml({
                selectedSchool,
                classroom,
                schoolStudents,
                supervisors,
                publishedCourses,
                schoolReport,
                parents,
            });

            if (!openPrintWindow(`${selectedSchool.name} - ${classroom.name}`, bodyHtml)) {
                setManagementError('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
            }
        };

        const downloadPackagesReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-packages-and-codes.xlsx`, buildSchoolPackagesReportSheets({
                schoolPackages,
                schoolCodes,
                activeSchoolPackages,
                activeSchoolCodes,
                teachers,
                paths,
                subjects,
                totalSeats,
                usedSeats,
            }));
        };

        const downloadRelationsReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-relations-report.xlsx`, buildSchoolRelationsReportSheets({
                selectedSchool,
                schoolStudents,
                schoolClasses,
                schoolParentUsers,
                schoolSupervisors,
                parents,
                studentsWithoutParent,
                studentsWithoutClass,
                supervisorsWithoutClass,
            }));
        };

        const handleApplyRelationImport = async () => {
            if (!relationRows.length) {
                setRelationError('ارفع ملف الربط أولا ثم راجع الصفوف قبل التنفيذ.');
                return;
            }

            const nextSummary: RelationImportSummary = {
                rows: relationRows.length,
                createdParents: 0,
                createdSupervisors: 0,
                linkedParents: 0,
                linkedSupervisors: 0,
                assignedClasses: 0,
                missingStudents: 0,
                missingParents: 0,
                missingSupervisors: 0,
                missingClasses: 0,
                skippedRows: 0,
            };
            const createdCredentials: RelationCredential[] = [];

            try {
                const response = await api.applySchoolRelations(selectedSchool.id, {
                    rows: relationRows,
                    createMissingUsers: createMissingRelationUsers,
                }) as RelationResponse;

                setRelationSummary(response.summary);
                setRelationCredentials(response.credentials || []);
                setRelationError(null);

                if (response.users?.length) {
                    mergeSchoolUsers(response.users);
                } else {
                    await refreshUsers();
                }

                mergeSchoolGroups(response.groups);
                await refreshSchoolWorkspace(selectedSchool.id);
                await loadSchoolReport(selectedSchool.id);
            } catch (error) {
                setRelationError(getErrorMessage(error, 'تعذر تنفيذ الربط وإنشاء الحسابات الآن.'));
            } finally {
                setIsApplyingRelations(false);
                if (createdCredentials.length) {
                    void refreshUsers();
                }
            }
        };

        const openSchoolRenameModal = () => {
            setEditNameModalState({
                isOpen: true,
                title: 'اكتب اسم المدرسة الجديد',
                initialValue: selectedSchool.name,
                onSave: async (newName: string) => {
                    if (newName.trim() === selectedSchool.name) return;
                    setSchoolActionPending('rename-school');
                    setSaveVerificationState('saving');
                    setSaveVerificationMessage('جاري حفظ اسم المدرسة...');
                    setManagementError(null);
                    setManagementNotice(null);
                    try {
                        const persistedSchool = await updateGroupAsync(selectedSchool.id, { name: newName.trim() });
                        const verifiedSchool = await refreshSchoolWorkspace(persistedSchool.id);
                        setSelectedSchool(verifiedSchool);
                        setSaveVerificationState('success');
                        setSaveVerificationMessage('تم حفظ اسم المدرسة والتأكد منه من الخادم.');
                        setManagementNotice('تم حفظ اسم المدرسة بعد التحقق من الخادم.');
                    } catch (error) {
                        const message = getErrorMessage(error, 'تعذر تعديل اسم المدرسة الآن.');
                        setSaveVerificationState('error');
                        setSaveVerificationMessage(message);
                        setManagementError(message);
                        throw error;
                    } finally {
                        setSchoolActionPending(null);
                    }
                },
            });
        };

        return (
            <div data-testid="school-workspace-shell" className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-fade-in">
                <SchoolWorkspaceControlsPanel
                    schoolName={selectedSchool.name}
                    saveVerificationState={saveVerificationState}
                    saveVerificationButtonLabel={saveVerificationButtonLabel}
                    isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                    isDeleteConfirmOpen={isDeleteSchoolConfirmOpen}
                    classCount={schoolClasses.length}
                    studentCount={schoolStudents.length}
                    supervisorCount={schoolSupervisors.length}
                    packageCount={schoolPackages.length}
                    codeCount={schoolCodes.length}
                    readinessScore={readinessScore}
                    readinessTotal={readinessChecks.length}
                    isDeletePending={Boolean(schoolActionPending)}
                    onBack={() => {
                        setManagementError(null);
                        setManagementNotice(null);
                        setIsDeleteSchoolConfirmOpen(false);
                        setSelectedSchool(null);
                    }}
                    onSaveAndVerify={() => void handleSaveAndVerifySchool()}
                    onRename={openSchoolRenameModal}
                    onDownloadHandover={downloadSchoolHandover}
                    onCopyHandover={() => void copySchoolHandoverMessage()}
                    onPrintReport={printSchoolReport}
                    onRequestDelete={handleDeleteSelectedSchool}
                    onCancelDelete={() => setIsDeleteSchoolConfirmOpen(false)}
                    onConfirmDelete={confirmDeleteSelectedSchool}
                />

                <div data-testid="school-workspace-tabs" className="hidden">
                    {[
                        { id: 'overview', label: '1 الفصول والطلاب' },
                        { id: 'import', label: '2 استيراد الطلاب' },
                        { id: 'relations', label: '3 المشرفون والتسليم' },
                        { id: 'packages', label: '4 الباقة والمسارات والأكواد' },
                        { id: 'reports', label: '5 تقرير التسليم' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setManagementError(null);
                                setManagementNotice(null);
                                setActiveTab(tab.id as typeof activeTab);
                                setExpandedSchoolStep(tab.id as typeof activeTab);
                            }}
                            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                                activeTab === tab.id
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {managementError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        {managementError}
                    </div>
                )}

                {managementNotice && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        {managementNotice}
                    </div>
                )}

                {saveVerificationMessage && (
                    <div
                        data-testid="school-save-verify-status"
                        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                            saveVerificationState === 'error'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : saveVerificationState === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                    >
                        {saveVerificationMessage}
                    </div>
                )}

                {rosterActionPending && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                        جار حفظ تغيير الطلاب أو المشرفين على الخادم...
                    </div>
                )}

                <SchoolLaunchBoardPanel
                    schoolName={selectedSchool.name}
                    readinessStatusLabel={readinessStatusLabel}
                    readinessNextStep={readinessNextStep}
                    readinessScore={readinessScore}
                    readinessTotal={readinessChecks.length}
                    readinessPercent={readinessPercent}
                    commercialOperatingSteps={commercialOperatingSteps}
                    expandedSchoolStep={expandedSchoolStep}
                    onBack={() => {
                        setManagementError(null);
                        setManagementNotice(null);
                        setIsDeleteSchoolConfirmOpen(false);
                        setSelectedSchool(null);
                    }}
                    onCollapseSteps={() => setExpandedSchoolStep(null)}
                    onSelectStep={(tab) => {
                        setActiveTab(tab);
                        setExpandedSchoolStep((current) => (current === tab ? null : tab));
                    }}
                />

                <div className="flex-1 w-full flex flex-col min-h-0 relative">
                    {/* ── تبويبات المدرسة ── */}
                    <div className="flex gap-1 mb-4 overflow-x-auto bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
                        {([
                            { id: 'dashboard', label: '🏠 نظرة عامة' },
                            { id: 'overview', label: '🏫 الفصول والطلاب' },
                            { id: 'import', label: '📥 استيراد' },
                            { id: 'relations', label: '🤝 المشرفون' },
                            { id: 'packages', label: '📦 الباقات' },
                            { id: 'reports', label: '📊 التقارير' },
                        ] as const).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setManagementError(null);
                                    setManagementNotice(null);
                                    setActiveTab(tab.id as typeof activeTab);
                                    setExpandedSchoolStep(tab.id === 'dashboard' ? null : tab.id as any);
                                }}
                                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                        {/* ── لوحة التحكم — أول تبويب ── */}
                        {activeTab === 'dashboard' && (
                            <SchoolDashboardPanel
                                school={selectedSchool}
                                schoolClasses={schoolClasses}
                                schoolStudents={schoolStudents}
                                supervisors={supervisors}
                                activePackages={activeSchoolPackages}
                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                                onGoToClasses={() => { setActiveTab('overview'); setExpandedSchoolStep('overview'); }}
                                onGoToStudents={() => { setActiveTab('overview'); setExpandedSchoolStep('overview'); }}
                                onGoToPackages={() => { setActiveTab('packages'); setExpandedSchoolStep('packages'); }}
                                onGoToImport={() => { setActiveTab('import'); setExpandedSchoolStep('import'); }}
                                onAddClass={() => void handleCreateSingleClass()}
                            />
                        )}

                        {activeTab === 'overview' && (
                            <div data-testid="school-classes-panel" className="space-y-8">
                                <div data-testid="school-overview-focus-strip" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-xs font-black text-slate-500">لوحة تشغيل المدرسة</p>
                                            <h3 className="text-lg font-black text-gray-900">ابدأ من هنا بدل البحث داخل الصفحة</h3>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                                            {nextOperatingStep.title}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {overviewFocusActions.map((action) => (
                                            <button
                                                key={action.id}
                                                type="button"
                                                data-testid={`school-overview-focus-${action.id}`}
                                                onClick={() => {
                                                    if (action.tab) {
                                                        setActiveTab(action.tab);
                                                    } else {
                                                        setActiveTab('overview');
                                                    }
                                                    window.setTimeout(() => {
                                                        document.querySelector(`[data-testid="${action.target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }, 80);
                                                }}
                                                className={`rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                                                    action.tone === 'emerald'
                                                        ? 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                                                        : action.tone === 'amber'
                                                            ? 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                                                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className="text-xs font-black text-slate-500">{action.label}</div>
                                                <div className="mt-2 text-sm font-black text-gray-900">{action.value}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                <SchoolCommandCenterPanel
                    readinessStatusLabel={readinessStatusLabel}
                    readinessNextStep={readinessNextStep}
                    readinessScore={readinessScore}
                    readinessChecks={readinessChecks}
                    readinessPercent={readinessPercent}
                    visibleReadinessGaps={visibleReadinessGaps}
                    commercialDecisionCards={commercialDecisionCards}
                    handoverBlockingGaps={handoverBlockingGaps}
                    handoverDecisionTitle={handoverDecisionTitle}
                    handoverDecisionCopy={handoverDecisionCopy}
                    nextOperatingStep={nextOperatingStep}
                    commercialOperatingSteps={commercialOperatingSteps}
                    currentOperatingStepIndex={currentOperatingStepIndex}
                    expandedSchoolStep={expandedSchoolStep}
                    isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                    onDownloadHandover={downloadSchoolHandover}
                    onSelectTab={(tab) => setActiveTab(tab)}
                    onCommercialDecision={(card) => {
                        setActiveTab(card.tab || 'overview');
                        window.setTimeout(() => {
                            if (card.target === 'school-wide-supervisors-panel') {
                                document.querySelector('[data-testid="school-wide-supervisors-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                return;
                            }
                            document.querySelector(`[data-testid="${card.target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 80);
                    }}
                    onSelectJourneyStep={(tab) => {
                        setActiveTab(tab);
                        setExpandedSchoolStep(tab);
                    }}
                    onAddClass={async () => {
                        setActiveTab('overview');
                        await handleCreateSingleClass();
                    }}
                    onAddStudent={() => {
                        setActiveTab('overview');
                        setIsSingleStudentOpen(true);
                        window.setTimeout(() => {
                            document.querySelector('[data-testid="school-students-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                    }}
                    onAddSupervisor={() => {
                        setActiveTab('relations');
                        window.setTimeout(() => {
                            document.querySelector('[data-testid="school-relations-quick-supervisor-card"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                    }}
                    onOpenPortal={() => {
                        const url = new URL('/admin-dashboard', window.location.origin);
                        url.searchParams.set('tab', 'school-portal');
                        window.history.pushState(null, '', `${url.pathname}${url.search}`);
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }}
                />

                <div className={`${expandedSchoolStep ? 'bg-white p-6 rounded-xl shadow-sm border border-gray-100' : 'hidden'}`}>
                    {activeTab === 'overview' && expandedSchoolStep === 'overview' && (
                        <div data-testid="school-classes-panel" className="space-y-8">
                            <SchoolOverviewOperationsPanel
                                overviewFocusActions={overviewFocusActions}
                                nextOperatingStep={nextOperatingStep}
                                studentCount={schoolStudents.length}
                                classCount={schoolClasses.length}
                                activePackageCount={activeSchoolPackages.length}
                                totalSeats={totalSeats}
                                usedSeats={usedSeats}
                                activeCodeCount={activeSchoolCodes.length}
                                classOperatingRows={classOperatingRows}
                                onFocusAction={(action) => {
                                    setActiveTab(action.tab || 'overview');
                                    window.setTimeout(() => {
                                        document.querySelector(`[data-testid="${action.target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 80);
                                }}
                                onOpenClass={(classroomId) => {
                                    document.querySelector(`[data-school-class-id="${classroomId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                            />

                            <SchoolSingleStudentPanel
                                isOpen={isSingleStudentOpen}
                                schoolClasses={schoolClasses}
                                student={singleStudent}
                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                                isImporting={isImporting}
                                onToggle={() => setIsSingleStudentOpen((current) => !current)}
                                onChangeField={(field, value) => setSingleStudent((current) => ({ ...current, [field]: value }))}
                                onCreateFirstClass={() => handleCreateSingleClass('تم إنشاء فصل جديد. اختره من حقل فصل الطالب ثم أضف الطالب.')}
                                onSubmit={() => void handleAddSingleStudent()}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SchoolWideSupervisorsPanel
                                    schoolLevelSupervisors={schoolLevelSupervisors}
                                    classScopedSupervisors={classScopedSupervisors}
                                    supervisorScopeRows={supervisorScopeRows}
                                    supervisors={supervisors}
                                    rosterActionPending={rosterActionPending}
                                    onOpenSupervisorEntry={() => focusQuickSupervisorEntry(selectedSchool.id, selectedSchool.name)}
                                    onAssignSupervisor={(value) => handleAssignSchoolSupervisor(value, selectedSchool.id)}
                                    onRemoveSupervisor={handleRemoveSchoolWideSupervisor}
                                />

                                <SchoolCoursesPanel
                                    schoolCourses={schoolCourses}
                                    publishedCourses={publishedCourses}
                                    selectedCourseIds={selectedSchool.courseIds}
                                    onAssignCourse={handleAssignCourseToSchool}
                                    onRemoveCourse={handleRemoveCourseFromSchool}
                                />
                            </div>

                            <SchoolClassesPanel
                                schoolClasses={schoolClasses}
                                schoolStudents={schoolStudents}
                                parents={parents}
                                supervisors={supervisors}
                                publishedCourses={publishedCourses}
                                bulkClassNames={bulkClassNames}
                                setBulkClassNames={setBulkClassNames}
                                schoolActionPending={schoolActionPending}
                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                                rosterActionPending={rosterActionPending}
                                onDownloadSchoolRoster={() => downloadSchoolRoster(selectedSchool, schoolStudents, schoolClasses)}
                                onCreateSingleClass={() => void handleCreateSingleClass()}
                                onCreateBulkClasses={handleCreateBulkClasses}
                                onDownloadClassReport={downloadClassReport}
                                onPrintClassReport={printClassReport}
                                onRenameClass={openClassRenameModal}
                                onDeleteClass={(classroom) => void handleDeleteClass(classroom)}
                                onFocusClassStudentForm={(classroom) => focusClassStudentForm(classroom.name)}
                                onFocusClassRoster={(classroom) => focusClassRoster(classroom.id)}
                                onOpenImport={() => setActiveTab('import')}
                                onOpenPackages={() => setActiveTab('packages')}
                                onAssignSupervisor={handleAssignSchoolSupervisor}
                                onCreateSupervisor={(classroom) => focusQuickSupervisorEntry(classroom.id, classroom.name)}
                                onRemoveSupervisor={handleRemoveClassSupervisor}
                                onAssignCourse={assignCourseToGroup}
                                onRemoveCourse={removeCourseFromGroup}
                            />

                            <SchoolStudentRosterPanel
                                studentSearch={studentSearch}
                                setStudentSearch={setStudentSearch}
                                selectedClassFilter={selectedClassFilter}
                                setSelectedClassFilter={setSelectedClassFilter}
                                schoolClasses={schoolClasses}
                                visibleSchoolStudents={visibleSchoolStudents}
                                pagedVisibleSchoolStudents={pagedVisibleSchoolStudents}
                                schoolStudentTotalPages={schoolStudentTotalPages}
                                safeSchoolStudentPage={safeSchoolStudentPage}
                                schoolStudentStartIndex={schoolStudentStartIndex}
                                schoolStudentEndIndex={schoolStudentEndIndex}
                                setSchoolStudentPage={setSchoolStudentPage}
                                rosterActionPending={rosterActionPending}
                                selectedSchoolName={selectedSchool.name}
                                selectedSchoolId={selectedSchool.id}
                                handleAssignStudentToClass={handleAssignStudentToClass}
                                handleRemoveStudentScope={handleRemoveStudentScope}
                            />
                        </div>
                    )}

                    {activeTab === 'packages' && (
                        <SchoolPackagesPanel
                            selectedSchool={selectedSchool}
                            schoolPackages={schoolPackages}
                            activeSchoolPackages={activeSchoolPackages}
                            schoolCodes={schoolCodes}
                            activeSchoolCodes={activeSchoolCodes}
                            totalSeats={totalSeats}
                            usedSeats={usedSeats}
                            packageActionPending={packageActionPending}
                            handleCreateSchoolPackage={handleCreateSchoolPackage}
                            handleUpdateSchoolPackage={handleUpdateSchoolPackage}
                            handleDeleteSchoolPackage={handleDeleteSchoolPackage}
                            handleExpireAllSchoolPackages={handleExpireAllSchoolPackages}
                            downloadPackagesReport={downloadPackagesReport}
                            publishedCourses={publishedCourses}
                            paths={paths}
                            subjects={subjects}
                            teachers={teachers}
                            assignCourseToGroup={assignCourseToGroup}
                            selectedPackageIdForCode={selectedPackageIdForCode}
                            setSelectedPackageIdForCode={setSelectedPackageIdForCode}
                            handleCreateSchoolAccessCode={handleCreateSchoolAccessCode}
                            accessCodeActionPending={accessCodeActionPending}
                            newCodeMaxUses={newCodeMaxUses}
                            setNewCodeMaxUses={setNewCodeMaxUses}
                            newCodeDurationDays={newCodeDurationDays}
                            setNewCodeDurationDays={setNewCodeDurationDays}
                            tableSchoolCodes={tableSchoolCodes}
                            handleCopyCode={handleCopyCode}
                            copiedCodeId={copiedCodeId}
                            handleDeleteSchoolAccessCode={handleDeleteSchoolAccessCode}
                            isLoadingPagedAccessCodes={isLoadingPagedAccessCodes}
                            pagedAccessCodesError={pagedAccessCodesError}
                            pagedAccessCodesPagination={pagedAccessCodesPagination}
                        />
                    )}

                    {activeTab === 'relations' && (
                        <SchoolRelationsPanel
                            schoolLevelSupervisors={schoolLevelSupervisors}
                            classScopedSupervisors={classScopedSupervisors}
                            schoolParentUsers={schoolParentUsers}
                            schoolSupervisors={schoolSupervisors}
                            studentsWithoutParent={studentsWithoutParent}
                            studentsWithoutClass={studentsWithoutClass}
                            quickSupervisor={quickSupervisor}
                            setQuickSupervisor={setQuickSupervisor}
                            schoolClasses={schoolClasses}
                            handleCreateQuickSupervisor={handleCreateQuickSupervisor}
                            rosterActionPending={rosterActionPending}
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
                            downloadRelationsReport={downloadRelationsReport}
                        />
                    )}

                    {activeTab === 'import' && (
                        <SchoolImportPanel
                            importRows={importRows}
                            importSummary={importSummary}
                            isImporting={isImporting}
                            importCredentials={importCredentials}
                            importError={importError}
                            importPreviewStats={importPreviewStats}
                            handleImportFile={handleImportFile}
                            handleStartImport={handleStartImport}
                            downloadTemplate={downloadTemplate}
                            downloadCredentials={downloadCredentials}
                        />
                    )}

                    {activeTab === 'reports' && (
                        <SchoolReportsPanel
                            readinessScore={readinessScore}
                            readinessTotal={readinessChecks.length}
                            readinessStatusLabel={readinessStatusLabel}
                            readinessNextStep={readinessNextStep}
                            readinessPercent={readinessPercent}
                            schoolClassCount={schoolClasses.length}
                            schoolStudentCount={schoolStudents.length}
                            schoolSupervisorCount={schoolSupervisors.length}
                            activePackageCount={activeSchoolPackages.length}
                            activeCodeCount={activeSchoolCodes.length}
                            handoverBlockingGaps={handoverBlockingGaps}
                            onNavigateTab={(tab) => setActiveTab(tab)}
                            downloadSchoolHandover={downloadSchoolHandover}
                            downloadSchoolGapReport={downloadSchoolGapReport}
                            printSchoolReport={printSchoolReport}
                            isLoadingReport={isLoadingReport}
                            reportError={reportError}
                            schoolReport={schoolReport}
                            subjects={subjects}
                            sections={sections}
                            downloadSchoolPerformanceReport={downloadSchoolPerformanceReport}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {activeSchoolActionsId && (
                <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={closeSchoolActions}
                    aria-label="Close school actions menu"
                />
            )}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 data-testid="school-commercial-title" className="text-2xl font-bold text-gray-900">تشغيل المدارس والتعاقدات</h1>
                    <p className="text-sm text-gray-500 mt-1">رحلة واحدة لتسليم أي تعاقد مدرسي أو جماعي: فصول، طلاب، مشرفون، باقات، أكواد، وتقرير جاهزية.</p>
                </div>
                <button
                    type="button"
                    onClick={exportSchoolPortfolioReadiness}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                    <Download size={18} /> تصدير جاهزية المدارس
                </button>
            </div>

            <div data-testid="school-create-journey-panel" className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:items-end">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700">
                            <Plus size={14} />
                            بداية تشغيل مدرسة جديدة
                        </div>
                        <h2 className="mt-3 text-lg font-black text-gray-900">أضف المدرسة ثم أكمل الرحلة من داخلها</h2>
                        <p className="mt-1 text-sm font-bold leading-6 text-amber-900">
                            بعد الإضافة ستفتح مساحة المدرسة مباشرة لتبدأ بالفصول، ثم الطلاب، ثم المشرفين، ثم الباقة المرتبطة بالمسارات والأكواد، وتنتهي بتقرير التسليم.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <input
                            value={newSchoolName}
                            onChange={(event) => setNewSchoolName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !schoolActionPending) {
                                    handleCreateSchool();
                                }
                            }}
                            placeholder="مثال: مدارس التربية النموذجية"
                            className="min-h-[48px] rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-amber-300"
                            data-testid="school-new-name-input"
                        />
                        <button
                            type="button"
                            onClick={handleCreateSchool}
                            disabled={Boolean(schoolActionPending)}
                            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-amber-600"
                            data-testid="school-create-button"
                        >
                            <Plus size={18} /> إنشاء وفتح التشغيل
                        </button>
                    </div>
                </div>
                <div data-testid="school-create-journey-steps" className="mt-4 grid gap-2 md:grid-cols-6">
                    {['الفصول', 'الطلاب', 'المشرفون', 'الباقة/المسارات', 'الأكواد', 'التقرير'].map((step, index) => (
                        <div key={step} data-testid="school-create-journey-step" className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-gray-700">
                            <span className="ml-1 text-amber-600">{index + 1}</span>
                            {step}
                        </div>
                    ))}
                </div>
            </div>

            <div data-testid="school-flow-boundary-card" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-500">رحلة المدرسة التجارية</div>
                        <p className="mt-1 text-sm font-bold leading-6 text-gray-700">
                            هذه الصفحة لتجهيز المدرسة: الفصول، الطلاب، المشرفون، الباقات المرتبطة بالمسارات، الأكواد، وتقرير التسليم. بعد التشغيل افتح بوابة المتابعة لقراءة الأداء المستمر بدون خلطها مع الإعدادات.
                        </p>
                        <div data-testid="school-flow-boundary-modes" className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                                <div className="text-xs font-black text-amber-700">هنا: تشغيل وتسليم</div>
                                <p className="mt-1 text-xs font-bold leading-5 text-amber-900">إنشاء المدرسة، الفصول، الطلاب، المشرفين، الباقة/المسارات، الأكواد، وملف التسليم.</p>
                            </div>
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                                <div className="text-xs font-black text-indigo-700">البوابة: متابعة بعد التشغيل</div>
                                <p className="mt-1 text-xs font-bold leading-5 text-indigo-900">قراءة الأداء، متابعة الفصول، طباعة التقارير، واكتشاف الطلاب المحتاجين لتدخل.</p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const url = new URL('/admin-dashboard', window.location.origin);
                            url.searchParams.set('tab', 'school-portal');
                            window.history.pushState(null, '', `${url.pathname}${url.search}`);
                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                        }}
                        data-testid="open-school-portal-from-groups"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
                    >
                        <ShieldCheck size={16} />
                        فتح بوابة متابعة المدارس
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                            <ShieldCheck size={14} />
                            مركز جاهزية التعاقدات المدرسية
                        </div>
                        <h2 className="mt-3 text-lg font-black text-gray-900">أين نبدأ اليوم؟</h2>
                        <p className="mt-1 text-sm text-gray-500">ملخص سريع لمحفظة المدارس قبل الدخول في التفاصيل؛ مفيد للمبيعات والتسليم والمتابعة.</p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
                        <div className="text-xs font-black text-amber-700">أولوية المتابعة</div>
                        <div className="mt-1 text-sm font-black text-gray-900">
                            {schoolPortfolioSummary.nextPriority?.school.name || 'لا توجد مدارس بعد'}
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-600">
                            {schoolPortfolioSummary.nextPriority?.nextAction?.hint || 'أضف مدرسة جديدة أو راجع المدارس الجاهزة.'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {[
                        { label: 'مدارس', value: schoolPortfolioRows.length, tone: 'slate' },
                        { label: 'جاهزة', value: schoolPortfolioSummary.ready, tone: 'emerald' },
                        { label: 'قريبة', value: schoolPortfolioSummary.nearReady, tone: 'amber' },
                        { label: 'تحتاج تجهيز', value: schoolPortfolioSummary.needsSetup, tone: 'rose' },
                        { label: 'طلاب', value: schoolPortfolioSummary.totalStudents, tone: 'blue' },
                        { label: 'باقات/مسارات', value: schoolPortfolioSummary.totalActivePackages, tone: 'indigo' },
                    ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border p-4 text-center ${
                            item.tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' :
                            item.tone === 'amber' ? 'border-amber-100 bg-amber-50' :
                            item.tone === 'rose' ? 'border-rose-100 bg-rose-50' :
                            item.tone === 'blue' ? 'border-blue-100 bg-blue-50' :
                            item.tone === 'indigo' ? 'border-indigo-100 bg-indigo-50' :
                            'border-gray-100 bg-gray-50'
                        }`}>
                            <div className="text-xs font-black text-gray-500">{item.label}</div>
                            <div className="mt-1 text-2xl font-black text-gray-900">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {managementError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {managementError}
                </div>
            )}

            {managementNotice && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {managementNotice}
                </div>
            )}

            <SchoolPortfolioFilterPanel
                schoolSearch={schoolSearch}
                schoolListMode={schoolListMode}
                filteredSchoolsCount={filteredSchools.length}
                schoolsCount={schools.length}
                hiddenDraftSchoolsCount={hiddenDraftSchoolsCount}
                visibleDraftSchoolsCount={visibleDraftSchoolsCount}
                onSearchChange={setSchoolSearch}
                onModeChange={setSchoolListMode}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchoolRows.map((cardPortfolioRow) => (
                    <SchoolPortfolioCard
                        key={cardPortfolioRow.school.id}
                        row={cardPortfolioRow}
                        listMode={schoolListMode}
                        actionsOpen={activeSchoolActionsId === cardPortfolioRow.school.id}
                        onToggleActions={() => toggleSchoolActions(cardPortfolioRow.school.id)}
                        onOpenTab={(tab) => {
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab(tab);
                        }}
                        onOpenFromMenu={(tab) => {
                            closeSchoolActions();
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab(tab);
                        }}
                        onReviewDelete={() => {
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab('overview');
                            setIsDeleteSchoolConfirmOpen(true);
                            window.setTimeout(() => {
                                document.querySelector('[data-testid="school-delete-confirm-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 80);
                        }}
                    />
                ))}
            </div>

            {filteredSchools.length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                    <FileSpreadsheet size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مدارس مطابقة</h3>
                    <p className="text-sm text-gray-500">أضف مدرسة جديدة أو غيّر كلمة البحث لعرض الجهات التعليمية الحالية.</p>
                </div>
            )}

            <EditNameModal
                isOpen={editNameModalState.isOpen}
                title={editNameModalState.title}
                initialValue={editNameModalState.initialValue}
                onClose={closeEditNameModal}
                onSave={editNameModalState.onSave}
            />
        </div>
    );
};
