import { displayText, type StudentAggregatedSkill } from './reportDomain';
import {
    buildSkillRecommendation,
    type SkillRecommendationCatalog,
} from './recommendationViewModel';

export interface StudentWeeklyPlanItem {
    day: string;
    skillId?: string;
    skill: string;
    subjectName: string;
    sectionName: string;
    mastery: number;
    attempts: number;
    isReliable: boolean;
    lessonTitle?: string;
    lessonLink?: string;
    lessonTopicTitle?: string;
    foundationTopicLink?: string;
    quizTitle?: string;
    quizLink?: string;
    actionText: string;
}

const dayLabels = ['اليوم 1', 'اليوم 2', 'اليوم 3'] as const;

export const buildStudentWeeklyPlan = (
    focusedReportSkills: StudentAggregatedSkill[],
    catalog: SkillRecommendationCatalog,
): StudentWeeklyPlanItem[] =>
    focusedReportSkills.slice(0, 3).map((skill, index) => {
        const recommendation = buildSkillRecommendation(skill, catalog);

        return {
            day: dayLabels[index],
            skillId: skill.skillId,
            skill: displayText(skill.skill),
            subjectName: displayText(skill.subjectName),
            sectionName: displayText(skill.sectionName),
            mastery: skill.mastery,
            attempts: skill.attempts,
            isReliable: skill.isReliable,
            lessonTitle: recommendation.lessonTitle,
            lessonLink: recommendation.lessonLink,
            lessonTopicTitle: recommendation.lessonTopicTitle,
            foundationTopicLink: recommendation.foundationTopicLink,
            quizTitle: recommendation.quizTitle,
            quizLink: recommendation.quizLink,
            actionText:
                recommendation.actionText ||
                (skill.mastery < 50
                    ? 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'
                    : 'حل تدريبًا قصيرًا للتأكد من ثبات المستوى.'),
        };
    });
