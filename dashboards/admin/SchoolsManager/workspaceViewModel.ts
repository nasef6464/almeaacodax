import type { AccessCode, B2BPackage, Group, User } from '../../../types';
import type { SchoolReport } from './contracts';

export type SchoolWorkspaceTab = 'overview' | 'packages' | 'relations' | 'import' | 'reports';
export type SaveVerificationState = 'idle' | 'saving' | 'verifying' | 'success' | 'error' | null;

export interface SchoolWorkspaceReadinessCheck {
    label: string;
    isReady: boolean;
    hint: string;
    tab: SchoolWorkspaceTab;
}

export interface SchoolOperatingStep {
    id: 'classes' | 'students' | 'supervisors' | 'access' | 'reports';
    title: string;
    metric: string;
    description: string;
    statusLabel: string;
    isReady: boolean;
    tab: SchoolWorkspaceTab;
    buttonLabel: string;
}

export interface SchoolDecisionCard {
    id: string;
    label: string;
    value: string;
    hint: string;
    tone: string;
    tab?: SchoolWorkspaceTab;
    target: string;
    actionLabel?: string;
}

export interface SchoolWorkspaceViewModelInput {
    school: Group;
    schoolClasses: Group[];
    schoolStudents: User[];
    schoolSupervisors: User[];
    studentsWithoutClass: User[];
    studentsWithoutParent: User[];
    activeSchoolPackages: B2BPackage[];
    activeSchoolCodes: AccessCode[];
    totalSeats: number;
    usedSeats: number;
    schoolReport: SchoolReport | null;
    saveVerificationState: SaveVerificationState;
    schoolActionPending: string | null;
    rosterActionPending: string | null;
    packageActionPending: string | null;
    accessCodeActionPending: string | null;
    isImporting: boolean;
    isApplyingRelations: boolean;
}

