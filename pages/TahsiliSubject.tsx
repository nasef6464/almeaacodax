
import React from 'react';
import { useParams } from 'react-router-dom';
import { LearningSection } from '../components/LearningSection';

export const TahsiliSubject: React.FC = () => {
    const { subject } = useParams<{ subject: string }>();
    const safeSubject = subject || 'math';

    const subjectTitles: Record<string, string> = {
        math: 'الرياضيات (تحصيلي)',
        physics: 'الفيزياء (تحصيلي)',
        chemistry: 'الكيمياء (تحصيلي)',
        biology: 'الأحياء (تحصيلي)',
        packages: 'عروض وباقات التحصيلي'
    };

    const title = subjectTitles[safeSubject] || 'المادة العلمية';

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 text-center">
                <h1 className="text-3xl font-bold mb-2">{title}</h1>
                <p className="text-gray-300">كل ما تحتاجه للتفوق في {title.split(' ')[0]}</p>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <LearningSection category="tahsili" subject={safeSubject} title={title} colorTheme="indigo" />
            </div>
        </div>
    );
};
