import React from 'react';
import type { Course } from '../../../types';

interface SchoolCoursesPanelProps {
    schoolCourses: Course[];
    publishedCourses: Course[];
    selectedCourseIds: string[];
    onAssignCourse: (courseId: string) => void;
    onRemoveCourse: (courseId: string) => void;
}

export const SchoolCoursesPanel: React.FC<SchoolCoursesPanelProps> = ({
    schoolCourses,
    publishedCourses,
    selectedCourseIds,
    onAssignCourse,
    onRemoveCourse,
}) => {
    const availableCourses = publishedCourses.filter((course) => !selectedCourseIds.includes(course.id));

    return (
        <div data-testid="school-courses-panel" className="border border-gray-100 rounded-xl p-5 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-lg font-bold text-gray-900">دورات المدرسة</h3>
                <span className="text-sm text-gray-500">{schoolCourses.length} دورة مرتبطة</span>
            </div>
            <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                defaultValue=""
                onChange={(event) => {
                    const value = event.target.value;
                    if (!value) return;
                    onAssignCourse(value);
                    event.target.value = '';
                }}
            >
                <option value="">ربط دورة مباشرة بالمدرسة</option>
                {availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                ))}
            </select>
            <div className="flex flex-wrap gap-2">
                {schoolCourses.length === 0 ? (
                    <span className="text-sm text-gray-400">لا توجد دورات مرتبطة بهذه المدرسة حتى الآن.</span>
                ) : schoolCourses.map((course) => (
                    <button
                        key={course.id}
                        onClick={() => onRemoveCourse(course.id)}
                        className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                        {course.title} ×
                    </button>
                ))}
            </div>
        </div>
    );
};
