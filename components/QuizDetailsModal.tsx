import React from 'react';
import { X } from 'lucide-react';
import { QuizHistoryItem, SkillGap } from '../types';

interface QuizDetailsModalProps {
    quiz: QuizHistoryItem;
    onClose: () => void;
}

export const QuizDetailsModal: React.FC<QuizDetailsModalProps> = ({ quiz, onClose }) => {
    // Group skills by section
    const groupedSkills = quiz.skillsAnalysis.reduce((acc, curr) => {
        const section = curr.section || 'عام';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(curr);
        return acc;
    }, {} as Record<string, SkillGap[]>);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-secondary-500">عرض تفصيلي للنتيجة</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-200 font-bold text-gray-700 text-center">
                            <div className="col-span-3 p-4 border-l border-gray-200">النسبة للمهارة</div>
                            <div className="col-span-6 p-4 border-l border-gray-200">المهارة</div>
                            <div className="col-span-3 p-4">القسم</div>
                        </div>

                        {/* Table Body */}
                        {(Object.entries(groupedSkills) as [string, SkillGap[]][]).map(([section, skills], sectionIdx) => (
                            <React.Fragment key={sectionIdx}>
                                {skills.map((skill, skillIdx) => (
                                    <div key={skillIdx} className="grid grid-cols-12 border-b border-gray-100 last:border-0 text-center hover:bg-gray-50 transition-colors">
                                        <div className={`col-span-3 p-4 border-l border-gray-100 font-bold ${
                                            skill.mastery === 0 ? 'text-red-500' : 
                                            skill.mastery < 50 ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                            {skill.mastery}%
                                        </div>
                                        <div className="col-span-6 p-4 border-l border-gray-100 text-gray-600 text-sm font-medium">
                                            {skill.skill}
                                        </div>
                                        {/* Render Section name only for the first skill in the group */}
                                        {skillIdx === 0 && (
                                            <div 
                                                className="col-span-3 p-4 font-bold text-blue-700 flex items-center justify-center bg-white"
                                                style={{ gridRow: `span ${skills.length}` }}
                                            >
                                                {section}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        {quiz.skillsAnalysis.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                لا توجد بيانات تفصيلية لهذا الاختبار.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};