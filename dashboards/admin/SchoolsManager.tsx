import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
    BookOpen,
    Building2,
    CheckCircle,
    Clock3,
    Download,
    Edit2,
    FileSpreadsheet,
    Key,
    MoreVertical,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Group, Role, User, PackageContentType } from '../../types';
import { api } from '../../services/api';

type ImportRow = {
    name: string;
    email: string;
    className?: string;
    password?: string;
};

type ImportSummary = {
    totalRows: number;
    imported: number;
    classesTouched: number;
};

type ImportResponse = {
    summary: ImportSummary;
    credentials: Array<{ name: string; email: string; password: string; className?: string }>;
};

type SchoolReport = {
    school: {
        id: string;
        name: string;
    };
    metrics: {
        totalStudents: number;
        activeStudents: number;
        totalClasses: number;
        activePackages: number;
        activeCodes: number;
        quizAttempts: number;
        averageScore: number;
    };
    classSummaries: Array<{
        id: string;
        name: string;
        studentCount: number;
        supervisorCount: number;
        quizAttempts: number;
        averageScore: number;
    }>;
    weakestSkills: Array<{
        skillId?: string;
        skill: string;
        subjectId?: string;
        sectionId?: string;
        attempts: number;
        mastery: number;
    }>;
};

const normalizeHeader = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\uFEFF/g, '')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/\s+/g, '');

const headerMatches = (header: string, aliases: string[]) =>
    aliases.map(normalizeHeader).includes(header);

const STUDENT_IMPORT_HEADERS = {
    name: ['name', 'fullName', 'studentName', 'الاسم', 'اسم الطالب', 'اسم', 'الطالب'],
    email: ['email', 'mail', 'البريد', 'البريد الإلكتروني', 'الايميل', 'الإيميل', 'بريد الطالب'],
    className: ['className', 'class', 'classroom', 'الفصل', 'اسم الفصل', 'الصف', 'المجموعة'],
    password: ['password', 'pass', 'كلمة المرور', 'كلمة السر', 'الرقم السري', 'passwordHint'],
};

const createCsvDownload = (fileName: string, rows: string[][]) => {
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
};

const createXlsxDownload = (fileName: string, rows: string[][]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'students');
    XLSX.writeFile(workbook, fileName);
};

const createWorkbookDownload = (
    fileName: string,
    sheets: Array<{ name: string; rows: Array<Array<string | number>> }>,
) => {
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, fileName);
};

const parseImportRows = (rows: unknown[][]): ImportRow[] => {
    const normalizedRows = rows
        .map((row) => row.map((cell) => String(cell ?? '').trim()))
        .filter((row) => row.some(Boolean));

    if (normalizedRows.length < 2) {
        return [];
    }

    normalizedRows[0] = normalizedRows[0].map((header) => {
        const normalizedHeader = normalizeHeader(header);
        if (headerMatches(normalizedHeader, STUDENT_IMPORT_HEADERS.name)) return 'name';
        if (headerMatches(normalizedHeader, STUDENT_IMPORT_HEADERS.email)) return 'email';
        if (headerMatches(normalizedHeader, STUDENT_IMPORT_HEADERS.className)) return 'className';
        if (headerMatches(normalizedHeader, STUDENT_IMPORT_HEADERS.password)) return 'password';
        return header;
    });

    const headers = normalizedRows[0].map(normalizeHeader);
    const nameIndex = headers.findIndex((header) => ['name', 'fullname', 'studentname', 'Ø§Ù„Ø§Ø³Ù…', 'Ø§Ø³Ù…Ø§Ù„Ø·Ø§Ù„Ø¨'].includes(header));
    const emailIndex = headers.findIndex((header) => ['email', 'mail', 'Ø§Ù„Ø¨Ø±ÙŠØ¯', 'Ø§Ù„Ø¨Ø±ÙŠØ¯Ø§Ù„Ø§Ù„ÙƒØªØ±ÙˆÙ†ÙŠ'].includes(header));
    const classIndex = headers.findIndex((header) => ['classname', 'class', 'Ø§Ù„ÙØµÙ„', 'Ø§Ø³Ù…Ø§Ù„ÙØµÙ„'].includes(header));
    const passwordIndex = headers.findIndex((header) => ['password', 'pass', 'ÙƒÙ„Ù…Ø©Ø§Ù„Ù…Ø±ÙˆØ±', 'passwordhint'].includes(header));

    if (nameIndex === -1 || emailIndex === -1) {
        throw new Error('Ø§Ù„Ù…Ù„Ù ÙŠØ­ØªØ§Ø¬ Ø¹Ù…ÙˆØ¯ÙŠÙ† Ø£Ø³Ø§Ø³ÙŠÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„: name Ùˆ email.');
    }

    return normalizedRows
        .slice(1)
        .map((cells) => ({
            name: (cells[nameIndex] || '').trim(),
            email: (cells[emailIndex] || '').trim(),
            className: classIndex >= 0 ? (cells[classIndex] || '').trim() : undefined,
            password: passwordIndex >= 0 ? (cells[passwordIndex] || '').trim() : undefined,
        }))
        .filter((row) => row.name && row.email);
};

