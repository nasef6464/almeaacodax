import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SkillGap } from '../types';
import { getInternalLearningPath, type AdaptiveSkillSignal } from '../services/adaptiveLearningPathService';
import { api } from '../services/api';
import { Sparkles, Zap, ArrowLeft, Clock } from 'lucide-react';
import { Card } from './ui/Card';

interface Props {
    skills: SkillGap[];
}

export const SmartLearningPath: React.FC<Props> = ({ skills }) => {
    const localPath = useMemo(() => getInternalLearningPath(skills), [skills]);
    const [serverSignals, setServerSignals] = useState<AdaptiveSkillSignal[] | null>(null);
    const [serverFingerprint, setServerFingerprint] = useState('');

    const scope = useMemo(() => {
        const pathIds = [...new Set(skills.map((skill) => skill.pathId).filter(Boolean))] as string[];
        const subjectIds = [...new Set(skills.map((skill) => skill.subjectId).filter(Boolean))] as string[];
        return pathIds.length === 1
            ? { pathId: pathIds[0], ...(subjectIds.length === 1 ? { subjectId: subjectIds[0] } : {}) }
            : null;
    }, [skills]);

    useEffect(() => {
        let cancelled = false;
        if (!scope?.pathId) {
            setServerSignals(null);
            setServerFingerprint('');
            return () => { cancelled = true; };
        }

        api.getNextBestAction(scope)
            .then((payload) => {
                if (cancelled) return;
                setServerFingerprint(payload.fingerprint || '');
                setServerSignals(
                    (payload.candidates || []).map((candidate) => ({
                        skillId: candidate.skillId,
                        skill: candidate.skill,
                        pathId: candidate.pathId,
                        subjectId: candidate.subjectId,
                        sectionId: candidate.sectionId,
                        mastery: candidate.mastery,
                        status: candidate.mastery >= 80 ? 'strong' : candidate.mastery < 50 ? 'weak' : 'average',
                        evidenceCount: candidate.evidenceCount,
                        trend: candidate.trend,
                    })),
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setServerSignals(null);
                    setServerFingerprint('');
                }
            });

        return () => { cancelled = true; };
    }, [scope?.pathId, scope?.subjectId]);

    const effectivePath = useMemo(
        () => serverSignals && serverSignals.length ? getInternalLearningPath(serverSignals) : localPath,
        [localPath, serverSignals],
    );
    const recommendations = effectivePath.recommendations;
    const fingerprint = serverFingerprint || effectivePath.fingerprint;

    if (recommendations.length === 0) return null;

    return (
        <div className="relative" data-adaptive-fingerprint={fingerprint}>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-purple-200">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">مسار التعلم الذكي</h3>
                    <p className="text-xs text-gray-500">تم اختياره لك بناءً على المهارات التي تحتاج دعمًا</p>
                </div>
            </div>

            <div className="relative border-r-2 border-purple-100 mr-4 space-y-6">
                {recommendations.map((item, index) => (
                    <div key={item.id} className="relative pr-8 animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
                        <div
                            className={`absolute -right-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                item.priority === 'high' ? 'bg-red-500' : 'bg-purple-500'
                            }`}
                        ></div>

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
                                        {item.type === 'lesson' ? 'درس' : item.type === 'quiz' ? 'اختبار' : 'مراجعة'}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={12} /> {item.duration}
                                    </span>
                                </div>
                                {item.priority === 'high' && (
                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                        <Zap size={12} /> أولوية عالية
                                    </span>
                                )}
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
