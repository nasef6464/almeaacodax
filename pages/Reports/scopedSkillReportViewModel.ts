import type { ScopedAnalyticsOverview } from './reportDomain';
import {
    buildSkillRecommendation,
    type SkillRecommendationCatalog,
} from './recommendationViewModel';

type ScopedWeakSkill = ScopedAnalyticsOverview['weakestSkills'][number];

export interface ScopedSkillReportCard extends ScopedWeakSkill {
    tone: {
        label: string;
        card: string;
        text: string;
        bar: string;
    };
    lessonLink?: string;
    lessonTitle?: string;
    quizLink?: string;
    quizTitle?: string;
}

export const buildScopedSkillReportCards = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
    catalog: SkillRecommendationCatalog,
): ScopedSkillReportCard[] =>
    (scopedAnalytics?.weakestSkills || []).slice(0, 4).map((skill) => {
        const tone = skill.mastery < 50
            ? {
                label: 'دعم عاجل',
                card: 'border-rose-100 bg-rose-50/70',
                text: 'text-rose-700',
                bar: 'bg-rose-500',
            }
            : {
                label: 'دعم قريب',
                card: 'border-amber-100 bg-amber-50/70',
                text: 'text-amber-700',
                bar: 'bg-amber-500',
            };
        const recommendation = buildSkillRecommendation(skill, catalog);

        return {
            ...skill,
            tone,
            lessonLink: recommendation.lessonLink,
            lessonTitle: recommendation.lessonTopicTitle || recommendation.lessonTitle,
            quizLink: recommendation.quizLink,
            quizTitle: recommendation.quizTitle,
        };
    });
