import { CourseModel } from "../../../models/Course.js";
import { QuizModel } from "../../../models/Quiz.js";
import {
  courseReuseDraftSchema,
  validateCourseReuseDraft,
} from "./courseReuseDraftTools.js";
import {
  planQuizQuestionUpdate,
  quizDraftSchema,
  quizQuestionUpdateDraftSchema,
  validateQuizDraft,
} from "./questionQuizDraftTools.js";
import {
  buildAliasMap,
  stableToken,
  type ApplyResult,
  type CommandDraftLike,
} from "./draftApplyTypes.js";

const cloneLessonForCourse = (lesson: any, id: string, order: number) => ({
  id,
  title: String(lesson?.title || "درس"),
  description: String(lesson?.description || ""),
  type: String(lesson?.type || "text"),
  duration: String(lesson?.duration || ""),
  content: String(lesson?.content || ""),
  videoUrl: String(lesson?.videoUrl || ""),
  videoSource: lesson?.videoSource || "upload",
  interactiveQuestions: Array.isArray(lesson?.interactiveQuestions) ? lesson.interactiveQuestions : [],
  fileUrl: String(lesson?.fileUrl || ""),
  meetingUrl: String(lesson?.meetingUrl || ""),
  meetingDate: String(lesson?.meetingDate || ""),
  recordingUrl: String(lesson?.recordingUrl || ""),
  joinInstructions: String(lesson?.joinInstructions || ""),
  showRecordingOnPlatform: Boolean(lesson?.showRecordingOnPlatform),
  showOnPlatform: lesson?.showOnPlatform !== false,
  quizId: lesson?.quizId ? String(lesson.quizId) : null,
  order,
  isCompleted: false,
  isLocked: Boolean(lesson?.isLocked),
  skillIds: Array.isArray(lesson?.skillIds) ? lesson.skillIds.map(String) : [],
  pathId: lesson?.pathId ? String(lesson.pathId) : undefined,
  subjectId: lesson?.subjectId ? String(lesson.subjectId) : undefined,
  sectionId: lesson?.sectionId ? String(lesson.sectionId) : undefined,
  accessControl: "enrolled",
});

const cloneQuizForCourse = (quiz: any, id: string, order: number) => ({
  id,
  title: String(quiz?.title || "اختبار"),
  description: String(quiz?.description || ""),
  type: "quiz",
  duration: `${Number(quiz?.settings?.timeLimit || 0)} دقيقة`,
  isCompleted: false,
  order,
  skillIds: Array.isArray(quiz?.skillIds) ? quiz.skillIds.map(String) : [],
  quizId: String(quiz?.id || quiz?._id || ""),
  pathId: String(quiz?.pathId || ""),
  subjectId: String(quiz?.subjectId || ""),
  sectionId: quiz?.sectionId ? String(quiz.sectionId) : undefined,
  accessControl: "enrolled",
});

