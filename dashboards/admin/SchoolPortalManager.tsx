import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    GraduationCap,
    Printer,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Group, QuizResult, Role, User } from '../../types';

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
        quizzes,
        examResults,
        b2bPackages,
        accessCodes,
    } = useStore();

    const scope = useMemo(() => {
        const userGroupIds = new Set(user.groupIds || []);
        const schoolIds = new Set<string>();

        if (user.schoolId) {
            schoolIds.add(user.schoolId);
        }

        groups.forEach((group) => {
            if (!userGroupIds.has(group.id)) return;
            if (group.type === 'SCHOOL') {
                schoolIds.add(group.id);
            }
            if (group.parentId) {
                schoolIds.add(group.parentId);
            }
        });

        const schools = groups.filter((group) => group.type === 'SCHOOL' && schoolIds.has(group.id));
        const classes = groups.filter((group) => {
            if (group.type !== 'CLASS') return false;
            return userGroupIds.has(group.id) || (!!group.parentId && schoolIds.has(group.parentId));
        });
        const classIds = new Set(classes.map((item) => item.id));
        const students = users.filter((item) => {
            if (item.role !== Role.STUDENT) return false;
            const sharesSchool = !!item.schoolId && schoolIds.has(item.schoolId);
            const sharesClass = (item.groupIds || []).some((groupId) => classIds.has(groupId) || userGroupIds.has(groupId));
            return sharesSchool || sharesClass;
        });
        const studentIds = new Set(students.map((student) => student.id));
        const results = examResults.filter((result) => !!result.userId && studentIds.has(result.userId));
        const packages = b2bPackages.filter((pkg) => schoolIds.has(pkg.schoolId));
        const codes = accessCodes.filter((code) => schoolIds.has(code.schoolId));
        const packageCourseIds = new Set(packages.flatMap((pkg) => pkg.courseIds || []));
        const scopedCourses = courses.filter((course) => packageCourseIds.has(course.id) || classes.some((classroom) => classroom.courseIds.includes(course.id)));
        const scopedGroupIds = new Set([...Array.from(classIds), ...Array.from(schoolIds), ...Array.from(userGroupIds)]);
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
        };
    }, [accessCodes, b2bPackages, courses, examResults, groups, quizzes, user.groupIds, user.schoolId]);

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

    const watchList = studentSummaries
        .filter((summary) => summary.results.length === 0 || summary.average < 60 || summary.weakSkills.length > 0)
        .sort((a, b) => a.average - b.average);

    const totalSeats = scope.packages
        .filter((pkg) => pkg.status === 'active')
        .reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
    const usedSeats = scope.codes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
    const activeCodes = scope.codes.filter((code) => code.expiresAt > Date.now());
    const average = averageScore(scope.results);
    const schoolTitle = scope.schools.map((school) => school.name).join('، ') || 'نطاق الإشراف الحالي';

    const exportPortalReport = () => {
        createWorkbookDownload('school-portal-supervisor-report.xlsx', [
            {
                name: 'summary',
                rows: [
                    ['البند', 'القيمة'],
                    ['النطاق', schoolTitle],
                    ['عدد المدارس', scope.schools.length],
                    ['عدد الفصول', scope.classes.length],
                    ['عدد الطلاب', scope.students.length],
                    ['متوسط الأداء', `${average}%`],
                    ['طلاب يحتاجون متابعة', watchList.length],
                    ['اختبارات متابعة', scope.followUpQuizzes.length],
                    ['باقات نشطة', scope.packages.filter((pkg) => pkg.status === 'active').length],
                    ['أكواد فعالة', activeCodes.length],
                ],
            },
            {
                name: 'students',
                rows: [
                    ['الطالب', 'البريد', 'الفصل', 'المحاولات', 'متوسط الأداء', 'آخر اختبار', 'أضعف مهارات'],
                    ...studentSummaries.map((summary) => [
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
                    ...scope.classes.map((classroom) => [
                        classroom.name,
                        studentSummaries.filter((summary) => (summary.student.groupIds || []).includes(classroom.id) || classroom.studentIds.includes(summary.student.id)).length,
                        classroom.courseIds.length,
                        classroom.supervisorIds.length,
                    ]),
                ],
            },
            {
                name: 'packages',
                rows: [
                    ['الباقة', 'الحالة', 'المقاعد', 'الأكواد'],
                    ...scope.packages.map((pkg) => [
                        pkg.name,
                        pkg.status === 'active' ? 'نشطة' : 'موقوفة',
                        pkg.maxStudents || 0,
                        scope.codes.filter((code) => code.packageId === pkg.id).length,
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
                <div class="metric"><span>الطلاب</span><strong>${scope.students.length}</strong></div>
                <div class="metric"><span>الفصول</span><strong>${scope.classes.length}</strong></div>
                <div class="metric"><span>متوسط الأداء</span><strong>${average}%</strong></div>
                <div class="metric"><span>يحتاجون متابعة</span><strong>${watchList.length}</strong></div>
                <div class="metric"><span>اختبارات متابعة</span><strong>${scope.followUpQuizzes.length}</strong></div>
                <div class="metric"><span>باقات نشطة</span><strong>${scope.packages.filter((pkg) => pkg.status === 'active').length}</strong></div>
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
                scope.classes.map((classroom) => [
                    classroom.name,
                    studentSummaries.filter((summary) => (summary.student.groupIds || []).includes(classroom.id) || classroom.studentIds.includes(summary.student.id)).length,
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
                    <h1 className="text-2xl font-black text-gray-900">بوابة المدرسة</h1>
                    <p className="mt-2 text-sm text-gray-500">لم يتم ربط حسابك بمدرسة أو فصل حتى الآن. اطلب من المدير ربطك بالمدرسة أو الفصل المناسب.</p>
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
                    <h1 className="text-2xl font-black text-gray-900">بوابة المدرسة</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        متابعة المدرسة والفصول والطلاب داخل نطاق المشرف بدون صلاحيات حذف أو تعديل إداري حساس.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'الطلاب داخل النطاق', value: scope.students.length, icon: <Users size={22} />, color: 'blue' },
                    { label: 'الفصول المرتبطة', value: scope.classes.length, icon: <GraduationCap size={22} />, color: 'purple' },
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
                            <div className="mt-1 text-2xl font-black text-amber-800">{scope.followUpQuizzes.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <GraduationCap className="text-purple-600" size={20} />
                        <h2 className="text-lg font-black text-gray-900">الفصول</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {scope.classes.map((classroom) => {
                            const classroomStudents = studentSummaries.filter((summary) =>
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
                        {scope.packages.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-sm font-bold text-gray-500">
                                لا توجد باقات مدرسية ظاهرة داخل نطاقك حتى الآن.
                            </div>
                        ) : scope.packages.map((pkg) => (
                            <div key={pkg.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-black text-gray-900">{pkg.name}</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {pkg.courseIds.length} دورة · {scope.codes.filter((code) => code.packageId === pkg.id).length} كود
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
        </div>
    );
};
