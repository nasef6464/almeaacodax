import type { Skill } from '../../types';
import {
    buildDirectedQuizManagerLink,
    displayText,
    type ScopedAnalyticsOverview,
} from './reportDomain';

type ScopedStudent = ScopedAnalyticsOverview['weakestStudents'][number];

export interface ScopedStudentFocusCard extends ScopedStudent {
    topSkills: NonNullable<ScopedStudent['weakestSkills']>;
    followUpLink: string;
    tone: string;
}

export const buildScopedStudentFocusCards = (
    scopedFilteredStudents: ScopedStudent[],
    skills: Skill[],
): ScopedStudentFocusCard[] =>
    scopedFilteredStudents.slice(0, 4).map((student) => {
        const topSkills = (student.weakestSkills || []).slice(0, 2);
        const primarySkillName = topSkills[0]?.skill;
        const resolvedSkill = primarySkillName
            ? skills.find((skill) => displayText(skill.name) === displayText(primarySkillName))
            : undefined;

        return {
            ...student,
            topSkills,
            followUpLink: buildDirectedQuizManagerLink({
                pathId: resolvedSkill?.pathId,
                subjectId: resolvedSkill?.subjectId,
                sectionId: resolvedSkill?.sectionId,
                skillId: resolvedSkill?.id,
                targetUserId: student.id,
                targetGroupId: student.groupIds?.[0],
            }),
            tone: student.averageScore < 50
                ? 'border-rose-100 bg-rose-50/70 text-rose-700'
                : 'border-amber-100 bg-amber-50/70 text-amber-700',
        };
    });
