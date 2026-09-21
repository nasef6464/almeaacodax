import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SkillGap } from '../types';
import { buildSmartLearningPath } from '../services/smartLearningPath';
import { Sparkles, Zap, ArrowLeft, Clock } from 'lucide-react';

interface Props {
    skills: SkillGap[];
}

export const SmartLearningPath: React.FC<Props> = ({ skills }) => {
    const smartPath = useMemo(() => buildSmartLearningPath(skills), [skills]);
    const recommendations = smartPath.recommendations;

    if (recommendations.length === 0) return null;

    return (
        <div className="relative" data-smart-path-version={smartPath.version} data-smart-path-fingerprint={smartPath.fingerprint}>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-purple-200">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">مسار التعلم الذكي</h3>
                    <p className="text-xs text-gray-500">اختيار داخلي مبني على الإتقان والأدلة والنطاق الحالي، بدون استدعاء AI</p>
                </div>
            </div>

            <div className="relative border-r-2 border-purple-100 mr-4 space-y-6">
                {recommendations.map((item, index) => (
                    <div key={item.id} className="relative pr-8 animate-fade-in" style={{ animationDelay: `${index * 120}ms` }}>
                        <div
                            className={`absolute -right-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-purple-500' : 'bg-emerald-500'
                            }`}
                        />

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                                            item.type === 'lesson'
                                                ? 'bg-blue-500'
                                                : item.type === 'quiz'
                                                  ? 'bg-amber-500'
                                                  : 'bg-emerald-500'
                                        }`}
                                    >
                                        {item.type === 'lesson' ? 'شرح' : item.type === 'quiz' ? 'قياس/تدريب' : 'مراجعة'}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={12} /> {item.duration}
                                    </span>
                                </div>
                                {item.priority === 'high' ? (
                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                        <Zap size={12} /> أولوية
                                    </span>
                                ) : null}
                            </div>

                            <h4 className="font-bold text-gray-800 text-lg mb-1">{item.title}</h4>

                            <div className="bg-purple-50 p-2 rounded-lg mb-3">
                                <p className="text-xs text-purple-700 flex items-start gap-2">
                                    <Sparkles size={12} className="mt-0.5 shrink-0" />
                                    {item.reason}
                                </p>
                            </div>

                            <div className="flex justify-start">
                                <Link
                                    to={item.link || '/dashboard'}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-5 py-2 text-xs sm:text-sm font-black text-white shadow-sm shadow-indigo-100 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                >
                                    <span className="h-2 w-2 rounded-full bg-white/80 animate-pulse" />
                                    {item.actionLabel}
                                    <ArrowLeft size={15} />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
