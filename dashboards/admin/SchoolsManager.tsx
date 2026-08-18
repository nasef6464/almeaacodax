import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { AccessCode, AnnouncementAd, B2BPackage, Group, Lesson, LibraryItem, PackageContentType, Role, StudyPlan, Topic, User } from '../../types';
import { api } from '../../services/api';
import { parseImportFile, parseRelationFile } from './SchoolsManager/importFileReaders';
import { getDuplicateImportEmails } from './SchoolsManager/importRowParsing';
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
import { PACKAGE_CONTENT_OPTIONS } from './SchoolsManager/contracts';
import type {
    AccessCodesListResponse,
    AccessCodesPagination,
    AdminUserPayload,
    ContentBootstrapPayload,
    ImportResponse,
    ImportRow,
    ImportSummary,
    RelationCredential,
    RelationImportRow,
    RelationImportSummary,
    RelationResponse,
    SchoolReport,
} from './SchoolsManager/contracts';
import {
    buildStoreGroup,
    buildStoreUser,
    generateTemporaryPassword,
    loadSchoolAdminUsers,
    mergeUsersById,
} from './SchoolsManager/dataAdapters';
import {
    createCsvDownload,
    createWorkbookDownload,
    createXlsxDownload,
    escapeHtml,
    openPrintWindow,
    renderPrintTable,
} from './SchoolsManager/exportHelpers';
import {
    buildSchoolPortfolioRows,
    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,
    getStudentsForSchool,
    summarizeSchoolPortfolio,
} from './SchoolsManager/readinessViewModel';
import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';
import { buildSchoolWorkspaceViewModel } from './SchoolsManager/workspaceViewModel';
import { buildSchoolRosterViewModel } from './SchoolsManager/rosterViewModel';

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

    const [selectedSchool, setSelectedSchool] = useState<Group | null>(null);
    const [activeSchoolActionsId, setActiveSchoolActionsId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'relations' | 'import' | 'reports'>('overview');
    const [schoolSearch, setSchoolSearch] = useState('');
    const [schoolListMode, setSchoolListMode] = useState<'active' | 'needs_setup' | 'ready' | 'all'>('active');
    const [newSchoolName, setNewSchoolName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [importCredentials, setImportCredentials] = useState<ImportResponse['credentials']>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const [relationRows, setRelationRows] = useState<RelationImportRow[]>([]);
    const [relationSummary, setRelationSummary] = useState<RelationImportSummary | null>(null);
    const [relationCredentials, setRelationCredentials] = useState<RelationCredential[]>([]);
    const [relationError, setRelationError] = useState<string | null>(null);
    const [isApplyingRelations, setIsApplyingRelations] = useState(false);
    const [createMissingRelationUsers, setCreateMissingRelationUsers] = useState(true);
    const [schoolReport, setSchoolReport] = useState<SchoolReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [selectedPackageIdForCode, setSelectedPackageIdForCode] = useState('');
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
    const [managementError, setManagementError] = useState<string | null>(null);
    const [managementNotice, setManagementNotice] = useState<string | null>(null);
    const [schoolActionPending, setSchoolActionPending] = useState<string | null>(null);
    const [packageActionPending, setPackageActionPending] = useState<string | null>(null);
    const [accessCodeActionPending, setAccessCodeActionPending] = useState<string | null>(null);
    const [rosterActionPending, setRosterActionPending] = useState<string | null>(null);
    const [saveVerificationState, setSaveVerificationState] = useState<'idle' | 'saving' | 'verifying' | 'success' | 'error'>('idle');
    const [saveVerificationMessage, setSaveVerificationMessage] = useState<string | null>(null);
    const [isDeleteSchoolConfirmOpen, setIsDeleteSchoolConfirmOpen] = useState(false);
    const [expandedSchoolStep, setExpandedSchoolStep] = useState<'overview' | 'import' | 'relations' | 'packages' | 'reports' | null>(null);
    const [isSingleStudentOpen, setIsSingleStudentOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState<'all' | 'unassigned' | string>('all');
    const [schoolStudentPage, setSchoolStudentPage] = useState(1);
    const schoolStudentPageSize = 80;
    const [newCodeMaxUses, setNewCodeMaxUses] = useState('50');
    const [newCodeDurationDays, setNewCodeDurationDays] = useState('30');
    const [bulkClassNames, setBulkClassNames] = useState('');
    const [singleStudent, setSingleStudent] = useState({ name: '', email: '', className: '', password: '' });
    const [quickSupervisor, setQuickSupervisor] = useState({ name: '', email: '', password: '', targetGroupId: '' });
    const [pagedAccessCodes, setPagedAccessCodes] = useState<Array<{
        id: string;
        code: string;
        schoolId: string;
        packageId: string;
        maxUses: number;
        currentUses: number;
        expiresAt: number;
        createdAt: number;
    }>>([]);
    const [pagedAccessCodesPagination, setPagedAccessCodesPagination] = useState<AccessCodesPagination | null>(null);
    const [isLoadingPagedAccessCodes, setIsLoadingPagedAccessCodes] = useState(false);
    const [pagedAccessCodesError, setPagedAccessCodesError] = useState<string | null>(null);

    const [editNameModalState, setEditNameModalState] = useState<{
        isOpen: boolean;
        title: string;
        initialValue: string;
        onSave: (newName: string) => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        initialValue: '',
        onSave: async () => {},
    });

    useEffect(() => {
        if (managementNotice) {
            const timer = setTimeout(() => setManagementNotice(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [managementNotice]);

    useEffect(() => {
        if (managementError) {
            const timer = setTimeout(() => setManagementError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [managementError]);
    const hasLoadedSchoolRosterUsersRef = useRef(false);

    const resetSchoolWorkspaceState = () => {
        setImportRows([]);
        setImportSummary(null);
        setImportCredentials([]);
        setImportError(null);
        setRelationRows([]);
        setRelationSummary(null);
        setRelationCredentials([]);
        setRelationError(null);
        setIsSingleStudentOpen(false);
        setSingleStudent({ name: '', email: '', className: '', password: '' });
        setQuickSupervisor({ name: '', email: '', password: '', targetGroupId: '' });
        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState(null);
        setStudentSearch('');
        setSelectedClassFilter('all');
    };

    useEffect(() => {
        resetSchoolWorkspaceState();
    }, [selectedSchool?.id]);

    const toggleSchoolActions = (schoolId: string) => {
        setActiveSchoolActionsId((current) => (current === schoolId ? null : schoolId));
    };

    const closeSchoolActions = () => {
        setActiveSchoolActionsId(null);
    };

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

    const filteredSchools = useMemo(() => {
        const keyword = schoolSearch.trim().toLowerCase();
        return schools.filter((school) => {
            const matchesSearch = !keyword || school.name.toLowerCase().includes(keyword);
            if (!matchesSearch) return false;

            const snapshot = getOperationalSnapshotForSchool(school);
            if (schoolListMode === 'all' || keyword) return true;
            if (schoolListMode === 'ready') return snapshot.readinessScore === 5;
            if (schoolListMode === 'needs_setup') return snapshot.readinessScore < 5 && !snapshot.isCommerciallyHiddenDraft;
            return !snapshot.isCommerciallyHiddenDraft;
        });
    }, [accessCodes, b2bPackages, classes, schoolListMode, schoolSearch, schools, students]);
    const hiddenDraftSchoolsCount = useMemo(
        () => schools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft).length,
        [accessCodes, b2bPackages, classes, schools, students],
    );
    const visibleDraftSchoolsCount = useMemo(
        () => filteredSchools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft).length,
        [accessCodes, b2bPackages, classes, filteredSchools, students],
    );
    const schoolPortfolioRows = useMemo(
        () => buildSchoolPortfolioRows(schools, { classes, students, b2bPackages, accessCodes }),
        [accessCodes, b2bPackages, classes, schools, students],
    );
    const schoolPortfolioSummary = useMemo(
        () => summarizeSchoolPortfolio(schoolPortfolioRows),
        [schoolPortfolioRows],
    );

    const exportSchoolPortfolioReadiness = () => {
        createWorkbookDownload('schools-portfolio-readiness.xlsx', [
            {
                name: 'portfolio-summary',
                rows: [
                    ['البند', 'القيمة'],
                    ['عدد المدارس', schoolPortfolioRows.length],
                    ['جاهزة للبيع/التسليم', schoolPortfolioSummary.ready],
                    ['قريبة من التسليم', schoolPortfolioSummary.nearReady],
                    ['تحتاج تجهيز', schoolPortfolioSummary.needsSetup],
                    ['إجمالي الطلاب', schoolPortfolioSummary.totalStudents],
                    ['الباقات النشطة', schoolPortfolioSummary.totalActivePackages],
                    ['أولوية المتابعة', schoolPortfolioSummary.nextPriority?.school.name || 'لا توجد'],
                ],
            },
            {
                name: 'schools-readiness',
                rows: [
                    ['المدرسة', 'الحالة', 'درجة الجاهزية', 'الفصول', 'الطلاب', 'المشرفون', 'الباقات النشطة', 'الأكواد الصالحة', 'الخطوة التالية'],
                    ...schoolPortfolioRows.map((row) => [
                        row.school.name,
                        row.status,
                        `${row.readinessScore}/${row.readinessTotal}`,
                        row.classCount,
                        row.studentCount,
                        row.supervisorCount,
                        row.activePackageCount,
                        row.activeCodeCount,
                        row.nextAction?.hint || 'مراجعة تقرير التسليم',
                    ]),
                ],
            },
        ]);
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

        hydrateContentBootstrap(bootstrap as ContentBootstrapPayload);
        if (adminUsersResponse && Array.isArray(adminUsersResponse)) {
            hydrateUsers(mergeUsersById(users, adminUsersResponse));
        }

        const freshGroups = (bootstrap.groups || []).map(buildStoreGroup).filter((group) => group.id && group.name);
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
            setSaveVerificationState('error');
            setSaveVerificationMessage(error instanceof Error ? error.message : 'فشل الحفظ أو التحقق من البيانات.');
            setManagementError(error instanceof Error ? error.message : 'فشل الحفظ أو التحقق من البيانات.');
        }
    };

    useEffect(() => {
        if (!selectedSchool?.id || user.role !== Role.ADMIN) {
            return;
        }

        void refreshSchoolWorkspace(selectedSchool.id).catch((error) => {
            setManagementError(error instanceof Error ? error.message : 'تعذر تحديث بيانات المدرسة من الخادم.');
        });
    }, [selectedSchool?.id, user.role]);

    const mergeSchoolUsers = (incomingUsers: AdminUserPayload[] | undefined) => {
        if (!incomingUsers?.length) {
            return;
        }

        const nextUsersById = new Map(users.map((currentUser) => [currentUser.id, currentUser]));
        incomingUsers.map(buildStoreUser).forEach((incomingUser) => {
            if (incomingUser.id) {
                nextUsersById.set(incomingUser.id, incomingUser);
            }
        });
        hydrateUsers(Array.from(nextUsersById.values()));
    };

    const mergeSchoolGroups = (incomingGroups: Group[] | undefined) => {
        if (!incomingGroups?.length) {
            return;
        }

        const normalizedGroups = incomingGroups.map(buildStoreGroup).filter((group) => group.id && group.name);
        if (!normalizedGroups.length) {
            return;
        }

        const nextGroupsById = new Map(groups.map((group) => [group.id, group]));
        normalizedGroups.forEach((group) => nextGroupsById.set(group.id, group));
        hydrateContentBootstrap({ groups: Array.from(nextGroupsById.values()) });

        if (selectedSchool) {
            const updatedSelectedSchool = normalizedGroups.find((group) => group.id === selectedSchool.id);
            if (updatedSelectedSchool) {
                setSelectedSchool(updatedSelectedSchool);
            }
        }
    };

    const loadSchoolReport = async (schoolId: string) => {
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
    };

    useEffect(() => {
        if (!selectedSchool) {
            setSchoolReport(null);
            setReportError(null);
            return;
        }

        if (activeTab === 'reports') {
            void loadSchoolReport(selectedSchool.id);
        }
    }, [activeTab, selectedSchool]);

    useEffect(() => {
        if (!selectedSchool) {
            setSelectedPackageIdForCode('');
            return;
        }

        const packages = b2bPackages.filter((pkg) => pkg.schoolId === selectedSchool.id && pkg.status === 'active');
        setSelectedPackageIdForCode((current) => (
            packages.some((pkg) => pkg.id === current)
                ? current
                : (packages[0]?.id || '')
        ));
    }, [selectedSchool, b2bPackages]);

    useEffect(() => {
        setSchoolStudentPage(1);
    }, [selectedSchool?.id, studentSearch, selectedClassFilter]);

    useEffect(() => {
        let cancelled = false;
        if (!selectedSchool || activeTab !== 'packages') {
            setPagedAccessCodes([]);
            setPagedAccessCodesPagination(null);
            setPagedAccessCodesError(null);
            setIsLoadingPagedAccessCodes(false);
            return () => {
                cancelled = true;
            };
        }

        setIsLoadingPagedAccessCodes(true);
        setPagedAccessCodesError(null);
        void (async () => {
            try {
                const response = await api.getAccessCodes({
                    schoolId: selectedSchool.id,
                    page: 1,
                    limit: 100,
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                }) as AccessCodesListResponse;

                if (cancelled) return;
                const incoming = Array.isArray(response?.data) ? response.data : [];
                setPagedAccessCodes(
                    incoming.map((code) => ({
                        id: String(code.id || code._id || ''),
                        code: String(code.code || ''),
                        schoolId: String(code.schoolId || ''),
                        packageId: String(code.packageId || ''),
                        maxUses: Number(code.maxUses || 0),
                        currentUses: Number(code.currentUses || 0),
                        expiresAt: Number(code.expiresAt || 0),
                        createdAt: Number(code.createdAt || 0),
                    })).filter((code) => code.id && code.schoolId),
                );

                const pagination = response?.pagination || {};
                if (typeof pagination.page === 'number' && typeof pagination.limit === 'number') {
                    setPagedAccessCodesPagination({
                        total: Number(pagination.total || 0),
                        page: pagination.page,
                        limit: pagination.limit,
                        totalPages: Number(pagination.totalPages || 1),
                        hasNext: Boolean(pagination.hasNext),
                        hasPrev: Boolean(pagination.hasPrev),
                    });
                } else {
                    setPagedAccessCodesPagination(null);
                }
            } catch (error) {
                if (cancelled) return;
                setPagedAccessCodes([]);
                setPagedAccessCodesPagination(null);
                setPagedAccessCodesError(error instanceof Error ? error.message : 'تعذّر تحميل أكواد التفعيل المرقّمة.');
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

        const newSchool: Group = {
            id: `school_${Date.now()}`,
            name,
            type: 'SCHOOL',
            ownerId: user.id,
            supervisorIds: [],
            studentIds: [],
            courseIds: [],
            createdAt: Date.now(),
            totalStudents: 0,
            totalSupervisors: 0,
            totalCourses: 0,
        };

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
            setSaveVerificationState('error');
            setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر إنشاء المدرسة الآن.');
            setManagementError(error instanceof Error ? error.message : 'تعذر إنشاء المدرسة الآن.');
        } finally {
            setSchoolActionPending(null);
        }
    };

    const handleCreateBulkClasses = async () => {
        if (!selectedSchool) return;

        const classNames = Array.from(new Set<string>(
            bulkClassNames
                .split(/\r?\n|،|,/)
                .map((name) => name.trim())
                .filter(Boolean),
        ));

        if (classNames.length === 0) {
            setManagementError('اكتب اسم فصل واحد على الأقل، ويمكنك فصل الأسماء بسطر جديد أو فاصلة.');
            return;
        }

        const existingNames = new Set(
            classes
                .filter((group) => group.parentId === selectedSchool.id)
                .map((group) => group.name.trim().toLowerCase()),
        );
        const now = Date.now();
        const namesToCreate = classNames.filter((name) => !existingNames.has(name.toLowerCase()));

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
            await Promise.all(namesToCreate.map((name, index) => createGroupAsync({
                id: `class_${now}_${index}`,
                name,
                type: 'CLASS',
                parentId: selectedSchool.id,
                ownerId: user.id,
                supervisorIds: [],
                studentIds: [],
                courseIds: [],
                createdAt: now + index,
                totalStudents: 0,
                totalSupervisors: 0,
                totalCourses: 0,
            })));

            await refreshSchoolWorkspace(selectedSchool.id);
            setBulkClassNames('');
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم الحفظ والتأكد من الفصول من الخادم.');
            setManagementNotice(`تم إنشاء ${namesToCreate.length} فصل/فصول والتأكد من حفظها.`);
        } catch (error) {
            setSaveVerificationState('error');
            setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر إنشاء الفصول الآن.');
            setManagementError(error instanceof Error ? error.message : 'تعذر إنشاء الفصول الآن.');
        } finally {
            setSchoolActionPending(null);
        }
    };

    const downloadTemplate = () => {
        createXlsxDownload('school-import-template.xlsx', [
            ['اسم الطالب', 'البريد الإلكتروني', 'اسم الفصل', 'كلمة المرور'],
            ['طالب تجريبي', 'student1@example.com', 'فصل أ', 'Nn@123456'],
            ['طالبة تجريبية', 'student2@example.com', 'فصل ب', ''],
        ]);
    };

    const downloadRelationsTemplate = () => {
        createWorkbookDownload('school-relations-template.xlsx', [
            {
                name: 'relations',
                rows: [
                    ['بريد الطالب', 'بريد ولي الأمر', 'اسم ولي الأمر', 'بريد المشرف', 'اسم المشرف', 'اسم الفصل'],
                    ['student1@example.com', 'parent1@example.com', 'ولي أمر تجريبي', 'supervisor1@example.com', 'مشرف تجريبي', 'فصل أ'],
                    ['student2@example.com', 'parent1@example.com', 'ولي أمر تجريبي', '', '', 'فصل ب'],
                ],
            },
            {
                name: 'notes',
                rows: [
                    ['ملاحظة', 'القيمة'],
                    ['الطلاب', 'يجب أن تكون حساباتهم موجودة داخل المدرسة قبل تنفيذ الربط.'],
                    ['أولياء الأمور والمشرفون', 'هذه الدفعة تربط الحسابات الموجودة فقط، والحسابات الناقصة تظهر في التقرير.'],
                    ['الفصل', 'اكتب اسم الفصل كما هو داخل المدرسة، واتركه فارغا إذا كان الطالب مرتبطا بالفعل.'],
                ],
            },
        ]);
    };

    const downloadCredentials = () => {
        if (!importCredentials.length) {
            return;
        }

        createCsvDownload('school-students-credentials.csv', [
            ['name', 'email', 'password', 'className'],
            ...importCredentials.map((row) => [row.name, row.email, row.password, row.className || '']),
        ]);
    };

    const downloadSchoolRoster = (school: Group, schoolStudents: User[], schoolClasses: Group[]) => {
        createXlsxDownload(`${school.name}-students-roster.xlsx`, [
            ['اسم الطالب', 'البريد الإلكتروني', 'الفصل', 'الحالة'],
            ...schoolStudents.map((student) => {
                const classroomName = schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id))?.name || '';
                return [
                    student.name,
                    student.email || '',
                    classroomName,
                    student.isActive === false ? 'موقوف' : 'نشط',
                ];
            }),
        ]);
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
            setImportError(error instanceof Error ? error.message : 'تعذر قراءة الملف. استخدم CSV أو TSV.');
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
            setRelationError(error instanceof Error ? error.message : 'تعذر قراءة ملف الربط. استخدم Excel أو CSV أو TSV.');
        }
    };

    const downloadRelationCredentials = () => {
        if (!relationCredentials.length) {
            return;
        }

        createWorkbookDownload('school-created-accounts.xlsx', [
            {
                name: 'created-accounts',
                rows: [
                    ['الدور', 'الاسم', 'البريد الإلكتروني', 'كلمة المرور المؤقتة', 'مرتبط بـ'],
                    ...relationCredentials.map((credential) => [
                        credential.role === Role.PARENT ? 'ولي أمر' : 'مشرف',
                        credential.name,
                        credential.email,
                        credential.password,
                        credential.linkedTo,
                    ]),
                ],
            },
            {
                name: 'handover-notes',
                rows: [
                    ['تعليمات التسليم', 'القيمة'],
                    ['الملف حساس', 'لا ترسله في مجموعة عامة، وسلمه لمسؤول المدرسة فقط.'],
                    ['كلمات المرور', 'اطلب من المستخدمين تغيير كلمة المرور بعد أول دخول عندما تتوفر هذه الخاصية.'],
                    ['المتابعة', 'بعد التسليم راجع تقرير الربط للتأكد من عدم وجود حسابات ناقصة.'],
                ],
            },
        ]);
    };

    const handleStartImport = async () => {
        if (!selectedSchool || !importRows.length) {
            return;
        }

        const duplicateEmails = getDuplicateImportEmails(importRows);
        if (duplicateEmails.length > 0) {
            setImportError(`يوجد بريد مكرر داخل الملف: ${duplicateEmails.slice(0, 3).join(', ')}${duplicateEmails.length > 3 ? '...' : ''}. صحح الملف ثم ارفعه مرة أخرى.`);
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
            setSaveVerificationState('error');
            setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر استيراد الطلاب الآن.');
            setImportError(error instanceof Error ? error.message : 'تعذر استيراد الطلاب الآن.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddSingleStudent = async () => {
        if (!selectedSchool) return;

        const name = singleStudent.name.trim();
        const email = singleStudent.email.trim().toLowerCase();
        if (!name || !email) {
            setImportError('اكتب اسم الطالب والبريد الإلكتروني قبل الإضافة.');
            return;
        }
        if (!singleStudent.className.trim()) {
            setImportError('اختر فصل الطالب قبل الإضافة حتى تبقى المدرسة مرتبة والتقارير واضحة.');
            return;
        }

        setIsImporting(true);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري حفظ الطالب...');
        setImportError(null);
        try {
            const response = await api.importSchoolStudents(selectedSchool.id, {
                rows: [{
                    name,
                    email,
                    className: singleStudent.className.trim() || undefined,
                    password: singleStudent.password.trim() || undefined,
                }],
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
            setSaveVerificationState('error');
            setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر إضافة الطالب الآن.');
            setImportError(error instanceof Error ? error.message : 'تعذر إضافة الطالب الآن.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleCopyCode = async (code: string, codeId: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCodeId(codeId);
            window.setTimeout(() => setCopiedCodeId((current) => (current === codeId ? null : current)), 1800);
        } catch (error) {
            console.warn('Failed to copy access code:', error);
        }
    };

    if (selectedSchool) {
        const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === selectedSchool.id);
        const schoolCodes = accessCodes.filter((code) => code.schoolId === selectedSchool.id);
        const schoolClasses = classes.filter((group) => group.parentId === selectedSchool.id);
        const schoolStudents = getStudentsForSchool(selectedSchool, schoolClasses, students);
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
        const schoolCourses = publishedCourses.filter((course) => selectedSchool.courseIds.includes(course.id));
        const activeSchoolPackages = schoolPackages.filter((pkg) => pkg.status === 'active');
        const activeSchoolCodes = schoolCodes.filter((code) => code.expiresAt > Date.now());
        const tableSchoolCodes = pagedAccessCodes.length > 0 ? pagedAccessCodes : schoolCodes;
        const selectedPackageForCode = schoolPackages.find((pkg) => pkg.id === selectedPackageIdForCode);
        const totalSeats = activeSchoolPackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
        const usedSeats = schoolCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
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
                setManagementError(error instanceof Error ? error.message : 'تعذر حذف المدرسة الآن.');
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
                await createGroupAsync({
                    id: `class_${now}`,
                    name: `فصل جديد - ${selectedSchool.name}`,
                    type: 'CLASS',
                    parentId: selectedSchool.id,
                    ownerId: user.id,
                    supervisorIds: [],
                    studentIds: [],
                    courseIds: [],
                    createdAt: now,
                    totalStudents: 0,
                    totalSupervisors: 0,
                    totalCourses: 0,
                });
                await refreshSchoolWorkspace(selectedSchool.id);
                setSaveVerificationState('success');
                setSaveVerificationMessage('تم الحفظ والتأكد من الفصل من الخادم.');
                setManagementNotice(notice);
            } catch (error) {
                setSaveVerificationState('error');
                setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر إنشاء الفصل الآن.');
                setManagementError(error instanceof Error ? error.message : 'تعذر إنشاء الفصل الآن.');
            } finally {
                setSchoolActionPending(null);
            }
        };
        const handleAssignSchoolSupervisor = async (supervisorId: string, groupId: string) => {
            const targetGroup = [selectedSchool, ...schoolClasses].find((group) => group.id === groupId);
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
                setSaveVerificationState('error');
                setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر ربط المشرف الآن.');
                setManagementError(error instanceof Error ? error.message : 'تعذر ربط المشرف الآن.');
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleRemoveSchoolSupervisor = async (supervisorId: string, groupId: string) => {
            const targetGroup = [selectedSchool, ...schoolClasses].find((group) => group.id === groupId);
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
                setSaveVerificationState('error');
                setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر إزالة المشرف الآن.');
                setManagementError(error instanceof Error ? error.message : 'تعذر إزالة المشرف الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر نقل الطالب الآن.');
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleRemoveStudentScope = async (studentId: string, groupId: string) => {
            const targetStudent = schoolStudents.find((student) => student.id === studentId);
            const targetGroup = [selectedSchool, ...schoolClasses].find((group) => group.id === groupId);
            setRosterActionPending(`student-remove-${groupId}-${studentId}`);
            setManagementError(null);
            setManagementNotice(null);
            try {
                await removeStudentFromGroupAsync(studentId, groupId);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice(`تم حفظ إخراج ${targetStudent?.name || 'الطالب'} من ${targetGroup?.name || 'النطاق المحدد'}.`);
            } catch (error) {
                setManagementError(error instanceof Error ? error.message : 'تعذر إخراج الطالب الآن.');
            } finally {
                setRosterActionPending(null);
            }
        };
        const handleCreateQuickSupervisor = async (fallbackGroupId?: string) => {
            const name = quickSupervisor.name.trim();
            const email = quickSupervisor.email.trim().toLowerCase();
            const targetGroupId = quickSupervisor.targetGroupId || fallbackGroupId || selectedSchool.id;
            const targetGroup = [selectedSchool, ...schoolClasses].find((group) => group.id === targetGroupId);

            if (!name || !email) {
                setManagementError('اكتب اسم المشرف وبريده قبل الإنشاء أو الربط.');
                setManagementNotice(null);
                return;
            }

            if (!targetGroup) {
                setManagementError('اختر نطاق المشرف: المدرسة كاملة أو فصل محدد.');
                setManagementNotice(null);
                return;
            }

            const existingSupervisor = supervisors.find((currentUser) => (currentUser.email || '').trim().toLowerCase() === email);
            const password = quickSupervisor.password.trim() || generateTemporaryPassword();

            setRosterActionPending(`supervisor-quick-${targetGroupId}`);
            try {
                let supervisor = existingSupervisor;

                if (!supervisor) {
                    const response = await api.createAdminUser({
                        name,
                        email,
                        password,
                        role: Role.SUPERVISOR,
                        schoolId: selectedSchool.id,
                        groupIds: [targetGroupId],
                    }) as { user?: AdminUserPayload };

                    if (!response.user) {
                        throw new Error('لم يرجع الخادم حساب المشرف الجديد.');
                    }

                    supervisor = buildStoreUser(response.user);
                    addUser(supervisor);
                }

                await assignSupervisorToGroupAsync(supervisor.id, targetGroupId);

                await refreshSchoolWorkspace(selectedSchool.id);

                setQuickSupervisor({ name: '', email: '', password: '', targetGroupId: '' });
                setManagementError(null);
                setManagementNotice(
                    existingSupervisor
                        ? `تم ربط ${supervisor.name} على نطاق ${targetGroup.name}.`
                        : `تم إنشاء وربط ${supervisor.name} على نطاق ${targetGroup.name}. كلمة المرور المؤقتة: ${password}`,
                );
            } catch (error) {
                setManagementError(error instanceof Error ? error.message : 'تعذر إنشاء أو ربط المشرف الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر حفظ الباقة المدرسية الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر حفظ تعديل الباقة المدرسية الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر حذف الباقة المدرسية الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر إيقاف كل الباقات الآن.');
            } finally {
                setPackageActionPending(null);
            }
        };
        const handleCreateSchoolAccessCode = async () => {
            setManagementError(null);
            setManagementNotice(null);

            if (activeSchoolPackages.length === 0) {
                setManagementError('يجب وجود باقة نشطة قبل توليد كود تفعيل.');
                return;
            }

            if (!selectedPackageIdForCode) {
                setManagementError('اختر الباقة النشطة التي سيعمل عليها كود التفعيل أولًا.');
                return;
            }

            if (!selectedPackageForCode || selectedPackageForCode.status !== 'active') {
                setManagementError('لا يمكن توليد كود على باقة موقوفة. فعّل الباقة أو اختر باقة نشطة.');
                return;
            }

            const now = Date.now();
            const accessCode: AccessCode = {
                id: `code_${now}`,
                code: `${selectedSchool.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                schoolId: selectedSchool.id,
                packageId: selectedPackageIdForCode,
                maxUses: Math.max(1, Number(newCodeMaxUses) || 50),
                currentUses: 0,
                expiresAt: now + Math.max(1, Number(newCodeDurationDays) || 30) * 24 * 60 * 60 * 1000,
                createdAt: now,
            };

            setAccessCodeActionPending(`create-${accessCode.id}`);
            try {
                await createAccessCodeAsync(accessCode);
                await refreshSchoolWorkspace(selectedSchool.id);
                setManagementNotice('تم توليد كود التفعيل وحفظه بعد التحقق من الخادم.');
            } catch (error) {
                setManagementError(error instanceof Error ? error.message : 'تعذر توليد كود التفعيل الآن.');
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
                setManagementError(error instanceof Error ? error.message : 'تعذر حذف كود التفعيل الآن.');
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
            try {
                await navigator.clipboard.writeText(schoolHandoverMessage);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = schoolHandoverMessage;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            setManagementNotice('تم نسخ رسالة تسليم المدرسة للإدارة.');
            setManagementError(null);
        };
        const downloadSchoolGapReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-readiness-gaps.xlsx`, [
                {
                    name: 'launch-summary',
                    rows: [
                        ['البند', 'القيمة'],
                        ['اسم المدرسة', selectedSchool.name],
                        ['حالة الجاهزية', readinessStatusLabel],
                        ['درجة الجاهزية', `${readinessScore}/${readinessChecks.length}`],
                        ['الخطوة التالية', readinessNextStep],
                        ['طلاب بلا فصل', studentsWithoutClass.length],
                        ['طلاب بلا ولي أمر', studentsWithoutParent.length],
                        ['مشرفون بلا فصل محدد', supervisorsWithoutClass.length],
                    ],
                },
                {
                    name: 'warnings',
                    rows: [
                        ['الملاحظة'],
                        ...(operationalWarnings.length ? operationalWarnings : ['لا توجد ملاحظات تشغيلية حرجة.']).map((warning) => [warning]),
                    ],
                },
                {
                    name: 'students-without-class',
                    rows: [
                        ['الطالب', 'البريد', 'الحالة'],
                        ...studentsWithoutClass.map((student) => [
                            student.name,
                            student.email || '',
                            student.isActive === false ? 'موقوف' : 'نشط',
                        ]),
                    ],
                },
                {
                    name: 'students-without-parent',
                    rows: [
                        ['الطالب', 'البريد', 'الفصل'],
                        ...studentsWithoutParent.map((student) => [
                            student.name,
                            student.email || '',
                            schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id))?.name || 'بدون فصل',
                        ]),
                    ],
                },
                {
                    name: 'supervisors',
                    rows: [
                        ['الاسم', 'البريد', 'الدور', 'النطاق'],
                        ...schoolSupervisors.map((currentUser) => [
                            currentUser.name,
                            currentUser.email || '',
                            currentUser.role === Role.TEACHER ? 'معلم' : 'مشرف',
                            (currentUser.groupIds || [])
                                .map((groupId) => groups.find((group) => group.id === groupId)?.name || groupId)
                                .join(' | ') || selectedSchool.name,
                        ]),
                    ],
                },
            ]);
        };
        const downloadSchoolHandover = () => {
            createWorkbookDownload(`${selectedSchool.name}-handover.xlsx`, [
                {
                    name: 'summary',
                    rows: [
                        ['البند', 'القيمة'],
                        ['اسم المدرسة', selectedSchool.name],
                        ['حالة الجاهزية', `${readinessScore}/${readinessChecks.length}`],
                        ['إجمالي الطلاب', schoolStudents.length],
                        ['الفصول', schoolClasses.length],
                        ['المشرفون والمعلمون', schoolSupervisors.length],
                        ['الباقات النشطة', activeSchoolPackages.length],
                        ['الأكواد الصالحة', activeSchoolCodes.length],
                        ['المقاعد المتاحة', totalSeats],
                        ['المقاعد المستخدمة', usedSeats],
                    ],
                },
                {
                    name: 'readiness',
                    rows: [
                        ['الفحص', 'الحالة', 'ملاحظة'],
                        ...readinessChecks.map((check) => [check.label, check.isReady ? 'جاهز' : 'يحتاج استكمال', check.hint]),
                    ],
                },
                {
                    name: 'launch-plan',
                    rows: [
                        ['المرحلة', 'الإجراء', 'الملاحظة'],
                        ...schoolLaunchPlan,
                    ],
                },
                {
                    name: 'supervisor-checklist',
                    rows: [
                        ['البند', 'الحالة'],
                        ...supervisorHandoverChecklist,
                    ],
                },
                {
                    name: 'handover-message',
                    rows: [
                        ['رسالة جاهزة للإدارة'],
                        ...schoolHandoverMessage.split('\n').map((line) => [line]),
                    ],
                },
                {
                    name: 'classes',
                    rows: [
                        ['اسم الفصل', 'عدد الطلاب', 'عدد المشرفين', 'عدد الدورات'],
                        ...schoolClasses.map((classroom) => [
                            classroom.name,
                            classroom.studentIds.length,
                            classroom.supervisorIds.length,
                            classroom.courseIds.length,
                        ]),
                    ],
                },
                {
                    name: 'students',
                    rows: [
                        ['اسم الطالب', 'البريد الإلكتروني', 'الفصل', 'الحالة'],
                        ...schoolStudents.map((student) => {
                            const classroomName = schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id))?.name || 'بدون فصل';
                            return [student.name, student.email || '', classroomName, student.isActive === false ? 'موقوف' : 'نشط'];
                        }),
                    ],
                },
                {
                    name: 'packages',
                    rows: [
                        ['اسم الباقة', 'الحالة', 'نوع الوصول', 'أقصى عدد طلاب', 'أنواع المحتوى', 'المسارات', 'المواد'],
                        ...schoolPackages.map((pkg) => [
                            pkg.name,
                            pkg.status === 'active' ? 'نشطة' : 'موقوفة',
                            pkg.type === 'free_access' ? 'وصول مجاني' : 'خصم',
                            pkg.maxStudents || 0,
                            (pkg.contentTypes || []).join(' | '),
                            (pkg.pathIds || []).map((pathId) => paths.find((path) => path.id === pathId)?.name || pathId).join(' | ') || 'كل المسارات',
                            (pkg.subjectIds || []).map((subjectId) => subjects.find((subject) => subject.id === subjectId)?.name || subjectId).join(' | ') || 'كل المواد',
                        ]),
                    ],
                },
                {
                    name: 'access-codes',
                    rows: [
                        ['الكود', 'الباقة', 'الاستخدام', 'أقصى استخدام', 'تاريخ الانتهاء', 'الحالة'],
                        ...schoolCodes.map((code) => [
                            code.code,
                            schoolPackages.find((pkg) => pkg.id === code.packageId)?.name || code.packageId,
                            code.currentUses || 0,
                            code.maxUses || 0,
                            new Date(code.expiresAt).toLocaleDateString('ar-SA'),
                            code.expiresAt > Date.now() ? 'صالح' : 'منتهي',
                        ]),
                    ],
                },
                {
                    name: 'supervisors',
                    rows: [
                        ['الاسم', 'البريد', 'الدور'],
                        ...schoolSupervisors.map((currentUser) => [
                            currentUser.name,
                            currentUser.email || '',
                            currentUser.role === Role.TEACHER ? 'معلم' : 'مشرف',
                        ]),
                    ],
                },
            ]);
        };

        const downloadSchoolPerformanceReport = () => {
            if (!schoolReport) return;

            createWorkbookDownload(`${selectedSchool.name}-performance-report.xlsx`, [
                {
                    name: 'summary',
                    rows: [
                        ['البند', 'القيمة'],
                        ['اسم المدرسة', schoolReport.school.name],
                        ['إجمالي الطلاب', schoolReport.metrics.totalStudents],
                        ['الطلاب النشطون', schoolReport.metrics.activeStudents],
                        ['عدد الفصول', schoolReport.metrics.totalClasses],
                        ['الباقات النشطة', schoolReport.metrics.activePackages],
                        ['الأكواد النشطة', schoolReport.metrics.activeCodes],
                        ['محاولات الاختبار', schoolReport.metrics.quizAttempts],
                        ['متوسط الأداء', `${schoolReport.metrics.averageScore}%`],
                    ],
                },
                {
                    name: 'weak-skills',
                    rows: [
                        ['المهارة', 'المادة', 'المهارة الرئيسية', 'عدد المحاولات', 'نسبة الإتقان', 'الأولوية'],
                        ...schoolReport.weakestSkills.map((item) => {
                            const subjectName = subjects.find((subject) => subject.id === item.subjectId)?.name || '';
                            const sectionName = sections.find((section) => section.id === item.sectionId)?.name || '';
                            return [
                                item.skill,
                                subjectName,
                                sectionName,
                                item.attempts,
                                `${item.mastery}%`,
                                item.mastery < 50 ? 'خطة علاجية عاجلة' : 'متابعة وتدريب إضافي',
                            ];
                        }),
                    ],
                },
                {
                    name: 'classes',
                    rows: [
                        ['الفصل', 'عدد الطلاب', 'عدد المشرفين', 'محاولات الاختبار', 'متوسط الأداء', 'التوصية'],
                        ...schoolReport.classSummaries.map((classroom) => [
                            classroom.name,
                            classroom.studentCount,
                            classroom.supervisorCount,
                            classroom.quizAttempts,
                            `${classroom.averageScore}%`,
                            classroom.averageScore < 50 ? 'متابعة قريبة وخطة علاجية' : classroom.averageScore < 70 ? 'تدريبات داعمة' : 'مستوى مطمئن',
                        ]),
                    ],
                },
            ]);
        };

        const handleAssignCourseToSchool = (courseId: string) => {
            assignCourseToGroup(courseId, selectedSchool.id);
            setSelectedSchool((current) =>
                current
                    ? {
                          ...current,
                          courseIds: current.courseIds.includes(courseId)
                              ? current.courseIds
                              : [...current.courseIds, courseId],
                      }
                    : current,
            );
        };

        const handleRemoveCourseFromSchool = (courseId: string) => {
            removeCourseFromGroup(courseId, selectedSchool.id);
            setSelectedSchool((current) =>
                current
                    ? {
                          ...current,
                          courseIds: current.courseIds.filter((id) => id !== courseId),
                      }
                    : current,
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
                        setSaveVerificationState('error');
                        setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر تعديل اسم الفصل الآن.');
                        setManagementError(error instanceof Error ? error.message : 'تعذر تعديل اسم الفصل الآن.');
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
                setSaveVerificationState('error');
                setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');
                setManagementError(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');
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
            const classStudents = schoolStudents.filter((student) => (
                classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id)
            ));
            const classSupervisors = supervisors.filter((currentUser) => (
                classroom.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(classroom.id)
            ));
            const classCourses = publishedCourses.filter((course) => classroom.courseIds.includes(course.id));
            const classSummary = schoolReport?.classSummaries.find((item) => item.id === classroom.id || item.name === classroom.name);
            const studentsWithoutLinkedParent = classStudents.filter((student) => (
                !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id))
            ));

            createWorkbookDownload(`${selectedSchool.name}-${classroom.name}-class-report.xlsx`, [
                {
                    name: 'summary',
                    rows: [
                        ['البند', 'القيمة'],
                        ['المدرسة', selectedSchool.name],
                        ['الفصل', classroom.name],
                        ['عدد الطلاب', classStudents.length],
                        ['عدد المشرفين', classSupervisors.length],
                        ['عدد الدورات', classCourses.length],
                        ['طلاب بلا ولي أمر', studentsWithoutLinkedParent.length],
                        ['محاولات الاختبار', classSummary?.quizAttempts || 0],
                        ['متوسط الأداء', classSummary ? `${classSummary.averageScore}%` : 'لا توجد بيانات كافية'],
                        ['التوصية', !classSummary ? 'ابدأ بجمع نتائج من الطلاب' : classSummary.averageScore < 50 ? 'متابعة قريبة وخطة علاجية' : classSummary.averageScore < 70 ? 'تدريبات داعمة' : 'مستوى مطمئن'],
                    ],
                },
                {
                    name: 'students',
                    rows: [
                        ['اسم الطالب', 'البريد', 'الحالة', 'أولياء الأمور', 'ملاحظة'],
                        ...classStudents.map((student) => {
                            const studentParents = parents.filter((parent) => (parent.linkedStudentIds || []).includes(student.id));
                            return [
                                student.name,
                                student.email || '',
                                student.isActive === false ? 'موقوف' : 'نشط',
                                studentParents.map((parent) => parent.name).join(' | ') || 'لا يوجد',
                                studentParents.length ? 'جاهز للمتابعة' : 'يحتاج ربط ولي أمر',
                            ];
                        }),
                    ],
                },
                {
                    name: 'supervisors',
                    rows: [
                        ['الاسم', 'البريد', 'الدور'],
                        ...classSupervisors.map((currentUser) => [
                            currentUser.name,
                            currentUser.email || '',
                            currentUser.role === Role.TEACHER ? 'معلم' : 'مشرف',
                        ]),
                    ],
                },
                {
                    name: 'courses',
                    rows: [
                        ['الدورة', 'الحالة'],
                        ...classCourses.map((course) => [course.title, course.isPublished === false ? 'غير منشورة' : 'منشورة']),
                    ],
                },
            ]);
        };

        const printSchoolReport = () => {
            const warnings = operationalWarnings.length ? operationalWarnings : ['لا توجد ملاحظات تشغيلية حرجة.'];
            const printedAt = new Date().toLocaleString('ar-SA');
            const bodyHtml = `
                <section class="hero">
                    <p class="muted">تقرير جاهزية وتشغيل المدرسة</p>
                    <h1>${escapeHtml(selectedSchool.name)}</h1>
                    <p class="muted">تم إنشاء التقرير في ${escapeHtml(printedAt)}</p>
                </section>
                <section class="metrics">
                    <div class="metric"><span>جاهزية التشغيل</span><strong>${readinessScore}/${readinessChecks.length}</strong></div>
                    <div class="metric"><span>الطلاب</span><strong>${schoolStudents.length}</strong></div>
                    <div class="metric"><span>الفصول</span><strong>${schoolClasses.length}</strong></div>
                    <div class="metric"><span>الباقات النشطة</span><strong>${activeSchoolPackages.length}</strong></div>
                    <div class="metric"><span>أكواد فعالة</span><strong>${activeSchoolCodes.length}</strong></div>
                    <div class="metric"><span>المقاعد المتاحة</span><strong>${totalSeats}</strong></div>
                    <div class="metric"><span>المقاعد المستخدمة</span><strong>${usedSeats}</strong></div>
                    <div class="metric"><span>المشرفون</span><strong>${schoolSupervisors.length}</strong></div>
                </section>
                <h2>فحص الجاهزية</h2>
                ${renderPrintTable(
                    ['الفحص', 'الحالة', 'ملاحظة'],
                    readinessChecks.map((check) => [check.label, check.isReady ? 'جاهز' : 'يحتاج استكمال', check.hint]),
                )}
                <h2>الفصول</h2>
                ${renderPrintTable(
                    ['الفصل', 'الطلاب', 'المشرفون', 'الدورات'],
                    schoolClasses.map((classroom) => [
                        classroom.name,
                        schoolStudents.filter((student) => classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id)).length,
                        supervisors.filter((currentUser) => classroom.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(classroom.id)).length,
                        classroom.courseIds.length,
                    ]),
                )}
                <h2>الباقات والأكواد</h2>
                ${renderPrintTable(
                    ['الباقة', 'الحالة', 'نوع الوصول', 'حد الطلاب', 'الأكواد'],
                    schoolPackages.map((pkg) => [
                        pkg.name,
                        pkg.status === 'active' ? 'نشطة' : 'موقوفة',
                        pkg.type === 'free_access' ? 'وصول مجاني' : `خصم ${pkg.discountPercentage || 0}%`,
                        pkg.maxStudents || 0,
                        schoolCodes.filter((code) => code.packageId === pkg.id).length,
                    ]),
                )}
                <h2>ملاحظات تشغيلية</h2>
                ${renderPrintTable(['الملاحظة'], warnings.map((warning) => [warning]))}
            `;

            if (!openPrintWindow(`${selectedSchool.name} - تقرير المدرسة`, bodyHtml)) {
                setManagementError('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
            }
        };

        const printClassReport = (classroom: Group) => {
            const classStudents = schoolStudents.filter((student) => (
                classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id)
            ));
            const classSupervisors = supervisors.filter((currentUser) => (
                classroom.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(classroom.id)
            ));
            const classCourses = publishedCourses.filter((course) => classroom.courseIds.includes(course.id));
            const classSummary = schoolReport?.classSummaries.find((item) => item.id === classroom.id || item.name === classroom.name);
            const studentsWithoutLinkedParent = classStudents.filter((student) => (
                !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id))
            ));
            const printedAt = new Date().toLocaleString('ar-SA');
            const bodyHtml = `
                <section class="hero">
                    <p class="muted">تقرير فصل داخل المدرسة</p>
                    <h1>${escapeHtml(classroom.name)}</h1>
                    <p class="muted">${escapeHtml(selectedSchool.name)} - ${escapeHtml(printedAt)}</p>
                </section>
                <section class="metrics">
                    <div class="metric"><span>الطلاب</span><strong>${classStudents.length}</strong></div>
                    <div class="metric"><span>المشرفون</span><strong>${classSupervisors.length}</strong></div>
                    <div class="metric"><span>الدورات</span><strong>${classCourses.length}</strong></div>
                    <div class="metric"><span>طلاب بلا ولي أمر</span><strong>${studentsWithoutLinkedParent.length}</strong></div>
                    <div class="metric"><span>محاولات الاختبار</span><strong>${classSummary?.quizAttempts || 0}</strong></div>
                    <div class="metric"><span>متوسط الأداء</span><strong>${classSummary ? `${classSummary.averageScore}%` : '-'}</strong></div>
                </section>
                <h2>الطلاب</h2>
                ${renderPrintTable(
                    ['الطالب', 'البريد', 'الحالة', 'أولياء الأمور', 'ملاحظة'],
                    classStudents.map((student) => {
                        const studentParents = parents.filter((parent) => (parent.linkedStudentIds || []).includes(student.id));
                        return [
                            student.name,
                            student.email || '',
                            student.isActive === false ? 'موقوف' : 'نشط',
                            studentParents.map((parent) => parent.name).join(' | ') || 'لا يوجد',
                            studentParents.length ? 'جاهز للمتابعة' : 'يحتاج ربط ولي أمر',
                        ];
                    }),
                )}
                <h2>المشرفون والدورات</h2>
                ${renderPrintTable(
                    ['النوع', 'الاسم', 'تفصيل'],
                    [
                        ...classSupervisors.map((currentUser) => [
                            currentUser.role === Role.TEACHER ? 'معلم' : 'مشرف',
                            currentUser.name,
                            currentUser.email || '',
                        ]),
                        ...classCourses.map((course) => [
                            'دورة',
                            course.title,
                            course.isPublished === false ? 'غير منشورة' : 'منشورة',
                        ]),
                    ],
                )}
            `;

            if (!openPrintWindow(`${selectedSchool.name} - ${classroom.name}`, bodyHtml)) {
                setManagementError('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
            }
        };

        const downloadPackagesReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-packages-and-codes.xlsx`, [
                {
                    name: 'packages',
                    rows: [
                        ['اسم الباقة', 'الحالة', 'نوع الوصول', 'المعلم/المدرب', 'نسبة المعلم', 'حد الطلاب', 'الدورات', 'أنواع المحتوى', 'المسارات', 'المواد', 'توصية'],
                        ...schoolPackages.map((pkg) => {
                            const packageCodes = schoolCodes.filter((code) => code.packageId === pkg.id);
                            const packageTeacher = teachers.find((teacher) => teacher.id === pkg.assignedTeacherId);
                            return [
                                pkg.name,
                                pkg.status === 'active' ? 'نشطة' : 'موقوفة',
                                pkg.type === 'free_access' ? 'وصول مجاني' : `خصم ${pkg.discountPercentage || 0}%`,
                                packageTeacher?.name || 'غير محدد',
                                pkg.revenueSharePercentage != null ? `${pkg.revenueSharePercentage}%` : 'غير محددة',
                                pkg.maxStudents || 0,
                                pkg.courseIds.length,
                                (pkg.contentTypes || []).join(' | ') || 'all',
                                (pkg.pathIds || []).map((pathId) => paths.find((path) => path.id === pathId)?.name || pathId).join(' | ') || 'كل المسارات',
                                (pkg.subjectIds || []).map((subjectId) => subjects.find((subject) => subject.id === subjectId)?.name || subjectId).join(' | ') || 'كل المواد',
                                pkg.status !== 'active'
                                    ? 'موقوفة ولا يفضل توليد أكواد جديدة عليها'
                                    : packageCodes.length === 0
                                        ? 'ولّد كود تفعيل قبل التسليم'
                                        : 'جاهزة للتسليم',
                            ];
                        }),
                    ],
                },
                {
                    name: 'access-codes',
                    rows: [
                        ['الكود', 'الباقة', 'حالة الباقة', 'الاستخدام', 'أقصى استخدام', 'تاريخ الانتهاء', 'حالة الكود'],
                        ...schoolCodes.map((code) => {
                            const pkg = schoolPackages.find((item) => item.id === code.packageId);
                            return [
                                code.code,
                                pkg?.name || code.packageId,
                                pkg?.status === 'active' ? 'نشطة' : 'موقوفة/غير معروفة',
                                code.currentUses || 0,
                                code.maxUses || 0,
                                new Date(code.expiresAt).toLocaleDateString('ar-SA'),
                                code.expiresAt > Date.now() ? 'صالح' : 'منتهي',
                            ];
                        }),
                    ],
                },
                {
                    name: 'readiness',
                    rows: [
                        ['الفحص', 'القيمة', 'ملاحظة'],
                        ['الباقات النشطة', activeSchoolPackages.length, activeSchoolPackages.length ? 'جيد' : 'فعّل باقة واحدة على الأقل'],
                        ['الأكواد الصالحة', activeSchoolCodes.length, activeSchoolCodes.length ? 'جاهز للتوزيع' : 'ولّد كود تفعيل صالح'],
                        ['المقاعد النشطة', totalSeats, totalSeats ? 'مرتبطة بالباقات النشطة فقط' : 'راجع سعة الباقات'],
                        ['الاستخدام الحالي', usedSeats, usedSeats >= totalSeats && totalSeats > 0 ? 'راجع المقاعد المتبقية' : 'ضمن السعة'],
                    ],
                },
            ]);
        };

        const downloadRelationsReport = () => {
            createWorkbookDownload(`${selectedSchool.name}-relations-report.xlsx`, [
                {
                    name: 'summary',
                    rows: [
                        ['البند', 'القيمة'],
                        ['اسم المدرسة', selectedSchool.name],
                        ['إجمالي الطلاب', schoolStudents.length],
                        ['أولياء الأمور المرتبطون', schoolParentUsers.length],
                        ['المشرفون والمعلمون', schoolSupervisors.length],
                        ['طلاب بلا ولي أمر', studentsWithoutParent.length],
                        ['طلاب بلا فصل', studentsWithoutClass.length],
                        ['مشرفون بلا فصل محدد', supervisorsWithoutClass.length],
                    ],
                },
                {
                    name: 'students',
                    rows: [
                        ['اسم الطالب', 'بريد الطالب', 'الفصل', 'أولياء الأمور', 'حالة الربط'],
                        ...schoolStudents.map((student) => {
                            const studentParents = parents.filter((parent) => (parent.linkedStudentIds || []).includes(student.id));
                            const classroomName = schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id))?.name || 'بدون فصل';
                            return [
                                student.name,
                                student.email || '',
                                classroomName,
                                studentParents.map((parent) => parent.name).join(' | ') || 'لا يوجد',
                                studentParents.length > 0 ? 'مرتبط' : 'يحتاج ولي أمر',
                            ];
                        }),
                    ],
                },
                {
                    name: 'parents',
                    rows: [
                        ['اسم ولي الأمر', 'البريد', 'عدد الطلاب', 'الطلاب المرتبطون', 'بريد الطلاب'],
                        ...schoolParentUsers.map((parent) => {
                            const linkedStudents = schoolStudents.filter((student) => (parent.linkedStudentIds || []).includes(student.id));
                            return [
                                parent.name,
                                parent.email || '',
                                linkedStudents.length,
                                linkedStudents.map((student) => student.name).join(' | '),
                                linkedStudents.map((student) => student.email || '').join(' | '),
                            ];
                        }),
                    ],
                },
                {
                    name: 'supervisors',
                    rows: [
                        ['اسم المشرف', 'البريد', 'الدور', 'النطاق'],
                        ...schoolSupervisors.map((currentUser) => {
                            const scopes = [
                                selectedSchool.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(selectedSchool.id)
                                    ? selectedSchool.name
                                    : '',
                                ...schoolClasses
                                    .filter((classroom) => classroom.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(classroom.id))
                                    .map((classroom) => classroom.name),
                            ].filter(Boolean);
                            return [
                                currentUser.name,
                                currentUser.email || '',
                                currentUser.role === Role.TEACHER ? 'معلم' : 'مشرف',
                                scopes.join(' | ') || 'بدون نطاق واضح',
                            ];
                        }),
                    ],
                },
                {
                    name: 'missing',
                    rows: [
                        ['النوع', 'الاسم', 'البريد', 'ملاحظة'],
                        ...studentsWithoutParent.map((student) => ['طالب بلا ولي أمر', student.name, student.email || '', 'اربط ولي أمر من تبويب الربط']),
                        ...studentsWithoutClass.map((student) => ['طالب بلا فصل', student.name, student.email || '', 'حدد فصل الطالب من تبويب النظرة العامة أو ملف الربط']),
                        ...supervisorsWithoutClass.map((currentUser) => ['مشرف بلا فصل', currentUser.name, currentUser.email || '', 'يمكن إبقاؤه على مستوى المدرسة أو ربطه بفصل محدد']),
                    ],
                },
            ]);
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
                setRelationError(error instanceof Error ? error.message : 'تعذر تنفيذ الربط وإنشاء الحسابات الآن.');
            } finally {
                setIsApplyingRelations(false);
                if (createdCredentials.length) {
                    void refreshUsers();
                }
            }
        };

        return (
            <div data-testid="school-workspace-shell" className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-fade-in">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <button onClick={() => { setManagementError(null); setManagementNotice(null); setIsDeleteSchoolConfirmOpen(false); setSelectedSchool(null); }} className="text-gray-500 hover:text-gray-900">
                        &rarr; عودة لقائمة المدارس
                    </button>
                    <h1 className="min-w-[220px] flex-1 text-2xl font-bold text-gray-900">{selectedSchool.name}</h1>
                    <button
                        type="button"
                        data-testid="school-save-verify-button"
                        onClick={() => void handleSaveAndVerifySchool()}
                        disabled={isSchoolWorkspaceBusy}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                            saveVerificationState === 'error'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : saveVerificationState === 'success'
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        title="حفظ ثم إعادة قراءة بيانات المدرسة من الخادم للتأكد"
                    >
                        <CheckCircle size={16} />
                        {saveVerificationButtonLabel}
                    </button>
                    <button
                        onClick={() => {
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
                                        setSaveVerificationState('error');
                                        setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر تعديل اسم المدرسة الآن.');
                                        setManagementError(error instanceof Error ? error.message : 'تعذر تعديل اسم المدرسة الآن.');
                                        throw error;
                                    } finally {
                                        setSchoolActionPending(null);
                                    }
                                }
                            });
                        }}
                        disabled={isSchoolWorkspaceBusy}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                        title="تعديل اسم المدرسة"
                    >
                        <Edit2 size={16} />
                        تعديل الاسم
                    </button>
                    <button
                        onClick={downloadSchoolHandover}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="تحميل ملف تسليم شامل للمدرسة"
                    >
                        <Download size={16} />
                        ملف تسليم المدرسة
                    </button>
                    <button
                        onClick={() => void copySchoolHandoverMessage()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                        title="نسخ رسالة جاهزة لإرسالها لإدارة المدرسة"
                    >
                        <Clipboard size={16} />
                        نسخ رسالة التسليم
                    </button>
                    <button
                        onClick={printSchoolReport}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        title="طباعة تقرير جاهزية وتشغيل المدرسة"
                    >
                        <Printer size={16} />
                        طباعة التقرير
                    </button>
                    <button
                        type="button"
                        data-testid="school-delete-button"
                        onClick={handleDeleteSelectedSchool}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors"
                        title="حذف المدرسة وفصلها عن الطلاب والمشرفين"
                    >
                        <Trash2 size={16} />
                        حذف المدرسة
                    </button>
                </div>

                {isDeleteSchoolConfirmOpen && (
                    <div data-testid="school-delete-confirm-panel" className="rounded-2xl border border-red-200 bg-red-50 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-red-700">
                                    <Trash2 size={14} />
                                    تأكيد حذف مدرسة
                                </div>
                                <h3 className="mt-3 text-lg font-black text-gray-900">راجع الأثر قبل حذف {selectedSchool.name}</h3>
                                <p className="mt-1 text-sm font-bold leading-6 text-red-800">
                                    الحذف يزيل المدرسة من هذه القائمة ويفصل نطاقها التشغيلي. استخدمه للتنظيف فقط عندما تكون متأكدًا أن المدرسة ليست عقدًا نشطًا.
                                </p>
                            </div>
                            <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
                                {[
                                    ['فصول', schoolClasses.length],
                                    ['طلاب', schoolStudents.length],
                                    ['مشرفون', schoolSupervisors.length],
                                    ['باقات', schoolPackages.length],
                                    ['أكواد', schoolCodes.length],
                                    ['جاهزية', `${readinessScore}/${readinessChecks.length}`],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-white px-3 py-2">
                                        <div className="text-lg font-black text-gray-900">{value}</div>
                                        <div className="text-[11px] font-black text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                data-testid="school-delete-cancel"
                                onClick={() => setIsDeleteSchoolConfirmOpen(false)}
                                className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition-colors hover:bg-gray-100"
                            >
                                إلغاء والعودة للإدارة
                            </button>
                            <button
                                type="button"
                                data-testid="school-delete-confirm"
                                onClick={confirmDeleteSelectedSchool}
                                disabled={Boolean(schoolActionPending)}
                                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-red-700"
                            >
                                حذف المدرسة نهائيًا
                            </button>
                        </div>
                    </div>
                )}

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

                <section data-testid="school-ux-launch-board" className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm p-6 space-y-6">
                    {/* Header Row: Back button, Name, Readiness Badge, and Action Pills */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                            <button
                                type="button"
                                onClick={() => { setManagementError(null); setManagementNotice(null); setIsDeleteSchoolConfirmOpen(false); setSelectedSchool(null); }}
                                className="mb-2 inline-flex items-center text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                &rarr; عودة لقائمة المدارس
                            </button>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-gray-950">{selectedSchool.name}</h2>
                                <span className={`rounded-full px-3 py-1 text-xs font-black border ${
                                    readinessScore === readinessChecks.length
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : readinessScore >= 3
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                    {readinessStatusLabel} ({readinessPercent}%)
                                </span>
                            </div>
                            <p data-testid="school-ux-next-action" className="mt-1.5 text-xs font-bold leading-6 text-gray-600">{readinessNextStep}</p>
                        </div>
                        
                        {/* Progress Bar & Gaps Quick Pill */}
                        <div className="min-w-[240px] space-y-2">
                            <div className="flex justify-between items-center text-xs font-black text-gray-500">
                                <span>نسبة الإنجاز</span>
                                <span>{readinessScore}/{readinessChecks.length} خطوات</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        readinessScore === readinessChecks.length ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${readinessPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 5-Step Workflow Stepper Bar */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900">مسار إعداد ومتابعة المدرسة</h3>
                            {expandedSchoolStep && (
                                <button
                                    onClick={() => setExpandedSchoolStep(null)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                                >
                                    <ChevronDown size={14} />
                                    <span>طي شريط الخطوات</span>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                            {commercialOperatingSteps.map((step, index) => {
                                const isOpen = expandedSchoolStep === step.tab;
                                return (
                                    <button
                                        key={step.id}
                                        type="button"
                                        data-testid={`school-ux-step-${step.id}`}
                                        onClick={() => {
                                            setActiveTab(step.tab);
                                            setExpandedSchoolStep((current) => (current === step.tab ? null : step.tab));
                                        }}
                                        className={`rounded-2xl border p-3.5 text-right transition-all flex flex-col justify-between h-full ${
                                            isOpen
                                                ? 'border-indigo-600 bg-indigo-950 text-white shadow-md'
                                                : step.isReady
                                                    ? 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950'
                                                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                                                isOpen ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-sm border border-slate-100'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                                isOpen ? 'bg-white/20 text-white' : step.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {step.statusLabel}
                                            </span>
                                        </div>
                                        <div>
                                            <span className={`block text-xs font-black ${isOpen ? 'text-white' : 'text-gray-950'}`}>{step.title}</span>
                                            <span className={`mt-0.5 block text-[11px] font-bold ${isOpen ? 'text-white/70' : 'text-slate-500'}`}>{step.metric}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <div className="flex-1 w-full flex flex-col min-h-0 relative">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
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

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <Search size={18} className="text-gray-400" />
                        <input
                            value={schoolSearch}
                            onChange={(event) => setSchoolSearch(event.target.value)}
                            placeholder="ابحث باسم المدرسة أو الجهة..."
                            className="w-full bg-transparent text-sm text-gray-700 outline-none"
                        />
                    </div>
                    <div data-testid="school-list-mode-filter" className="flex flex-wrap gap-2">
                        {[
                            { id: 'active', label: 'الأولوية التجارية' },
                            { id: 'needs_setup', label: 'تحتاج تجهيز' },
                            { id: 'ready', label: 'جاهزة' },
                            { id: 'all', label: 'عرض الكل/التنظيف' },
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                data-testid={`school-list-mode-${mode.id}`}
                                onClick={() => setSchoolListMode(mode.id as typeof schoolListMode)}
                                className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                                    schoolListMode === mode.id
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div data-testid="school-list-hygiene-summary" className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-700">
                    القائمة تعرض {filteredSchools.length} من {schools.length} مدرسة.
                    {hiddenDraftSchoolsCount > 0
                        ? ` تم عزل ${hiddenDraftSchoolsCount} مدرسة مسودة أو تجريبية عن الأولوية التجارية.`
                        : ' لا توجد مدارس تجريبية معزولة حاليًا.'}
                    {schoolListMode === 'all' ? ' أنت الآن في وضع المراجعة والتنظيف.' : ' استخدم عرض الكل/التنظيف عند مراجعة التجارب القديمة.'}
                </div>
                {schoolListMode === 'active' && hiddenDraftSchoolsCount > 0 && !schoolSearch.trim() && (
                    <div data-testid="school-hidden-drafts-note" className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span>تم إخفاء {hiddenDraftSchoolsCount} مدرسة مسودة أو تجريبية لتقليل الزحمة. افتح وضع التنظيف لمراجعتها أو حذف التجارب فقط.</span>
                            <button
                                type="button"
                                data-testid="school-open-cleanup-mode"
                                onClick={() => setSchoolListMode('all')}
                                className="inline-flex w-fit items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-amber-700"
                            >
                                فتح وضع التنظيف
                            </button>
                        </div>
                    </div>
                )}
                {schoolListMode === 'all' && (
                    <div data-testid="school-cleanup-review-panel" className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-900">
                        وضع التنظيف يعرض العقود والتجارب معًا للمراجعة. التجارب المعزولة تظهر بعلامة واضحة وزر "مراجعة الحذف"، ولا يتم حذف أي مدرسة إلا من لوحة التأكيد.
                        {visibleDraftSchoolsCount > 0
                            ? ` يظهر الآن ${visibleDraftSchoolsCount} مدرسة مسودة أو تجريبية داخل القائمة.`
                            : ' لا تظهر مدارس تجريبية في نتيجة البحث الحالية.'}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchools.map((school) => {
                    const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === school.id);
                    const schoolCodes = accessCodes.filter((code) => code.schoolId === school.id && code.expiresAt > Date.now());
                    const schoolClasses = classes.filter((group) => group.parentId === school.id);
                    const schoolStudents = getStudentsForSchool(school, schoolClasses, students);
                    const schoolClassCount = schoolClasses.length;
                    const activePackageCount = schoolPackages.filter((pkg) => pkg.status === 'active').length;
                    const cardOperationalSnapshot = getOperationalSnapshotForSchool(school);
                    const cardReadinessScore = [
                        schoolClassCount > 0,
                        schoolStudents.length > 0,
                        school.supervisorIds.length > 0,
                        activePackageCount > 0,
                        schoolCodes.length > 0,
                    ].filter(Boolean).length;
                    const cardReadinessTotal = 5;
                    const cardReadinessActions = [
                        {
                            id: 'classes',
                            label: 'الفصول',
                            isReady: schoolClassCount > 0,
                            tab: 'overview' as const,
                            hint: schoolClassCount > 0 ? `${schoolClassCount} فصل` : 'أضف فصولًا',
                        },
                        {
                            id: 'students',
                            label: 'الطلاب',
                            isReady: schoolStudents.length > 0,
                            tab: 'overview' as const,
                            hint: schoolStudents.length > 0 ? `${schoolStudents.length} طالب` : 'أضف الطلاب',
                        },
                        {
                            id: 'supervisors',
                            label: 'المشرفون',
                            isReady: school.supervisorIds.length > 0,
                            tab: 'relations' as const,
                            hint: school.supervisorIds.length > 0 ? `${school.supervisorIds.length} مشرف` : 'اربط مشرفًا',
                        },
                        {
                            id: 'packages',
                            label: 'الباقة/المسارات',
                            isReady: activePackageCount > 0,
                            tab: 'packages' as const,
                            hint: activePackageCount > 0 ? `${activePackageCount} باقة` : 'فعّل باقة ومسارات',
                        },
                        {
                            id: 'codes',
                            label: 'الأكواد',
                            isReady: schoolCodes.length > 0,
                            tab: 'packages' as const,
                            hint: schoolCodes.length > 0 ? `${schoolCodes.length} كود` : 'ولّد كودًا',
                        },
                    ];
                    const nextCardAction = cardReadinessActions.find((action) => !action.isReady);

                    return (
                        <div
                            key={school.id}
                            data-testid="school-card"
                            data-cleanup-draft={cardOperationalSnapshot.isCommerciallyHiddenDraft ? 'true' : 'false'}
                            className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 ${
                                cardOperationalSnapshot.isCommerciallyHiddenDraft && schoolListMode === 'all'
                                    ? 'border-amber-200 bg-amber-50/30'
                                    : 'border-slate-100 hover:border-indigo-100'
                            }`}
                        >
                            <div className="relative flex justify-between items-start mb-4">
                                <div className="w-13 h-13 bg-indigo-50/80 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                                        cardReadinessScore === cardReadinessTotal
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : cardReadinessScore >= 2
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {cardReadinessScore === cardReadinessTotal ? 'جاهزة للتشغيل 🟢' : 'قيد التجهيز 🟠'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggleSchoolActions(school.id)}
                                        className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                        title="إجراءات تشغيل المدرسة"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                                {activeSchoolActionsId === school.id && (
                                    <div className="absolute left-0 top-10 z-20 min-w-[180px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeSchoolActions();
                                                setSelectedSchool(school);
                                                setActiveTab('overview');
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-right text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            فتح التشغيل
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeSchoolActions();
                                                setSelectedSchool(school);
                                                setActiveTab('relations');
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-right text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            المشرفون والتسليم
                                        </button>
                                    </div>
                                )}
                            </div>

                            {cardOperationalSnapshot.isCommerciallyHiddenDraft && schoolListMode === 'all' && (
                                <div data-testid="school-card-cleanup-badge" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs font-black leading-5 text-amber-900 shadow-sm">
                                    مسودة/تجربة معزولة عن الأولوية التجارية. راجعها قبل حذفها حتى لا تحذف عقدًا حقيقيًا بالخطأ.
                                </div>
                            )}

                            <h3 className="text-lg font-black text-gray-900 mb-1">{school.name}</h3>
                            <p data-testid="school-card-operating-copy" className="text-xs text-gray-500 mb-4 leading-5">مسار تشغيل المدرسة: فصول، طلاب، مشرفون، باقة/مسارات، أكواد، ثم تقرير تسليم.</p>

                            <div data-testid="school-card-readiness" className={`mb-2.5 rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center justify-between border ${
                                cardReadinessScore === cardReadinessTotal
                                    ? 'bg-emerald-50/70 text-emerald-800 border-emerald-100'
                                    : cardReadinessScore >= 2
                                        ? 'bg-amber-50/70 text-amber-800 border-amber-100'
                                        : 'bg-rose-50/70 text-rose-800 border-rose-100'
                            }`}>
                                <span>{cardReadinessScore === cardReadinessTotal ? 'جاهزة للتشغيل' : 'تحتاج استكمال المسار'}</span>
                                <span className="font-black">{cardReadinessScore}/{cardReadinessTotal}</span>
                            </div>
                            <div data-testid="school-card-readiness-progress" className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100 p-0.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        cardReadinessScore === cardReadinessTotal
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                            : cardReadinessScore >= 2
                                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                : 'bg-gradient-to-r from-rose-500 to-red-500'
                                    }`}
                                    style={{ width: `${Math.round((cardReadinessScore / cardReadinessTotal) * 100)}%` }}
                                />
                            </div>
                            <div data-testid="school-card-next-action-panel" className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-black text-gray-400">الخطوة التالية</p>
                                    <span className="rounded-full bg-white border border-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-700 shadow-sm">
                                        {nextCardAction ? nextCardAction.label : 'جاهزة'}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-gray-800 leading-5">
                                    {nextCardAction ? nextCardAction.hint : 'افتح تشغيل المدرسة لمراجعة التسليم أو التقرير.'}
                                </p>
                                <button
                                    type="button"
                                    data-testid="school-card-next-action"
                                    onClick={() => {
                                        setSelectedSchool(school);
                                        setActiveTab(nextCardAction?.tab || 'overview');
                                    }}
                                    className="w-full rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100"
                                >
                                    {nextCardAction ? `ابدأ: ${nextCardAction.label}` : 'فتح مراجعة التسليم'}
                                </button>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                                    {cardReadinessActions.map((action) => (
                                        <button
                                            key={action.label}
                                            type="button"
                                            data-testid={`school-card-step-${action.id}`}
                                            onClick={() => {
                                                setSelectedSchool(school);
                                                setActiveTab(action.tab);
                                            }}
                                            className={`rounded-xl px-2 py-1.5 text-[10px] font-black transition-all border ${
                                                action.isReady
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                                            }`}
                                        >
                                            {action.label} {action.isReady ? '✓' : '•'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 mb-5">
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">طلاب</p>
                                    <p className="font-black text-gray-900 text-sm">{schoolStudents.length}</p>
                                </div>
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">باقات</p>
                                    <p className="font-black text-gray-900 text-sm">{activePackageCount}</p>
                                </div>
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">أكواد</p>
                                    <p className="font-black text-gray-900 text-sm">{schoolCodes.length}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                data-testid="school-card-open-management"
                                onClick={() => {
                                    setSelectedSchool(school);
                                    setActiveTab('overview');
                                }}
                                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black hover:bg-black transition-all shadow-md text-xs"
                            >
                                فتح تشغيل المدرسة
                            </button>
                            {cardOperationalSnapshot.isCommerciallyHiddenDraft && schoolListMode === 'all' && (
                                <button
                                    type="button"
                                    data-testid="school-card-review-delete"
                                    onClick={() => {
                                        setSelectedSchool(school);
                                        setActiveTab('overview');
                                        setIsDeleteSchoolConfirmOpen(true);
                                        window.setTimeout(() => {
                                            document.querySelector('[data-testid="school-delete-confirm-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 80);
                                    }}
                                    className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-2.5 text-xs font-black text-red-600 transition-colors hover:bg-red-50"
                                >
                                    مراجعة الحذف
                                </button>
                            )}
                        </div>
                    );
                })}
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
                onClose={() => setEditNameModalState(prev => ({ ...prev, isOpen: false }))}
                onSave={editNameModalState.onSave}
            />
        </div>
    );
};