export const buildSchoolWorkspaceViewModel = ({
    school,
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
}: SchoolWorkspaceViewModelInput) => {
    const readinessChecks: SchoolWorkspaceReadinessCheck[] = [
        {
            label: 'فصول دراسية',
            isReady: schoolClasses.length > 0,
            hint: schoolClasses.length > 0 ? `${schoolClasses.length} فصل جاهز` : 'أضف فصلًا واحدًا على الأقل',
            tab: 'overview',
        },
        {
            label: 'طلاب مسجلون',
            isReady: schoolStudents.length > 0 && studentsWithoutClass.length === 0,
            hint: schoolStudents.length === 0
                ? 'أضف الطلاب أو ارفع ملف Excel'
                : studentsWithoutClass.length > 0
                    ? `${studentsWithoutClass.length} طالب يحتاج فصل واضح`
                    : `${schoolStudents.length} طالب داخل فصول واضحة`,
            tab: schoolStudents.length === 0 ? 'import' : 'overview',
        },
        {
            label: 'مشرفون',
            isReady: schoolSupervisors.length > 0,
            hint: schoolSupervisors.length > 0 ? `${schoolSupervisors.length} مشرف/معلم` : 'اربط مشرفًا أو معلمًا بالمدرسة',
            tab: 'relations',
        },
        {
            label: 'باقة/مسارات',
            isReady: activeSchoolPackages.length > 0,
            hint: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة نشطة مرتبطة بالمسارات` : 'فعّل باقة مدرسية واحدة على الأقل وحدد مساراتها',
            tab: 'packages',
        },
        {
            label: 'أكواد دخول',
            isReady: activeSchoolCodes.length > 0,
            hint: activeSchoolCodes.length > 0 ? `${activeSchoolCodes.length} كود صالح` : 'ولّد كودًا صالحًا للطلاب',
            tab: 'packages',
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
        studentsWithoutClass.length > 0 ? 'يوجد طلاب بلا فصل، يفضل نقلهم لفصول قبل متابعة التقارير.' : '',
        studentsWithoutParent.length > 0 ? 'يوجد طلاب بلا ولي أمر مرتبط، راجع تبويب الربط والمتابعة قبل تسليم الحسابات.' : '',
    ].filter(Boolean);

    const readinessStatusLabel = readinessScore === readinessChecks.length
        ? 'جاهزة للتسليم'
        : readinessScore >= 2
            ? 'قريبة من التسليم'
            : 'تحتاج تجهيز';
    const readinessNextStep = operationalWarnings[0] || 'المدرسة جاهزة تشغيليًا. راجع تقرير الأداء أسبوعيًا بعد بدء الطلاب.';

    const commercialOperatingSteps: SchoolOperatingStep[] = [
        {
            id: 'classes',
            title: 'الفصول',
            metric: `${schoolClasses.length} فصل`,
            description: schoolClasses.length > 0 ? 'الفصول جاهزة لاستقبال الطلاب.' : 'ابدأ بإنشاء فصول المدرسة.',
            statusLabel: schoolClasses.length > 0 ? 'جاهز' : 'ناقص',
            isReady: schoolClasses.length > 0,
            tab: 'overview',
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
            tab: 'import',
            buttonLabel: schoolStudents.length > 0 ? 'استيراد/إضافة طلاب' : 'إضافة الطلاب',
        },
        {
            id: 'supervisors',
            title: 'المشرفون',
            metric: `${schoolSupervisors.length} مشرف`,
            description: schoolSupervisors.length > 0 ? 'يمكن متابعة المدرسة أو الفصول حسب النطاق.' : 'اربط مدير المدرسة أو مشرفي الفصول.',
            statusLabel: schoolSupervisors.length > 0 ? 'جاهز' : 'ناقص',
            isReady: schoolSupervisors.length > 0,
            tab: 'relations',
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
            tab: 'packages',
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
            tab: 'reports',
            buttonLabel: 'فتح التقارير',
        },
    ];

    const nextOperatingStep = commercialOperatingSteps.find((step) => !step.isReady)
        || commercialOperatingSteps[commercialOperatingSteps.length - 1];
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

    const commercialDecisionCards: SchoolDecisionCard[] = [
        {
            id: 'readiness',
            label: 'قرار التشغيل',
            value: readinessStatusLabel,
            hint: readinessScore === readinessChecks.length
                ? 'يمكن تسليم المدرسة بثقة ومتابعة الأداء من البوابة.'
                : 'لا تزال هناك خطوات تشغيل قبل التسليم التجاري الكامل.',
            tone: readinessScore === readinessChecks.length ? 'emerald' : readinessScore >= 3 ? 'amber' : 'rose',
            tab: 'overview',
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
            tab: 'relations',
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
            tab: 'packages',
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

    const overviewFocusActions: SchoolDecisionCard[] = [
        {
            id: 'classes',
            label: 'الفصول',
            value: `${schoolClasses.length} فصل`,
            hint: schoolClasses.length > 0 ? 'راجع توزيع الطلاب والمشرفين داخل كل فصل.' : 'ابدأ بإنشاء الفصول قبل استيراد الطلاب.',
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
            hint: schoolSupervisors.length > 0 ? 'الصلاحيات موزعة بين المدرسة والفصول.' : 'اربط مدير المدرسة أو مشرفي الفصول.',
            actionLabel: 'ربط مشرف',
            target: 'school-relations-quick-supervisor-card',
            tab: 'relations',
            tone: schoolSupervisors.length > 0 ? 'emerald' : 'purple',
        },
        {
            id: 'access',
            label: 'الباقة/المسارات',
            value: activeSchoolPackages.length > 0 ? `${activeSchoolPackages.length} باقة` : 'بدون باقة',
            hint: activeSchoolCodes.length > 0 ? `${activeSchoolCodes.length} كود جاهز للتسليم.` : 'فعّل باقة مرتبطة بالمسارات أو أنشئ أكواد المدرسة.',
            actionLabel: 'الباقة والمسارات',
            target: 'school-packages-panel',
            tab: 'packages',
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
        `تم تجهيز مساحة ${school.name} على منصة المئة.`,
        `حالة الجاهزية الحالية: ${readinessStatusLabel} (${readinessScore}/${readinessChecks.length}).`,
        `الخطوة التالية: ${readinessNextStep}`,
        'يمكن للمشرف متابعة الطلاب، تصدير التقارير، وتوجيه الاختبارات من لوحة المشرف.',
    ].join('\n');

    return {
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
    };
};
