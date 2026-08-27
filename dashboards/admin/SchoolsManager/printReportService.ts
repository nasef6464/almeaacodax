import { B2BPackage, Course, Group, Role, User, AccessCode } from '../../../types';
import type { SchoolReport } from './contracts';
import type { SchoolWorkspaceReadinessCheck } from './workspaceViewModel';
import { escapeHtml, renderPrintTable } from './exportHelpers';

type BuildSchoolPrintReportHtmlInput = {
    selectedSchool: Group;
    readinessChecks: SchoolWorkspaceReadinessCheck[];
    readinessScore: number;
    schoolStudents: User[];
    schoolClasses: Group[];
    activeSchoolPackages: B2BPackage[];
    activeSchoolCodes: AccessCode[];
    totalSeats: number;
    usedSeats: number;
    schoolSupervisors: User[];
    supervisors: User[];
    schoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    operationalWarnings: string[];
};

type BuildClassPrintReportHtmlInput = {
    selectedSchool: Group;
    classroom: Group;
    schoolStudents: User[];
    supervisors: User[];
    publishedCourses: Course[];
    schoolReport: SchoolReport | null;
    parents: User[];
};

export const buildSchoolPrintReportHtml = ({
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
}: BuildSchoolPrintReportHtmlInput) => {
    const warnings = operationalWarnings.length ? operationalWarnings : ['لا توجد ملاحظات تشغيلية حرجة.'];
    const printedAt = new Date().toLocaleString('ar-SA');

    return `
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
};

export const buildClassPrintReportHtml = ({
    selectedSchool,
    classroom,
    schoolStudents,
    supervisors,
    publishedCourses,
    schoolReport,
    parents,
}: BuildClassPrintReportHtmlInput) => {
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

    return `
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
};
