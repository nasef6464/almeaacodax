import { SkillModel } from "../../../models/Skill.js";
import { TopicModel } from "../../../models/Topic.js";
import { LessonModel } from "../../../models/Lesson.js";
import { QuizModel } from "../../../models/Quiz.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { buildDocumentQuery, buildDocumentsByIdsQuery } from "../infrastructure/contentDocumentQuery.js";

type FoundationTopicCandidate = {
  pathId?: string | null;
  subjectId?: string | null;
  sectionId?: string | null;
  parentId?: string | null;
  skillId?: string | null;
  skillIds?: string[] | null;
};

type FoundationTopicSkillValidation =
  | {
      ok: true;
      normalized: {
        pathId: string;
        subjectId: string;
        sectionId: string;
        skillId: string;
        skillIds: string[];
      };
      parentSkillId: string;
    }
  | {
      ok: false;
      status: 400;
      message: string;
    };

const stringId = (value: unknown) => String(value ?? "").trim();
const normalizeIds = (values: unknown) =>
  [...new Set((Array.isArray(values) ? values : []).map((value) => stringId(value)).filter(Boolean))];

export async function validateFoundationSubtopicSkillLink(
  candidate: FoundationTopicCandidate,
  _currentTopicMongoId?: unknown,
): Promise<FoundationTopicSkillValidation> {
  const parentId = stringId(candidate.parentId);
  const requestedSkillIds = normalizeIds([
    ...(candidate.skillIds || []),
    candidate.skillId,
  ]);

  if (!parentId) {
    return {
      ok: true,
      normalized: {
        pathId: stringId(candidate.pathId),
        subjectId: stringId(candidate.subjectId),
        sectionId: stringId(candidate.sectionId),
        skillId: stringId(candidate.skillId),
        skillIds: requestedSkillIds,
      },
      parentSkillId: "",
    };
  }

  const pathId = stringId(candidate.pathId);
  const subjectId = stringId(candidate.subjectId);
  const requestedSectionId = stringId(candidate.sectionId);

  if (requestedSkillIds.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Foundation subtopic must be linked to at least one subskill",
    };
  }

  const parentTopic = await TopicModel.findOne(buildDocumentQuery(parentId))
    .select("_id id pathId subjectId sectionId skillId skillIds parentId title")
    .lean();

  if (!parentTopic || stringId((parentTopic as any).parentId)) {
    return {
      ok: false,
      status: 400,
      message: "Foundation subtopic must belong to a valid main Foundation topic",
    };
  }

  const parentTopicPathId = stringId((parentTopic as any).pathId);
  const parentTopicSubjectId = stringId((parentTopic as any).subjectId);
  if (
    (parentTopicPathId && parentTopicPathId !== pathId) ||
    (parentTopicSubjectId && parentTopicSubjectId !== subjectId)
  ) {
    return {
      ok: false,
      status: 400,
      message: "Foundation subtopic scope must match its parent topic path and subject",
    };
  }

  const skillDocuments = await SkillModel.find({
    pathId,
    subjectId,
    "subSkills.id": { $in: requestedSkillIds },
  })
    .select("_id id pathId subjectId sectionId name subSkills")
    .lean();

  const matched = new Map<string, { parentSkillId: string; sectionId: string }>();
  for (const document of skillDocuments as any[]) {
    const parentSkillId = stringId(document.id || document._id);
    const sectionId = stringId(document.sectionId);
    for (const subSkill of document.subSkills || []) {
      const subSkillId = stringId(subSkill?.id);
      if (requestedSkillIds.includes(subSkillId)) {
        matched.set(subSkillId, { parentSkillId, sectionId });
      }
    }
  }

  const missingSkillIds = requestedSkillIds.filter((skillId) => !matched.has(skillId));
  if (missingSkillIds.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "One or more selected subskills do not belong to this path and subject",
    };
  }

  const parentSkillIds = [...new Set(requestedSkillIds.map((skillId) => matched.get(skillId)!.parentSkillId))];
  const sectionIds = [...new Set(requestedSkillIds.map((skillId) => matched.get(skillId)!.sectionId).filter(Boolean))];

  if (parentSkillIds.length !== 1) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskills must belong to the same main Foundation skill",
    };
  }

  if (sectionIds.length > 1) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskills must belong to the same section",
    };
  }

  const parentSkillId = parentSkillIds[0];
  const canonicalSectionId = sectionIds[0] || requestedSectionId;
  const parentTopicSkillId = stringId((parentTopic as any).skillId);
  const parentTopicSectionId = stringId((parentTopic as any).sectionId);

  if (requestedSectionId && canonicalSectionId && requestedSectionId !== canonicalSectionId) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskills belong to a different section",
    };
  }

  if (
    (parentTopicSkillId && parentTopicSkillId !== parentSkillId) ||
    (parentTopicSectionId && canonicalSectionId && parentTopicSectionId !== canonicalSectionId)
  ) {
    return {
      ok: false,
      status: 400,
      message: "Selected subskills belong to a different main Foundation topic",
    };
  }

  return {
    ok: true,
    normalized: {
      pathId,
      subjectId,
      sectionId: canonicalSectionId,
      skillId: requestedSkillIds[0],
      skillIds: requestedSkillIds,
    },
    parentSkillId,
  };
}

type FoundationTopicResourceLink = {
  parentId?: string | null;
  skillId?: string | null;
  skillIds?: string[] | null;
  lessonIds?: string[];
  quizIds?: string[];
  libraryItemIds?: string[];
};

export async function syncFoundationTopicResourcesToSkill(
  topic: FoundationTopicResourceLink,
  previousSkillIds?: unknown,
) {
  const previous = normalizeIds(previousSkillIds);
  const next = stringId(topic.parentId)
    ? normalizeIds([...(topic.skillIds || []), topic.skillId])
    : [];

  if (previous.length === 0 && next.length === 0) return;

  const removed = previous.filter((skillId) => !next.includes(skillId));
  const lessonIds = normalizeIds(topic.lessonIds);
  const quizIds = normalizeIds(topic.quizIds);
  const libraryItemIds = normalizeIds(topic.libraryItemIds);

  const syncCollection = async (
    model: any,
    query: Record<string, unknown>,
  ) => {
    if (removed.length > 0) {
      await model.updateMany(query, { $pull: { skillIds: { $in: removed } } } as any);
    }
    if (next.length > 0) {
      await model.updateMany(query, { $addToSet: { skillIds: { $each: next } } } as any);
    }
  };

  await Promise.all([
    lessonIds.length
      ? syncCollection(LessonModel, buildDocumentsByIdsQuery(lessonIds))
      : Promise.resolve(),
    quizIds.length
      ? syncCollection(QuizModel, { $or: [{ id: { $in: quizIds } }, { _id: { $in: quizIds } }] })
      : Promise.resolve(),
    libraryItemIds.length
      ? syncCollection(LibraryItemModel, buildDocumentsByIdsQuery(libraryItemIds))
      : Promise.resolve(),
  ]);
}
