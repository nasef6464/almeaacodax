import { Course, Group, Role, User } from '../../../types';
import type { SchoolReport } from './contracts';

type WorkbookSheet = {
    name: string;
    rows: Array<Array<string | number>>;
};

type BuildSchoolClassReportSheetsInput = {
    selectedSchool: Group;
    classroom: Group;
    schoolStudents: User[];
    supervisors: User[];
    publishedCourses: Course[];
    schoolReport: SchoolReport | null;
    parents: User[];
};

export const buildSchoolClassReportSheets = ({
    selectedSchool,
    classroom,
    schoolStudents,
    supervisors,
    publishedCourses,
    schoolReport,
    parents,
}: BuildSchoolClassReportSheetsInput): WorkbookSheet[] => {
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

    return [
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
    ];
};
