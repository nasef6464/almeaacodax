
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Course } from '../types';
import { CoursePlayer } from '../components/CoursePlayer';
import { CourseLanding } from '../components/CourseLanding';
import { CourseOverview } from '../components/CourseOverview';
import { Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { adapter } from '../services/adapter';

const CourseView: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const { enrolledCourses } = useStore();

    useEffect(() => {
        let mounted = true;

        const loadCourse = async () => {
            if (!courseId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const foundCourse = await adapter.getCourseById(courseId);
                if (mounted) {
                    setCourse(foundCourse);
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">الدورة غير موجودة</h1>
                <button 
                    onClick={() => window.history.back()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold"
                >
                    العودة للخلف
                </button>
            </div>
        );
    }

    const isEnrolled = enrolledCourses.includes(course.id);

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
