import React from 'react';
import { useParams } from 'react-router-dom';
import { LearningSection } from '../components/LearningSection';

interface QudratSectionProps {
    type?: 'quant' | 'verbal' | 'packages';
}

export const QudratSection: React.FC<QudratSectionProps> = ({ type: propType }) => {
    const { type: paramType } = useParams<{ type: string }>();
    const sectionType = propType || paramType || 'quant';

    const titles: Record<string, string> = {
        quant: 'القدرات (كمي)',
        verbal: 'القدرات (لفظي)',
        packages: 'باقات القدرات'
    };

    const title = titles[sectionType] || 'القسم';

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <header className="bg-indigo-900 text-white py-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl font-bold mb-2">{title}</h1>
                    <p className="text-indigo-200">تأسيس شامل، تدريب مكثف، واختبارات محاكية</p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <LearningSection category="qudrat" subject={sectionType} title={title} colorTheme="amber" />
            </div>
        </div>
    );
};
