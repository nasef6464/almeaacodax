import type { Skill } from '../../types';

export type StudentSkillTaxonomyEntry = {
    id: string;
    name: string;
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    level: 'main' | 'sub';
    parentSkillId?: string;
};

export const buildStudentSkillTaxonomyIndex = (
    skills: Skill[],
): Map<string, StudentSkillTaxonomyEntry> => {
    const index = new Map<string, StudentSkillTaxonomyEntry>();

    skills.forEach((mainSkill) => {
        index.set(mainSkill.id, {
            id: mainSkill.id,
            name: mainSkill.name,
            pathId: mainSkill.pathId,
            subjectId: mainSkill.subjectId,
            sectionId: mainSkill.sectionId,
            level: 'main',
        });

        (mainSkill.subSkills || []).forEach((subSkill) => {
            index.set(subSkill.id, {
                id: subSkill.id,
                name: subSkill.name,
                pathId: mainSkill.pathId,
                subjectId: mainSkill.subjectId,
                sectionId: mainSkill.sectionId,
                level: 'sub',
                parentSkillId: mainSkill.id,
            });
        });
    });

    return index;
};
