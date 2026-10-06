import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SkillGap, type Skill, type Topic } from '../types';
import { getInternalLearningPath, type AdaptiveSkillSignal } from '../services/adaptiveLearningPathService';
import { useStore } from '../store/useStore';
import { resolveFoundationSkillTarget } from '../utils/foundationSkillTarget';
import { api } from '../services/api';
import { Sparkles, Zap, ArrowLeft, Clock } from 'lucide-react';
import { Card } from './ui/Card';

interface Props {
    skills: SkillGap[];
}

const enrichSignalsWithFoundationTarget = (
    signals: AdaptiveSkillSignal[],
    skillCatalog: Skill[],
    topics: Topic[],
): AdaptiveSkillSignal[] =>
    signals.map((signal) => {
        const target = resolveFoundationSkillTarget({
            skillId: signal.skillId,
            skillName: signal.skill,
            pathId: signal.pathId,
            subjectId: signal.subjectId,
            sectionId: signal.sectionId,
        }, skillCatalog, topics);
        return {
            ...signal,
            pathId: target.pathId || signal.pathId,
            subjectId: target.subjectId || signal.subjectId,
            sectionId: target.sectionId || signal.sectionId,
            topicId: target.topicId,
        };
    });

export const SmartLearningPath: React.FC<Props> = ({ skills }) => {
    const skillCatalog = useStore((state) => state.skills);
    const topics = useStore((state) => state.topics);
    const localSignals = useMemo(
        () => enrichSignalsWithFoundationTarget(skills, skillCatalog, topics),
        [skillCatalog, skills, topics],
    );
    const localPath = useMemo(() => getInternalLearningPath(localSignals), [localSignals]);
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
    }, [scope?.pathId, scope?.subjectId, localPath.fingerprint]);

    const effectivePath = useMemo(
        () => serverSignals && serverSignals.length
            ? getInternalLearningPath(enrichSignalsWithFoundationTarget(serverSignals, skillCatalog, topics))
            : localPath,
        [localPath, serverSignals, skillCatalog, topics],
    );
    const recommendations = effectivePath.recommendations;
    const fingerprint = serverFingerprint || effectivePath.fingerprint;

    if (recommendations.length === 0) return null;

    const current = recommendations[0];
    const nextItems = recommendations.slice(1, 4);

    return (
        <Card
            className="overflow-hidden border border-emerald-100 bg-white shadow-sm"
            data-adaptive-fingerprint={fingerprint}
            data-testid="student-smart-path"
        >
            <div className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-white p-4 sm:p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-gray-900">المسار الذكي</h3>
                        <p className="text-xs font-bold text-gray-500">خطوة واضحة، ثم نحدّث المسار تلقائيًا.</p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-emerald-700">
                        <span className="rounded-full bg-white px-2.5 py-1">خطوتك الآن</span>
                        <span className="inline-flex items-center gap-1 text-gray-500">
                            <Clock size={12} /> {current.duration}
                        </span>
                    </div>
                    <h4 className="mt-3 text-base font-black text-gray-900">{current.title}</h4>
                    <p className="mt-1 text-xs sm:text-sm font-bold leading-6 text-gray-500">{current.reason}</p>
                    {current.link ? (
                        <Link
                            to={current.link}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                        >
                            {current.actionLabel || 'ابدأ الآن'}
                            <ArrowLeft size={15} />
                        </Link>
                    ) : null}
                </div>

                {nextItems.length ? (
                    <div className="mt-4">
                        <p className="mb-2 text-xs font-black text-gray-500">بعدها</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {nextItems.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.link || '#'}
                                    className="rounded-2xl border border-gray-100 bg-gray-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs font-black text-gray-800">{item.title}</span>
                                        <Zap size={13} className="shrink-0 text-amber-500" />
                                    </div>
                                    <p className="mt-1 text-[11px] font-bold text-gray-400">{item.duration}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </Card>
    );
};
