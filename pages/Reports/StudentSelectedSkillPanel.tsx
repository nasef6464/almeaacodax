import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, FileText, Video } from 'lucide-react';
import { displayText, type StudentAggregatedSkill } from './reportDomain';
import type { SkillRecommendation } from './reportTypes';

interface StudentSelectedSkillPanelProps {
    skill: StudentAggregatedSkill;
    recommendation: SkillRecommendation;
    sessionLink: string;
}

export const StudentSelectedSkillPanel: React.FC<StudentSelectedSkillPanelProps> = ({ skill, recommendation, sessionLink }) => (
    <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">مقترحات لهذه المهارة</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 break-words">{displayText(skill.skill)}</h3>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                    اختر من المقترحات التالية ما يناسب وقتك الآن. الأفضل أن تبدأ بالشرح ثم تنتقل للتدريب.
                </p>
                <p className="mt-2 text-xs font-bold text-indigo-600">
                    يمكنك تغيير المقترحات بالضغط على أي مهارة من البطاقات بالأعلى.
                </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
                {recommendation.lessonLink ? (
                    <Link to={recommendation.lessonLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2">
                        <Video size={16} />
                        {recommendation.lessonTopicTitle ? `درس: ${recommendation.lessonTopicTitle}` : 'فيديو أو درس'}
                    </Link>
                ) : (
                    <Link to="/courses" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                        <Video size={16} />
                        استعرض الشروح
                    </Link>
                )}
                {recommendation.quizLink ? (
                    <Link to={recommendation.quizLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-amber-700 border border-amber-100 hover:bg-amber-50 flex items-center gap-2">
                        <FileText size={16} />
                        اختبار علاجي
                    </Link>
                ) : (
                    <Link to="/dashboard?tab=saher" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                        <FileText size={16} />
                        ابحث عن اختبار
                    </Link>
                )}
                {recommendation.resourceUrl ? (
                    <a href={recommendation.resourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                        <BookOpen size={16} />
                        ملف داعم
                    </a>
                ) : null}
                <Link to={sessionLink} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 flex items-center gap-2">
                    <Clock size={16} />
                    حجز حصة
                </Link>
            </div>
        </div>
    </div>
);