export async function applyCourseDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const input = courseReuseDraftSchema.parse(draft.payload || {});
  const validation = await validateCourseReuseDraft(input);
  if (!validation.ok) {
    throw Object.assign(
      new Error(`Course draft is no longer valid: ${validation.issues.map((issue) => issue.type).join(", ")}`),
      { statusCode: 422 },
    );
  }

  const lessonById = buildAliasMap(validation.resolved.lessons as any[]);
  const quizById = buildAliasMap(validation.resolved.quizzes as any[]);
  const libraryById = buildAliasMap(validation.resolved.libraryItems as any[]);
  const draftId = String(draft._id);
  const courseId = `cc_course_${stableToken(draftId, 20)}`;

  const modules = input.modules.map((module, moduleIndex) => {
    const lessons: any[] = [];
    module.lessons.forEach((lessonRef, lessonIndex) => {
      const sourceLesson = lessonById.get(lessonRef.lessonId);
      const sourceId = String(sourceLesson?.id || sourceLesson?._id || lessonRef.lessonId);
      lessons.push(
        cloneLessonForCourse(
          sourceLesson,
          `cc_lesson_${stableToken(`${draftId}:lesson:${sourceId}:${moduleIndex}:${lessonIndex}`, 20)}`,
          lessons.length + 1,
        ),
      );
      lessonRef.trainingQuizIds.forEach((quizId, trainingIndex) => {
        lessons.push(
          cloneQuizForCourse(
            quizById.get(quizId),
            `cc_quiz_lesson_${stableToken(`${draftId}:training:${quizId}:${moduleIndex}:${lessonIndex}:${trainingIndex}`, 20)}`,
            lessons.length + 1,
          ),
        );
      });
    });

    module.assessmentQuizIds.forEach((quizId, assessmentIndex) => {
      lessons.push(
        cloneQuizForCourse(
          quizById.get(quizId),
          `cc_module_assessment_${stableToken(`${draftId}:${module.id}:${quizId}:${assessmentIndex}`, 20)}`,
          lessons.length + 1,
        ),
      );
    });

    return { id: module.id, title: module.title, order: module.order, lessons };
  });

  const assessments = [
    ...input.modules.flatMap((module, moduleIndex) =>
      module.assessmentQuizIds.map((quizId, index) => {
        const quiz = quizById.get(quizId);
        return {
          id: `cc_assessment_${stableToken(`${draftId}:during:${module.id}:${quizId}:${index}`, 20)}`,
          quizId: String(quiz?.id || quiz?._id || quizId),
          title: String(quiz?.title || `اختبار ${module.title}`),
          phase: "during_course",
          access: "enrolled_paid",
          showOnPlatform: true,
          order: moduleIndex * 100 + index,
        };
      }),
    ),
    ...input.finalQuizIds.map((quizId, index) => {
      const quiz = quizById.get(quizId);
      return {
        id: `cc_assessment_${stableToken(`${draftId}:final:${quizId}:${index}`, 20)}`,
        quizId: String(quiz?.id || quiz?._id || quizId),
        title: String(quiz?.title || "الاختبار النهائي"),
        phase: "final_course",
        access: "enrolled_paid",
        showOnPlatform: true,
        order: 100000 + index,
      };
    }),
  ];

  const files = input.libraryItemIds.map((libraryId) => {
    const item = libraryById.get(libraryId);
    return {
      id: `cc_file_${stableToken(`${draftId}:${libraryId}`, 20)}`,
      title: String(item?.title || "ملف الدورة"),
      type: String(item?.type || "pdf"),
      url: String(item?.url || ""),
      size: String(item?.size || ""),
      access: "enrolled_paid",
    };
  });

  const existing = await CourseModel.findById(courseId).lean();
  if (!existing) {
    await CourseModel.create({
      _id: courseId,
      title: input.title,
      description: input.description,
      instructor: input.instructor,
      pathId: input.pathId,
      subjectId: input.subjectId,
      subject: input.subjectId,
      sectionId: input.sectionId,
      category: "دورة تعليمية",
      level: "Beginner",
      price: 0,
      currency: "SAR",
      duration: 0,
      modules,
      assessments,
      files,
      skills: validation.derivedSkillIds,
      ownerType: "platform",
      ownerId: actorId,
      createdBy: actorId,
      approvalStatus: "approved",
      approvedBy: actorId,
      approvedAt: Date.now(),
      reviewerNotes: `Applied from Command Center draft ${draftId}`,
      isPublished: false,
      showOnPlatform: false,
    });
  }

  return {
    resourceType: "course",
    resourceId: courseId,
    summary: {
      idempotentReplay: Boolean(existing),
      modules: modules.length,
      lessons: modules.reduce((total, module) => total + module.lessons.length, 0),
      assessments: assessments.length,
      files: files.length,
      published: false,
    },
  };
}

