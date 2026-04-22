import React from 'react';
import { X, Sparkles, Target, TrendingUp } from 'lucide-react';

interface Skill {
    name: string;
    percentage: number;
    color: string;
}

interface DetailedAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    skills?: Skill[];
    mode?: 'test' | 'bank';
}

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({ isOpen, onClose, skills, mode = 'test' }) => {
    if (!isOpen) return null;

    const defaultSkills: Skill[] = [
        { name: 'الهندسة', percentage: 85, color: 'bg-blue-500' },
        { name: 'الجبر', percentage: 70, color: 'bg-purple-500' },
        { name: 'الحساب', percentage: 92, color: 'bg-emerald-500' },
        { name: 'المنطق', percentage: 65, color: 'bg-amber-500' },
    ];

    const displaySkills = skills || defaultSkills;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-scale-up overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">التحليل التفصيلي للمهارات</h2>
                            <p className="text-indigo-100 text-xs">بناءً على أدائك في هذا {mode === 'bank' ? 'البنك' : 'الاختبار'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <div className="grid gap-6">
                        {displaySkills.map((skill, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-700">{skill.name}</span>
                                    <span className={`font-black ${
                                        skill.percentage >= 80 ? 'text-emerald-600' : 
                                        skill.percentage >= 60 ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                        {skill.percentage}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${skill.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${skill.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Recommendation */}
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 flex gap-4">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-purple-900 mb-1">توصية الذكاء الاصطناعي 🤖</h4>
                            <p className="text-sm text-purple-700 leading-relaxed">
                                مستواك في "الهندسة" ممتاز جداً! ننصحك بالتركيز أكثر على "المنطق" و "الجبر" لرفع درجتك الكلية. يمكنك البدء بحل بنك أسئلة الجبر المكثف.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        فهمت، شكراً لك
                    </button>
                </div>
            </div>
        </div>
    );
};
