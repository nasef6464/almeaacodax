import { SkillModel } from "../../../models/Skill.js";
import { TopicModel } from "../../../models/Topic.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";

type FoundationTopicCandidate = {
  pathId?: string | null;
  subjectId?: string | null;
  sectionId?: string | null;
  parentId?: string | null;
  skillId?: string | null;
};

type FoundationTopicSkillValidation =
  | {
      ok: true;
      normalized: {
        pathId: string;
        subjectId: string;
        sectionId: string;
        skillId: string;
      };
      parentSkillId: string;
    }
  | {
      ok: false;
      status: 400 | 409;
      message: string;
    };

const stringId = (value: unknown) => String(value ?? "").trim();

export async function validateFoundationSubtopicSkillLink(
  candidate: FoundationTopicCandidate,
  currentTopicMongoId?: unknown,
): Promise<FoundationTopicSkillValidation> {
  const parentId = stringId(candidate.parentId);
  if (!parentId) {
    return {
      ok: true,
      normalized: {
        pathId: stringId(candidate.pathId),
        subjectId: stringId(candidate.subjectId),
        sectionId: stringId(candidate.sectionId),
        skillId: stringId(candidate.skillId),
      },
      parentSkillId: "",
    };
  }

  const pathId = stringId(candidate.pathId);
  const subjectId = stringId(candidate.subjectId);
  const skillId = stringId(candidate.skillId);

  if (!skillId) {
    return {
      ok: false,
      status: 400,
      message: "Foundation subtopic must be linked to one subskill",
    };
  }

  const parentTopic = await TopicModel.findOne(buildDocumentQuery(parentId))
    .select("_id id pathId subjectId sectionId skillId parentId title")
    .lean();

  if (!parentTopic || stringId((parentTopic as any).parentId)) {
    return {
      ok: false,
      status: 400,
      message: "Foundation subtopic must belong to a valid main Foundation topic",
    };
  }

  const skillDocument = await SkillModel.findOne({
    pathId,
    subjectId,
    "subSkills.id": skillId,
  })
    .select("_id id pathId subjectId sectionId name subSkills")
    .lean();

  if (!skillDocument) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskill does not belong to this path and subject",
    };
  }

  const parentSkillId = stringId((skillDocument as any).id || (skillDocument as any)._id);
  const canonicalSectionId = stringId((skillDocument as any).sectionId);
  const parentTopicSkillId = stringId((parentTopic as any).skillId);
  const parentTopicSectionId = stringId((parentTopic as any).sectionId);

  if (
    (parentTopicSkillId && parentTopicSkillId !== parentSkillId) ||
    (parentTopicSectionId && canonicalSectionId && parentTopicSectionId !== canonicalSectionId)
  ) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskill belongs to a different main Foundation topic",
    };
  }

  const duplicateFilter: Record<string, unknown> = {
    pathId,
    subjectId,
    parentId: { $ne: null },
    skillId,
  };
  if (currentTopicMongoId) {
    duplicateFilter._id = { $ne: currentTopicMongoId };
  }

  const duplicate = await TopicModel.findOne(duplicateFilter)
    .select("_id id title")
    .lean();

  if (duplicate) {
    return {
      ok: false,
      status: 409,
      message: `Subskill is already linked to Foundation topic: ${stringId((duplicate as any).title) || stringId((duplicate as any).id || (duplicate as any)._id)}`,
    };
  }

  return {
    ok: true,
    normalized: {
      pathId,
      subjectId,
      sectionId: canonicalSectionId,
      skillId,
    },
    parentSkillId,
  };
}
