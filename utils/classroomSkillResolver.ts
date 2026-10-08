import type { Skill, NestedSkill, CategorySubject } from '../types';

/**
 * Resolves technical skill IDs (e.g. "p_1777779639431", "subject:رياضيات", etc.)
 * into clear, user-friendly Arabic titles using platform taxonomy definitions.
 */
export function resolveClassroomSkillName(
  skillId: string | undefined | null,
  skills: Skill[] = [],
  nestedSkills: NestedSkill[] = [],
  subjects: CategorySubject[] = []
): string {
  if (!skillId) return '';
  const trimmed = String(skillId).trim();
  if (!trimmed) return '';

  // 1. Check if prefixed with "subject:"
  if (trimmed.startsWith('subject:')) {
    const rawSubject = trimmed.slice('subject:'.length);
    const matchedSubj = subjects.find((s) => s.id === rawSubject || s.name === rawSubject);
    return matchedSubj?.name || rawSubject;
  }

  // 2. Direct match in main skills list
  const directSkill = skills.find((s) => s.id === trimmed);
  if (directSkill?.name) return directSkill.name;

  // 3. Search in subSkills of main skills
  for (const skill of skills) {
    if (Array.isArray(skill.subSkills)) {
      const matchedSub = skill.subSkills.find((sub) => sub.id === trimmed);
      if (matchedSub?.name) return matchedSub.name;
    }
  }

  // 4. Direct match in nestedSkills
  const directNested = nestedSkills.find((ns) => ns.id === trimmed);
  if (directNested?.name) return directNested.name;

  // 5. Search in subSkills of nestedSkills
  for (const nested of nestedSkills) {
    if (Array.isArray(nested.subSkills)) {
      const matchedNestedSub = nested.subSkills.find((sub) => sub.id === trimmed);
      if (matchedNestedSub?.name) return matchedNestedSub.name;
    }
  }

  // 6. Direct match in subjects
  const matchedSubject = subjects.find((s) => s.id === trimmed);
  if (matchedSubject?.name) return matchedSubject.name;

  // 7. Fallback: clean up common technical prefixes
  return trimmed;
}
