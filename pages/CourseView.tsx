import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Course } from '../types';
import { CoursePlayer } from '../components/CoursePlayer';
import { CourseOverview } from '../components/CourseOverview';
import { StudentNextActionStrip } from '../components/StudentNextActionStrip';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { adapter } from '../services/adapter';

const PaymentModal = React.lazy(() => import('../components/PaymentModal').then((module) => ({ default: module.PaymentModal })));

const withCourseAccessLocks = (course: Course, hasAccess: boolean): Course => {
    if (hasAccess) return course;

    return {
        ...course,
        modules: course.modules?.map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) => ({
                ...lesson,
                isLocked: lesson.accessControl !== 'public',
            })),
        })),
    };
};

const CourseView: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isPlaying, setIsPlaying] = useState(() => searchParams.get('learn') === '1');
    const requestedTab = searchParams.get('tab');
    const purchaseRequested = searchParams.get('buy') === '1';
    const [certificateCode, setCertificateCode] = useState('');
    const { user, enrolledCourses, hasScopedPackageAccess, courses } = useStore();
    const isGuestUser = !user?.email || user.id === 'guest';
    const isStaffViewer = !isGuestUser && ['admin', 'teacher', 'supervisor'].includes(user.role);

    useEffect(() => {
        setIsPlaying(searchParams.get('learn') === '1');
    }, [searchParams]);

    const resolveOverviewTab = (value: string | null): 'description' | 'syllabus' | 'tests' | 'qa' | 'files' => {
        if (value === 'description' || value === 'syllabus' || value === 'tests' || value === 'qa' || value === 'files') {
            return value;
        }
        return 'syllabus';
    };

    const updateLearningUrlState = useCallback((nextPlaying: boolean, lessonId?: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (nextPlaying) {
            nextParams.set('learn', '1');
            nextParams.delete('buy');
            if (lessonId) {
                nextParams.set('lesson', lessonId);
            }
        } else {
            nextParams.delete('learn');
            nextParams.delete('lesson');
        }
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const closePurchaseModal = useCallback(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('buy');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        let mounted = true;

        const loadCourse = async () => {
            if (!courseId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setLoadError('');
            try {
                const foundCourse = await adapter.getCourseById(courseId);
                if (mounted) {
                    setCourse(foundCourse);
                }
            } catch (error) {
                console.warn('Unable to load course', error);
                if (mounted) {
                    const localCourse =
                        courses.find((item: any) => String(item.id || item._id || '') === String(courseId || '')) || null;
                    if (localCourse) {
                        setCourse(localCourse);
                        setLoadError('');
                    } else {
                        setCourse(null);
                        setLoadError('تعذر تحميل الدورة حاليًا. تأكد من الرابط أو جرّب مرة أخرى بعد قليل.');
                    }
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadCourse();

        return () => {
            mounted = false;
        };
    }, [courseId, courses]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="max-w-md rounded-3xl border border-amber-100 bg-white p-8 shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="mb-3 text-xl sm:text-2xl font-black leading-tight text-gray-900">لم نتمكن من فتح الدورة</h1>
                    <p className="mb-6 text-sm leading-7 text-gray-500">{loadError}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 sm:w-auto"
                    >
                        العودة للخلف
                    </button>
                </div>
            </div>
        );
    }

    const courseIsVisibleToStudent =
        course &&
        course.showOnPlatform !== false &&
        course.isPublished !== false &&
        (!course.approvalStatus || course.approvalStatus === 'approved');

    if (!course || (!isStaffViewer && !courseIsVisibleToStudent)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-tight">الدورة غير متاحة حاليًا</h1>
                <button
                    onClick={() => window.history.back()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold w-full sm:w-auto"
                >
                    العودة للخلف
                </button>
            </div>
        );
    }

    const hasPackageAccess = hasScopedPackageAccess('courses', course.pathId || course.category, course.subjectId || course.subject);
    const isFreeCourse = Number(course.price || 0) <= 0;
    const isEnrolled =
        enrolledCourses.includes(course.id) ||
        (user.subscription?.purchasedCourses || []).includes(course.id) ||
        hasPackageAccess;
    const courseForCurrentAccess = withCourseAccessLocks(course, isEnrolled || isStaffViewer || isFreeCourse);
    const hasPlayablePreviewLesson = courseForCurrentAccess.modules?.some((module) =>
        module.lessons.some((lesson) => !lesson.isLocked),
    ) === true;
    const canOpenCoursePlayer = isEnrolled || isStaffViewer || isFreeCourse || hasPlayablePreviewLesson;
    const courseSubjectPath = course.subjectId || course.subject;
    const coursePath = course.pathId || course.category;
    const foundationHref =
        coursePath && courseSubjectPath
            ? `/category/${coursePath}?subject=${courseSubjectPath}&tab=skills`
            : '/dashboard?tab=paths';
    const packagesHref =
        coursePath && courseSubjectPath
            ? `/category/${coursePath}?subject=${courseSubjectPath}&tab=packages&contentType=courses`
            : '/pricing';
    const courseNextAction = (
        <div className="mx-auto mb-4 mt-4 w-full max-w-5xl px-4">
            <StudentNextActionStrip
                title={canOpenCoursePlayer ? 'ابدأ أول درس الآن' : 'اشتر الدورة أو اختر باقة مناسبة'}
                description={canOpenCoursePlayer ? 'شاهد درسًا قصيرًا، ثم انتقل لتدريب بسيط من نفس المهارة.' : 'يمكنك شراء هذه الدورة وحدها، أو اختيار باقة تفتح محتوى أوسع في نفس المسار.'}
                primaryLabel={canOpenCoursePlayer ? 'ابدأ التعلم' : 'شراء الدورة'}
                primaryHref={canOpenCoursePlayer ? `/course/${course.id}?learn=1` : `/course/${course.id}?buy=1`}
                secondaryLabel={canOpenCoursePlayer ? 'التأسيس' : 'عرض الباقات'}
                secondaryHref={canOpenCoursePlayer ? foundationHref : packagesHref}
                tone={canOpenCoursePlayer ? 'indigo' : 'amber'}
            />
        </div>
    );

    if (isPlaying && (isEnrolled || isStaffViewer || isFreeCourse || hasPlayablePreviewLesson)) {
        return (
            <CoursePlayer
                course={courseForCurrentAccess}
                initialLessonId={searchParams.get('lesson') || undefined}
                onLessonChange={(lessonId) => updateLearningUrlState(true, lessonId)}
                onBack={() => {
                    setIsPlaying(false);
                    updateLearningUrlState(false);
                }}
            />
        );
    }

    if (isEnrolled) {
        return (
            <div>
                {courseNextAction}
                {course.certificateEnabled && Number(course.progress || 0) >= 100 ? (
                    <div className="mx-auto mb-4 mt-4 w-full max-w-5xl px-4">
                        <button
                            onClick={async () => {
                                try {
                                    const { api } = await import('../services/api');
                                    const cert = await api.generateCertificate({ courseId: course.id });
                                    const code = String(cert?.verificationCode || '');
                                    if (code) {
                                        setCertificateCode(code);
                                        window.location.href = `/certificate/${code}`;
                                    }
                                } catch (e) {
                                    console.warn('Certificate generation failed', e);
                                }
                            }}
                            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                        >
                            إصدار الشهادة
                        </button>
                        {certificateCode ? <p className="mt-2 text-xs text-gray-500">تم إنشاء الشهادة بنجاح.</p> : null}
                    </div>
                ) : null}
                <CourseOverview
                    course={courseForCurrentAccess}
                    initialTab={resolveOverviewTab(requestedTab)}
                    onTabChange={(tab) => {
                        const nextParams = new URLSearchParams(searchParams);
                        if (tab === 'syllabus') {
                            nextParams.delete('tab');
                        } else {
                            nextParams.set('tab', tab);
                        }
                        setSearchParams(nextParams, { replace: true });
                    }}
                    onContinue={(lessonId?: string) => {
                        setIsPlaying(true);
                        updateLearningUrlState(true, lessonId);
                    }}
                />
            </div>
        );
    }

    return (
        <div>
            {courseNextAction}
            <CourseOverview
                course={courseForCurrentAccess}
                initialTab={resolveOverviewTab(requestedTab)}
                onTabChange={(tab) => {
                    const nextParams = new URLSearchParams(searchParams);
                    if (tab === 'syllabus') {
                        nextParams.delete('tab');
                    } else {
                        nextParams.set('tab', tab);
                    }
                    setSearchParams(nextParams, { replace: true });
                }}
                onContinue={(lessonId?: string) => {
                    setIsPlaying(true);
                    updateLearningUrlState(true, lessonId);
                }}
            />
            {purchaseRequested && !isFreeCourse && !isStaffViewer ? (
                <React.Suspense fallback={null}>
                    <PaymentModal
                        isOpen
                        onClose={closePurchaseModal}
                        item={{ ...course, purchaseType: 'course' }}
                        type="course"
                    />
                </React.Suspense>
            ) : null}
        </div>
    );
};

export default CourseView;
