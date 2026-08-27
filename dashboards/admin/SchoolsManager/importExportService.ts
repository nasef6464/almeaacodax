import { AccessCode, B2BPackage, CategoryPath, CategorySubject, Group, Role, User } from '../../../types';
import type { ImportResponse, RelationCredential, SchoolReport } from './contracts';
import { createCsvDownload, createWorkbookDownload, createXlsxDownload } from './exportHelpers';
import type { SchoolPortfolioRow, SchoolPortfolioSummary } from './readinessViewModel';

type WorkbookSheet = {
    name: string;
    rows: Array<Array<string | number>>;
};

export function buildSchoolImportTemplateRows(): string[][] {
    return [
        ['اسم الطالب', 'البريد الإلكتروني', 'اسم الفصل', 'كلمة المرور'],
        ['طالب تجريبي', 'student1@example.com', 'فصل أ', 'ExamplePass123!'],
        ['طالبة تجريبية', 'student2@example.com', 'فصل ب', ''],
    ];
}

export function buildSchoolRelationsTemplateSheets(): WorkbookSheet[] {
    return [
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
    ];
}

export function buildStudentImportCredentialRows(credentials: ImportResponse['credentials']): string[][] {
    return [
        ['name', 'email', 'password', 'className'],
        ...credentials.map((row) => [row.name, row.email, row.password, row.className || '']),
    ];
}

export function buildSchoolRosterRows(schoolStudents: User[], schoolClasses: Group[]): string[][] {
    return [
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
    ];
}

type BuildSchoolPackagesReportSheetsInput = {
    schoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    activeSchoolPackages: B2BPackage[];
    activeSchoolCodes: AccessCode[];
    teachers: User[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    totalSeats: number;
    usedSeats: number;
};

type BuildSchoolRelationsReportSheetsInput = {
    selectedSchool: Group;
    schoolStudents: User[];
    schoolClasses: Group[];
    schoolParentUsers: User[];
    schoolSupervisors: User[];
    parents: User[];
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];
    supervisorsWithoutClass: User[];
};

type ReadinessCheck = {
    label: string;
    isReady: boolean;
    hint: string;
};

type HandoverRow = Array<string | number>;

type BuildSchoolGapReportSheetsInput = {
    selectedSchool: Group;
    readinessStatusLabel: string;
    readinessScore: number;
    readinessChecks: ReadinessCheck[];
    readinessNextStep: string;
    operationalWarnings: string[];
    studentsWithoutClass: User[];
    studentsWithoutParent: User[];
    supervisorsWithoutClass: User[];
    schoolClasses: Group[];
    schoolSupervisors: User[];
    groups: Group[];
};

type BuildSchoolHandoverReportSheetsInput = {
    selectedSchool: Group;
    readinessScore: number;
    readinessChecks: ReadinessCheck[];
    schoolStudents: User[];
    schoolClasses: Group[];
    schoolSupervisors: User[];
    activeSchoolPackages: B2BPackage[];
    activeSchoolCodes: AccessCode[];
    schoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    totalSeats: number;
    usedSeats: number;
    schoolLaunchPlan: HandoverRow[];
    supervisorHandoverChecklist: HandoverRow[];
    schoolHandoverMessage: string;
    paths: CategoryPath[];
    subjects: CategorySubject[];
};

type BuildSchoolPerformanceReportSheetsInput = {
    schoolReport: SchoolReport;
    subjects: CategorySubject[];
    sections: Array<{ id: string; name: string }>;
};

type BuildSchoolPortfolioReadinessSheetsInput = {
    schoolPortfolioRows: SchoolPortfolioRow[];
    schoolPortfolioSummary: SchoolPortfolioSummary;
};

export function buildSchoolPackagesReportSheets({
    schoolPackages,
    schoolCodes,
    activeSchoolPackages,
    activeSchoolCodes,
    teachers,
    paths,
    subjects,
    totalSeats,
    usedSeats,
}: BuildSchoolPackagesReportSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolGapReportSheets({
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
}: BuildSchoolGapReportSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolHandoverReportSheets({
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
}: BuildSchoolHandoverReportSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolPerformanceReportSheets({
    schoolReport,
    subjects,
    sections,
}: BuildSchoolPerformanceReportSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolPortfolioReadinessSheets({
    schoolPortfolioRows,
    schoolPortfolioSummary,
}: BuildSchoolPortfolioReadinessSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolRelationsReportSheets({
    selectedSchool,
    schoolStudents,
    schoolClasses,
    schoolParentUsers,
    schoolSupervisors,
    parents,
    studentsWithoutParent,
    studentsWithoutClass,
    supervisorsWithoutClass,
}: BuildSchoolRelationsReportSheetsInput): WorkbookSheet[] {
    return [
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
    ];
}

export function buildSchoolRelationCredentialSheets(credentials: RelationCredential[]): WorkbookSheet[] {
    return [
        {
            name: 'created-accounts',
            rows: [
                ['الدور', 'الاسم', 'البريد الإلكتروني', 'كلمة المرور المؤقتة', 'مرتبط بـ'],
                ...credentials.map((credential) => [
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
    ];
}

export function downloadSchoolImportTemplate() {
    createXlsxDownload('school-import-template.xlsx', buildSchoolImportTemplateRows());
}

export function downloadSchoolRelationsTemplate() {
    createWorkbookDownload('school-relations-template.xlsx', buildSchoolRelationsTemplateSheets());
}

export function downloadStudentImportCredentials(credentials: ImportResponse['credentials']) {
    if (!credentials.length) {
        return;
    }

    createCsvDownload('school-students-credentials.csv', buildStudentImportCredentialRows(credentials));
}

export function downloadSchoolRoster(school: Group, schoolStudents: User[], schoolClasses: Group[]) {
    createXlsxDownload(`${school.name}-students-roster.xlsx`, buildSchoolRosterRows(schoolStudents, schoolClasses));
}

export function downloadSchoolRelationCredentials(credentials: RelationCredential[]) {
    if (!credentials.length) {
        return;
    }

    createWorkbookDownload('school-created-accounts.xlsx', buildSchoolRelationCredentialSheets(credentials));
}
