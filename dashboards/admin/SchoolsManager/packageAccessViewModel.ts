import type {
    AccessCode,
    B2BPackage,
    CategoryPath,
    CategorySubject,
    Course,
    User,
} from '../../../types';

export interface SchoolPackageAccessViewModelInput {
    schoolPackages: B2BPackage[];
    activeSchoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    activeSchoolCodes: AccessCode[];
    totalSeats: number;
    usedSeats: number;
    publishedCourses: Course[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    teachers: User[];
}

export interface SchoolPackagePresentation {
    courses: Course[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    teacher?: User;
}

/**
 * Pure package/access projection for the school workspace.
 *
 * Package cards previously scanned the full courses/paths/subjects/teachers
 * collections for every package render. Pre-indexing keeps that work close to
 * O(reference collections + package references) as B2B content grows.
 */
export const buildSchoolPackageAccessViewModel = ({
    schoolPackages,
    activeSchoolPackages,
    schoolCodes,
    activeSchoolCodes,
    totalSeats,
    usedSeats,
    publishedCourses,
    paths,
    subjects,
    teachers,
}: SchoolPackageAccessViewModelInput) => {
    const courseById = new Map(publishedCourses.map((course) => [course.id, course]));
    const pathById = new Map(paths.map((path) => [path.id, path]));
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));

    const packageAccessRowsById = new Map<string, SchoolPackagePresentation>();
    schoolPackages.forEach((pkg) => {
        packageAccessRowsById.set(pkg.id, {
            courses: (pkg.courseIds || []).map((id) => courseById.get(id)).filter(Boolean) as Course[],
            paths: (pkg.pathIds || []).map((id) => pathById.get(id)).filter(Boolean) as CategoryPath[],
            subjects: (pkg.subjectIds || []).map((id) => subjectById.get(id)).filter(Boolean) as CategorySubject[],
            teacher: pkg.assignedTeacherId ? teacherById.get(pkg.assignedTeacherId) : undefined,
        });
    });

    const activePackageCount = activeSchoolPackages.length;
    const inactivePackageCount = schoolPackages.length - activePackageCount;
    const activeCodeCount = activeSchoolCodes.length;
    const totalCodeCount = schoolCodes.length;
    const hasSeatCapacity = totalSeats > 0;
    const seatCapacityExhausted = hasSeatCapacity && usedSeats >= totalSeats;
    const seatUsagePercent = hasSeatCapacity
        ? Math.min(100, Math.max(0, Math.round((usedSeats / totalSeats) * 100)))
        : 0;
    const seatsLabel = hasSeatCapacity ? `${usedSeats}/${totalSeats}` : '0/0';
    const accessReady = activePackageCount > 0 && activeCodeCount > 0 && !seatCapacityExhausted;

    const accessStatusLabel = activePackageCount > 0 && activeCodeCount > 0
        ? 'الوصول جاهز للتسليم'
        : 'الوصول يحتاج استكمال';
    const accessNextAction = activePackageCount === 0
        ? 'فعّل باقة مدرسية مرتبطة بالمسارات حتى يحصل الطلاب على الوصول بدون شراء فردي.'
        : activeCodeCount === 0
            ? 'ولّد كود دخول صالحًا للطلاب أو أرسل رابط التسجيل حسب طريقة التسليم.'
            : seatCapacityExhausted
                ? 'المقاعد المتاحة مستهلكة بالكامل. زِد سعة الباقة قبل إضافة طلاب جدد.'
                : 'الباقة والمسارات والأكواد جاهزة. يمكنك إرسال ملف التسليم للمدرسة أو متابعة الاستهلاك.';

    return {
        packageAccessRowsById,
        activePackageCount,
        inactivePackageCount,
        activeCodeCount,
        totalCodeCount,
        hasSeatCapacity,
        seatCapacityExhausted,
        seatUsagePercent,
        seatsLabel,
        accessReady,
        accessStatusLabel,
        accessNextAction,
    };
};
