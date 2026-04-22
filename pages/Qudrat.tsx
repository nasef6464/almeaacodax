
import React from 'react';
import { useStore } from '../store/useStore';
import { PathLayout, PathCard } from '../components/PathLayout';

export const Qudrat: React.FC = () => {
    const { subjects, courses } = useStore();
    
    // Filter only Qudrat courses for the grid below
    const filteredCourses = courses.filter(course => course.category === 'القدرات' || course.category === 'قدرات');

    const pathSubjects = subjects.filter(s => s.pathId === 'p_qudrat');

    const qudratCards: PathCard[] = [
        {
            id: 'offers',
            title: 'العروض والباقات',
            subtitle: '% خصومات حصرية',
            color: 'bg-[#10b981]',
            link: '/category/qudrat/packages',
            isPillSubtitle: true
        },
        ...pathSubjects.map((subject, index) => {
            const colors = ['bg-[#2563eb]', 'bg-[#f59e0b]', 'bg-[#8b5cf6]', 'bg-[#ea580c]', 'bg-[#059669]'];
            return {
                id: subject.id,
                title: subject.name,
                subtitle: 'تأسيس - محاكي - شروحات',
                color: colors[index % colors.length],
                link: `/category/p_qudrat/${subject.id}`
            };
        })
    ];

    return (
        <PathLayout
            title="دورات القدرات 2025"
            subtitle="تأسيس وتدريب شامل لاختبار القدرات العامة مع نخبة من أفضل المعلمين"
            cards={qudratCards}
            coursesTitle="أحدث الدورات"
            courses={filteredCourses}
        />
    );
};
