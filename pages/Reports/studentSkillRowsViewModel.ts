import { getReportMasteryTone, type StudentAggregatedSkill } from './reportDomain';
import { buildSkillRecommendation, type SkillRecommendationCatalog } from './recommendationViewModel';
import { resolveMasteryLevel, type MasteryLevel } from '../../services/masteryPolicy';
import { buildSkillRecheckActionLink } from '../../utils/skillActionLinks';

export interface StudentSkillReportRow extends StudentAggregatedSkill {
    tone: ReturnType<typeof getReportMasteryTone>;
    lessonLink: string;
    lessonLabel: string;
    quizLink: string;
    quizLabel: string;
    retestLink: string;
    evidenceLabel: string;
    masteryLevel: MasteryLevel;
}

export const buildStudentSkillReportRows = (
    focusedReportSkills: StudentAggregatedSkill[],
    catalog: SkillRecommendationCatalog,
    limit = 5,
): StudentSkillReportRow[] =>
    focusedReportSkills.slice(0, limit).map((skill) => {
        const recommendation = buildSkillRecommendation(skill, catalog);
        const quizLink = recommendation.quizLink
            || (skill.skillId ? `/quiz?skillIds=${encodeURIComponent(skill.skillId)}` : '/dashboard?tab=saher');
        const retestLink = buildSkillRecheckActionLink({
            pathId: skill.pathId,
            subjectId: skill.subjectId,
            sectionId: skill.sectionId,
            skillId: skill.skillId,
        }) || quizLink;

        return {
            ...skill,
            tone: getReportMasteryTone(skill.mastery),
            lessonLink: recommendation.lessonLink || recommendation.foundationTopicLink || '/courses',
            lessonLabel: recommendation.lessonTopicTitle || recommendation.lessonTitle || 'شرح',
            quizLink,
            quizLabel: recommendation.quizTitle || 'تدريب',
            retestLink,
            masteryLevel: resolveMasteryLevel(skill.mastery, skill.totalEvidence || skill.attempts),
            evidenceLabel: skill.isReliable
                ? `${skill.correctAttempts}/${skill.totalEvidence} صحيح`
                : `قراءة أولية ${skill.correctAttempts}/${skill.totalEvidence}`,
        };
    });
