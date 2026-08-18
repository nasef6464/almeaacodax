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
    UserPlus,
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
        const schoolGroupIds = new Set([selectedSchool.id, ...schoolClasses.map((classroom) => classroom.id)]);
        const schoolSupervisors = supervisors.filter((currentUser) => (
            selectedSchool.supervisorIds.includes(currentUser.id)
            || schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
            || (currentUser.groupIds || []).some((groupId) => schoolGroupIds.has(groupId))
        ));
        const schoolLevelSupervisors = schoolSupervisors.filter((currentUser) => (
            selectedSchool.supervisorIds.includes(currentUser.id)
            || (currentUser.groupIds || []).includes(selectedSchool.id)
        ));
        const classScopedSupervisors = schoolSupervisors.filter((currentUser) => (
            !schoolLevelSupervisors.some((supervisor) => supervisor.id === currentUser.id)
            && (
                schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
                || (currentUser.groupIds || []).some((groupId) => schoolClasses.some((classroom) => classroom.id === groupId))
            )
        ));
        const supervisorScopeRows = schoolSupervisors.map((currentUser) => {
            const schoolScope = selectedSchool.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(selectedSchool.id);
            const scopedClassNames = schoolClasses
                .filter((classroom) => classroom.supervisorIds.includes(currentUser.id) || (currentUser.groupIds || []).includes(classroom.id))
                .map((classroom) => classroom.name);

            return {
                user: currentUser,
                scopeLabel: schoolScope ? 'مدير/مشرف المدرسة كاملة' : 'مشرف فصول محددة',
                scopeDetails: schoolScope ? selectedSchool.name : scopedClassNames.join('، ') || 'بدون نطاق واضح',
                isSchoolWide: schoolScope,
            };
        });
        const schoolParentUsers = parents.filter((currentUser) => (
            (currentUser.linkedStudentIds || []).some((studentId) => schoolStudents.some((student) => student.id === studentId))
        ));
        const studentsWithoutParent = schoolStudents.filter((student) => (
            !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id))
        ));
        const studentsWithoutClass = schoolStudents.filter((student) => (
            !(student.groupIds || []).some((groupId) => schoolClasses.some((classroom) => classroom.id === groupId))
        ));
        const supervisorsWithoutClass = schoolSupervisors.filter((currentUser) => (
            !(currentUser.groupIds || []).some((groupId) => schoolClasses.some((classroom) => classroom.id === groupId))
            && !schoolClasses.some((classroom) => classroom.supervisorIds.includes(currentUser.id))
        ));
        const classOperatingRows = schoolClasses.map((classroom) => {
            const classStudents = schoolStudents.filter((student) => (
                classroom.studentIds.includes(student.id)
                || (student.groupIds || []).includes(classroom.id)
            ));
            const classSupervisors = schoolSupervisors.filter((currentUser) => (
                classroom.supervisorIds.includes(currentUser.id)
                || (currentUser.groupIds || []).includes(classroom.id)
            ));
            const classStudentsWithoutParent = classStudents.filter((student) => (
                !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id))
            ));
            const gaps = [
                classStudents.length === 0 ? 'لا يوجد طلاب' : '',
                classSupervisors.length === 0 ? 'لا يوجد مشرف فصل' : '',
                classStudentsWithoutParent.length > 0 ? `${classStudentsWithoutParent.length} بلا ولي أمر` : '',
            ].filter(Boolean);

            return {
                classroom,
                studentCount: classStudents.length,
                supervisorCount: classSupervisors.length,
                studentsWithoutParentCount: classStudentsWithoutParent.length,
                gaps,
                isReady: classStudents.length > 0 && classSupervisors.length > 0,
            };
        });
        const schoolCourses = publishedCourses.filter((course) => selectedSchool.courseIds.includes(course.id));
        const activeSchoolPackages = schoolPackages.filter((pkg) => pkg.status === 'active');
        const activeSchoolCodes = schoolCodes.filter((code) => code.expiresAt > Date.now());
        const tableSchoolCodes = pagedAccessCodes.length > 0 ? pagedAccessCodes : schoolCodes;
        const selectedPackageForCode = schoolPackages.find((pkg) => pkg.id === selectedPackageIdForCode);
        const totalSeats = activeSchoolPackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
        const usedSeats = schoolCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
        const visibleSchoolStudents = schoolStudents.filter((student) => {
            const query = studentSearch.trim().toLowerCase();
            const matchesSearch = !query || student.name.toLowerCase().includes(query) || (student.email || '').toLowerCase().includes(query);
            if (!matchesSearch) return false;
            if (selectedClassFilter === 'all') return true;
            if (selectedClassFilter === 'unassigned') {
                return !(student.groupIds || []).some((groupId) => schoolClasses.some((item) => item.id === groupId));
            }
            return (student.groupIds || []).includes(selectedClassFilter);
        });
        const schoolStudentTotalPages = Math.max(1, Math.ceil(visibleSchoolStudents.length / schoolStudentPageSize));
        const safeSchoolStudentPage = Math.min(schoolStudentPage, schoolStudentTotalPages);
        const schoolStudentStartIndex = (safeSchoolStudentPage - 1) * schoolStudentPageSize;
        const schoolStudentEndIndex = Math.min(schoolStudentStartIndex + schoolStudentPageSize, visibleSchoolStudents.length);
        const pagedVisibleSchoolStudents = visibleSchoolStudents.slice(schoolStudentStartIndex, schoolStudentEndIndex);
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
        const readinessChecks = [
            {
                label: 'فصول دراسية',
                isReady: schoolClasses.length > 0,
                hint: schoolClasses.length > 0 ? `${schoolClasses.length} فصل جاهز` : 'أضف فصلًا واحدًا على الأقل',
                tab: 'overview' as const,
            },
            {
                label: 'طلاب مسجلون',
                isReady: schoolStudents.length > 0 && studentsWithoutClass.length === 0,
                hint: schoolStudents.length === 0
                    ? 'أضف الطلاب أو ارفع ملف Excel'
                    : studentsWithoutClass.length > 0
                        ? `${studentsWithoutClass.length} طالب يحتاج فصل واضح`
                        : `${schoolStudents.length} طالب داخل فصول واضحة`,
                tab: schoolStudents.length === 0 ? 'import' as const : 'overview' as const,
            },
            {
                label: 'مشرفون',
                isReady: schoolSupervisors.length > 0,
                hint: schoolSupervisors.length > 0 ? `${schoolSupervisors.length} مشرف/معلم` : 'اربط مشرفًا أو معلمًا بالمدرسة',
                tab: 'relations' as const,
            },
            {
                label: 'باقة/مسارات',
                isReady: activeSchoolPackages.length > 0,
                hint: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة نشطة مرتبطة بالمسارات` : 'فعّل باقة مدرسية واحدة على الأقل وحدد مساراتها',
                tab: 'packages' as const,
            },
            {
                label: 'أكواد دخول',
                isReady: activeSchoolCodes.length > 0,
                hint: activeSchoolCodes.length > 0 ? `${activeSchoolCodes.length} كود صالح` : 'ولّد كودًا صالحًا للطلاب',
                tab: 'packages' as const,
            },
        ];
        const readinessScore = readinessChecks.filter((check) => check.isReady).length;
        const handoverBlockingGaps = readinessChecks.filter((check) => !check.isReady);
        const visibleReadinessGaps = handoverBlockingGaps.slice(0, 3);
        const operationalWarnings = [
            schoolClasses.length === 0 ? 'أضف فصلًا واحدًا على الأقل قبل تسليم المدرسة.' : '',
            schoolSupervisors.length === 0 ? 'اربط مشرفًا أو معلمًا ليتمكن من متابعة الطلاب.' : '',
            activeSchoolPackages.length === 0 ? 'فعّل باقة مدرسية مرتبطة بالمسارات حتى يحصل الطلاب على الوصول بدون شراء فردي.' : '',
            activeSchoolCodes.length === 0 ? 'ولّد كود دخول صالحًا إذا كانت المدرسة ستسجل الطلاب بالأكواد.' : '',
            totalSeats > 0 && usedSeats >= totalSeats ? 'تم استهلاك كل المقاعد المتاحة، راجع سعة الباقات.' : '',
            studentsWithoutClass.length > 0
                ? 'يوجد طلاب بلا فصل، يفضل نقلهم لفصول قبل متابعة التقارير.'
                : '',
            studentsWithoutParent.length > 0
                ? 'يوجد طلاب بلا ولي أمر مرتبط، راجع تبويب الربط والمتابعة قبل تسليم الحسابات.'
                : '',
        ].filter(Boolean);
        const readinessStatusLabel = readinessScore === readinessChecks.length
            ? 'جاهزة للتسليم'
            : readinessScore >= 2
                ? 'قريبة من التسليم'
                : 'تحتاج تجهيز';
        const readinessNextStep = operationalWarnings[0] || 'المدرسة جاهزة تشغيليًا. راجع تقرير الأداء أسبوعيًا بعد بدء الطلاب.';
        const commercialOperatingSteps = [
            {
                id: 'classes',
                title: 'الفصول',
                metric: `${schoolClasses.length} فصل`,
                description: schoolClasses.length > 0 ? 'الفصول جاهزة لاستقبال الطلاب.' : 'ابدأ بإنشاء فصول المدرسة.',
                statusLabel: schoolClasses.length > 0 ? 'جاهز' : 'ناقص',
                isReady: schoolClasses.length > 0,
                tab: 'overview' as const,
                buttonLabel: schoolClasses.length > 0 ? 'إدارة الفصول' : 'إضافة فصول',
            },
            {
                id: 'students',
                title: 'الطلاب',
                metric: `${schoolStudents.length} طالب`,
                description: studentsWithoutClass.length > 0
                    ? `${studentsWithoutClass.length} طالب يحتاج فصل واضح.`
                    : 'الطلاب مربوطون داخل نطاق المدرسة.',
                statusLabel: schoolStudents.length > 0 && studentsWithoutClass.length === 0 ? 'جاهز' : 'راجع',
                isReady: schoolStudents.length > 0 && studentsWithoutClass.length === 0,
                tab: 'import' as const,
                buttonLabel: schoolStudents.length > 0 ? 'استيراد/إضافة طلاب' : 'إضافة الطلاب',
            },
            {
                id: 'supervisors',
                title: 'المشرفون',
                metric: `${schoolSupervisors.length} مشرف`,
                description: schoolSupervisors.length > 0 ? 'يمكن متابعة المدرسة أو الفصول حسب النطاق.' : 'اربط مدير المدرسة أو مشرفي الفصول.',
                statusLabel: schoolSupervisors.length > 0 ? 'جاهز' : 'ناقص',
                isReady: schoolSupervisors.length > 0,
                tab: 'relations' as const,
                buttonLabel: 'ربط المشرفين',
            },
            {
                id: 'access',
                title: 'الباقة والمسارات',
                metric: `${activeSchoolPackages.length} باقة`,
                description: activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0
                    ? 'الباقة والمسارات والأكواد جاهزة للتسليم.'
                    : 'فعّل باقة مدرسية مرتبطة بالمسارات وولّد كود دخول.',
                statusLabel: activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'جاهز' : 'ناقص',
                isReady: activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0,
                tab: 'packages' as const,
                buttonLabel: 'إدارة الباقات والمسارات',
            },
            {
                id: 'reports',
                title: 'تقرير التسليم',
                metric: schoolReport ? `${schoolReport.metrics.averageScore}%` : 'قريبًا',
                description: schoolReport && schoolReport.metrics.quizAttempts > 0
                    ? 'تقرير الأداء جاهز للإدارة والمتابعة.'
                    : 'يظهر التقرير بعد أول اختبارات أو تدريبات.',
                statusLabel: schoolReport && schoolReport.metrics.quizAttempts > 0 ? 'جاهز' : 'ينتظر بيانات',
                isReady: !!schoolReport && schoolReport.metrics.quizAttempts > 0,
                tab: 'reports' as const,
                buttonLabel: 'فتح التقارير',
            },
        ];
        const nextOperatingStep = commercialOperatingSteps.find((step) => !step.isReady) || commercialOperatingSteps[commercialOperatingSteps.length - 1];
        const currentOperatingStepIndex = Math.max(0, commercialOperatingSteps.findIndex((step) => step.id === nextOperatingStep.id));
        const readinessPercent = Math.round((readinessScore / Math.max(readinessChecks.length, 1)) * 100);
        const handoverDecisionTitle = handoverBlockingGaps.length === 0
            ? 'جاهزة للتسليم التجاري'
            : `لا تسلم المدرسة قبل إغلاق ${handoverBlockingGaps.length} بند`;
        const handoverDecisionCopy = handoverBlockingGaps.length === 0
            ? 'كل عناصر التشغيل الأساسية مكتملة. يمكنك تحميل ملف التسليم أو فتح بوابة المتابعة بعد بدء الطلاب.'
            : 'هذه هي البنود التي تمنع التسليم النظيف للمدرسة. ابدأ بأول بند، وسيأخذك الزر مباشرة للمكان الصحيح.';
        const isSaveVerificationBusy = saveVerificationState === 'saving' || saveVerificationState === 'verifying';
        const isSchoolWorkspaceBusy = Boolean(
            isSaveVerificationBusy
            || schoolActionPending
            || rosterActionPending
            || packageActionPending
            || accessCodeActionPending
            || isImporting
            || isApplyingRelations,
        );
        const saveVerificationButtonLabel = saveVerificationState === 'saving'
            ? 'جاري الحفظ...'
            : saveVerificationState === 'verifying'
                ? 'جاري التحقق...'
                : saveVerificationState === 'success'
                    ? 'تم الحفظ والتأكد'
                    : saveVerificationState === 'error'
                        ? 'فشل الحفظ'
                        : 'حفظ وتأكيد البيانات';
        const commercialDecisionCards = [
            {
                id: 'readiness',
                label: 'قرار التشغيل',
                value: readinessStatusLabel,
                hint: readinessScore === readinessChecks.length
                    ? 'يمكن تسليم المدرسة بثقة ومتابعة الأداء من البوابة.'
                    : 'لا تزال هناك خطوات تشغيل قبل التسليم التجاري الكامل.',
                tone: readinessScore === readinessChecks.length ? 'emerald' : readinessScore >= 3 ? 'amber' : 'rose',
                tab: 'overview' as const,
                target: 'school-next-action',
            },
            {
                id: 'scope',
                label: 'النطاق الحالي',
                value: `${schoolClasses.length} فصل / ${schoolStudents.length} طالب`,
                hint: schoolSupervisors.length > 0
                    ? `${schoolSupervisors.length} مشرف أو معلم مرتبط بالنطاق.`
                    : 'اربط مدير المدرسة أو مشرفي الفصول قبل التسليم.',
                tone: schoolSupervisors.length > 0 ? 'blue' : 'amber',
                tab: 'relations' as const,
                target: 'school-wide-supervisors-panel',
            },
            {
                id: 'access',
                label: 'الوصول التجاري',
                value: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة نشطة` : 'بلا باقة نشطة',
                hint: activeSchoolCodes.length > 0
                    ? `${activeSchoolCodes.length} كود صالح للتوزيع.`
                    : 'أنشئ باقة مرتبطة بالمسارات وكود دخول لتجنب شراء الطلاب بشكل فردي.',
                tone: activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'emerald' : 'rose',
                tab: 'packages' as const,
                target: 'school-packages-panel',
            },
            {
                id: 'next-action',
                label: 'إجراء اليوم',
                value: nextOperatingStep.title,
                hint: nextOperatingStep.description,
                tone: nextOperatingStep.isReady ? 'emerald' : 'slate',
                tab: nextOperatingStep.tab,
                target: nextOperatingStep.id === 'supervisors'
                    ? 'school-wide-supervisors-panel'
                    : nextOperatingStep.id === 'access'
                        ? 'school-packages-panel'
                        : nextOperatingStep.id === 'reports'
                            ? 'school-reports-panel'
                            : nextOperatingStep.id === 'students'
                                ? 'school-students-panel'
                                : 'school-classes-panel',
            },
        ];
        const overviewFocusActions = [
            {
                id: 'classes',
                label: 'الفصول',
                value: `${schoolClasses.length} فصل`,
                hint: schoolClasses.length > 0
                    ? 'راجع توزيع الطلاب والمشرفين داخل كل فصل.'
                    : 'ابدأ بإنشاء الفصول قبل استيراد الطلاب.',
                actionLabel: schoolClasses.length > 0 ? 'إدارة الفصول' : 'إنشاء الفصول',
                target: 'school-class-creation-panel',
                tone: schoolClasses.length > 0 ? 'emerald' : 'amber',
            },
            {
                id: 'students',
                label: 'الطلاب',
                value: `${schoolStudents.length} طالب`,
                hint: studentsWithoutClass.length > 0
                    ? `${studentsWithoutClass.length} طالب يحتاجون فصل.`
                    : schoolStudents.length > 0
                        ? 'الطلاب مرتبطون ويمكن متابعة توزيعهم.'
                        : 'أضف طالبًا سريعًا أو استورد ملف المدرسة.',
                actionLabel: schoolStudents.length > 0 ? 'تنظيم الطلاب' : 'إضافة طالب',
                target: 'school-students-panel',
                tone: studentsWithoutClass.length > 0 ? 'amber' : schoolStudents.length > 0 ? 'emerald' : 'indigo',
            },
            {
                id: 'supervisors',
                label: 'المشرفون',
                value: `${schoolSupervisors.length} مشرف`,
                hint: schoolSupervisors.length > 0
                    ? 'الصلاحيات موزعة بين المدرسة والفصول.'
                    : 'اربط مدير المدرسة أو مشرفي الفصول.',
                actionLabel: 'ربط مشرف',
                target: 'school-relations-quick-supervisor-card',
                tab: 'relations' as const,
                tone: schoolSupervisors.length > 0 ? 'emerald' : 'purple',
            },
            {
                id: 'access',
                label: 'الباقة/المسارات',
                value: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة` : 'بدون باقة',
                hint: activeSchoolCodes.length > 0
                    ? `${activeSchoolCodes.length} كود جاهز للتسليم.`
                    : 'فعّل باقة مرتبطة بالمسارات أو أنشئ أكواد المدرسة.',
                actionLabel: 'الباقة والمسارات',
                target: 'school-packages-panel',
                tab: 'packages' as const,
                tone: activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'emerald' : 'rose',
            },
        ];
        const schoolLaunchPlan = [
            ['قبل التسليم', 'تأكيد الفصول والمشرفين والباقة والمسارات والأكواد', readinessNextStep],
            ['يوم التسليم', 'إرسال أكواد الدخول وتعليمات الدخول للطلاب', activeSchoolCodes.length > 0 ? 'الأكواد الصالحة جاهزة للتوزيع' : 'ولّد كودًا صالحًا من تبويب الباقة والمسارات'],
            ['أول 3 أيام', 'متابعة الطلاب الذين لم يبدأوا التدريب أو الاختبارات', studentsWithoutClass.length > 0 ? 'ابدأ بالطلاب غير المصنفين في فصول' : 'راجع بوابة المشرف يوميًا'],
            ['نهاية الأسبوع الأول', 'تصدير تقرير الأداء ومشاركته مع الإدارة', schoolReport ? 'تقرير الأداء متاح من تبويب التقارير' : 'سيظهر التقرير بعد بدء الطلاب في القياس'],
        ];
        const supervisorHandoverChecklist = [
            ['المشرف يرى مدرسته/فصوله من لوحة المشرف', schoolSupervisors.length > 0 ? 'جاهز' : 'يحتاج ربط مشرف'],
            ['كل طالب داخل فصل واضح', studentsWithoutClass.length === 0 ? 'جاهز' : `${studentsWithoutClass.length} طالب يحتاج فصل`],
            ['أولياء الأمور المرتبطون بالطلاب المهمين', studentsWithoutParent.length === 0 ? 'جاهز' : `${studentsWithoutParent.length} طالب بلا ولي أمر`],
            ['يوجد كود أو باقة نشطة لتفعيل الطلاب', activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'جاهز' : 'يحتاج باقة وكود صالح'],
            ['تقرير الأداء جاهز للمتابعة', schoolReport && schoolReport.metrics.quizAttempts > 0 ? 'جاهز' : 'يظهر بعد بدء الاختبارات'],
        ];
        const schoolHandoverMessage = [
            `تم تجهيز مساحة ${selectedSchool.name} على منصة المئة.`,
            `حالة الجاهزية الحالية: ${readinessStatusLabel} (${readinessScore}/${readinessChecks.length}).`,
            `الخطوة التالية: ${readinessNextStep}`,
            'يمكن للمشرف متابعة الطلاب، تصدير التقارير، وتوجيه الاختبارات من لوحة المشرف.',
        ].join('\n');
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

                <div data-testid="school-command-center" className="hidden">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                <Building2 size={14} />
                                مركز تشغيل المدرسة
                            </div>
                            <h2 className="mt-3 text-lg font-black text-gray-900">{readinessStatusLabel}</h2>
                            <p data-testid="school-next-action" className="mt-1 text-sm font-bold leading-7 text-gray-600">{readinessNextStep}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                readinessScore === readinessChecks.length
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : readinessScore >= 3
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                            }`}>
                                {readinessScore}/{readinessChecks.length} جاهز
                            </span>
                            <button
                                type="button"
                                onClick={downloadSchoolHandover}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-amber-600"
                            >
                                <Download size={16} />
                                ملف التسليم
                            </button>
                        </div>
                    </div>
                    <div className="mb-4 grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                                <span>نسبة الجاهزية</span>
                                <span>{readinessPercent}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-white">
                                <div
                                    className={`h-2 rounded-full ${readinessScore === readinessChecks.length ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${readinessPercent}%` }}
                                />
                            </div>
                            <p className="mt-3 text-xs font-bold leading-6 text-slate-600">
                                {readinessScore === readinessChecks.length ? 'جاهزة للتجربة والتسليم.' : `${readinessScore}/${readinessChecks.length} بنود جاهزة.`}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="text-sm font-black text-gray-900">أهم النواقص الآن</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('reports')}
                                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100"
                                >
                                    التفاصيل في التقرير
                                </button>
                            </div>
                            {visibleReadinessGaps.length === 0 ? (
                                <p className="text-sm font-bold text-emerald-700">لا توجد نواقص تشغيلية تمنع التجربة.</p>
                            ) : (
                                <div className="grid gap-2 md:grid-cols-3">
                                    {visibleReadinessGaps.map((gap) => (
                                        <button
                                            key={gap.label}
                                            type="button"
                                            onClick={() => setActiveTab(gap.tab)}
                                            className="rounded-xl bg-white px-3 py-2 text-right text-xs font-bold leading-5 text-amber-900 transition-colors hover:bg-amber-100"
                                        >
                                            <span className="block font-black">{gap.label}</span>
                                            {gap.hint}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div data-testid="school-commercial-summary-strip" className="hidden">
                        {commercialDecisionCards.map((card) => (
                            <button
                                key={card.id}
                                type="button"
                                data-testid={`school-commercial-decision-${card.id}`}
                                onClick={() => {
                                    setActiveTab(card.tab);
                                    window.setTimeout(() => {
                                        if (card.target === 'school-wide-supervisors-panel') {
                                            document.querySelector('[data-testid="school-wide-supervisors-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            return;
                                        }
                                        document.querySelector(`[data-testid="${card.target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 80);
                                }}
                                className={`rounded-2xl border p-4 text-right transition-colors ${
                                    card.tone === 'emerald'
                                        ? 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                                        : card.tone === 'amber'
                                            ? 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                                            : card.tone === 'rose'
                                                ? 'border-rose-100 bg-rose-50 hover:bg-rose-100'
                                                : card.tone === 'blue'
                                                    ? 'border-blue-100 bg-blue-50 hover:bg-blue-100'
                                                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                                }`}
                            >
                                <div className="text-xs font-black text-slate-500">{card.label}</div>
                                <div className="mt-2 text-base font-black text-gray-900">{card.value}</div>
                                <p className="mt-2 min-h-[44px] text-xs font-bold leading-6 text-gray-600">{card.hint}</p>
                            </button>
                        ))}
                    </div>
                    <div data-testid="school-handover-decision-board" className={`hidden ${
                        handoverBlockingGaps.length === 0
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-amber-100 bg-amber-50'
                    }`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                                    handoverBlockingGaps.length === 0
                                        ? 'bg-white text-emerald-700'
                                        : 'bg-white text-amber-800'
                                }`}>
                                    <ShieldCheck size={14} />
                                    قرار التسليم
                                </div>
                                <h3 className="mt-3 text-lg font-black text-gray-900">{handoverDecisionTitle}</h3>
                                <p className="mt-1 text-sm font-bold leading-7 text-gray-700">{handoverDecisionCopy}</p>
                            </div>
                            <button
                                type="button"
                                data-testid="school-handover-decision-report"
                                onClick={() => setActiveTab('reports')}
                                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-amber-600"
                            >
                                فتح تقرير التسليم
                            </button>
                        </div>
                        <div data-testid="school-handover-decision-items" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {(handoverBlockingGaps.length > 0 ? handoverBlockingGaps : readinessChecks).map((item, index) => (
                                <button
                                    key={`${item.label}-${index}`}
                                    type="button"
                                    data-testid={`school-handover-decision-item-${index}`}
                                    onClick={() => setActiveTab(item.tab)}
                                    className={`rounded-xl border bg-white px-3 py-2 text-right transition-colors hover:bg-gray-50 ${
                                        item.isReady ? 'border-emerald-100' : 'border-amber-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-black text-gray-900">{item.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                            item.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {item.isReady ? 'جاهز' : 'ناقص'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs font-bold leading-5 text-gray-600">{item.hint}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div data-testid="school-delivery-journey" className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="text-xs font-black text-slate-500">مسار تسليم المدرسة</div>
                                <h3 className="mt-1 text-base font-black text-gray-900">
                                    الخطوة الحالية: {nextOperatingStep.title}
                                </h3>
                                <p className="mt-1 text-sm font-bold leading-6 text-gray-600">
                                    {nextOperatingStep.description}
                                </p>
                            </div>
                            <button
                                type="button"
                                data-testid="school-next-step-button"
                                onClick={() => setActiveTab(nextOperatingStep.tab)}
                                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-amber-600"
                            >
                                {nextOperatingStep.buttonLabel}
                            </button>
                        </div>
                        <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                                <span>{readinessPercent}% جاهزية تشغيل</span>
                                <span>{readinessScore}/{readinessChecks.length}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white">
                                <div
                                    className={`h-2 rounded-full ${readinessScore === readinessChecks.length ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${readinessPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className="mt-4 grid gap-2 md:grid-cols-5">
                            {commercialOperatingSteps.map((step, index) => (
                                <button
                                    key={step.id}
                                    type="button"
                                    data-testid={`school-delivery-journey-step-${step.id}`}
                                    onClick={() => {
                                        setActiveTab(step.tab);
                                        setExpandedSchoolStep(step.tab);
                                    }}
                                    className={`rounded-xl border px-3 py-3 text-right transition-colors ${
                                        expandedSchoolStep === step.tab
                                            ? 'border-slate-300 bg-slate-900 text-white shadow-sm'
                                            : step.isReady
                                            ? 'border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50'
                                            : index === currentOperatingStepIndex
                                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                                : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <span className="block text-[11px] font-black text-slate-400">مرحلة {index + 1}</span>
                                    <span className={`mt-1 block text-sm font-black ${expandedSchoolStep === step.tab ? 'text-white' : 'text-gray-900'}`}>{step.title}</span>
                                    <span className="mt-1 block text-xs font-bold leading-5">{step.metric}</span>
                                    <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${expandedSchoolStep === step.tab ? 'bg-white/15 text-white' : 'bg-white text-gray-700'}`}>
                                        {step.buttonLabel}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div data-testid="school-setup-progress" className="hidden">
                        {commercialOperatingSteps.map((step, index) => (
                            <div
                                key={step.id}
                                data-testid={`school-commercial-step-${step.id}`}
                                className={`rounded-2xl border p-4 ${
                                    step.isReady
                                        ? 'border-emerald-100 bg-emerald-50'
                                        : 'border-amber-100 bg-amber-50'
                                }`}
                            >
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-gray-900">
                                        {index + 1}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                        step.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {step.statusLabel}
                                    </span>
                                </div>
                                <p className="text-sm font-black text-gray-900">{step.title}</p>
                                <p className="mt-1 text-xl font-black text-gray-900">{step.metric}</p>
                                <p className="mt-2 min-h-[44px] text-xs font-bold leading-6 text-gray-600">{step.description}</p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(step.tab)}
                                    className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                                >
                                    {step.buttonLabel}
                                </button>
                            </div>
                        ))}
                    </div>
                    <div data-testid="school-primary-actions" className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                        <button
                            type="button"
                            data-testid="school-primary-add-class"
                            disabled={isSchoolWorkspaceBusy}
                            onClick={async () => {
                                setActiveTab('overview');
                                await handleCreateSingleClass();
                            }}
                            className="rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-800"
                        >
                            إضافة فصل
                        </button>
                        <button
                            type="button"
                            data-testid="school-primary-add-student"
                            onClick={() => {
                                setActiveTab('overview');
                                setIsSingleStudentOpen(true);
                                window.setTimeout(() => {
                                    document.querySelector('[data-testid="school-students-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 50);
                            }}
                            className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                            إضافة طالب
                        </button>
                        <button
                            type="button"
                            data-testid="school-primary-add-supervisor"
                            onClick={() => {
                                setActiveTab('relations');
                                window.setTimeout(() => {
                                    document.querySelector('[data-testid="school-relations-quick-supervisor-card"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 50);
                            }}
                            className="rounded-xl bg-purple-50 px-3 py-2.5 text-xs font-black text-purple-700 transition-colors hover:bg-purple-100"
                        >
                            إضافة مشرف
                        </button>
                        <button
                            type="button"
                            data-testid="school-primary-open-packages"
                            onClick={() => setActiveTab('packages')}
                            className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                            الباقة والمسارات
                        </button>
                        <button
                            type="button"
                            data-testid="school-primary-open-reports"
                            onClick={() => setActiveTab('reports')}
                            className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100"
                        >
                            تقرير التسليم
                        </button>
                        <button
                            type="button"
                            data-testid="school-primary-open-portal"
                            onClick={() => {
                                const url = new URL('/admin-dashboard', window.location.origin);
                                url.searchParams.set('tab', 'school-portal');
                                window.history.pushState(null, '', `${url.pathname}${url.search}`);
                                window.dispatchEvent(new HashChangeEvent('hashchange'));
                            }}
                            className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100"
                        >
                            بوابة المتابعة
                        </button>
                    </div>
                </div>

                <div className={`${expandedSchoolStep ? 'bg-white p-6 rounded-xl shadow-sm border border-gray-100' : 'hidden'}`}>
                    {activeTab === 'overview' && expandedSchoolStep === 'overview' && (
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
                                                        : action.tone === 'purple'
                                                            ? 'border-purple-100 bg-purple-50 hover:bg-purple-100'
                                                            : action.tone === 'rose'
                                                                ? 'border-rose-100 bg-rose-50 hover:bg-rose-100'
                                                                : 'border-indigo-100 bg-indigo-50 hover:bg-indigo-100'
                                            }`}
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-gray-600">
                                                    {action.label}
                                                </span>
                                                <span className="text-lg font-black text-gray-900">{action.value}</span>
                                            </div>
                                            <p className="min-h-[44px] text-xs font-bold leading-6 text-gray-600">{action.hint}</p>
                                            <span className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800">
                                                {action.actionLabel}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div data-testid="school-overview-metrics-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="text-blue-500" size={24} />
                                        <h3 className="font-bold text-gray-900">إجمالي الطلاب</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600">{schoolStudents.length}</p>
                                </div>
                                <div className="bg-purple-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Building2 className="text-purple-500" size={24} />
                                        <h3 className="font-bold text-gray-900">الفصول الدراسية</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-purple-600">{schoolClasses.length}</p>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpen className="text-emerald-500" size={24} />
                                        <h3 className="font-bold text-gray-900">الباقات النشطة</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600">{schoolPackages.filter((pkg) => pkg.status === 'active').length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                                        <ShieldCheck size={18} />
                                        <span className="text-xs font-black">المقاعد المتاحة</span>
                                    </div>
                                    <div className="text-2xl font-black text-amber-800">{totalSeats}</div>
                                    <p className="text-xs text-amber-700 mt-1">إجمالي سعة الباقات المدرسية</p>
                                </div>
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                                    <div className="flex items-center gap-2 text-indigo-700 mb-2">
                                        <Users size={18} />
                                        <span className="text-xs font-black">مقاعد مستخدمة</span>
                                    </div>
                                    <div className="text-2xl font-black text-indigo-800">{usedSeats}</div>
                                    <p className="text-xs text-indigo-700 mt-1">استخدام الأكواد حتى الآن</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                                        <Key size={18} />
                                        <span className="text-xs font-black">أكواد فعالة</span>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-800">{activeSchoolCodes.length}</div>
                                    <p className="text-xs text-emerald-700 mt-1">صالحة الآن للتوزيع</p>
                                </div>
                                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                                        <Clock3 size={18} />
                                        <span className="text-xs font-black">طلاب المدرسة</span>
                                    </div>
                                    <div className="text-2xl font-black text-rose-800">{schoolStudents.length}</div>
                                    <p className="text-xs text-rose-700 mt-1">مرتبطون فعليًا بهذه المدرسة</p>
                                </div>
                            </div>

                            <div data-testid="school-class-operating-brief" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-500">كشف تشغيل الفصول</p>
                                        <h3 className="text-lg font-black text-gray-900">كل فصل واضح قبل التسليم</h3>
                                        <p className="mt-1 text-sm font-bold leading-6 text-gray-500">
                                            ملخص سريع يوضح الطلاب والمشرفين والنواقص داخل كل فصل بدون فتح الجداول الطويلة.
                                        </p>
                                    </div>
                                    <span className="w-fit rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                                        {classOperatingRows.filter((row) => row.isReady).length}/{Math.max(classOperatingRows.length, 1)} جاهز
                                    </span>
                                </div>
                                {classOperatingRows.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm font-bold text-amber-800">
                                        لا توجد فصول بعد. ابدأ بإنشاء فصل واحد حتى تصبح رحلة الطلاب والمشرفين واضحة.
                                    </div>
                                ) : (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {classOperatingRows.map((row) => (
                                            <div
                                                key={row.classroom.id}
                                                data-testid="school-class-operating-row"
                                                className={`rounded-2xl border p-4 ${
                                                    row.isReady ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-100 bg-amber-50/70'
                                                }`}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-sm font-black text-gray-900">{row.classroom.name}</h4>
                                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                                                row.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {row.isReady ? 'جاهز' : 'يحتاج مراجعة'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{row.studentCount} طالب</span>
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-purple-700">{row.supervisorCount} مشرف</span>
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-amber-700">{row.studentsWithoutParentCount} بلا ولي أمر</span>
                                                        </div>
                                                        <p className="mt-3 text-xs font-bold leading-6 text-gray-600">
                                                            {row.gaps.length > 0 ? row.gaps.join('، ') : 'الفصل جاهز للتسليم والمتابعة.'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        data-testid="school-class-operating-open"
                                                        onClick={() => {
                                                            document
                                                                .querySelector(`[data-school-class-id="${row.classroom.id}"]`)
                                                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }}
                                                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                                                    >
                                                        فتح الفصل
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div data-testid="school-students-panel" className="min-w-0 max-w-full rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">إضافة طالب منفرد</h3>
                                        <p className="text-sm text-indigo-800">للطالب الواحد أو التصحيح السريع داخل فصل واضح.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsSingleStudentOpen((current) => !current)}
                                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                                    >
                                        {isSingleStudentOpen ? 'إغلاق البطاقة' : 'إضافة طالب منفرد'}
                                    </button>
                                </div>
                                {isSingleStudentOpen && schoolClasses.length === 0 && (
                                    <div data-testid="school-student-needs-class-note" className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="text-sm font-black text-amber-800">ابدأ بفصل واحد قبل إضافة الطلاب</div>
                                            <p className="mt-1 text-xs font-bold leading-5 text-amber-700">الإضافة اليدوية تحتاج فصلًا واضحًا حتى لا تتراكم طلاب بلا تصنيف.</p>
                                        </div>
                                        <button
                                            type="button"
                                            data-testid="school-student-create-first-class"
                                            disabled={isSchoolWorkspaceBusy}
                                            onClick={async () => {
                                                await handleCreateSingleClass('تم إنشاء فصل جديد. اختره من حقل فصل الطالب ثم أضف الطالب.');
                                            }}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600"
                                        >
                                            <Plus size={14} />
                                            إنشاء فصل الآن
                                        </button>
                                    </div>
                                )}
                                {isSingleStudentOpen && (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-4">
                                            <input
                                                data-testid="school-single-student-name"
                                                value={singleStudent.name}
                                                onChange={(event) => setSingleStudent((current) => ({ ...current, name: event.target.value }))}
                                                placeholder="اسم الطالب"
                                                className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                            <input
                                                data-testid="school-single-student-email"
                                                value={singleStudent.email}
                                                onChange={(event) => setSingleStudent((current) => ({ ...current, email: event.target.value }))}
                                                placeholder="بريد الطالب"
                                                className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                            <select
                                                data-testid="school-single-student-class"
                                                value={singleStudent.className}
                                                onChange={(event) => setSingleStudent((current) => ({ ...current, className: event.target.value }))}
                                                className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                <option value="">اختر فصل الطالب</option>
                                                {schoolClasses.map((classroom) => (
                                                    <option key={classroom.id} value={classroom.name}>{classroom.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                data-testid="school-single-student-password"
                                                value={singleStudent.password}
                                                onChange={(event) => setSingleStudent((current) => ({ ...current, password: event.target.value }))}
                                                placeholder="كلمة مرور اختيارية"
                                                className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                data-testid="school-single-student-submit"
                                                onClick={() => void handleAddSingleStudent()}
                                                disabled={isImporting}
                                                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                إضافة الطالب
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div data-testid="school-wide-supervisors-panel" className="border border-gray-100 rounded-xl p-5 space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">مدير/مشرف المدرسة كاملة</h3>
                                        <span className="text-sm text-gray-500">{schoolLevelSupervisors.length} يرى المدرسة كاملة</span>
                                    </div>
                                    <p className="text-xs font-bold leading-6 text-gray-500">
                                        هذا النطاق مناسب لمدير المدرسة أو المسؤول العام؛ سيظهر له كل الفصول والطلاب والتقارير داخل هذه المدرسة.
                                    </p>
                                    <div data-testid="school-supervisor-scope-decision" className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-emerald-900">مدير المدرسة كاملة</span>
                                                <span data-testid="school-supervisor-schoolwide-count" className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                                                    {schoolLevelSupervisors.length}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs font-bold leading-6 text-emerald-800">
                                                يرى كل الفصول والطلاب وتقارير المدرسة. استخدمه لمدير المدرسة أو المشرف العام.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-blue-900">مشرف فصول محددة</span>
                                                <span data-testid="school-supervisor-class-count" className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
                                                    {classScopedSupervisors.length}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs font-bold leading-6 text-blue-800">
                                                يرى الفصول التي تم ربطه بها فقط. استخدمه للمعلم أو مشرف الفصل.
                                            </p>
                                        </div>
                                    </div>
                                    <div data-testid="school-supervisor-single-entry-note" className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="mb-2 flex items-center gap-2 text-sm font-black text-purple-800">
                                                    <UserPlus size={16} />
                                                    إضافة المشرفين من مكان واحد
                                                </div>
                                                <p className="text-xs font-bold leading-6 text-purple-900">
                                                    حتى لا تتكرر نفس المهمة، يتم إنشاء مدير المدرسة أو مشرف الفصل من تبويب المشرفون والتسليم فقط. هذه البطاقة تعرض النطاق الحالي وتوجهك للمكان الصحيح.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                data-testid="school-open-supervisor-entry"
                                                onClick={() => focusQuickSupervisorEntry(selectedSchool.id, selectedSchool.name)}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-purple-800"
                                            >
                                                <UserPlus size={16} />
                                                فتح إضافة المشرف
                                            </button>
                                        </div>
                                    </div>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        defaultValue=""
                                        onChange={(event) => {
                                            const target = event.currentTarget;
                                            const value = event.target.value;
                                            if (!value) return;
                                            void handleAssignSchoolSupervisor(value, selectedSchool.id).finally(() => {
                                                target.value = '';
                                            });
                                        }}
                                        disabled={Boolean(rosterActionPending)}
                                    >
                                        <option value="">إضافة مدير/مشرف للمدرسة كاملة</option>
                                        {supervisors
                                            .filter((currentUser) => !schoolLevelSupervisors.some((supervisor) => supervisor.id === currentUser.id))
                                            .map((currentUser) => (
                                                <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                                            ))}
                                    </select>
                                    {supervisors.filter((currentUser) => !schoolLevelSupervisors.some((supervisor) => supervisor.id === currentUser.id)).length === 0 && (
                                        <p className="text-xs font-bold leading-6 text-amber-700">
                                            لا يوجد مشرفون متاحون، أنشئ مشرفًا جديدًا أو حرر مشرفًا مرتبطًا بنطاق آخر.
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {schoolLevelSupervisors.length === 0 ? (
                                            <span className="text-sm text-gray-400">لا يوجد مدير أو مشرف عام لهذه المدرسة بعد.</span>
                                        ) : schoolLevelSupervisors.map((currentUser) => (
                                            <button
                                                key={currentUser.id}
                                                type="button"
                                                data-testid="school-remove-school-supervisor"
                                                onClick={() => {
                                                    if (!window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف ${selectedSchool.name}؟`)) {
                                                        return;
                                                    }
                                                    void handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id);
                                                }}
                                                disabled={Boolean(rosterActionPending)}
                                                className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                                            >
                                                {currentUser.name} ×
                                            </button>
                                        ))}
                                    </div>
                                    <div data-testid="school-supervisor-scope-summary" className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className="text-xs font-black text-slate-700">نطاقات المشرفين</span>
                                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                                                {classScopedSupervisors.length} للفصول فقط
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {supervisorScopeRows.length === 0 ? (
                                                <p className="text-xs font-bold text-slate-500">اربط مشرفًا بالمدرسة أو فصلًا محددًا لتظهر الصلاحيات هنا.</p>
                                            ) : supervisorScopeRows.map((row) => (
                                                <div key={row.user.id} data-testid={row.isSchoolWide ? 'school-supervisor-scope-school' : 'school-supervisor-scope-class'} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900">{row.user.name}</p>
                                                        <p className="text-[11px] font-bold text-gray-500">{row.scopeDetails}</p>
                                                    </div>
                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${
                                                        row.isSchoolWide ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                        {row.scopeLabel}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">دورات المدرسة</h3>
                                        <span className="text-sm text-gray-500">{schoolCourses.length} دورة مرتبطة</span>
                                    </div>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        defaultValue=""
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (!value) return;
                                            assignCourseToGroup(value, selectedSchool.id);
                                            setSelectedSchool((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          courseIds: current.courseIds.includes(value)
                                                              ? current.courseIds
                                                              : [...current.courseIds, value],
                                                      }
                                                    : current,
                                            );
                                            event.target.value = '';
                                        }}
                                    >
                                        <option value="">ربط دورة مباشرة بالمدرسة</option>
                                        {publishedCourses
                                            .filter((course) => !selectedSchool.courseIds.includes(course.id))
                                            .map((course) => (
                                                <option key={course.id} value={course.id}>{course.title}</option>
                                            ))}
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        {schoolCourses.length === 0 ? (
                                            <span className="text-sm text-gray-400">لا توجد دورات مرتبطة بهذه المدرسة حتى الآن.</span>
                                        ) : schoolCourses.map((course) => (
                                            <button
                                                key={course.id}
                                                onClick={() => {
                                                    removeCourseFromGroup(course.id, selectedSchool.id);
                                                    setSelectedSchool((current) =>
                                                        current
                                                            ? {
                                                                  ...current,
                                                                  courseIds: current.courseIds.filter((id) => id !== course.id),
                                                              }
                                                            : current,
                                                    );
                                                }}
                                                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                                            >
                                                {course.title} ×
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">الفصول الدراسية</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => downloadSchoolRoster(selectedSchool, schoolStudents, schoolClasses)}
                                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                                        >
                                            <Download size={16} /> تصدير كشف الطلاب
                                        </button>
                                        <button
                                            disabled={isSchoolWorkspaceBusy}
                                            onClick={() => void handleCreateSingleClass()}
                                            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={16} /> إضافة فصل
                                        </button>
                                    </div>
                                </div>

                                <div data-testid="school-class-creation-panel" className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-amber-900">
                                                إنشاء عدة فصول مرة واحدة
                                            </label>
                                            <textarea
                                                value={bulkClassNames}
                                                onChange={(event) => setBulkClassNames(event.target.value)}
                                                placeholder="مثال: أول ثانوي أ&#10;أول ثانوي ب&#10;ثاني ثانوي قدرات"
                                                rows={3}
                                                className="w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <p className="mt-2 text-xs leading-6 text-amber-800">
                                                اكتب كل فصل في سطر، أو افصل بينها بفاصلة. النظام يتجنب تكرار أسماء الفصول الموجودة.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleCreateBulkClasses}
                                            disabled={Boolean(schoolActionPending)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                                        >
                                            <Plus size={16} />
                                            إنشاء الفصول
                                        </button>
                                    </div>
                                </div>

                                {schoolClasses.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500">لا توجد فصول دراسية مضافة حتى الآن.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {schoolClasses.map((classroom) => {
                                            const classSupervisors = supervisors.filter((currentUser) => classroom.supervisorIds.includes(currentUser.id));
                                            const classCourses = publishedCourses.filter((course) => classroom.courseIds.includes(course.id));
                                            const classStudents = schoolStudents.filter((student) => classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id));
                                            const classStudentsWithoutParent = classStudents.filter((student) => !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id)));

                                            return (
                                                <div key={classroom.id} data-testid="school-class-card" data-school-class-id={classroom.id} className="border border-gray-100 p-4 rounded-xl hover:shadow-sm transition-shadow space-y-4">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{classroom.name}</h4>
                                                            <p className="text-sm text-gray-500">
                                                                {classStudents.length} طالب • {classSupervisors.length} مشرف • {classCourses.length} دورة
                                                            </p>
                                                            {classStudentsWithoutParent.length > 0 && (
                                                                <p className="mt-1 text-xs font-bold text-amber-700">
                                                                    {classStudentsWithoutParent.length} طالب بلا ولي أمر
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => downloadClassReport(classroom)}
                                                                className="text-gray-400 hover:text-emerald-600 transition-colors"
                                                                title="تصدير تقرير الفصل"
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => printClassReport(classroom)}
                                                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                                title="طباعة تقرير الفصل"
                                                            >
                                                                <Printer size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
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
                                                                        }
                                                                    });
                                                                }}
                                                                disabled={isSchoolWorkspaceBusy}
                                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
                                                                        setSchoolActionPending(`delete-class-${classroom.id}`);
                                                                        setSaveVerificationState('saving');
                                                                        setSaveVerificationMessage('جاري حذف الفصل...');
                                                                        setManagementError(null);
                                                                        setManagementNotice(null);
                                                                        try {
                                                                            await deleteGroupAsync(classroom.id);
                                                                            await refreshSchoolWorkspace(selectedSchool.id);
                                                                            setSaveVerificationState('success');
                                                                            setSaveVerificationMessage('تم حذف الفصل والتأكد من الخادم.');
                                                                            setManagementNotice('تم حذف الفصل بعد التحقق من الخادم.');
                                                                        } catch (error) {
                                                                            setSaveVerificationState('error');
                                                                            setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');
                                                                            setManagementError(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');
                                                                        } finally {
                                                                            setSchoolActionPending(null);
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={isSchoolWorkspaceBusy}
                                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div data-testid="school-class-operating-actions" className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-4">
                                                        <button
                                                            type="button"
                                                            data-testid="school-class-add-students"
                                                            onClick={() => focusClassStudentForm(classroom.name)}
                                                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-indigo-600 hover:text-white"
                                                        >
                                                            إضافة طالب
                                                        </button>
                                                        <button
                                                            type="button"
                                                            data-testid="school-class-roster"
                                                            onClick={() => focusClassRoster(classroom.id)}
                                                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                                                        >
                                                            طلاب الفصل
                                                        </button>
                                                        <button
                                                            type="button"
                                                            data-testid="school-class-import-students"
                                                            onClick={() => setActiveTab('import')}
                                                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-amber-500 hover:text-white"
                                                        >
                                                            Excel للفصل
                                                        </button>
                                                        <button
                                                            type="button"
                                                            data-testid="school-class-access"
                                                            onClick={() => setActiveTab('packages')}
                                                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-emerald-600 hover:text-white"
                                                        >
                                                            محتوى وأكواد
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2">المشرف المسؤول</label>
                                                            <select
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                defaultValue=""
                                                                onChange={(event) => {
                                                                    const target = event.currentTarget;
                                                                    const value = event.target.value;
                                                                    if (!value) return;
                                                                    void handleAssignSchoolSupervisor(value, classroom.id).finally(() => {
                                                                        target.value = '';
                                                                    });
                                                                }}
                                                                disabled={Boolean(rosterActionPending)}
                                                            >
                                                                <option value="">إضافة مشرف للفصل</option>
                                                                {supervisors
                                                                    .filter((currentUser) => !classroom.supervisorIds.includes(currentUser.id))
                                                                    .map((currentUser) => (
                                                                        <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                                                                    ))}
                                                            </select>
                                                            {supervisors.filter((currentUser) => !classroom.supervisorIds.includes(currentUser.id)).length === 0 && (
                                                                <p className="mt-2 text-xs font-bold leading-6 text-amber-700">
                                                                    لا يوجد مشرفون متاحون، أنشئ مشرفًا جديدًا أو حرر مشرفًا مرتبطًا بنطاق آخر.
                                                                </p>
                                                            )}
                                                            <button
                                                                type="button"
                                                                data-testid="school-class-create-supervisor"
                                                                onClick={() => focusQuickSupervisorEntry(classroom.id, classroom.name)}
                                                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 transition-colors hover:bg-purple-100"
                                                            >
                                                                <UserPlus size={14} />
                                                                إنشاء مشرف جديد لهذا الفصل
                                                            </button>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {classSupervisors.length === 0 ? (
                                                                    <span className="text-xs text-gray-400">لا يوجد مشرف مرتبط بهذا الفصل.</span>
                                                                ) : classSupervisors.map((currentUser) => (
                                                                    <button
                                                                        key={currentUser.id}
                                                                        type="button"
                                                                        data-testid="school-remove-class-supervisor"
                                                                        onClick={() => {
                                                                            if (window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف فصل ${classroom.name}؟`)) {
                                                                                void handleRemoveSchoolSupervisor(currentUser.id, classroom.id);
                                                                            }
                                                                        }}
                                                                        disabled={Boolean(rosterActionPending)}
                                                                        className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                                                                    >
                                                                        {currentUser.name} ×
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2">الدورات المخصصة</label>
                                                            <select
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                defaultValue=""
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    if (!value) return;
                                                                    assignCourseToGroup(value, classroom.id);
                                                                    event.target.value = '';
                                                                }}
                                                            >
                                                                <option value="">إضافة دورة للفصل</option>
                                                                {publishedCourses
                                                                    .filter((course) => !classroom.courseIds.includes(course.id))
                                                                    .map((course) => (
                                                                        <option key={course.id} value={course.id}>{course.title}</option>
                                                                    ))}
                                                            </select>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {classCourses.length === 0 ? (
                                                                    <span className="text-xs text-gray-400">لا توجد دورات مرتبطة بهذا الفصل.</span>
                                                                ) : classCourses.map((course) => (
                                                                    <button
                                                                        key={course.id}
                                                                        onClick={() => removeCourseFromGroup(course.id, classroom.id)}
                                                                        className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                                    >
                                                                        {course.title} ×
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div data-testid="school-roster-panel" className="min-w-0 max-w-full border border-gray-100 rounded-2xl p-5 space-y-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">طلاب المدرسة</h3>
                                        <p className="text-sm text-gray-500 mt-1">استعراض سريع للطلاب مع نقلهم بين الفصول بدون مغادرة الصفحة.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[540px]">
                                        <div className="relative">
                                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={studentSearch}
                                                onChange={(event) => setStudentSearch(event.target.value)}
                                                placeholder="ابحث بالاسم أو البريد..."
                                                className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <select
                                            value={selectedClassFilter}
                                            onChange={(event) => setSelectedClassFilter(event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="all">كل الفصول</option>
                                            <option value="unassigned">طلاب بدون فصل</option>
                                            {schoolClasses.map((classroom) => (
                                                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {visibleSchoolStudents.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                        لا يوجد طلاب مطابقون للبحث الحالي داخل هذه المدرسة.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                                        <table className="w-full text-right">
                                            <thead className="bg-gray-50 text-xs font-bold text-gray-600">
                                                <tr>
                                                    <th className="p-4">الطالب</th>
                                                    <th className="p-4">البريد</th>
                                                    <th className="p-4">الفصل الحالي</th>
                                                    <th className="p-4">النقل إلى فصل</th>
                                                    <th className="p-4">إجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                                {pagedVisibleSchoolStudents.map((student) => {
                                                    const currentClass = schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id));
                                                    return (
                                                        <tr key={student.id}>
                                                            <td className="p-4">
                                                                <div className="font-bold text-gray-900">{student.name}</div>
                                                                <div className="text-xs text-gray-400 mt-1">{student.isActive === false ? 'الحساب موقوف' : 'الحساب نشط'}</div>
                                                            </td>
                                                            <td className="p-4 text-gray-600">{student.email || '-'}</td>
                                                            <td className="p-4">
                                                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentClass ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                    {currentClass?.name || 'بدون فصل'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <select
                                                                    value={currentClass?.id || ''}
                                                                    onChange={(event) => {
                                                                        const value = event.target.value;
                                                                        if (!value || value === currentClass?.id) return;
                                                                        void handleAssignStudentToClass(student.id, value);
                                                                    }}
                                                                    disabled={Boolean(rosterActionPending)}
                                                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                >
                                                                    <option value="">اختر فصلاً</option>
                                                                    {schoolClasses.map((classroom) => (
                                                                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {currentClass && (
                                                                        <button
                                                                            type="button"
                                                                            data-testid="school-student-remove-class"
                                                                            onClick={() => {
                                                                                if (window.confirm(`هل تريد إخراج ${student.name} من فصل ${currentClass.name}؟ سيبقى الطالب داخل المدرسة.`)) {
                                                                                    void handleRemoveStudentScope(student.id, currentClass.id);
                                                                                }
                                                                            }}
                                                                            disabled={Boolean(rosterActionPending)}
                                                                            className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100"
                                                                        >
                                                                            إخراج من الفصل
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        data-testid="school-student-remove-school"
                                                                        onClick={() => {
                                                                            if (window.confirm(`هل تريد إزالة ${student.name} من ${selectedSchool.name}؟ سيتم إخراجه من المدرسة وفصولها.`)) {
                                                                                void handleRemoveStudentScope(student.id, selectedSchool.id);
                                                                            }
                                                                        }}
                                                                        disabled={Boolean(rosterActionPending)}
                                                                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-100"
                                                                    >
                                                                        إزالة من المدرسة
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {schoolStudentTotalPages > 1 && (
                                            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                                                <span>
                                                    عرض {schoolStudentStartIndex + 1}-{schoolStudentEndIndex} من {visibleSchoolStudents.length} طالب
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={safeSchoolStudentPage <= 1}
                                                        onClick={() => setSchoolStudentPage((page) => Math.max(1, page - 1))}
                                                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        السابق
                                                    </button>
                                                    <span className="rounded-xl bg-white px-3 py-2 text-gray-500">
                                                        صفحة {safeSchoolStudentPage} / {schoolStudentTotalPages}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={safeSchoolStudentPage >= schoolStudentTotalPages}
                                                        onClick={() => setSchoolStudentPage((page) => Math.min(schoolStudentTotalPages, page + 1))}
                                                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        التالي
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
                        <div data-testid="school-reports-panel" className="space-y-6">
                            <div data-testid="school-handover-report-summary" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                                    <div>
                                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                                            readinessScore === readinessChecks.length
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : readinessScore >= 3
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-red-50 text-red-700'
                                        }`}>
                                            <ShieldCheck size={14} />
                                            {readinessStatusLabel}
                                        </div>
                                        <h3 className="mt-3 text-xl font-black text-gray-900">قرار تسليم المدرسة</h3>
                                        <p className="mt-2 text-sm font-bold leading-7 text-gray-600">{readinessNextStep}</p>
                                        <div data-testid="school-handover-readiness-progress" className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full ${
                                                    readinessScore === readinessChecks.length
                                                        ? 'bg-emerald-500'
                                                        : readinessScore >= 3
                                                            ? 'bg-amber-500'
                                                            : 'bg-red-500'
                                                }`}
                                                style={{ width: `${readinessPercent}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs font-black text-gray-500">
                                            <span>جاهزية التشغيل</span>
                                            <span>{readinessScore}/{readinessChecks.length}</span>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                        <button
                                            type="button"
                                            data-testid="school-report-download-handover"
                                            onClick={downloadSchoolHandover}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
                                        >
                                            <Download size={16} />
                                            ملف التسليم
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="school-report-download-gaps"
                                            onClick={downloadSchoolGapReport}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                                        >
                                            <FileSpreadsheet size={16} />
                                            فجوات الجاهزية
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="school-report-print-readiness"
                                            onClick={printSchoolReport}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                                        >
                                            <Printer size={16} />
                                            طباعة تقرير التسليم
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-3 md:grid-cols-3">
                                    {[
                                        ['نطاق المدرسة', `${schoolClasses.length} فصل / ${schoolStudents.length} طالب`],
                                        ['المشرفون', `${schoolSupervisors.length} مشرف`],
                                        ['الوصول', `${activeSchoolPackages.length} باقة / ${activeSchoolCodes.length} كود`],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                            <div className="text-xs font-black text-gray-500">{label}</div>
                                            <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div data-testid="school-handover-blocking-gaps" className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900">نواقص تمنع التسليم</h4>
                                            <p className="mt-1 text-xs font-bold leading-6 text-gray-500">
                                                هذه القائمة هي قرار اليوم: أكمل البنود الناقصة فقط، ثم اطبع تقرير التسليم.
                                            </p>
                                        </div>
                                        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ${
                                            handoverBlockingGaps.length === 0
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {handoverBlockingGaps.length === 0 ? 'لا توجد نواقص تشغيلية' : `${handoverBlockingGaps.length} بند يحتاج استكمال`}
                                        </span>
                                    </div>
                                    {handoverBlockingGaps.length === 0 ? (
                                        <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700">
                                            المدرسة جاهزة للتسليم. استخدم ملف التسليم أو الطباعة لمشاركة النسخة النهائية مع الإدارة.
                                        </div>
                                    ) : (
                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            {handoverBlockingGaps.map((gap) => (
                                                <div key={gap.label} className="flex flex-col gap-3 rounded-xl border border-white bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <div className="text-sm font-black text-gray-900">{gap.label}</div>
                                                        <div className="mt-1 text-xs font-bold leading-6 text-gray-500">{gap.hint}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab(gap.tab)}
                                                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-xs font-black text-white hover:bg-gray-800"
                                                    >
                                                        استكمال
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isLoadingReport ? (
                                <div className="py-12 text-center text-gray-500">جارٍ تحميل تقرير المدرسة...</div>
                            ) : reportError ? (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                                    {reportError}
                                </div>
                            ) : schoolReport ? (
                                <>
                                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">ملف تقرير المدرسة</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                لقطة تنفيذية للمدير أو المشرف تشمل الأداء العام، أضعف المهارات، وأداء الفصول.
                                            </p>
                                        </div>
                                        <button
                                            onClick={downloadSchoolPerformanceReport}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                                        >
                                            <Download size={16} />
                                            تصدير تقرير المدرسة
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 p-5 rounded-xl">
                                            <p className="text-sm text-blue-700 mb-1">الطلاب النشطون</p>
                                            <p className="text-3xl font-bold text-blue-600">{schoolReport.metrics.activeStudents}</p>
                                        </div>
                                        <div className="bg-purple-50 p-5 rounded-xl">
                                            <p className="text-sm text-purple-700 mb-1">محاولات الاختبار</p>
                                            <p className="text-3xl font-bold text-purple-600">{schoolReport.metrics.quizAttempts}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-5 rounded-xl">
                                            <p className="text-sm text-emerald-700 mb-1">متوسط الأداء</p>
                                            <p className="text-3xl font-bold text-emerald-600">{schoolReport.metrics.averageScore}%</p>
                                        </div>
                                        <div className="bg-amber-50 p-5 rounded-xl">
                                            <p className="text-sm text-amber-700 mb-1">الأكواد النشطة</p>
                                            <p className="text-3xl font-bold text-amber-600">{schoolReport.metrics.activeCodes}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="border border-gray-100 rounded-xl p-5">
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">أضعف المهارات داخل المدرسة</h3>
                                            <div className="space-y-3">
                                                {schoolReport.weakestSkills.length === 0 ? (
                                                    <p className="text-sm text-gray-500">لا توجد بيانات نتائج كافية بعد لإظهار نقاط الضعف.</p>
                                                ) : schoolReport.weakestSkills.map((item) => {
                                                    const subjectName = subjects.find((subject) => subject.id === item.subjectId)?.name;
                                                    const sectionName = sections.find((section) => section.id === item.sectionId)?.name;
                                                    return (
                                                        <div key={`${item.skillId || item.skill}-${item.attempts}`} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                                <div>
                                                                    <p className="font-bold text-gray-900">{item.skill}</p>
                                                                    <p className="text-xs text-gray-500">{[subjectName, sectionName].filter(Boolean).join(' • ') || 'بدون تصنيف إضافي'}</p>
                                                                </div>
                                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.mastery < 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    إتقان {item.mastery}%
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600">عدد المحاولات: {item.attempts}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-5">
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">أداء الفصول</h3>
                                            <div className="space-y-3">
                                                {schoolReport.classSummaries.length === 0 ? (
                                                    <p className="text-sm text-gray-500">لا توجد فصول مرتبطة بهذه المدرسة بعد.</p>
                                                ) : schoolReport.classSummaries.map((classroom) => (
                                                    <div key={classroom.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-gray-900">{classroom.name}</p>
                                                                <p className="text-xs text-gray-500">{classroom.studentCount} طالب • {classroom.supervisorCount} مشرف</p>
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-900">{classroom.averageScore}%</span>
                                                        </div>
                                                        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full ${classroom.averageScore >= 70 ? 'bg-emerald-500' : classroom.averageScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.min(classroom.averageScore, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="mt-2 text-xs text-gray-500">محاولات الاختبار: {classroom.quizAttempts}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center text-gray-500">لا توجد بيانات تقرير متاحة بعد.</div>
                            )}
                        </div>
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