export async function applyQuizDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const rawPayload = (draft.payload || {}) as any;
  if (rawPayload.operation === "update_existing_questions") {
    const updateInput = quizQuestionUpdateDraftSchema.parse({
      targetQuizId: rawPayload.targetQuizId || rawPayload.targetQuizMongoId,
      candidateQuestionIds: rawPayload.candidateQuestionIds,
      mode: rawPayload.mode || "add",
      title: draft.title,
      requestId: String((draft as any).requestId || ""),
    });
    const refreshedPlan = await planQuizQuestionUpdate(updateInput);
    if (!refreshedPlan.ok || !refreshedPlan.quiz || !refreshedPlan.diff) {
      throw Object.assign(
        new Error(
          `Quiz update draft is no longer valid: ${refreshedPlan.issues
            .map((issue) => issue.type)
            .join(", ")}`,
        ),
        { statusCode: 422 },
      );
    }

    const approvedFinalIds = Array.isArray(rawPayload.finalQuestionIds)
      ? rawPayload.finalQuestionIds.map(String)
      : [];
    const currentFinalIds = refreshedPlan.diff.finalQuestionIds.map(String);
    if (JSON.stringify(approvedFinalIds) !== JSON.stringify(currentFinalIds)) {
      throw Object.assign(
        new Error(
          "Quiz update changed after review; create and approve a fresh diff draft before applying",
        ),
        { statusCode: 409 },
      );
    }

    const target = await QuizModel.findOne({
      $or: [
        { _id: String(rawPayload.targetQuizMongoId || rawPayload.targetQuizId) },
        { id: String(rawPayload.targetQuizId || "") },
      ],
    }).lean();
    if (!target) {
      throw Object.assign(new Error("Target quiz no longer exists"), { statusCode: 404 });
    }

    const draftId = String(draft._id);
    const replacementRequired = Boolean((target as any).isPublished);
    const resourceId = replacementRequired
      ? `cc_quiz_revision_${stableToken(draftId, 20)}`
      : String((target as any)._id);

    if (replacementRequired) {
      const existingReplacement = await QuizModel.findById(resourceId).lean();
      if (!existingReplacement) {
        const clone: Record<string, unknown> = { ...(target as any) };
        delete clone._id;
        delete clone.__v;
        delete clone.createdAt;
        delete clone.updatedAt;
        await QuizModel.create({
          ...clone,
          _id: resourceId,
          id: resourceId,
          title: `${String((target as any).title || "اختبار")} — تحديث`,
          questionIds: currentFinalIds,
          skillIds: refreshedPlan.diff.afterSkillIds,
          isPublished: false,
          showOnPlatform: false,
          approvalStatus: "approved",
          approvedBy: actorId,
          approvedAt: Date.now(),
          createdBy: actorId,
          reviewerNotes: `Replacement created from Command Center update draft ${draftId}; original published quiz was left unchanged.`,
        });
      }
    } else {
      await QuizModel.updateOne(
        { _id: (target as any)._id },
        {
          $set: {
            questionIds: currentFinalIds,
            skillIds: refreshedPlan.diff.afterSkillIds,
            approvalStatus: "approved",
            approvedBy: actorId,
            approvedAt: Date.now(),
            reviewerNotes: `Updated from approved Command Center draft ${draftId}`,
            isPublished: false,
          },
        },
        { runValidators: true },
      );
    }

    return {
      resourceType: replacementRequired ? "quiz_replacement" : "quiz",
      resourceId,
      summary: {
        operation: "update_existing_questions",
        targetQuizId: refreshedPlan.quiz.id,
        replacementRequired,
        originalPublishedQuizUnchanged: replacementRequired,
        added: refreshedPlan.diff.acceptedAdditionCount,
        exactDuplicatesSkipped: refreshedPlan.diff.exactExistingCount,
        nearDuplicatesSkipped: refreshedPlan.diff.nearDuplicateCount,
        finalQuestionCount: currentFinalIds.length,
        published: false,
      },
    };
  }

  const input = quizDraftSchema.parse(rawPayload);
  const validation = await validateQuizDraft(input);
  if (!validation.ok) {
    throw Object.assign(
      new Error(`Quiz draft is no longer valid; missing questions: ${validation.missingQuestionIds.join(", ")}`),
      { statusCode: 422 },
    );
  }

  const draftId = String(draft._id);
  const quizId = `cc_quiz_${stableToken(draftId, 20)}`;
  const existing = await QuizModel.findById(quizId).lean();
  if (!existing) {
    await QuizModel.create({
      _id: quizId,
      id: quizId,
      title: input.title,
      description: input.description,
      pathId: input.pathId,
      subjectId: input.subjectId,
      questionIds: input.questionIds,
      skillIds: input.skillIds.length ? input.skillIds : validation.skillIds,
      quizKind: "test",
      type: "quiz",
      placement: "training",
      settings: input.settings,
      ownerType: "platform",
      ownerId: actorId,
      createdBy: actorId,
      approvalStatus: "approved",
      approvedBy: actorId,
      approvedAt: Date.now(),
      reviewerNotes: `Applied from Command Center draft ${draftId}`,
      isPublished: false,
      showOnPlatform: false,
    });
  }

  return {
    resourceType: "quiz",
    resourceId: quizId,
    summary: {
      idempotentReplay: Boolean(existing),
      questionCount: validation.questionCount,
      published: false,
    },
  };
}
