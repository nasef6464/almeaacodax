import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { CourseModel } from "../../../models/Course.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizModel } from "../../../models/Quiz.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import {
  courseReuseDraftSchema,
  validateCourseReuseDraft,
} from "./courseReuseDraftTools.js";
import { quizDraftSchema, validateQuizDraft } from "./questionQuizDraftTools.js";

type CommandDraftLike = InstanceType<typeof CommandCenterDraftModel>;

type ApplyResult = {
  resourceType: string;
  resourceId: string;
  summary: Record<string, unknown>;
};

const stableToken = (value: string, length = 12) =>
  createHash("sha256").update(value).digest("hex").slice(0, length);

const stableObjectId = (value: string) =>
  new mongoose.Types.ObjectId(createHash("sha256").update(value).digest("hex").slice(0, 24));

const aliases = (items: any[]) => {
  const map = new Map<string, any>();
  for (const item of items) {
    for (const value of [item?.id, item?._id]) {
      const key = String(value || "").trim();
      if (key) map.set(key, item);
    }
  }
  return map;
};

const cloneLessonForCourse = (
  lesson: any,
  courseLessonId: string,
  order: number,
) => ({
  id: courseLessonId,
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

const cloneQuizForCourse = (
  quiz: any,
  courseQuizId: string,
  order: number,
) => ({
  id: courseQuizId,
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

async function applyCourseDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const input = courseReuseDraftSchema.parse(draft.payload || {});
  const validation = await validateCourseReuseDraft(input);
  if (!validation.ok) {
    const error = new Error(
      `Course draft is no longer valid: ${validation.issues.map((issue) => issue.type).join(", ")}`,
    ) as Error & { statusCode?: number };
    error.statusCode = 422;
    throw error;
  }

  const lessonById = aliases(validation.resolved.lessons as any[]);
  const quizById = aliases(validation.resolved.quizzes as any[]);
  const libraryById = aliases(validation.resolved.libraryItems as any[]);
  const draftId = String(draft._id);
  const courseId = `cc_course_${stableToken(draftId, 20)}`;

  const modules = input.modules.map((module, moduleIndex) => {
    const lessons: any[] = [];
    for (const [lessonIndex, lessonRef] of module.lessons.entries()) {
      const sourceLesson = lessonById.get(lessonRef.lessonId);
      const sourceId = String(sourceLesson?.id || sourceLesson?._id || lessonRef.lessonId);
      lessons.push(
        cloneLessonForCourse(
          sourceLesson,
          `cc_lesson_${stableToken(`${draftId}:lesson:${sourceId}:${moduleIndex}:${lessonIndex}`, 20)}`,
          lessons.length + 1,
        ),
      );

      for (const [trainingIndex, quizId] of lessonRef.trainingQuizIds.entries()) {
        const quiz = quizById.get(quizId);
        lessons.push(
          cloneQuizForCourse(
            quiz,
            `cc_quiz_lesson_${stableToken(`${draftId}:training:${quizId}:${moduleIndex}:${lessonIndex}:${trainingIndex}`, 20)}`,
            lessons.length + 1,
          ),
        );
      }
    }

    for (const [assessmentIndex, quizId] of module.assessmentQuizIds.entries()) {
      const quiz = quizById.get(quizId);
      lessons.push(
        cloneQuizForCourse(
          quiz,
          `cc_module_assessment_${stableToken(`${draftId}:${module.id}:${quizId}:${assessmentIndex}`, 20)}`,
          lessons.length + 1,
        ),
      );
    }

    return {
      id: module.id,
      title: module.title,
      order: module.order,
      lessons,
    };
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
  if (existing) {
    return {
      resourceType: "course",
      resourceId: courseId,
      summary: {
        idempotentReplay: true,
        modules: modules.length,
        lessons: modules.reduce((total, module) => total + module.lessons.length, 0),
        assessments: assessments.length,
        files: files.length,
      },
    };
  }

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

  return {
    resourceType: "course",
    resourceId: courseId,
    summary: {
      idempotentReplay: false,
      modules: modules.length,
      lessons: modules.reduce((total, module) => total + module.lessons.length, 0),
      assessments: assessments.length,
      files: files.length,
      published: false,
    },
  };
}

async function applyQuizDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const input = quizDraftSchema.parse(draft.payload || {});
  const validation = await validateQuizDraft(input);
  if (!validation.ok) {
    const error = new Error(
      `Quiz draft is no longer valid; missing questions: ${validation.missingQuestionIds.join(", ")}`,
    ) as Error & { statusCode?: number };
    error.statusCode = 422;
    throw error;
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

const loadUserForApply = async (userId: string, expectedRole: string | string[]) => {
  const user = await UserModel.findById(userId)
    .select("_id email role isActive schoolId groupIds")
    .lean();
  if (!user || user.isActive === false) {
    throw Object.assign(new Error(`User is missing or inactive: ${userId}`), { statusCode: 422 });
  }
  const roles = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
  if (!roles.includes(String(user.role))) {
    throw Object.assign(new Error(`User role mismatch: ${userId}`), { statusCode: 422 });
  }
  return user as any;
};

async function applySchoolDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const payload = (draft.payload || {}) as any;
  const draftId = String(draft._id);
  const desiredSchoolId = String(payload.schoolId || "").trim();
  const schoolObjectId = desiredSchoolId
    ? new mongoose.Types.ObjectId(desiredSchoolId)
    : stableObjectId(`command-center:school:${draftId}`);

  const existingSchool = await GroupModel.findById(schoolObjectId).lean();
  if (existingSchool && String((existingSchool as any).type) !== "SCHOOL") {
    throw Object.assign(new Error("Deterministic school identifier is occupied by another group type"), {
      statusCode: 409,
    });
  }
  if (!existingSchool && desiredSchoolId) {
    throw Object.assign(new Error("Target school no longer exists"), { statusCode: 404 });
  }

  if (!existingSchool) {
    const conflictingSchool = await GroupModel.findOne({
      type: "SCHOOL",
      name: String(payload.schoolName || "").trim(),
      _id: { $ne: schoolObjectId },
    }).lean();
    if (conflictingSchool) {
      throw Object.assign(new Error("A different school with the same name already exists"), {
        statusCode: 409,
      });
    }
  }

  const school = await GroupModel.findOneAndUpdate(
    { _id: schoolObjectId },
    {
      $setOnInsert: {
        name: String(payload.schoolName || "").trim(),
        type: "SCHOOL",
        ownerId: actorId,
        studentIds: [],
        supervisorIds: [],
        courseIds: [],
        metadata: {
          description: "",
          location: "",
          settings: { commandCenterDraftId: draftId },
        },
      },
    },
    { new: true, upsert: !desiredSchoolId, runValidators: true },
  );
  if (!school) throw Object.assign(new Error("School apply failed"), { statusCode: 500 });
  const schoolId = String(school._id);

  const classIdByKey = new Map<string, string>();
  for (const classroom of Array.isArray(payload.classes) ? payload.classes : []) {
    const classKey = String(classroom.key || "").trim();
    const className = String(classroom.name || "").trim();
    const classObjectId = stableObjectId(`command-center:class:${draftId}:${classKey}`);
    const collision = await GroupModel.findOne({
      type: "CLASS",
      parentId: schoolId,
      name: className,
      _id: { $ne: classObjectId },
    }).lean();
    if (collision) {
      throw Object.assign(new Error(`Class name already exists: ${className}`), { statusCode: 409 });
    }

    const classDoc = await GroupModel.findOneAndUpdate(
      { _id: classObjectId },
      {
        $setOnInsert: {
          name: className,
          type: "CLASS",
          parentId: schoolId,
          ownerId: actorId,
          studentIds: [],
          supervisorIds: [],
          courseIds: [],
          metadata: {
            description: "",
            location: "",
            settings: { commandCenterDraftId: draftId, classKey },
          },
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
    classIdByKey.set(classKey, String(classDoc!._id));
  }

  for (const studentRef of Array.isArray(payload.students) ? payload.students : []) {
    const userId = String(studentRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "student");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Student belongs to another school: ${user.email}`), {
        statusCode: 409,
      });
    }
    const classId = classIdByKey.get(String(studentRef.classKey || ""));
    if (!classId) throw Object.assign(new Error("Student class mapping is missing"), { statusCode: 422 });

    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: { $each: [schoolId, classId] } } },
      ),
      GroupModel.updateOne({ _id: schoolObjectId }, { $addToSet: { studentIds: userId } }),
      GroupModel.updateOne({ _id: classId }, { $addToSet: { studentIds: userId } }),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "student" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "student" } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  for (const teacherRef of Array.isArray(payload.teachers) ? payload.teachers : []) {
    const userId = String(teacherRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "teacher");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Teacher belongs to another school: ${user.email}`), {
        statusCode: 409,
      });
    }
    const classId = classIdByKey.get(String(teacherRef.classKey || ""));
    if (!classId) throw Object.assign(new Error("Teacher class mapping is missing"), { statusCode: 422 });
    const subjectId = String(teacherRef.subjectId || "");

    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: { $each: [schoolId, classId] } } },
      ),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "teacher" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "teacher" } },
        { upsert: true, new: true, runValidators: true },
      ),
      TeachingAssignmentModel.findOneAndUpdate(
        { schoolId, teacherId: userId, classId, subjectId },
        { $set: { status: "active" }, $setOnInsert: { schoolId, teacherId: userId, classId, subjectId } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  for (const supervisorRef of Array.isArray(payload.supervisors) ? payload.supervisors : []) {
    const userId = String(supervisorRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "supervisor");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Supervisor belongs to another school: ${user.email}`), {
        statusCode: 409,
      });
    }

    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: schoolId } },
      ),
      GroupModel.updateOne({ _id: schoolObjectId }, { $addToSet: { supervisorIds: userId } }),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "supervisor" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "supervisor" } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  return {
    resourceType: "school",
    resourceId: schoolId,
    summary: {
      schoolCreated: !existingSchool,
      classes: classIdByKey.size,
      students: Array.isArray(payload.students) ? payload.students.length : 0,
      teachers: Array.isArray(payload.teachers) ? payload.teachers.length : 0,
      supervisors: Array.isArray(payload.supervisors) ? payload.supervisors.length : 0,
    },
  };
}

export async function applyApprovedCommandDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  if (draft.kind === "course") return applyCourseDraft(draft, actorId);
  if (draft.kind === "quiz") return applyQuizDraft(draft, actorId);
  if (draft.kind === "school_setup") return applySchoolDraft(draft, actorId);

  const error = new Error(
    `Apply adapter is not available yet for draft kind: ${String(draft.kind)}`,
  ) as Error & { statusCode?: number };
  error.statusCode = 422;
  throw error;
}
