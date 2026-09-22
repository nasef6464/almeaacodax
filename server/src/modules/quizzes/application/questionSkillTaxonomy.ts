import { SkillModel } from "../../../models/Skill.js";

type QuestionSkillScope = {
  pathId?: string | null;
  subject?: string | null;
  sectionId?: string | null;
  skillIds?: string[];
};

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

export const resolveCanonicalQuestionSkillIds = async (input: QuestionSkillScope) => {
  const pathId = String(input.pathId || "").trim();
  const subjectId = String(input.subject || "").trim();
  const sectionId = String(input.sectionId || "").trim();
  const requestedIds = uniqueStrings(input.skillIds || []);

  if (!pathId || !subjectId || !sectionId) {
    return { ok: false as const, message: "Question path, subject and main skill are required." };
  }

  const mainSkill = await SkillModel.findOne({ pathId, subjectId, sectionId })
    .select("id name subSkills")
    .lean();

  if (!mainSkill) {
    return { ok: false as const, message: "The selected main skill does not exist in the current taxonomy." };
  }

  const mainSkillId = String((mainSkill as any).id || (mainSkill as any)._id || "").trim();
  const nestedIds = new Set(
    (Array.isArray((mainSkill as any).subSkills) ? (mainSkill as any).subSkills : [])
      .map((subSkill: any) => String(subSkill?.id || "").trim())
      .filter(Boolean),
  );
  const requestedNestedIds = requestedIds.filter((id) => id !== mainSkillId);
  const missingIds = requestedNestedIds.filter((id) => !nestedIds.has(id));

  if (missingIds.length > 0) {
    return {
      ok: false as const,
      message: `Question references subskills outside the current taxonomy: ${missingIds.join(", ")}`,
    };
  }

  if (nestedIds.size > 0 && requestedNestedIds.length === 0) {
    return {
      ok: false as const,
      message: "Question must be linked to at least one current nested subskill.",
    };
  }

  return {
    ok: true as const,
    skillIds: uniqueStrings([mainSkillId, ...requestedNestedIds]),
  };
};