const parseImportFile = async (file: File): Promise<ImportRow[]> => {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            return [];
        }

        const worksheet = workbook.Sheets[firstSheetName];
        return parseImportRows(XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]);
    }

    const raw = await file.text();
    const content = raw.replace(/\r\n/g, '\n').trim();
    if (!content) {
        return [];
    }

    const lines = content.split('\n').filter(Boolean);
    if (lines.length < 2) {
        return [];
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    return parseImportRows(lines.map((line) => line.split(delimiter)));
/*
    const headers = lines[0].split(delimiter).map(normalizeHeader);
    const nameIndex = headers.findIndex((header) => ['name', 'fullname', 'studentname', 'الاسم', 'اسمالطالب'].includes(header));
    const emailIndex = headers.findIndex((header) => ['email', 'mail', 'البريد', 'البريدالالكتروني'].includes(header));
    const classIndex = headers.findIndex((header) => ['classname', 'class', 'الفصل', 'اسمالفصل'].includes(header));
    const passwordIndex = headers.findIndex((header) => ['password', 'pass', 'كلمةالمرور', 'passwordhint'].includes(header));

    if (nameIndex === -1 || emailIndex === -1) {
        throw new Error('الملف يحتاج عمودين أساسيين على الأقل: name و email.');
    }

    return lines
        .slice(1)
        .map((line) => line.split(delimiter))
        .map((cells) => ({
            name: (cells[nameIndex] || '').trim(),
            email: (cells[emailIndex] || '').trim(),
            className: classIndex >= 0 ? (cells[classIndex] || '').trim() : undefined,
            password: passwordIndex >= 0 ? (cells[passwordIndex] || '').trim() : undefined,
        }))
        .filter((row) => row.name && row.email);
*/
};

const getDuplicateImportEmails = (rows: ImportRow[]) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    rows.forEach((row) => {
        const email = row.email.trim().toLowerCase();
        if (!email) return;
        if (seen.has(email)) {
            duplicates.add(email);
            return;
        }
        seen.add(email);
    });

    return Array.from(duplicates);
};

