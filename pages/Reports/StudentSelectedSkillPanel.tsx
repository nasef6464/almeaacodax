import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, FileText, RefreshCw, Video } from 'lucide-react';
import { buildSkillRecheckActionLink } from '../../utils/skillActionLinks';
import { displayText, type StudentAggregatedSkill } from './reportDomain';
import type { SkillRecommendation } from './reportTypes';

interface StudentSelectedSkillPanelProps {
    skill: StudentAggregatedSkill;
    recommendation: SkillRecommendation;
    sessionLink: string;
}

const UnavailableAction = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-400 border border-dashed border-slate-200 flex items-center gap-2">
        {icon}
        {label}
    </div>
);

export const StudentSelectedSkillPanel: React.FC<StudentSelectedSkillPanelProps> = ({ skill, recommendation, sessionLink }) => {
    const recheckLink = buildSkillRecheckActionLink({
        pathId: skill.pathId,
        subjectId: skill.subjectId,
        sectionId: skill.sectionId,
        skillId: skill.skillId,
        returnTo: '/reports',
    });

    return (
        <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">علاج نفس المهارة من التأسيس</span>
                        {skill.parentSkill ? (
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                                {displayText(skill.parentSkill)}
                            </span>
                        ) : null}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 break-words">{displayText(skill.skill)}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                        ابدأ بالشرح أو الفيديو من موضوع التأسيس المرتبط، ثم نفّذ تدريب نفس المهارة، وبعدها أعد القياس.
                    </p>
                    <p className="mt-2 text-xs font-bold text-indigo-600">
                        لا يتم فتح محتوى عام أو مهارة أخرى بدل هذه المهارة إذا كان الربط غير مكتمل.
                    </p>
                </div>

                <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
                    {recommendation.lessonLink ? (
                        <Link to={recommendation.lessonLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2">
                            <Video size={16} />
                            {recommendation.lessonTopicTitle ? `شرح/فيديو: ${recommendation.lessonTopicTitle}` : 'شرح/فيديو التأسيس'}
                        </Link>
                    ) : (
                        <UnavailableAction icon={<Video size={16} />} label="الشرح غير مرتبط بالتأسيس بعد" />
                    )}

                    {recommendation.quizLink ? (
                        <Link to={recommendation.quizLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-amber-700 border border-amber-100 hover:bg-amber-50 flex items-center gap-2">
                            <FileText size={16} />
                            تدريب المهارة في التأسيس
                        </Link>
                    ) : (
                        <UnavailableAction icon={<FileText size={16} />} label="تدريب التأسيس غير مرتبط بعد" />
                    )}

                    {recommendation.supportLink ? (
                        <Link to={recommendation.supportLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                            <BookOpen size={16} />
                            {recommendation.resourceTitle ? `ملف الدعم: ${recommendation.resourceTitle}` : 'ملف الدعم'}
                        </Link>
                    ) : (
                        <UnavailableAction icon={<BookOpen size={16} />} label="ملف الدعم غير مرتبط بعد" />
                    )}

                    {recheckLink ? (
                        <Link to={recheckLink} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 flex items-center gap-2">
                            <RefreshCw size={16} />
                            إعادة قياس المهارة
                        </Link>
                    ) : (
                        <UnavailableAction icon={<RefreshCw size={16} />} label="إعادة القياس غير متاحة" />
                    )}

                    <Link to={sessionLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 border border-indigo-200 hover:bg-indigo-50 flex items-center gap-2 sm:col-span-2">
                        <Clock size={16} />
                        دعم إضافي / حجز حصة عند استمرار الضعف
                    </Link>
                </div>
            </div>
        </div>
    );
};
