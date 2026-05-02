
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Course } from '../types';
import { CoursePlayer } from '../components/CoursePlayer';
import { CourseLanding } from '../components/CourseLanding';
import { CourseOverview } from '../components/CourseOverview';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { adapter } from '../services/adapter';

const CourseView: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const { user, enrolledCourses, hasScopedPackageAccess } = useStore();
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);

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
                    setCourse(null);
                    setLoadError('تعذر تحميل الدورة الآن. تأكد أن الدورة منشورة أو جرّب مرة أخرى بعد لحظات.');
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
    }, [courseId]);

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
                    <h1 className="mb-3 text-xl sm:text-2xl font-black leading-tight text-gray-900">لم نستطع فتح الدورة</h1>
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
    const isEnrolled =
        enrolledCourses.includes(course.id) ||
        (user.subscription?.purchasedCourses || []).includes(course.id) ||
        hasPackageAccess;

    if (isEnrolled) {
        if (isPlaying) {
            return <CoursePlayer course={course} onBack={() => setIsPlaying(false)} />;
        }
        return <CourseOverview course={course} onContinue={() => setIsPlaying(true)} />;
    }

    return (
        <div className="min-h-screen bg-white">
            <CourseLanding course={course} />
        </div>
    );
};

export default CourseView;
