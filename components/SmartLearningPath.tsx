import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { SkillGap, Topic } from '../types';
import { buildInternalLearningPath } from '../services/learningPathService';
import { Sparkles, Zap, ArrowLeft, BrainCircuit, Clock } from 'lucide-react';
import { Card } from './ui/Card';

interface Props {
    skills: SkillGap[];
    topics?: Topic[];
    scopeLabel?: string;
}

export const SmartLearningPath: React.FC<Props> = ({ skills, topics = [], scopeLabel }) => {
    const recommendations = useMemo(
        () => buildInternalLearningPath(skills, topics),
        [skills, topics],
    );

    if (recommendations.length === 0) {
        return (
            <Card className="border-emerald-100 bg-emerald-50/60 p-5">
                <div className="flex items-start gap-3">
                    <BrainCircuit className="mt-0.5 text-emerald-600" size={22} />
                    <div>
                        <h3 className="font-black text-emerald-900">لا توجد فجوة عاجلة الآن</h3>
                        <p className="mt-1 text-xs font-bold leading-6 text-emerald-700">
                            نفّذ مراجعة خفيفة أو قياسًا دوريًا للحفاظ على المهارات.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="relative">
            <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-2 text-white shadow-lg shadow-purple-200">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">مسار التعلم الذكي</h3>
                    <p className="text-xs text-gray-500">
                        ترتيب داخلي قابل للتفسير حسب الإتقان والدليل والاتجاه{scopeLabel ? ` · ${scopeLabel}` : ''}
                    </p>
                </div>
            </div>

            <div className="relative mr-4 space-y-6 border-r-2 border-purple-100">
                {recommendations.map((item, index) => (
                    <div key={item.id} className="relative pr-8 animate-fade-in" style={{ animationDelay: `${index * 120}ms` }}>
                        <div
                            className={`absolute -right-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                                item.priority === 'high' ? 'bg-red-500' : 'bg-purple-500'
                            }`}
                        />

                        <div className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
                            item.isPrimary ? 'border-purple-200 ring-2 ring-purple-50' : 'border-gray-100'
                        }`}>
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                                            item.type === 'lesson'
                                                ? 'bg-blue-500'
                                                : item.type === 'quiz'
                                                  ? 'bg-amber-500'
                                                  : 'bg-emerald-500'
                                        }`}
                                    >
                                        {item.type === 'lesson' ? 'شرح' : item.type === 'quiz' ? 'قياس/تدريب' : 'مراجعة'}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <Clock size={12} /> {item.duration}
                                    </span>
                                    {item.isPrimary ? (
                                        <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                                            الخطوة التالية الآن
                                        </span>
                                    ) : null}
                                </div>
                                {item.priority === 'high' ? (
                                    <span className="flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                        <Zap size={12} /> أولوية عالية
                                    </span>
                                ) : null}
                            </div>

                            <h4 className="mb-1 text-lg font-bold text-gray-800">{item.title}</h4>
                            <div className="mb-3 rounded-lg bg-purple-50 p-2">
                                <p className="flex items-start gap-2 text-xs text-purple-700">
                                    <BrainCircuit size={12} className="mt-0.5 shrink-0" />
                                    {item.reason}
                                </p>
                            </div>

                            <Link
                                to={item.link || '/reports'}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-5 py-2 text-xs font-black text-white shadow-sm shadow-indigo-100 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                            >
                                {item.actionLabel}
                                <ArrowLeft size={15} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
