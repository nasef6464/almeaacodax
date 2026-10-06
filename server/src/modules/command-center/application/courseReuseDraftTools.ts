import mongoose from "mongoose";
import { z } from "zod";
import { LessonModel } from "../../../models/Lesson.js";
import { QuizModel } from "../../../models/Quiz.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { SkillModel } from "../../../models/Skill.js";

export const courseInventoryQuerySchema = z.object({
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().optional(),
  includeHidden: z.coerce.boolean().optional().default(false),
});

const courseLessonRefSchema = z.object({
  lessonId: z.string().trim().min(1),
  trainingQuizIds: z.array(z.string().trim().min(1)).max(10).optional().default([]),
  order: z.number().int().nonnegative(),
});

const courseModuleDraftSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  order: z.number().int().nonnegative(),
  lessons: z.array(courseLessonRefSchema).min(1).max(100),
  assessmentQuizIds: z.array(z.string().trim().min(1)).max(20).optional().default([]),
});

export const courseReuseDraftSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().optional().default(""),
  instructor: z.string().trim().min(1).default("فريق المنصة"),
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().optional().default(""),
  modules: z.array(courseModuleDraftSchema).min(1).max(100),
  finalQuizIds: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  libraryItemIds: z.array(z.string().trim().min(1)).max(100).optional().default([]),
  skillIds: z.array(z.string().trim().min(1)).max(200).optional().default([]),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const idQuery = (ids: string[]) => {
  const normalized = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  const objectIds = normalized.filter((id) => mongoose.Types.ObjectId.isValid(id));
  return {
    $or: [
      { id: { $in: normalized } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

export async function getReusableCourseInventory(
  input: z.infer<typeof courseInventoryQuerySchema>,
) {
  const scope = {
    pathId: input.pathId,
    subjectId: input.subjectId,
    ...(input.sectionId ? { sectionId: input.sectionId } : {}),
    ...(input.includeHidden ? {} : { showOnPlatform: { $ne: false } }),
  };

  const [lessons, quizzes, libraryItems, skills] = await Promise.all([
    LessonModel.find(scope)
      .select("id title description type duration videoUrl videoSource fileUrl quizId order skillIds approvalStatus showOnPlatform")
      .sort({ sectionId: 1, order: 1, createdAt: 1 })
      .lean(),
    QuizModel.find(scope)
      .select("id title description quizKind placement questionIds skillIds approvalStatus isPublished showOnPlatform settings")
      .sort({ createdAt: 1 })
      .lean(),
    LibraryItemModel.find(scope)
      .select("id title type url size skillIds approvalStatus showOnPlatform")
      .sort({ createdAt: 1 })
      .lean(),
    SkillModel.find({
      pathId: input.pathId,
      subjectId: input.subjectId,
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
    })
      .select("id name order subSkills")
      .sort({ order: 1 })
      .lean(),
  ]);

  return {
    policy: {
      strategy: "reuse_first",
      generateOnlyWhenMissing: true,
      sourceOfTruth: "existing_platform_content",
    },
    counts: {
      lessons: lessons.length,
      videoLessons: lessons.filter((lesson) => lesson.type === "video" || Boolean(lesson.videoUrl)).length,
      quizzes: quizzes.length,
      libraryItems: libraryItems.length,
      skills: skills.length,
    },
    lessons,
    quizzes,
    libraryItems,
    skills,
  };
}

export async function validateCourseReuseDraft(
  input: z.infer<typeof courseReuseDraftSchema>,
) {
  const lessonIds = [
    ...new Set(input.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))),
  ];
  const quizIds = [
    ...new Set([
      ...input.finalQuizIds,
      ...input.modules.flatMap((module) => [
        ...module.assessmentQuizIds,
        ...module.lessons.flatMap((lesson) => lesson.trainingQuizIds),
      ]),
    ]),
  ];
  const libraryIds = [...new Set(input.libraryItemIds)];

  const [lessons, quizzes, libraryItems, mainSkills] = await Promise.all([
    lessonIds.length
      ? LessonModel.find(idQuery(lessonIds))
          .select("id title description pathId subjectId sectionId skillIds approvalStatus showOnPlatform type duration content videoUrl videoSource interactiveQuestions fileUrl meetingUrl meetingDate recordingUrl joinInstructions showRecordingOnPlatform quizId isLocked")
          .lean()
      : [],
    quizIds.length
      ? QuizModel.find(idQuery(quizIds))
          .select("id title description pathId subjectId sectionId skillIds approvalStatus isPublished showOnPlatform questionIds quizKind settings")
          .lean()
      : [],
    libraryIds.length
      ? LibraryItemModel.find(idQuery(libraryIds))
          .select("id title pathId subjectId sectionId skillIds approvalStatus showOnPlatform type url size")
          .lean()
      : [],
    SkillModel.find({ _id: { $in: input.skillIds } }).select("_id pathId subjectId sectionId").lean(),
  ]);

  const buildAliasMap = (items: any[]) => {
    const aliases = new Map<string, any>();
    for (const item of items) {
      const ids = [item?.id, item?._id].map((value) => String(value || "").trim()).filter(Boolean);
      for (const id of ids) aliases.set(id, item);
    }
    return aliases;
  };
  const lessonById = buildAliasMap(lessons);
  const quizById = buildAliasMap(quizzes);
  const libraryById = buildAliasMap(libraryItems);
  const skillById = buildAliasMap(mainSkills);

  const issues: Array<{
    type: string;
    refId: string;
    message: string;
    moduleId?: string;
  }> = [];

  const assertScope = (kind: string, refId: string, item: any, moduleId?: string) => {
    if (!item) {
      issues.push({ type: `${kind}_not_found`, refId, moduleId, message: `${kind} was not found` });
      return;
    }
    if (String(item.pathId || "") !== input.pathId || String(item.subjectId || "") !== input.subjectId) {
      issues.push({
        type: `${kind}_scope_mismatch`,
        refId,
        moduleId,
        message: `${kind} belongs to a different path or subject`,
      });
    }
    if (input.sectionId && item.sectionId && String(item.sectionId) !== input.sectionId) {
      issues.push({
        type: `${kind}_section_mismatch`,
        refId,
        moduleId,
        message: `${kind} belongs to a different section`,
      });
    }
  };

  for (const module of input.modules) {
    for (const lessonRef of module.lessons) {
      assertScope("lesson", lessonRef.lessonId, lessonById.get(lessonRef.lessonId), module.id);
      for (const quizId of lessonRef.trainingQuizIds) {
        assertScope("quiz", quizId, quizById.get(quizId), module.id);
      }
    }
    for (const quizId of module.assessmentQuizIds) {
      assertScope("quiz", quizId, quizById.get(quizId), module.id);
    }
  }

  for (const quizId of input.finalQuizIds) {
    assertScope("quiz", quizId, quizById.get(quizId));
  }
  for (const libraryId of libraryIds) {
    assertScope("library_item", libraryId, libraryById.get(libraryId));
  }
  for (const skillId of input.skillIds) {
    assertScope("skill", skillId, skillById.get(skillId));
  }

  const duplicateLessonIds = lessonIds.filter((id) => {
    const count = input.modules.reduce(
      (total, module) => total + module.lessons.filter((lesson) => lesson.lessonId === id).length,
      0,
    );
    return count > 1;
  });
  for (const lessonId of duplicateLessonIds) {
    issues.push({
      type: "duplicate_lesson_reference",
      refId: lessonId,
      message: "The same lesson is referenced more than once in the course plan",
    });
  }

  const derivedSkillIds = [
    ...new Set([
      ...input.skillIds,
      ...lessons.flatMap((lesson: any) => Array.isArray(lesson.skillIds) ? lesson.skillIds.map(String) : []),
      ...quizzes.flatMap((quiz: any) => Array.isArray(quiz.skillIds) ? quiz.skillIds.map(String) : []),
      ...libraryItems.flatMap((item: any) => Array.isArray(item.skillIds) ? item.skillIds.map(String) : []),
    ]),
  ];

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      modules: input.modules.length,
      lessons: lessonIds.length,
      quizzes: quizIds.length,
      libraryItems: libraryIds.length,
      derivedSkills: derivedSkillIds.length,
    },
    derivedSkillIds,
    resolved: {
      lessons,
      quizzes,
      libraryItems,
    },
  };
}
