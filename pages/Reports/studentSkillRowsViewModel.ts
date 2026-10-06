import { getReportMasteryTone, type StudentAggregatedSkill } from './reportDomain';
import { buildSkillRecommendation, type SkillRecommendationCatalog } from './recommendationViewModel';
import { resolveMasteryLevel, type MasteryLevel } from '../../services/masteryPolicy';
import { buildCanonicalFoundationSkillActions, buildSkillRecheckActionLink } from '../../utils/skillActionLinks';

export interface StudentSkillReportRow extends StudentAggregatedSkill {
    tone: ReturnType<typeof getReportMasteryTone>;
    lessonLink?: string;
    lessonLabel: string;
    quizLink?: string;
    quizLabel: string;
    retestLink: string;
    supportLink?: string;
    evidenceLabel: string;
    masteryLevel: MasteryLevel;
}

export const buildStudentSkillReportRows = (
    focusedReportSkills: StudentAggregatedSkill[],
    catalog: SkillRecommendationCatalog,
    limit?: number,
): StudentSkillReportRow[] =>
    (typeof limit === 'number' ? focusedReportSkills.slice(0, limit) : focusedReportSkills).map((skill) => {
        const recommendation = buildSkillRecommendation(skill, catalog);
        const foundationActions = buildCanonicalFoundationSkillActions({
            pathId: skill.pathId,
            subjectId: skill.subjectId,
            sectionId: skill.sectionId,
            skillId: skill.skillId,
            skillName: skill.skill,
        }, catalog.allSkills, catalog.topics);
        const quizLink = foundationActions.quizLink;
        const retestLink = buildSkillRecheckActionLink({
            pathId: skill.pathId,
            subjectId: skill.subjectId,
            sectionId: skill.sectionId,
            skillId: skill.skillId,
        }) || '/reports';

        return {
            ...skill,
            tone: getReportMasteryTone(skill.mastery),
            lessonLink: foundationActions.lessonLink,
            lessonLabel: recommendation.lessonTopicTitle || recommendation.lessonTitle || 'شرح',
            quizLink,
            quizLabel: recommendation.quizTitle || 'تدريب',
            retestLink,
            supportLink: foundationActions.supportLink,
            masteryLevel: resolveMasteryLevel(skill.mastery, skill.totalEvidence || skill.attempts),
            evidenceLabel: skill.isReliable
                ? [
                    `${skill.correctAttempts}/${skill.totalEvidence} صحيح`,
                    typeof skill.recentMastery === 'number' ? `آخر 5: ${skill.recentMastery}%` : '',
                    skill.trend === 'improving' ? 'الاتجاه يتحسن' : skill.trend === 'declining' ? 'الاتجاه يتراجع' : 'الاتجاه مستقر',
                ].filter(Boolean).join(' · ')
                : `قراءة أولية ${skill.correctAttempts}/${skill.totalEvidence} — تحتاج قياسًا إضافيًا`,
        };
    });