const PACKAGE_CONTENT_OPTIONS: Array<{ value: PackageContentType; label: string }> = [
    { value: 'all', label: 'شاملة' },
    { value: 'courses', label: 'الدورات' },
    { value: 'foundation', label: 'التأسيس' },
    { value: 'banks', label: 'التدريبات' },
    { value: 'tests', label: 'الاختبارات' },
    { value: 'library', label: 'المكتبة' },
];

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
        createGroup,
        updateGroup,
        deleteGroup,
        assignSupervisorToGroup,
        removeSupervisorFromGroup,
        assignCourseToGroup,
        removeCourseFromGroup,
        assignStudentToGroup,
        createB2BPackage,
        updateB2BPackage,
        deleteB2BPackage,
        createAccessCode,
        deleteAccessCode,
        hydrateUsers,
    } = useStore();

    const [selectedSchool, setSelectedSchool] = useState<Group | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'import' | 'reports'>('overview');
    const [schoolSearch, setSchoolSearch] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [importCredentials, setImportCredentials] = useState<ImportResponse['credentials']>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const [schoolReport, setSchoolReport] = useState<SchoolReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [selectedPackageIdForCode, setSelectedPackageIdForCode] = useState('');
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
    const [managementError, setManagementError] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState<'all' | 'unassigned' | string>('all');
    const [newCodeMaxUses, setNewCodeMaxUses] = useState('50');
    const [newCodeDurationDays, setNewCodeDurationDays] = useState('30');
    const [bulkClassNames, setBulkClassNames] = useState('');

    const schools = useMemo(() => groups.filter((group) => group.type === 'SCHOOL'), [groups]);
    const classes = useMemo(() => groups.filter((group) => group.type === 'CLASS'), [groups]);
    const students = useMemo(() => users.filter((currentUser) => currentUser.role === Role.STUDENT), [users]);
    const supervisors = useMemo(
        () => users.filter((currentUser) => currentUser.role === Role.SUPERVISOR || currentUser.role === Role.TEACHER),
        [users],
    );
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

    const filteredSchools = useMemo(() => {
        const keyword = schoolSearch.trim().toLowerCase();
        if (!keyword) {
            return schools;
        }

        return schools.filter((school) => school.name.toLowerCase().includes(keyword));
    }, [schoolSearch, schools]);

    const refreshUsers = async () => {
        if (user.role !== Role.ADMIN) {
            return;
        }

        try {
            const response = await api.getAdminUsers() as { users: User[] };
            hydrateUsers(response.users || []);
        } catch (error) {
            console.warn('Failed to refresh users after school updates:', error);
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

        const packages = b2bPackages.filter((pkg) => pkg.schoolId === selectedSchool.id);
        setSelectedPackageIdForCode((current) => (
            packages.some((pkg) => pkg.id === current)
                ? current
                : (packages[0]?.id || '')
        ));
    }, [selectedSchool, b2bPackages]);

    const handleCreateSchool = () => {
        const newSchool: Group = {
            id: `school_${Date.now()}`,
            name: 'مدرسة جديدة',
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

        createGroup(newSchool);
        setSelectedSchool(newSchool);
        setActiveTab('overview');
    };

    const handleCreateBulkClasses = () => {
        if (!selectedSchool) return;

        const classNames = Array.from(new Set(
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

        namesToCreate.forEach((name, index) => {
            createGroup({
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
            });
        });

        setBulkClassNames('');
        setManagementError(null);
    };

    const downloadTemplate = () => {
        createXlsxDownload('school-import-template.xlsx', [
            ['اسم الطالب', 'البريد الإلكتروني', 'اسم الفصل', 'كلمة المرور'],
            ['طالب تجريبي', 'student1@example.com', 'فصل أ', 'Nn@123456'],
            ['طالبة تجريبية', 'student2@example.com', 'فصل ب', ''],
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
        setImportError(null);
        try {
            const response = await api.importSchoolStudents(selectedSchool.id, { rows: importRows }) as ImportResponse;
            setImportSummary(response.summary);
            setImportCredentials(response.credentials);
            await refreshUsers();
            await loadSchoolReport(selectedSchool.id);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'تعذر استيراد الطلاب الآن.');
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
        const schoolStudents = students.filter((currentUser) => currentUser.schoolId === selectedSchool.id);
        const schoolSupervisors = supervisors.filter((currentUser) => currentUser.groupIds?.includes(selectedSchool.id));
        const schoolCourses = publishedCourses.filter((course) => selectedSchool.courseIds.includes(course.id));
        const activeSchoolPackages = schoolPackages.filter((pkg) => pkg.status === 'active');
        const activeSchoolCodes = schoolCodes.filter((code) => code.expiresAt > Date.now());
        const totalSeats = schoolPackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
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
        const readinessChecks = [
            {
                label: 'فصول دراسية',
                isReady: schoolClasses.length > 0,
                hint: schoolClasses.length > 0 ? `${schoolClasses.length} فصل جاهز` : 'أضف فصلًا واحدًا على الأقل',
            },
            {
                label: 'مشرفون',
                isReady: schoolSupervisors.length > 0,
                hint: schoolSupervisors.length > 0 ? `${schoolSupervisors.length} مشرف/معلم` : 'اربط مشرفًا أو معلمًا بالمدرسة',
            },
            {
                label: 'باقات نشطة',
                isReady: activeSchoolPackages.length > 0,
                hint: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة نشطة` : 'فعّل باقة مدرسية واحدة على الأقل',
            },
            {
                label: 'أكواد دخول',
                isReady: activeSchoolCodes.length > 0,
                hint: activeSchoolCodes.length > 0 ? `${activeSchoolCodes.length} كود صالح` : 'ولّد كودًا صالحًا للطلاب',
            },
        ];
        const readinessScore = readinessChecks.filter((check) => check.isReady).length;
        const operationalWarnings = [
            schoolClasses.length === 0 ? 'أضف فصلًا واحدًا على الأقل قبل تسليم المدرسة.' : '',
            schoolSupervisors.length === 0 ? 'اربط مشرفًا أو معلمًا ليتمكن من متابعة الطلاب.' : '',
            activeSchoolPackages.length === 0 ? 'فعّل باقة مدرسية حتى يحصل الطلاب على الوصول بدون شراء فردي.' : '',
            activeSchoolCodes.length === 0 ? 'ولّد كود دخول صالحًا إذا كانت المدرسة ستسجل الطلاب بالأكواد.' : '',
            totalSeats > 0 && usedSeats >= totalSeats ? 'تم استهلاك كل المقاعد المتاحة، راجع سعة الباقات.' : '',
            schoolStudents.some((student) => !(student.groupIds || []).some((groupId) => schoolClasses.some((classroom) => classroom.id === groupId)))
                ? 'يوجد طلاب بلا فصل، يفضل نقلهم لفصول قبل متابعة التقارير.'
                : '',
        ].filter(Boolean);
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

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => { setManagementError(null); setSelectedSchool(null); }} className="text-gray-500 hover:text-gray-900">
                        &rarr; عودة لقائمة المدارس
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedSchool.name}</h1>
                    <button
                        onClick={() => {
                            const newName = window.prompt('اكتب اسم المدرسة الجديد:', selectedSchool.name);
                            if (newName?.trim() && newName.trim() !== selectedSchool.name) {
                                const nextName = newName.trim();
                                updateGroup(selectedSchool.id, { name: nextName });
                                setSelectedSchool({ ...selectedSchool, name: nextName });
                            }
                        }}
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
                </div>

                <div className="flex gap-2 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'نظرة عامة والفصول' },
                        { id: 'packages', label: 'الباقات والأكواد' },
                        { id: 'import', label: 'استيراد الطلاب (Excel)' },
                        { id: 'reports', label: 'تقارير الأداء' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setManagementError(null);
                                setActiveTab(tab.id as typeof activeTab);
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

                {operationalWarnings.length > 0 && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-amber-800">
                            <ShieldCheck size={18} />
                            ملاحظات قبل التسليم
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                            {operationalWarnings.map((warning) => (
                                <div key={warning} className="rounded-xl bg-white px-4 py-3 text-sm font-bold leading-7 text-amber-800">
                                    {warning}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">جاهزية المدرسة للتشغيل</h2>
                            <p className="text-sm text-gray-500 mt-1">فحص سريع قبل تسليم المدرسة للطلاب والمشرفين.</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            readinessScore === readinessChecks.length
                                ? 'bg-emerald-100 text-emerald-700'
                                : readinessScore >= 2
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                        }`}>
                            {readinessScore}/{readinessChecks.length} جاهز
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {readinessChecks.map((check) => (
                            <div
                                key={check.label}
                                className={`rounded-xl border p-4 ${
                                    check.isReady
                                        ? 'border-emerald-100 bg-emerald-50'
                                        : 'border-amber-100 bg-amber-50'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={18} className={check.isReady ? 'text-emerald-600' : 'text-amber-600'} />
                                    <p className="font-bold text-gray-900 text-sm">{check.label}</p>
                                </div>
                                <p className={`text-xs ${check.isReady ? 'text-emerald-700' : 'text-amber-700'}`}>{check.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="text-blue-500" size={24} />
                                        <h3 className="font-bold text-gray-900">إجمالي الطلاب</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600">{selectedSchool.studentIds.length}</p>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">مشرفو المدرسة</h3>
                                        <span className="text-sm text-gray-500">{schoolSupervisors.length} مرتبطون</span>
                                    </div>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        defaultValue=""
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (!value) return;
                                            assignSupervisorToGroup(value, selectedSchool.id);
                                            event.target.value = '';
                                        }}
                                    >
                                        <option value="">إضافة مشرف أو معلم للمدرسة</option>
                                        {supervisors
                                            .filter((currentUser) => !selectedSchool.supervisorIds.includes(currentUser.id))
                                            .map((currentUser) => (
                                                <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                                            ))}
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        {schoolSupervisors.length === 0 ? (
                                            <span className="text-sm text-gray-400">لا يوجد مشرفون مرتبطون بهذه المدرسة بعد.</span>
                                        ) : schoolSupervisors.map((currentUser) => (
                                            <button
                                                key={currentUser.id}
                                                onClick={() => removeSupervisorFromGroup(currentUser.id, selectedSchool.id)}
                                                className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                                            >
                                                {currentUser.name} ×
                                            </button>
                                        ))}
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
                                                onClick={() => removeCourseFromGroup(course.id, selectedSchool.id)}
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
                                    <button
                                        onClick={() => downloadSchoolRoster(selectedSchool, schoolStudents, schoolClasses)}
                                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <Download size={16} /> تصدير كشف الطلاب
                                    </button>
                                    <button
                                        onClick={() => {
                                            createGroup({
                                                id: `class_${Date.now()}`,
                                                name: `فصل جديد - ${selectedSchool.name}`,
                                                type: 'CLASS',
                                                parentId: selectedSchool.id,
                                                ownerId: user.id,
                                                supervisorIds: [],
                                                studentIds: [],
                                                courseIds: [],
                                                createdAt: Date.now(),
                                                totalStudents: 0,
                                                totalSupervisors: 0,
                                                totalCourses: 0,
                                            });
                                        }}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> إضافة فصل
                                    </button>
                                </div>

                                <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
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

                                            return (
                                                <div key={classroom.id} className="border border-gray-100 p-4 rounded-xl hover:shadow-sm transition-shadow space-y-4">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{classroom.name}</h4>
                                                            <p className="text-sm text-gray-500">
                                                                {classroom.studentIds.length} طالب • {classroom.supervisorIds.length} مشرف • {classroom.courseIds.length} دورة
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const newName = window.prompt('أدخل اسم الفصل الجديد:', classroom.name);
                                                                    if (newName?.trim()) {
                                                                        updateGroup(classroom.id, { name: newName.trim() });
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
                                                                        deleteGroup(classroom.id);
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2">المشرف المسؤول</label>
                                                            <select
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                defaultValue=""
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    if (!value) return;
                                                                    assignSupervisorToGroup(value, classroom.id);
                                                                    event.target.value = '';
                                                                }}
                                                            >
                                                                <option value="">إضافة مشرف للفصل</option>
                                                                {supervisors
                                                                    .filter((currentUser) => !classroom.supervisorIds.includes(currentUser.id))
                                                                    .map((currentUser) => (
                                                                        <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                                                                    ))}
                                                            </select>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {classSupervisors.length === 0 ? (
                                                                    <span className="text-xs text-gray-400">لا يوجد مشرف مرتبط بهذا الفصل.</span>
                                                                ) : classSupervisors.map((currentUser) => (
                                                                    <button
                                                                        key={currentUser.id}
                                                                        onClick={() => removeSupervisorFromGroup(currentUser.id, classroom.id)}
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

                            <div className="border border-gray-100 rounded-2xl p-5 space-y-4">
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
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                                {visibleSchoolStudents.slice(0, 80).map((student) => {
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
                                                                        assignStudentToGroup(student.id, value);
                                                                    }}
                                                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                >
                                                                    <option value="">اختر فصلاً</option>
                                                                    {schoolClasses.map((classroom) => (
                                                                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'packages' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                    <div className="text-xs font-black text-emerald-700 mb-2">باقات نشطة</div>
                                    <div className="text-2xl font-black text-emerald-800">{activeSchoolPackages.length}</div>
                                </div>
                                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                                    <div className="text-xs font-black text-rose-700 mb-2">باقات موقوفة/منتهية</div>
                                    <div className="text-2xl font-black text-rose-800">{schoolPackages.filter((pkg) => pkg.status !== 'active').length}</div>
                                </div>
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                                    <div className="text-xs font-black text-indigo-700 mb-2">إجمالي الأكواد</div>
                                    <div className="text-2xl font-black text-indigo-800">{schoolCodes.length}</div>
                                </div>
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <div className="text-xs font-black text-amber-700 mb-2">معدل الاستخدام</div>
                                    <div className="text-2xl font-black text-amber-800">{totalSeats > 0 ? `${Math.min(100, Math.round((usedSeats / totalSeats) * 100))}%` : '0%'}</div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">الباقات المخصصة</h3>
                                    <button
                                        onClick={() => {
                                            createB2BPackage({
                                                id: `pkg_${Date.now()}`,
                                                schoolId: selectedSchool.id,
                                                name: 'باقة جديدة',
                                                courseIds: [],
                                                contentTypes: ['all'],
                                                pathIds: [],
                                                subjectIds: [],
                                                type: 'free_access',
                                                maxStudents: 100,
                                                status: 'active',
                                                createdAt: Date.now(),
                                            });
                                        }}
                                        className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> تخصيص باقة
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {schoolPackages.map((pkg) => {
                                        const packageCourses = publishedCourses.filter((course) => pkg.courseIds.includes(course.id));
                                        const packagePaths = paths.filter((path) => (pkg.pathIds || []).includes(path.id));
                                        const packageSubjects = subjects.filter((currentSubject) => (pkg.subjectIds || []).includes(currentSubject.id));

                                        return (
                                        <div key={pkg.id} className="border border-gray-200 p-5 rounded-xl space-y-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <input
                                                        defaultValue={pkg.name}
                                                        onBlur={(event) => {
                                                            const value = event.target.value.trim();
                                                            if (value && value !== pkg.name) {
                                                                updateB2BPackage(pkg.id, { name: value });
                                                            }
                                                        }}
                                                        className="font-bold text-gray-900 text-lg bg-transparent border-b border-transparent hover:border-gray-200 focus:border-amber-400 focus:outline-none transition-colors w-full"
                                                    />
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block ${pkg.type === 'free_access' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {pkg.type === 'free_access' ? 'وصول مجاني للطلاب' : 'خصم خاص'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {pkg.status === 'active' ? 'نشطة' : 'منتهية'}
                                                    </span>
                                                    <button
                                                        onClick={() => updateB2BPackage(pkg.id, {
                                                            status: pkg.status === 'active' ? 'expired' : 'active',
                                                        })}
                                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                                            pkg.status === 'active'
                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        }`}
                                                        title="إيقاف أو تنشيط الباقة بدون حذفها"
                                                    >
                                                        {pkg.status === 'active' ? 'إيقاف مؤقت' : 'تنشيط'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('هل تريد حذف هذه الباقة وكل الأكواد التابعة لها؟')) {
                                                                deleteB2BPackage(pkg.id);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-2">نوع الباقة</label>
                                                    <select
                                                        value={pkg.type}
                                                        onChange={(event) => updateB2BPackage(pkg.id, {
                                                            type: event.target.value as 'free_access' | 'discounted',
                                                        })}
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        <option value="free_access">وصول مجاني</option>
                                                        <option value="discounted">خصم خاص</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-2">حالة الباقة</label>
                                                    <select
                                                        value={pkg.status}
                                                        onChange={(event) => updateB2BPackage(pkg.id, {
                                                            status: event.target.value as 'active' | 'expired',
                                                        })}
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        <option value="active">نشطة</option>
                                                        <option value="expired">منتهية</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-2">الحد الأقصى للطلاب</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        defaultValue={pkg.maxStudents}
                                                        onBlur={(event) => {
                                                            const value = Number(event.target.value);
                                                            if (Number.isFinite(value) && value > 0 && value !== pkg.maxStudents) {
                                                                updateB2BPackage(pkg.id, { maxStudents: value });
                                                            }
                                                        }}
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    />
                                                </div>
                                                {pkg.type === 'discounted' ? (
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-2">نسبة الخصم %</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={100}
                                                            defaultValue={pkg.discountPercentage || 20}
                                                            onBlur={(event) => {
                                                                const value = Number(event.target.value);
                                                                if (Number.isFinite(value) && value > 0 && value <= 100 && value !== pkg.discountPercentage) {
                                                                    updateB2BPackage(pkg.id, { discountPercentage: value });
                                                                }
                                                            }}
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center">
                                                        هذه الباقة تمنح الوصول الكامل للدورات المرتبطة دون خصم.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3 border-t border-gray-100 pt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-2">نوع المحتوى المفتوح بهذه الباقة</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {PACKAGE_CONTENT_OPTIONS.map((option) => {
                                                            const selectedContentTypes = Array.isArray(pkg.contentTypes) && pkg.contentTypes.length ? pkg.contentTypes : ['all'];
                                                            const isSelected = selectedContentTypes.includes(option.value);
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        let nextTypes: PackageContentType[] = selectedContentTypes as PackageContentType[];

                                                                        if (option.value === 'all') {
                                                                            nextTypes = ['all'];
                                                                        } else if (isSelected) {
                                                                            nextTypes = selectedContentTypes.filter((item) => item !== option.value && item !== 'all') as PackageContentType[];
                                                                        } else {
                                                                            nextTypes = [...selectedContentTypes.filter((item) => item !== 'all'), option.value] as PackageContentType[];
                                                                        }

                                                                        updateB2BPackage(pkg.id, {
                                                                            contentTypes: nextTypes.length > 0 ? nextTypes : ['all'],
                                                                        });
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                                                        isSelected
                                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                                    }`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-2">تقييد الباقة على مسار</label>
                                                        <select
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            defaultValue=""
                                                            onChange={(event) => {
                                                                const value = event.target.value;
                                                                if (!value) return;
                                                                updateB2BPackage(pkg.id, {
                                                                    pathIds: Array.from(new Set([...(pkg.pathIds || []), value])),
                                                                });
                                                                event.target.value = '';
                                                            }}
                                                        >
                                                            <option value="">أضف مسارًا أو اتركها عامة</option>
                                                            {paths
                                                                .filter((path) => !(pkg.pathIds || []).includes(path.id))
                                                                .map((path) => (
                                                                    <option key={path.id} value={path.id}>{path.name}</option>
                                                                ))}
                                                        </select>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {packagePaths.length === 0 ? (
                                                                <span className="text-xs text-gray-400">هذه الباقة تعمل على كل المسارات.</span>
                                                            ) : packagePaths.map((path) => (
                                                                <button
                                                                    key={path.id}
                                                                    onClick={() => updateB2BPackage(pkg.id, {
                                                                        pathIds: (pkg.pathIds || []).filter((pathId) => pathId !== path.id),
                                                                    })}
                                                                    className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                                                                >
                                                                    {path.name} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-2">تقييد الباقة على مادة</label>
                                                        <select
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            defaultValue=""
                                                            onChange={(event) => {
                                                                const value = event.target.value;
                                                                if (!value) return;
                                                                updateB2BPackage(pkg.id, {
                                                                    subjectIds: Array.from(new Set([...(pkg.subjectIds || []), value])),
                                                                });
                                                                event.target.value = '';
                                                            }}
                                                        >
                                                            <option value="">أضف مادة أو اتركها عامة</option>
                                                            {subjects
                                                                .filter((currentSubject) => {
                                                                    const pathFilter = (pkg.pathIds || []).length === 0 || (pkg.pathIds || []).includes(currentSubject.pathId);
                                                                    const notSelected = !(pkg.subjectIds || []).includes(currentSubject.id);
                                                                    return pathFilter && notSelected;
                                                                })
                                                                .map((currentSubject) => (
                                                                    <option key={currentSubject.id} value={currentSubject.id}>{currentSubject.name}</option>
                                                                ))}
                                                        </select>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {packageSubjects.length === 0 ? (
                                                                <span className="text-xs text-gray-400">هذه الباقة تعمل على كل المواد ضمن النطاق المختار.</span>
                                                            ) : packageSubjects.map((currentSubject) => (
                                                                <button
                                                                    key={currentSubject.id}
                                                                    onClick={() => updateB2BPackage(pkg.id, {
                                                                        subjectIds: (pkg.subjectIds || []).filter((subjectId) => subjectId !== currentSubject.id),
                                                                    })}
                                                                    className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                                                                >
                                                                    {currentSubject.name} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p>عدد الدورات المشمولة: {pkg.courseIds.length}</p>
                                                        <p>الحد الأقصى للطلاب: {pkg.maxStudents}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {pkg.discountPercentage ? `خصم ${pkg.discountPercentage}%` : 'وصول مباشر'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-2">إضافة دورة إلى الباقة</label>
                                                    <select
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                        defaultValue=""
                                                        onChange={(event) => {
                                                            const value = event.target.value;
                                                            if (!value) return;

                                                            if (!selectedSchool.courseIds.includes(value)) {
                                                                assignCourseToGroup(value, selectedSchool.id);
                                                            }

                                                            updateB2BPackage(pkg.id, {
                                                                courseIds: Array.from(new Set([...pkg.courseIds, value])),
                                                            });
                                                            event.target.value = '';
                                                        }}
                                                    >
                                                        <option value="">اختر دورة منشورة لإضافتها</option>
                                                        {publishedCourses
                                                            .filter((course) => !pkg.courseIds.includes(course.id))
                                                            .map((course) => (
                                                                <option key={course.id} value={course.id}>{course.title}</option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {packageCourses.length === 0 ? (
                                                        <span className="text-sm text-gray-400">لا توجد دورات مرتبطة بهذه الباقة حتى الآن.</span>
                                                    ) : packageCourses.map((course) => (
                                                        <button
                                                            key={course.id}
                                                            onClick={() => updateB2BPackage(pkg.id, {
                                                                courseIds: pkg.courseIds.filter((courseId) => courseId !== course.id),
                                                            })}
                                                            className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
                                                        >
                                                            {course.title} ×
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أكواد التفعيل</h3>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={selectedPackageIdForCode}
                                            onChange={(event) => setSelectedPackageIdForCode(event.target.value)}
                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[220px]"
                                        >
                                            <option value="">اختر الباقة المستهدفة</option>
                                            {schoolPackages.map((pkg) => (
                                                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{schoolCodes.length} كود</span>
                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{activeSchoolCodes.length} كود صالح</span>
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{usedSeats} استخدام</span>
                                        </div>
                                        <button
                            onClick={() => {
                                                setManagementError(null);
                                                if (schoolPackages.length === 0) {
                                                    setManagementError('يجب إنشاء باقة أولًا قبل توليد كود تفعيل.');
                                                    return;
                                                }

                                                if (!selectedPackageIdForCode) {
                                                    setManagementError('اختر الباقة التي سيعمل عليها كود التفعيل أولًا.');
                                                    return;
                                                }

                                                createAccessCode({
                                                    id: `code_${Date.now()}`,
                                                    code: `${selectedSchool.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                                    schoolId: selectedSchool.id,
                                                    packageId: selectedPackageIdForCode,
                                                    maxUses: Math.max(1, Number(newCodeMaxUses) || 50),
                                                    currentUses: 0,
                                                    expiresAt: Date.now() + Math.max(1, Number(newCodeDurationDays) || 30) * 24 * 60 * 60 * 1000,
                                                    createdAt: Date.now(),
                                                });
                                            }}
                                            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <Key size={16} /> توليد كود جديد
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <label className="block text-xs font-bold text-gray-600 mb-2">عدد المقاعد لكل كود</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newCodeMaxUses}
                                            onChange={(event) => setNewCodeMaxUses(event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <label className="block text-xs font-bold text-gray-600 mb-2">مدة صلاحية الكود بالأيام</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newCodeDurationDays}
                                            onChange={(event) => setNewCodeDurationDays(event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-right">
                                        <thead className="bg-gray-100 text-gray-600 text-sm">
                                            <tr>
                                                <th className="p-4 font-medium">الكود</th>
                                                <th className="p-4 font-medium">الباقة المرتبطة</th>
                                                <th className="p-4 font-medium">الاستخدام</th>
                                                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                                                <th className="p-4 font-medium">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {schoolCodes.map((code) => (
                                                <tr key={code.id} className="bg-white">
                                                    <td className="p-4 font-mono font-bold text-amber-600">{code.code}</td>
                                                    <td className="p-4 text-sm text-gray-800">{schoolPackages.find((pkg) => pkg.id === code.packageId)?.name || 'باقة غير معروفة'}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (code.currentUses / Math.max(code.maxUses, 1)) * 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-xs text-gray-500">{code.currentUses}/{code.maxUses}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500">{new Date(code.expiresAt).toLocaleDateString('ar-SA')}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => void handleCopyCode(code.code, code.id)}
                                                                className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                                                            >
                                                                {copiedCodeId === code.id ? 'تم النسخ' : 'نسخ'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('هل تريد حذف كود التفعيل هذا؟')) {
                                                                        deleteAccessCode(code.id);
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'import' && (
                        <div className="max-w-4xl mx-auto py-8 space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">استيراد الطلاب دفعة واحدة</h2>
                                <p className="text-gray-500">حمّل النموذج، ثم ارفع ملف Excel أو CSV وسيقوم النظام بإنشاء الحسابات وربطها بالمدرسة والفصول.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-gray-200 rounded-xl p-6 text-center hover:border-amber-500 transition-colors group cursor-pointer">
                                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Download size={32} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">1. تحميل النموذج</h3>
                                    <p className="text-sm text-gray-500 mb-4">نموذج Excel جاهز بالأعمدة الأساسية: الاسم، البريد، الفصل، وكلمة المرور الاختيارية.</p>
                                    <button onClick={downloadTemplate} className="text-amber-600 font-bold text-sm">تحميل school-import-template.xlsx</button>
                                </div>

                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative overflow-hidden ${importSummary ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,.tsv,.txt"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                void handleImportFile(file);
                                            }
                                        }}
                                    />

                                    {isImporting ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                            <p className="font-bold text-blue-600">جارٍ استيراد الطلاب وربطهم بالمدرسة...</p>
                                        </div>
                                    ) : importSummary ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle size={32} />
                                            </div>
                                            <h3 className="font-bold text-emerald-900 mb-2">تم الاستيراد بنجاح</h3>
                                            <p className="text-sm text-emerald-700 mb-4">تم استيراد {importSummary.imported} طالب عبر {importSummary.classesTouched} فصل.</p>
                                            <button onClick={downloadCredentials} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700">
                                                <Download size={16} /> تحميل بيانات الدخول
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Upload size={32} />
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">2. رفع الملف</h3>
                                            <p className="text-sm text-gray-500 mb-4">ارفع ملف Excel أو CSV أو TSV وسيتم تجهيز الصفوف للمراجعة قبل التنفيذ.</p>
                                            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold pointer-events-none">اختيار ملف</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {importError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                                    {importError}
                                </div>
                            )}

                            {importRows.length > 0 && !importSummary && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                            <p className="text-xs font-black text-blue-700 mb-1">صفوف جاهزة</p>
                                            <p className="text-2xl font-black text-blue-800">{importRows.length}</p>
                                        </div>
                                        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                                            <p className="text-xs font-black text-purple-700 mb-1">فصول في الملف</p>
                                            <p className="text-2xl font-black text-purple-800">{importPreviewStats.classNames.length}</p>
                                        </div>
                                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                            <p className="text-xs font-black text-amber-700 mb-1">كلمات مرور تلقائية</p>
                                            <p className="text-2xl font-black text-amber-800">{importPreviewStats.rowsWithoutPassword}</p>
                                        </div>
                                        <div className={`rounded-2xl border p-4 ${
                                            importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                                ? 'border-rose-100 bg-rose-50'
                                                : 'border-emerald-100 bg-emerald-50'
                                        }`}>
                                            <p className={`text-xs font-black mb-1 ${
                                                importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                                    ? 'text-rose-700'
                                                    : 'text-emerald-700'
                                            }`}>فحص البريد</p>
                                            <p className={`text-2xl font-black ${
                                                importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                                    ? 'text-rose-800'
                                                    : 'text-emerald-800'
                                            }`}>
                                                {importPreviewStats.duplicateEmails.length + importPreviewStats.existingEmails.length}
                                            </p>
                                        </div>
                                    </div>

                                    {(importPreviewStats.duplicateEmails.length > 0 || importPreviewStats.existingEmails.length > 0) && (
                                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                                            {importPreviewStats.duplicateEmails.length > 0 ? (
                                                <p><strong>إيميلات مكررة داخل الملف:</strong> {importPreviewStats.duplicateEmails.slice(0, 6).join(', ')}</p>
                                            ) : null}
                                            {importPreviewStats.existingEmails.length > 0 ? (
                                                <p><strong>إيميلات موجودة مسبقًا:</strong> {Array.from(new Set(importPreviewStats.existingEmails)).slice(0, 6).join(', ')}</p>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">معاينة البيانات</h3>
                                            <p className="text-sm text-gray-500">تم تجهيز {importRows.length} صفًا صالحًا للاستيراد.</p>
                                        </div>
                                        <button
                                            onClick={() => void handleStartImport()}
                                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                                        >
                                            بدء الاستيراد
                                        </button>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                        <table className="w-full text-right">
                                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                                <tr>
                                                    <th className="p-4 font-medium">الاسم</th>
                                                    <th className="p-4 font-medium">البريد الإلكتروني</th>
                                                    <th className="p-4 font-medium">الفصل</th>
                                                    <th className="p-4 font-medium">كلمة المرور</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {importRows.slice(0, 8).map((row, index) => (
                                                    <tr key={`${row.email}-${index}`} className="bg-white">
                                                        <td className="p-4 text-sm text-gray-800">{row.name}</td>
                                                        <td className="p-4 text-sm text-gray-500">{row.email}</td>
                                                        <td className="p-4 text-sm text-gray-500">{row.className || 'سيُترك بدون فصل'}</td>
                                                        <td className="p-4 text-sm text-gray-500">{row.password || 'سيتم توليدها تلقائيًا'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="space-y-6">
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المدارس والجهات (B2B)</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة التعاقدات، الباقات، الفصول، والمشرفين للمدارس والسناتر.</p>
                </div>
                <button
                    onClick={handleCreateSchool}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} /> إضافة مدرسة جديدة
                </button>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                    value={schoolSearch}
                    onChange={(event) => setSchoolSearch(event.target.value)}
                    placeholder="ابحث باسم المدرسة أو الجهة..."
                    className="w-full bg-transparent outline-none text-sm text-gray-700"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchools.map((school) => {
                    const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === school.id);
                    const schoolCodes = accessCodes.filter((code) => code.schoolId === school.id && code.expiresAt > Date.now());
                    const schoolStudents = students.filter((student) => student.schoolId === school.id);
                    const schoolClassCount = classes.filter((group) => group.parentId === school.id).length;
                    const activePackageCount = schoolPackages.filter((pkg) => pkg.status === 'active').length;
                    const cardReadinessScore = [
                        schoolClassCount > 0,
                        school.supervisorIds.length > 0,
                        activePackageCount > 0,
                        schoolCodes.length > 0,
                    ].filter(Boolean).length;

                    return (
                        <div key={school.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                    <Building2 size={24} />
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">{school.name}</h3>
                            <p className="text-sm text-gray-500 mb-5">إدارة الطلاب والفصول والباقات والمشرفين لهذه الجهة التعليمية.</p>

                            <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between ${
                                cardReadinessScore === 4
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : cardReadinessScore >= 2
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-red-50 text-red-700'
                            }`}>
                                <span>{cardReadinessScore === 4 ? 'جاهزة للتشغيل' : 'تحتاج استكمال'}</span>
                                <span>{cardReadinessScore}/4</span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">طلاب</p>
                                    <p className="font-bold text-gray-900">{schoolStudents.length}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">باقات نشطة</p>
                                    <p className="font-bold text-gray-900">{activePackageCount}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">أكواد</p>
                                    <p className="font-bold text-gray-900">{schoolCodes.length}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedSchool(school);
                                    setActiveTab('overview');
                                }}
                                className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                فتح إدارة المدرسة
                            </button>
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
        </div>
    );
};
