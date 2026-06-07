import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Clipboard,
    Download,
    FileSpreadsheet,
    GraduationCap,
    Mail,
    Printer,
    ShieldCheck,
    Search,
    Target,
    Users,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Group, QuizResult, Role, User } from '../../types';
import { loadXlsx } from '../../utils/xlsxLoader';

const packageContentTypeLabels: Record<string, string> = {
    all: 'كل المحتوى',
    courses: 'الدورات',
    foundation: 'التأسيس',
    banks: 'التدريب',
    tests: 'الاختبارات',
    mockExams: 'الاختبارات المحاكية',
    library: 'المكتبة',
};

const createWorkbookDownload = async (
    fileName: string,
    sheets: Array<{ name: string; rows: Array<Array<string | number>> }>,
) => {
    const XLSX = await loadXlsx();
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, fileName);
};

const escapeHtml = (value: string | number | null | undefined) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const renderPrintTable = (headers: string[], rows: Array<Array<string | number>>) => `
    <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>
            ${
                rows.length
                    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
                    : `<tr><td colspan="${headers.length}">لا توجد بيانات في هذا النطاق حاليا.</td></tr>`
            }
        </tbody>
    </table>
`;

const openPrintWindow = (title: string, bodyHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;

    printWindow.document.write(`
        <!doctype html>
        <html lang="ar" dir="rtl">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(title)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; background: #f8fafc; color: #111827; font-family: Tahoma, Arial, sans-serif; line-height: 1.8; }
                    main { width: min(1040px, calc(100% - 32px)); margin: 24px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; }
                    .hero { border-radius: 16px; padding: 22px; color: #fff; background: linear-gradient(135deg, #4338ca, #047857); margin-bottom: 20px; }
                    .hero h1, .hero p { margin: 0; }
                    .hero h1 { font-size: 28px; margin-top: 6px; }
                    .muted { color: #e0f2fe; font-size: 13px; }
                    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
                    .metric { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; background: #f9fafb; }
                    .metric strong { display: block; font-size: 24px; margin-top: 4px; }
                    h2 { font-size: 18px; margin: 24px 0 10px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
                    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; vertical-align: top; font-size: 13px; }
                    th { background: #f3f4f6; font-weight: 800; }
                    @media print {
                        body { background: #fff; }
                        main { width: 100%; margin: 0; border: 0; border-radius: 0; }
                    }
                    @media (max-width: 760px) {
                        .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    }
                </style>
            </head>
            <body>
                <main>${bodyHtml}</main>
                <script>
                    window.setTimeout(function () {
                        window.focus();
                        window.print();
                    }, 250);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
    return true;
};

const averageScore = (results: QuizResult[]) =>
    results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0;

const getLatestResult = (results: QuizResult[]) =>
    [...results].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

const getStudentClassNames = (student: User, classes: Group[]) =>
    classes
        .filter((classroom) => classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id))
        .map((classroom) => classroom.name)
        .join('، ') || 'بدون فصل محدد';

export const SchoolPortalManager: React.FC = () => {
    const {
        user,
        users,
        groups,
        courses,
        paths,
        subjects,
        quizzes,
        examResults,
        b2bPackages,
        accessCodes,
    } = useStore();
    const [actionFeedback, setActionFeedback] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState('all');
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [reportMode, setReportMode] = useState<'combined' | 'aggregated' | 'individual'>('combined');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    const scope = useMemo(() => {
        if (user.role === Role.ADMIN) {
            const schools = groups.filter((group) => group.type === 'SCHOOL');
            const classes = groups.filter((group) => group.type === 'CLASS');
            const students = users.filter((item) => item.role === Role.STUDENT);
            const studentIds = new Set(students.map((student) => student.id));
            const results = examResults.filter((result) => !!result.userId && studentIds.has(result.userId));
            const schoolIds = new Set(schools.map((school) => school.id));
            return {
                schools,
                classes,
                students,
                results,
                packages: b2bPackages.filter((pkg) => schoolIds.has(pkg.schoolId)),
                codes: accessCodes.filter((code) => schoolIds.has(code.schoolId)),
                scopedCourses: courses,
                followUpQuizzes: quizzes,
                schoolWideIds: Array.from(schoolIds),
                classScopedIds: classes.map((classroom) => classroom.id),
            };
        }

        const userGroupIds = new Set(user.groupIds || []);
        const schoolWideIds = new Set<string>();
        const classScopedIds = new Set<string>();

        groups.forEach((group) => {
            if (group.type === 'SCHOOL') {
                const isSchoolWideSupervisor = userGroupIds.has(group.id) || group.supervisorIds.includes(user.id);
                if (isSchoolWideSupervisor) {
                    schoolWideIds.add(group.id);
                }
            }
            if (group.type === 'CLASS') {
                const isClassSupervisor = userGroupIds.has(group.id) || group.supervisorIds.includes(user.id);
                if (isClassSupervisor) {
                    classScopedIds.add(group.id);
                }
            }
        });

        const visibleSchoolIds = new Set<string>([
            ...Array.from(schoolWideIds),
            ...groups
                .filter((group) => group.type === 'CLASS' && classScopedIds.has(group.id) && group.parentId)
                .map((group) => group.parentId as string),
        ]);
        const schools = groups.filter((group) => group.type === 'SCHOOL' && visibleSchoolIds.has(group.id));
        const classes = groups.filter((group) => {
            if (group.type !== 'CLASS') return false;
            return classScopedIds.has(group.id) || (!!group.parentId && schoolWideIds.has(group.parentId));
        });
        const classIds = new Set(classes.map((item) => item.id));
        const students = users.filter((item) => {
            if (item.role !== Role.STUDENT) return false;
            const sharesSchool = !!item.schoolId && schoolWideIds.has(item.schoolId);
            const sharesClass = (item.groupIds || []).some((groupId) => classIds.has(groupId));
            return sharesSchool || sharesClass;
        });
        const studentIds = new Set(students.map((student) => student.id));
        const results = examResults.filter((result) => !!result.userId && studentIds.has(result.userId));
        const packages = b2bPackages.filter((pkg) => visibleSchoolIds.has(pkg.schoolId));
        const codes = accessCodes.filter((code) => visibleSchoolIds.has(code.schoolId));
        const packageCourseIds = new Set(packages.flatMap((pkg) => pkg.courseIds || []));
        const scopedCourses = courses.filter((course) => packageCourseIds.has(course.id) || classes.some((classroom) => classroom.courseIds.includes(course.id)));
        const scopedGroupIds = new Set([...Array.from(classIds), ...Array.from(visibleSchoolIds), ...Array.from(userGroupIds)]);
        const followUpQuizzes = quizzes.filter((quiz) => {
            const targetsGroup = (quiz.targetGroupIds || []).some((groupId) => scopedGroupIds.has(groupId));
            const targetsStudent = (quiz.targetUserIds || []).some((studentId) => studentIds.has(studentId));
            return targetsGroup || targetsStudent;
        });

        return {
            schools,
            classes,
            students,
            results,
            packages,
            codes,
            scopedCourses,
            followUpQuizzes,
            schoolWideIds: Array.from(schoolWideIds),
            classScopedIds: Array.from(classScopedIds),
        };
    }, [accessCodes, b2bPackages, courses, examResults, groups, quizzes, user.groupIds, user.role, user.schoolId, users]);

    const supervisorAccess = useMemo(() => {
        const hasWholeSchoolAccess = user.role === Role.ADMIN || scope.schoolWideIds.length > 0;
        const classScopedNames = scope.classes
            .filter((classroom) => scope.classScopedIds.includes(classroom.id) && !scope.schoolWideIds.includes(classroom.parentId || ''))
            .map((classroom) => classroom.name);
        const schoolWideNames = scope.schools
            .filter((school) => user.role === Role.ADMIN || scope.schoolWideIds.includes(school.id))
            .map((school) => school.name);
        const title = user.role === Role.ADMIN
            ? 'مشاهدة مدير المنصة'
            : hasWholeSchoolAccess
                ? 'مدير/مشرف مدرسة كاملة'
                : 'مشرف فصل أو فصول محددة';
        const description = user.role === Role.ADMIN
            ? 'ترى كل المدارس والفصول لأغراض الإدارة والمتابعة.'
            : hasWholeSchoolAccess
                ? 'ترى كل الفصول والطلاب والتقارير داخل المدرسة المرتبطة بك.'
                : 'ترى فقط الفصول المسندة لك والطلاب الموجودين داخلها.';
        const visibleScope = schoolWideNames.length
            ? schoolWideNames.join('، ')
            : classScopedNames.length
                ? classScopedNames.join('، ')
                : 'نطاق الإشراف الحالي';

        return {
            title,
            description,
            visibleScope,
            isWholeSchool: hasWholeSchoolAccess,
            schoolWideNames,
            classScopedNames,
        };
    }, [scope.classScopedIds, scope.classes, scope.schoolWideIds, scope.schools, user.role]);

    useEffect(() => {
        if (selectedSchoolId !== 'all' && !scope.schools.some((school) => school.id === selectedSchoolId)) {
            setSelectedSchoolId('all');
        }
        if (selectedClassId !== 'all' && !scope.classes.some((classroom) => classroom.id === selectedClassId)) {
            setSelectedClassId('all');
        }
    }, [scope.classes, scope.schools, selectedClassId, selectedSchoolId]);

    const studentSummaries = useMemo(() => (
        scope.students.map((student) => {
            const results = scope.results.filter((result) => result.userId === student.id);
            const latest = getLatestResult(results);
            const weakSkills = results
                .flatMap((result) => result.skillsAnalysis || [])
                .filter((skill) => skill.mastery < 60)
                .slice(0, 3);

            return {
                student,
                results,
                latest,
                average: averageScore(results),
                weakSkills,
                classNames: getStudentClassNames(student, scope.classes),
            };
        })
    ), [scope.classes, scope.results, scope.students]);

    const reportClasses = useMemo(() => {
        if (selectedClassId !== 'all') {
            return scope.classes.filter((classroom) => classroom.id === selectedClassId);
        }
        if (selectedSchoolId === 'all') {
            return scope.classes;
        }
        return scope.classes.filter((classroom) => classroom.parentId === selectedSchoolId);
    }, [scope.classes, selectedClassId, selectedSchoolId]);

    const reportStudents = useMemo(() => {
        if (selectedClassId !== 'all') {
            const classGroup = scope.classes.find((classroom) => classroom.id === selectedClassId);
            if (!classGroup) return [];
            return scope.students.filter((student) =>
                classGroup.studentIds.includes(student.id) || (student.groupIds || []).includes(classGroup.id),
            );
        }
        if (selectedSchoolId === 'all') {
            return scope.students;
        }
        const classIds = new Set(scope.classes.filter((classroom) => classroom.parentId === selectedSchoolId).map((classroom) => classroom.id));
        return scope.students.filter((student) =>
            student.schoolId === selectedSchoolId || (student.groupIds || []).some((groupId) => classIds.has(groupId)),
        );
    }, [scope.classes, scope.students, selectedClassId, selectedSchoolId]);

    const reportStudentIds = useMemo(() => new Set(reportStudents.map((student) => student.id)), [reportStudents]);
    const reportStudentSummaries = useMemo(() => {
        const scopedSummaries = studentSummaries.filter((summary) => reportStudentIds.has(summary.student.id));
        const search = studentSearchTerm.trim().toLowerCase();
        if (!search) return scopedSummaries;

        return scopedSummaries.filter((summary) => {
            const haystack = [
                summary.student.name,
                summary.student.email,
                summary.classNames,
                summary.latest?.quizTitle,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(search);
        });
    }, [reportStudentIds, studentSearchTerm, studentSummaries]);

    const reportPackages = useMemo(() => {
        if (selectedSchoolId === 'all') return scope.packages;
        return scope.packages.filter((pkg) => pkg.schoolId === selectedSchoolId);
    }, [scope.packages, selectedSchoolId]);
    const describePackageScope = (pkg: (typeof reportPackages)[number]) => {
        const content = (pkg.contentTypes?.length ? pkg.contentTypes : ['all'])
            .map((type) => packageContentTypeLabels[type] || type)
            .join('، ');
        const pathNames = (pkg.pathIds || [])
            .map((pathId) => paths.find((path) => path.id === pathId)?.name || pathId)
            .join('، ');
        const subjectNames = (pkg.subjectIds || [])
            .map((subjectId) => subjects.find((subject) => subject.id === subjectId)?.name || subjectId)
            .join('، ');

        return [
            content,
            pathNames ? `المسارات: ${pathNames}` : 'كل المسارات',
            subjectNames ? `المواد: ${subjectNames}` : 'كل المواد',
        ].join(' · ');
    };

    const reportCodes = useMemo(() => {
        if (selectedSchoolId === 'all') return scope.codes;
        return scope.codes.filter((code) => code.schoolId === selectedSchoolId);
    }, [scope.codes, selectedSchoolId]);

    const reportFollowUpQuizzes = useMemo(() => {
        const reportClassIds = new Set(reportClasses.map((classroom) => classroom.id));
        return scope.followUpQuizzes.filter((quiz) => {
            const groupMatch = (quiz.targetGroupIds || []).some((groupId) => reportClassIds.has(groupId));
            const userMatch = (quiz.targetUserIds || []).some((studentId) => reportStudentIds.has(studentId));
            return groupMatch || userMatch;
        });
    }, [reportClasses, reportStudentIds, scope.followUpQuizzes]);

    const watchList = reportStudentSummaries
        .filter((summary) => summary.results.length === 0 || summary.average < 60 || summary.weakSkills.length > 0)
        .sort((a, b) => a.average - b.average);
    const interventionPlan = [
        {
            id: 'not-started',
            title: 'لم يبدأوا القياس',
            tone: 'amber',
            students: reportStudentSummaries.filter((summary) => summary.results.length === 0),
            action: 'ابدأ باختبار قياس قصير موجه للمجموعة، ثم أرسل تنبيه دخول للطالب وولي الأمر.',
        },
        {
            id: 'low-average',
            title: 'متوسط منخفض',
            tone: 'rose',
            students: reportStudentSummaries.filter((summary) => summary.results.length > 0 && summary.average < 60),
            action: 'وجّه تدريبًا علاجيًا قصيرًا ثم اختبار متابعة بعد 48 ساعة.',
        },
        {
            id: 'weak-skills',
            title: 'ضعف مهاري واضح',
            tone: 'indigo',
            students: reportStudentSummaries.filter((summary) => summary.weakSkills.length > 0 && summary.average >= 60),
            action: 'اجمع الطلاب حسب المهارة الضعيفة وأرسل اختبارًا موجها على نفس المهارة.',
        },
        {
            id: 'stable',
            title: 'مستقرون',
            tone: 'emerald',
            students: reportStudentSummaries.filter((summary) => summary.results.length > 0 && summary.average >= 75 && summary.weakSkills.length === 0),
            action: 'اكتف بتقرير أسبوعي وتحفيز، ولا تزحمهم برسائل علاجية.',
        },
    ];
    const priorityIntervention = interventionPlan
        .filter((item) => item.id !== 'stable')
        .sort((a, b) => b.students.length - a.students.length)[0];
    const classActionPlan = reportClasses.map((classroom) => {
        const classroomStudents = reportStudentSummaries.filter((summary) =>
            classroom.studentIds.includes(summary.student.id) || (summary.student.groupIds || []).includes(classroom.id),
        );
        const classroomAverage = averageScore(classroomStudents.flatMap((item) => item.results));
        const classroomWatchList = classroomStudents.filter((summary) =>
            summary.results.length === 0 || summary.average < 60 || summary.weakSkills.length > 0,
        );
        const studentsWithoutAttempts = classroomStudents.filter((summary) => summary.results.length === 0).length;
        const nextAction = classroomStudents.length === 0
            ? 'أضف الطلاب أو راجع ربط الفصل.'
            : studentsWithoutAttempts > 0
                ? 'ابدأ باختبار قياس قصير للطلاب الذين لم يبدأوا.'
                : classroomAverage < 60
                    ? 'وجّه خطة علاجية قصيرة ثم اختبار متابعة.'
                    : classroomWatchList.length > 0
                        ? 'راجع الطلاب الضعاف وأرسل تنبيه متابعة.'
                        : 'الفصل مستقر، صدّر تقريرًا أسبوعيًا فقط.';

        return {
            classroom,
            studentCount: classroomStudents.length,
            average: classroomAverage,
            watchCount: classroomWatchList.length,
            studentsWithoutAttempts,
            nextAction,
        };
    }).sort((a, b) => b.watchCount - a.watchCount || a.average - b.average);
    const bestClassSnapshot = [...classActionPlan]
        .filter((item) => item.studentCount > 0)
        .sort((a, b) => b.average - a.average || a.watchCount - b.watchCount)[0];
    const weakestClassSnapshot = classActionPlan.find((item) => item.studentCount > 0 && (item.watchCount > 0 || item.average < 60))
        || [...classActionPlan].filter((item) => item.studentCount > 0).sort((a, b) => a.average - b.average)[0];
    const sharedWeakSkillSnapshot = Object.values(
        reportStudentSummaries
            .flatMap((summary) => summary.weakSkills.map((skill) => ({ ...skill, studentId: summary.student.id })))
            .reduce<Record<string, { skill: string; count: number; masteryTotal: number; studentIds: Set<string> }>>((acc, item) => {
                const key = item.skill || 'مهارة غير محددة';
                if (!acc[key]) {
                    acc[key] = { skill: key, count: 0, masteryTotal: 0, studentIds: new Set<string>() };
                }
                acc[key].count += 1;
                acc[key].masteryTotal += Number(item.mastery || 0);
                acc[key].studentIds.add(item.studentId);
                return acc;
            }, {}),
    )
        .map((item) => ({
            skill: item.skill,
            count: item.count,
            studentCount: item.studentIds.size,
            averageMastery: item.count ? Math.round(item.masteryTotal / item.count) : 0,
        }))
        .sort((a, b) => b.studentCount - a.studentCount || a.averageMastery - b.averageMastery)[0];

    const totalSeats = reportPackages
        .filter((pkg) => pkg.status === 'active')
        .reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
    const usedSeats = reportCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
    const activeCodes = reportCodes.filter((code) => code.expiresAt > Date.now());
    const average = averageScore(reportStudentSummaries.flatMap((item) => item.results));
    const schoolTitle = scope.schools.map((school) => school.name).join('، ') || 'نطاق الإشراف الحالي';
    const primaryTargetGroupId = reportClasses[0]?.id || scope.schools.find((school) => school.id === selectedSchoolId)?.id || scope.schools[0]?.id || '';
    const followUpEmails = watchList
        .map((summary) => summary.student.email)
        .filter(Boolean)
        .slice(0, 40) as string[];
    const followUpMessage = [
        `تقرير متابعة ${schoolTitle}`,
        '',
        `عدد الطلاب داخل النطاق: ${reportStudents.length}`,
        `طلاب يحتاجون متابعة: ${watchList.length}`,
        `متوسط الأداء: ${average}%`,
        '',
        'أولوية المتابعة:',
        ...watchList.slice(0, 8).map((summary, index) => {
            const reason = summary.results.length === 0
                ? 'لم يبدأ القياس بعد'
                : summary.weakSkills.map((skill) => skill.skill).join('، ') || `متوسط ${summary.average}%`;
            return `${index + 1}. ${summary.student.name} - ${reason}`;
        }),
        '',
        'أولوية الفصول:',
        ...classActionPlan.slice(0, 5).map((item, index) => `${index + 1}. ${item.classroom.name}: ${item.nextAction}`),
        ].join('\n');
    const interventionBrief = [
        `خطة تدخل أسبوعية - ${schoolTitle}`,
        `الأولوية الحالية: ${priorityIntervention?.title || 'لا توجد أولوية حرجة'}`,
        `الإجراء المقترح: ${priorityIntervention?.action || 'اكتف بتقرير متابعة أسبوعي.'}`,
        '',
        ...interventionPlan.map((item) => `${item.title}: ${item.students.length} طالب`),
    ].join('\n');
    const supervisorWeeklyPlan = [
        ['اليوم', 'راجع قائمة الطلاب الذين لم يبدأوا القياس أو متوسطهم أقل من 60%.'],
        ['خلال 48 ساعة', 'وجّه اختبارًا قصيرًا للمجموعة الأساسية ثم راقب نتائج المهارات الضعيفة.'],
        ['منتصف الأسبوع', 'أرسل رسالة متابعة للطلاب وأولياء الأمور عند وجود بريد متاح.'],
        ['نهاية الأسبوع', 'صدّر تقرير البوابة وشاركه مع إدارة المدرسة أو ولي الأمر حسب الحاجة.'],
    ];
    const supervisorBrief = [
        `ملخص إشراف ${schoolTitle}`,
        `الطلاب داخل النطاق: ${reportStudents.length}`,
        `يحتاجون متابعة: ${watchList.length}`,
        `متوسط الأداء: ${average}%`,
        `أفضل إجراء الآن: ${watchList.length ? 'اختبار قصير ثم رسالة متابعة' : 'تقرير أسبوعي للإدارة'}`,
        `نطاق الاختبار المقترح: ${reportClasses[0]?.name || scope.schools[0]?.name || 'نطاق الإشراف الحالي'}`,
    ].join('\n');
    const showAggregatedSections = reportMode === 'combined' || reportMode === 'aggregated';
    const showIndividualSections = reportMode === 'combined' || reportMode === 'individual';

    const openTargetedQuiz = () => {
        const params = new URLSearchParams({
            tab: 'quizzes',
            mode: 'central',
            source: 'school-portal',
        });
        if (primaryTargetGroupId) params.set('targetGroupId', primaryTargetGroupId);
        window.location.hash = `/admin-dashboard?${params.toString()}`;
        setActionFeedback(primaryTargetGroupId ? 'تم فتح مركز الاختبارات مع تحديد نطاق المجموعة.' : 'تم فتح مركز الاختبارات لإنشاء اختبار موجه.');
    };

    const createDecisionIntervention = () => {
        const targetClassId = weakestClassSnapshot?.classroom.id || primaryTargetGroupId;
        const params = new URLSearchParams({
            tab: 'quizzes',
            mode: 'central',
            source: 'school-portal',
            intent: 'intervention',
        });
        if (targetClassId) params.set('targetGroupId', targetClassId);
        if (sharedWeakSkillSnapshot?.skill) params.set('weakSkill', sharedWeakSkillSnapshot.skill);
        window.location.hash = `/admin-dashboard?${params.toString()}`;
        setActionFeedback(
            weakestClassSnapshot
                ? `تم فتح مركز الاختبارات لتدخل علاجي على ${weakestClassSnapshot.classroom.name}.`
                : 'تم فتح مركز الاختبارات لإنشاء تدخل علاجي سريع.',
        );
    };

    const openReports = () => {
        window.location.hash = '/reports';
        setActionFeedback('تم فتح مركز التقارير التفصيلية.');
    };

    const copyFollowUpMessage = async () => {
        try {
            await navigator.clipboard.writeText(followUpMessage);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = followUpMessage;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        setActionFeedback('تم نسخ ملخص المتابعة لاستخدامه في رسالة أو واتساب.');
    };

    const copySupervisorBrief = async () => {
        try {
            await navigator.clipboard.writeText(`${supervisorBrief}\n\n${interventionBrief}`);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = `${supervisorBrief}\n\n${interventionBrief}`;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        setActionFeedback('تم نسخ ملخص المشرف التنفيذي للإدارة.');
    };

    const openFollowUpEmail = () => {
        const query = new URLSearchParams({
            subject: `متابعة طلاب ${schoolTitle}`,
            body: followUpMessage,
        });
        if (followUpEmails.length) {
            query.set('bcc', followUpEmails.join(','));
        }
        window.location.href = `mailto:?${query.toString()}`;
        setActionFeedback(followUpEmails.length ? 'تم تجهيز رسالة بريد للطلاب داخل نطاق المشرف.' : 'لا توجد عناوين بريد متاحة داخل نطاق المتابعة الحالي.');
    };

    const exportWatchList = () => {
        createWorkbookDownload('school-follow-up-watchlist.xlsx', [
            {
                name: 'watchlist',
                rows: [
                    ['الطالب', 'البريد', 'الفصل', 'المحاولات', 'متوسط الأداء', 'سبب المتابعة', 'آخر اختبار'],
                    ...watchList.map((summary) => [
                        summary.student.name,
                        summary.student.email || '',
                        summary.classNames,
                        summary.results.length,
                        `${summary.average}%`,
                        summary.results.length === 0
                            ? 'لم يبدأ القياس بعد'
                            : summary.weakSkills.map((skill) => `${skill.skill} (${skill.mastery}%)`).join(' | ') || 'متابعة أداء منخفض',
                        summary.latest?.quizTitle || '',
                    ]),
                ],
            },
        ]);
        setActionFeedback('تم تجهيز ملف قائمة المتابعة للتنزيل.');
    };

    const exportClassActionPlan = () => {
        createWorkbookDownload('school-class-action-plan.xlsx', [
            {
                name: 'class-action-plan',
                rows: [
                    ['الفصل', 'عدد الطلاب', 'متوسط الأداء', 'يحتاجون متابعة', 'لم يبدأوا القياس', 'الإجراء التالي'],
                    ...classActionPlan.map((item) => [
                        item.classroom.name,
                        item.studentCount,
                        `${item.average}%`,
                        item.watchCount,
                        item.studentsWithoutAttempts,
                        item.nextAction,
                    ]),
                ],
            },
        ]);
        setActionFeedback('تم تجهيز خطة متابعة الفصول للتنزيل.');
    };

    const exportInterventionPlan = () => {
        createWorkbookDownload('school-weekly-intervention-plan.xlsx', [
            {
                name: 'intervention-summary',
                rows: [
                    ['البند', 'القيمة'],
                    ['النطاق', schoolTitle],
                    ['الأولوية الحالية', priorityIntervention?.title || 'لا توجد أولوية حرجة'],
                    ['الإجراء المقترح', priorityIntervention?.action || 'تقرير أسبوعي وتحفيز'],
                    ...interventionPlan.map((item) => [item.title, item.students.length]),
                ],
            },
            ...interventionPlan.map((item) => ({
                name: item.id,
                rows: [
                    ['الطالب', 'البريد', 'الفصل', 'المحاولات', 'المتوسط', 'أضعف المهارات', 'الإجراء المقترح'],
                    ...item.students.map((summary) => [
                        summary.student.name,
                        summary.student.email || '',
                        summary.classNames,
                        summary.results.length,
                        summary.results.length ? `${summary.average}%` : 'بدون قياس',
                        summary.weakSkills.map((skill) => `${skill.skill} (${skill.mastery}%)`).join(' | ') || '-',
                        item.action,
                    ]),
                ],
            })),
        ]);
        setActionFeedback('تم تجهيز خطة التدخل الأسبوعية للتنزيل.');
    };

    const exportPortalReport = () => {
        createWorkbookDownload('school-portal-supervisor-report.xlsx', [
            {
                name: 'summary',
                rows: [
                    ['البند', 'القيمة'],
                    ['النطاق', schoolTitle],
                    ['عدد المدارس', scope.schools.length],
                    ['عدد الفصول', reportClasses.length],
                    ['عدد الطلاب', reportStudents.length],
                    ['متوسط الأداء', `${average}%`],
                    ['طلاب يحتاجون متابعة', watchList.length],
                    ['اختبارات متابعة', reportFollowUpQuizzes.length],
                    ['باقات نشطة', reportPackages.filter((pkg) => pkg.status === 'active').length],
                    ['أكواد فعالة', activeCodes.length],
                ],
            },
            {
                name: 'students',
                rows: [
                    ['الطالب', 'البريد', 'الفصل', 'المحاولات', 'متوسط الأداء', 'آخر اختبار', 'أضعف مهارات'],
                    ...reportStudentSummaries.map((summary) => [
                        summary.student.name,
                        summary.student.email || '',
                        summary.classNames,
                        summary.results.length,
                        `${summary.average}%`,
                        summary.latest?.quizTitle || 'لا توجد محاولات',
                        summary.weakSkills.map((skill) => `${skill.skill} (${skill.mastery}%)`).join(' | ') || 'لا توجد إشارات ضعف واضحة',
                    ]),
                ],
            },
            {
                name: 'classes',
                rows: [
                    ['الفصل', 'الطلاب', 'الدورات', 'المشرفون'],
                    ...reportClasses.map((classroom) => [
                        classroom.name,
                        reportStudentSummaries.filter((summary) => (summary.student.groupIds || []).includes(classroom.id) || classroom.studentIds.includes(summary.student.id)).length,
                        classroom.courseIds.length,
                        classroom.supervisorIds.length,
                    ]),
                ],
            },
            {
                name: 'class-action-plan',
                rows: [
                    ['الفصل', 'عدد الطلاب', 'متوسط الأداء', 'يحتاجون متابعة', 'لم يبدأوا القياس', 'الإجراء التالي'],
                    ...classActionPlan.map((item) => [
                        item.classroom.name,
                        item.studentCount,
                        `${item.average}%`,
                        item.watchCount,
                        item.studentsWithoutAttempts,
                        item.nextAction,
                    ]),
                ],
            },
            {
                name: 'intervention-summary',
                rows: [
                    ['الفئة', 'عدد الطلاب', 'الإجراء المقترح'],
                    ...interventionPlan.map((item) => [item.title, item.students.length, item.action]),
                ],
            },
            {
                name: 'weekly-plan',
                rows: [
                    ['المرحلة', 'الإجراء'],
                    ...supervisorWeeklyPlan,
                ],
            },
            {
                name: 'supervisor-brief',
                rows: [
                    ['ملخص تنفيذي جاهز'],
                    ...supervisorBrief.split('\n').map((line) => [line]),
                    [''],
                    ['خطة التدخل الأسبوعية'],
                    ...interventionBrief.split('\n').map((line) => [line]),
                ],
            },
            {
                name: 'packages',
                rows: [
                    ['الباقة', 'الحالة', 'المقاعد', 'الأكواد', 'نطاق الوصول'],
                    ...reportPackages.map((pkg) => [
                        pkg.name,
                        pkg.status === 'active' ? 'نشطة' : 'موقوفة',
                        pkg.maxStudents || 0,
                        reportCodes.filter((code) => code.packageId === pkg.id).length,
                        describePackageScope(pkg),
                    ]),
                ],
            },
        ]);
    };

    const printPortalReport = () => {
        const bodyHtml = `
            <section class="hero">
                <p class="muted">تقرير بوابة المدرسة للمشرف</p>
                <h1>${escapeHtml(schoolTitle)}</h1>
                <p class="muted">${escapeHtml(new Date().toLocaleString('ar-SA'))}</p>
            </section>
            <section class="metrics">
                <div class="metric"><span>الطلاب</span><strong>${reportStudents.length}</strong></div>
                <div class="metric"><span>الفصول</span><strong>${reportClasses.length}</strong></div>
                <div class="metric"><span>متوسط الأداء</span><strong>${average}%</strong></div>
                <div class="metric"><span>يحتاجون متابعة</span><strong>${watchList.length}</strong></div>
                <div class="metric"><span>اختبارات متابعة</span><strong>${reportFollowUpQuizzes.length}</strong></div>
                <div class="metric"><span>باقات نشطة</span><strong>${reportPackages.filter((pkg) => pkg.status === 'active').length}</strong></div>
                <div class="metric"><span>أكواد فعالة</span><strong>${activeCodes.length}</strong></div>
                <div class="metric"><span>المقاعد</span><strong>${usedSeats}/${totalSeats}</strong></div>
            </section>
            <h2>قائمة المتابعة</h2>
            ${renderPrintTable(
                ['الطالب', 'الفصل', 'المحاولات', 'متوسط الأداء', 'سبب المتابعة'],
                watchList.map((summary) => [
                    summary.student.name,
                    summary.classNames,
                    summary.results.length,
                    `${summary.average}%`,
                    summary.results.length === 0 ? 'لا توجد محاولات' : summary.weakSkills.map((skill) => skill.skill).join('، ') || 'أداء منخفض',
                ]),
            )}
            <h2>الفصول</h2>
            ${renderPrintTable(
                ['الفصل', 'الطلاب', 'الدورات', 'المشرفون'],
                reportClasses.map((classroom) => [
                    classroom.name,
                    reportStudentSummaries.filter((summary) => (summary.student.groupIds || []).includes(classroom.id) || classroom.studentIds.includes(summary.student.id)).length,
                    classroom.courseIds.length,
                    classroom.supervisorIds.length,
                ]),
            )}
        `;

        openPrintWindow('تقرير بوابة المدرسة', bodyHtml);
    };

    if (scope.schools.length === 0 && scope.classes.length === 0) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{user.role === Role.ADMIN ? 'بوابة متابعة المدارس' : 'بوابة مدرستي'}</h1>
                    <p className="mt-2 text-sm text-gray-500">لم يتم ربط حسابك بمدرسة أو فصل حتى الآن. اطلب من المدير ربطك بالمدرسة أو الفصل المناسب.</p>
                </div>
                <div data-testid="school-portal-boundary-card" className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="text-xs font-black text-indigo-700">فصل واضح بين التشغيل والمتابعة</div>
                            <p className="mt-1 text-sm font-bold leading-6 text-gray-700">
                                هذه البوابة للمتابعة والتقارير بعد ربط المدرسة أو الفصل. إنشاء المدرسة، إضافة الطلاب، وربط المشرفين يبدأ من صفحة تشغيل المدارس.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const url = new URL('/admin-dashboard', window.location.origin);
                                url.searchParams.set('tab', 'groups');
                                window.history.pushState(null, '', `${url.pathname}${url.search}`);
                                window.dispatchEvent(new HashChangeEvent('hashchange'));
                            }}
                            data-testid="open-school-operations-from-portal"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
                        >
                            <Users size={16} />
                            فتح تشغيل المدارس
                        </button>
                    </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-800">
                    <div className="flex items-center gap-3 font-black">
                        <AlertTriangle size={22} />
                        لا يوجد نطاق إشراف ظاهر لهذا الحساب.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{user.role === Role.ADMIN ? 'بوابة متابعة المدارس' : 'بوابة مدرستي'}</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        متابعة المدرسة والفصول والطلاب داخل نطاق المشرف بدون صلاحيات حذف أو تعديل إداري حساس.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const url = new URL('/admin-dashboard', window.location.origin);
                            url.searchParams.set('tab', 'groups');
                            window.history.pushState(null, '', `${url.pathname}${url.search}`);
                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white hover:bg-gray-800"
                    >
                        <Users size={16} />
                        فتح تشغيل المدارس
                    </button>
                    <button
                        onClick={printPortalReport}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 hover:bg-indigo-100"
                    >
                        <Printer size={16} />
                        طباعة تقرير
                    </button>
                    <button
                        onClick={exportPortalReport}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                    >
                        <Download size={16} />
                        تصدير Excel
                    </button>
                </div>
            </div>

            <div data-testid="school-portal-boundary-card" className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-xs font-black text-indigo-700">فصل واضح بين التشغيل والمتابعة</div>
                        <p className="mt-1 text-sm font-bold leading-6 text-gray-700">
                            هذه البوابة لقراءة الأداء، متابعة الفصول، طباعة التقارير، وتحديد الطلاب المحتاجين لتدخل. إنشاء المدرسة، إضافة الطلاب، ربط المشرفين، والباقات تتم من صفحة تشغيل المدارس.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const url = new URL('/admin-dashboard', window.location.origin);
                            url.searchParams.set('tab', 'groups');
                            window.history.pushState(null, '', `${url.pathname}${url.search}`);
                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                        }}
                        data-testid="open-school-operations-from-portal"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
                    >
                        <Users size={16} />
                        فتح تشغيل المدارس
                    </button>
                </div>
            </div>

            <div data-testid="supervisor-school-scope-card" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className={`rounded-2xl p-3 ${supervisorAccess.isWholeSchool ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                {supervisorAccess.title}
                            </div>
                            <h2 className="mt-2 text-lg font-black text-gray-900">{supervisorAccess.visibleScope}</h2>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{supervisorAccess.description}</p>
                        </div>
                    </div>
                    <div data-testid="supervisor-scope-action-guide" className="grid min-w-[280px] grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-xl">
                        <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-500">ابدأ من</div>
                            <div className="mt-1 text-sm font-black text-gray-900">
                                {supervisorAccess.isWholeSchool ? 'أضعف فصل' : 'طلاب فصلك'}
                            </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-500">إجراء اليوم</div>
                            <div className="mt-1 text-sm font-black text-gray-900">
                                {watchList.length ? 'اختبار متابعة' : 'تقرير مختصر'}
                            </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-500">لا يظهر لك</div>
                            <div className="mt-1 text-sm font-black text-gray-900">
                                {supervisorAccess.isWholeSchool ? 'إدارة المنصة' : 'فصول غير مسندة'}
                            </div>
                        </div>
                    </div>
                </div>
                {!supervisorAccess.isWholeSchool && supervisorAccess.classScopedNames.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {supervisorAccess.classScopedNames.map((className) => (
                            <span key={className} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                {className}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'الطلاب داخل النطاق', value: reportStudents.length, icon: <Users size={22} />, color: 'blue' },
                    { label: 'الفصول المرتبطة', value: reportClasses.length, icon: <GraduationCap size={22} />, color: 'purple' },
                    { label: 'متوسط الأداء', value: `${average}%`, icon: <CheckCircle2 size={22} />, color: 'emerald' },
                    { label: 'يحتاجون متابعة', value: watchList.length, icon: <AlertTriangle size={22} />, color: 'amber' },
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className={`rounded-xl p-3 ${
                                item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                item.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                                item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-amber-50 text-amber-600'
                            }`}>
                                {item.icon}
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-500">{item.label}</div>
                                <div className="mt-1 text-2xl font-black text-gray-900">{item.value}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="text-xs font-black text-gray-600">
                        نطاق المدرسة
                        <select
                            value={selectedSchoolId}
                            onChange={(event) => {
                                setSelectedSchoolId(event.target.value);
                                setSelectedClassId('all');
                            }}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                        >
                            <option value="all">كل المدارس في نطاقي</option>
                            {scope.schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-black text-gray-600">
                        نطاق الفصل
                        <select
                            value={selectedClassId}
                            onChange={(event) => setSelectedClassId(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                        >
                            <option value="all">كل الفصول</option>
                            {scope.classes
                                .filter((classroom) => selectedSchoolId === 'all' || classroom.parentId === selectedSchoolId)
                                .map((classroom) => (
                                    <option key={classroom.id} value={classroom.id}>
                                        {classroom.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label className="text-xs font-black text-gray-600">
                        نوع التقرير
                        <select
                            value={reportMode}
                            onChange={(event) => setReportMode(event.target.value as 'combined' | 'aggregated' | 'individual')}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                        >
                            <option value="combined">تقرير شامل</option>
                            <option value="aggregated">مجمّع فقط</option>
                            <option value="individual">مفرد فقط</option>
                        </select>
                    </label>
                </div>
                <div className="mt-3">
                    <label className="text-xs font-black text-gray-600">
                        بحث داخل النطاق الحالي
                        <div className="relative mt-2">
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="search"
                                value={studentSearchTerm}
                                onChange={(event) => setStudentSearchTerm(event.target.value)}
                                placeholder="ابحث باسم الطالب أو البريد أو الفصل..."
                                className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    </label>
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                            <ShieldCheck size={14} />
                            مركز قرارات المشرف
                        </div>
                        <h2 className="mt-3 text-lg font-black text-gray-900">ماذا أفعل الآن؟</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            أدوات سريعة للمتابعة اليومية: تقرير، اختبار موجه، رسالة، وتصدير قائمة الطلاب.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <button
                            type="button"
                            onClick={openTargetedQuiz}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700"
                        >
                            <Target size={15} />
                            اختبار موجه
                        </button>
                        <button
                            type="button"
                            onClick={openReports}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                        >
                            <FileSpreadsheet size={15} />
                            تقرير مفصل
                        </button>
                        <button
                            type="button"
                            onClick={exportWatchList}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700 hover:bg-amber-100"
                        >
                            <Download size={15} />
                            قائمة المتابعة
                        </button>
                        <button
                            type="button"
                            onClick={openFollowUpEmail}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                        >
                            <Mail size={15} />
                            مراسلة الطلاب
                        </button>
                        <button
                            type="button"
                            onClick={copyFollowUpMessage}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-100"
                        >
                            <Clipboard size={15} />
                            نسخ ملخص
                        </button>
                        <button
                            type="button"
                            onClick={copySupervisorBrief}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                        >
                            <Clipboard size={15} />
                            ملخص للإدارة
                        </button>
                    </div>
                </div>

                {actionFeedback && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                        {actionFeedback}
                    </div>
                )}

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div className="text-xs font-black text-gray-500">أولوية اليوم</div>
                        <div className="mt-2 text-2xl font-black text-gray-900">{watchList.length.toLocaleString('ar-EG')}</div>
                        <p className="mt-1 text-xs text-gray-500">طالب يحتاج متابعة أو قياس أولي.</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div className="text-xs font-black text-gray-500">أفضل إجراء</div>
                        <div className="mt-2 text-sm font-black text-gray-900">
                            {watchList.length ? 'اختبار قصير ثم رسالة متابعة' : 'تصدير تقرير أسبوعي للمدرسة'}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">مصمم ليخدم مدير المدرسة بدون زحمة.</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div className="text-xs font-black text-gray-500">نطاق الاختبار التالي</div>
                        <div className="mt-2 truncate text-sm font-black text-gray-900">
                            {reportClasses[0]?.name || scope.schools[0]?.name || 'لم يحدد بعد'}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">يمكن تغيير النطاق من مركز الاختبارات.</p>
                    </div>
                </div>

                <div data-testid="supervisor-executive-decision-snapshot" className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-base font-black text-gray-900">لقطة قرار الإدارة</h3>
                            <p className="mt-1 text-xs font-bold text-gray-500">أقل كلام، أعلى فائدة: من الأفضل؟ من يحتاج تدخل؟ وما المهارة المشتركة؟</p>
                        </div>
                        <button
                            type="button"
                            onClick={createDecisionIntervention}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-indigo-700"
                        >
                            <Target size={15} />
                            أنشئ تدخل علاجي
                        </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div data-testid="supervisor-best-class" className="rounded-xl bg-white p-4">
                            <div className="text-xs font-black text-emerald-700">أفضل فصل</div>
                            <div className="mt-2 truncate text-sm font-black text-gray-900">
                                {bestClassSnapshot?.classroom.name || 'لا توجد بيانات كافية'}
                            </div>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                                {bestClassSnapshot ? `${bestClassSnapshot.average}% متوسط، ${bestClassSnapshot.watchCount} متابعة` : 'يظهر بعد بدء القياس.'}
                            </p>
                        </div>
                        <div data-testid="supervisor-weakest-class" className="rounded-xl bg-white p-4">
                            <div className="text-xs font-black text-rose-700">أضعف فصل</div>
                            <div className="mt-2 truncate text-sm font-black text-gray-900">
                                {weakestClassSnapshot?.classroom.name || 'لا توجد بيانات كافية'}
                            </div>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                                {weakestClassSnapshot ? `${weakestClassSnapshot.average}% متوسط، ${weakestClassSnapshot.watchCount} يحتاجون متابعة` : 'يظهر بعد بدء القياس.'}
                            </p>
                        </div>
                        <div data-testid="supervisor-shared-weak-skill" className="rounded-xl bg-white p-4">
                            <div className="text-xs font-black text-indigo-700">مهارة ضعيفة مشتركة</div>
                            <div className="mt-2 truncate text-sm font-black text-gray-900">
                                {sharedWeakSkillSnapshot?.skill || 'لا توجد مهارة متكررة'}
                            </div>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                                {sharedWeakSkillSnapshot
                                    ? `${sharedWeakSkillSnapshot.studentCount} طالب، إتقان ${sharedWeakSkillSnapshot.averageMastery}%`
                                    : 'ستظهر عند وجود تحليل مهارات.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showAggregatedSections && (
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">خطة التدخل الأسبوعية</h2>
                        <p className="mt-1 text-sm text-gray-500">تقسيم عملي للطلاب حسب الحاجة حتى يعرف المشرف من يبدأ به وماذا يرسل.</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportInterventionPlan}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                    >
                        <Download size={15} />
                        تصدير خطة التدخل
                    </button>
                </div>
                <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="text-xs font-black text-amber-700">الأولوية الآن</div>
                    <div className="mt-1 text-base font-black text-gray-900">{priorityIntervention?.title || 'لا توجد أولوية حرجة'}</div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{priorityIntervention?.action || 'استمر في المتابعة الأسبوعية والتحفيز.'}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {interventionPlan.map((item) => (
                        <div key={item.id} className={`rounded-2xl border p-4 ${
                            item.tone === 'rose' ? 'border-rose-100 bg-rose-50/70' :
                            item.tone === 'amber' ? 'border-amber-100 bg-amber-50/70' :
                            item.tone === 'indigo' ? 'border-indigo-100 bg-indigo-50/70' :
                            'border-emerald-100 bg-emerald-50/70'
                        }`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-gray-900">{item.title}</div>
                                <div className={`rounded-full px-3 py-1 text-xs font-black ${
                                    item.tone === 'rose' ? 'bg-white text-rose-700' :
                                    item.tone === 'amber' ? 'bg-white text-amber-700' :
                                    item.tone === 'indigo' ? 'bg-white text-indigo-700' :
                                    'bg-white text-emerald-700'
                                }`}>
                                    {item.students.length} طالب
                                </div>
                            </div>
                            <p className="mt-3 text-xs font-bold leading-6 text-gray-600">{item.action}</p>
                            {item.students.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {item.students.slice(0, 3).map((summary) => (
                                        <span key={summary.student.id} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-600">
                                            {summary.student.name}
                                        </span>
                                    ))}
                                    {item.students.length > 3 && (
                                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-400">
                                            +{item.students.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            )}

            {showAggregatedSections && (
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">خطة متابعة الفصول</h2>
                        <p className="mt-1 text-sm text-gray-500">ترتيب سريع يساعد المشرف يعرف يبدأ بأي فصل وما الإجراء التالي.</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportClassActionPlan}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                        <Download size={15} />
                        تصدير خطة الفصول
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-500">
                                <th className="py-3 font-black">الفصل</th>
                                <th className="py-3 font-black">الطلاب</th>
                                <th className="py-3 font-black">المتوسط</th>
                                <th className="py-3 font-black">متابعة</th>
                                <th className="py-3 font-black">الإجراء التالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classActionPlan.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-sm font-bold text-gray-500">
                                        لا توجد فصول داخل نطاق هذا المشرف حتى الآن.
                                    </td>
                                </tr>
                            ) : classActionPlan.slice(0, 8).map((item) => (
                                <tr key={item.classroom.id} className="border-b border-gray-50 last:border-0">
                                    <td className="py-3 font-bold text-gray-900">{item.classroom.name}</td>
                                    <td className="py-3 text-gray-600">{item.studentCount}</td>
                                    <td className="py-3">
                                        <span className={`rounded-full px-2 py-1 text-xs font-black ${
                                            item.average >= 75 ? 'bg-emerald-50 text-emerald-700' :
                                            item.average >= 60 ? 'bg-amber-50 text-amber-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                            {item.studentCount ? `${item.average}%` : '-'}
                                        </span>
                                    </td>
                                    <td className="py-3 text-gray-600">{item.watchCount}</td>
                                    <td className="py-3 text-gray-700">{item.nextAction}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {showIndividualSections && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">قائمة المتابعة السريعة</h2>
                            <p className="mt-1 text-sm text-gray-500">طلاب بلا محاولات أو متوسطهم منخفض أو لديهم مهارات ضعيفة.</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{watchList.length} طالب</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs text-gray-500">
                                    <th className="py-3 font-black">الطالب</th>
                                    <th className="py-3 font-black">الفصل</th>
                                    <th className="py-3 font-black">المحاولات</th>
                                    <th className="py-3 font-black">المتوسط</th>
                                    <th className="py-3 font-black">ما يحتاجه الآن</th>
                                </tr>
                            </thead>
                            <tbody>
                                {watchList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-sm font-bold text-emerald-700">
                                            ممتاز. لا توجد إشارات ضعف حرجة داخل نطاقك الآن.
                                        </td>
                                    </tr>
                                ) : watchList.slice(0, 12).map((summary) => (
                                    <tr key={summary.student.id} className="border-b border-gray-50 last:border-0">
                                        <td className="py-3 font-bold text-gray-900">{summary.student.name}</td>
                                        <td className="py-3 text-gray-600">{summary.classNames}</td>
                                        <td className="py-3 text-gray-600">{summary.results.length}</td>
                                        <td className="py-3">
                                            <span className={`rounded-full px-2 py-1 text-xs font-black ${
                                                summary.average >= 75 ? 'bg-emerald-50 text-emerald-700' :
                                                summary.average >= 60 ? 'bg-amber-50 text-amber-700' :
                                                'bg-rose-50 text-rose-700'
                                            }`}>
                                                {summary.results.length ? `${summary.average}%` : 'بدون قياس'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {summary.results.length === 0
                                                ? 'ابدأ باختبار قياس قصير'
                                                : summary.weakSkills.map((skill) => skill.skill).join('، ') || 'متابعة تدريب داعم'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={20} />
                        <h2 className="text-lg font-black text-gray-900">جاهزية الوصول</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-xl bg-emerald-50 p-4">
                            <div className="text-xs font-bold text-emerald-700">المقاعد المستخدمة</div>
                            <div className="mt-1 text-2xl font-black text-emerald-800">{usedSeats}/{totalSeats || 0}</div>
                        </div>
                        <div className="rounded-xl bg-indigo-50 p-4">
                            <div className="text-xs font-bold text-indigo-700">أكواد فعالة</div>
                            <div className="mt-1 text-2xl font-black text-indigo-800">{activeCodes.length}</div>
                        </div>
                        <div className="rounded-xl bg-amber-50 p-4">
                            <div className="text-xs font-bold text-amber-700">اختبارات متابعة موجهة</div>
                            <div className="mt-1 text-2xl font-black text-amber-800">{reportFollowUpQuizzes.length}</div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {showAggregatedSections && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <GraduationCap className="text-purple-600" size={20} />
                        <h2 className="text-lg font-black text-gray-900">الفصول</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {reportClasses.map((classroom) => {
                            const classroomStudents = reportStudentSummaries.filter((summary) =>
                                classroom.studentIds.includes(summary.student.id) || (summary.student.groupIds || []).includes(classroom.id),
                            );
                            return (
                                <div key={classroom.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                    <div className="font-black text-gray-900">{classroom.name}</div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="rounded-xl bg-white p-3">
                                            <div className="font-black text-gray-900">{classroomStudents.length}</div>
                                            <div className="text-gray-500">طلاب</div>
                                        </div>
                                        <div className="rounded-xl bg-white p-3">
                                            <div className="font-black text-gray-900">{classroom.courseIds.length}</div>
                                            <div className="text-gray-500">دورات</div>
                                        </div>
                                        <div className="rounded-xl bg-white p-3">
                                            <div className="font-black text-gray-900">{averageScore(classroomStudents.flatMap((item) => item.results))}%</div>
                                            <div className="text-gray-500">متوسط</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <BookOpen className="text-blue-600" size={20} />
                        <h2 className="text-lg font-black text-gray-900">الدورات والباقات</h2>
                    </div>
                    <div className="space-y-3">
                        {reportPackages.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-sm font-bold text-gray-500">
                                لا توجد باقات مدرسية ظاهرة داخل نطاقك حتى الآن.
                            </div>
                        ) : reportPackages.map((pkg) => (
                            <div key={pkg.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-black text-gray-900">{pkg.name}</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {pkg.courseIds.length} دورة · {reportCodes.filter((code) => code.packageId === pkg.id).length} كود
                                        </div>
                                        <div className="mt-2 text-xs font-bold leading-5 text-gray-600">
                                            {describePackageScope(pkg)}
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                        pkg.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                        {pkg.status === 'active' ? 'نشطة' : 'موقوفة'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-indigo-800">
                            <FileSpreadsheet size={18} />
                            دورات ظاهرة داخل النطاق: {scope.scopedCourses.length}
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};
