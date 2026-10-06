import { Types } from "mongoose";
import { z } from "zod";
import { GroupModel } from "../../../models/Group.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { resolveSchoolEntitlement } from "../../schools/application/schoolEntitlementResolver.js";
import { loadApprovedVisibleQuestions } from "../../../routes/classroom/classroomRouteSupport.js";

export const smartTeacherSessionDraftSchema = z.object({
  title: z.string().trim().min(1).max(240),
  schoolId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  teacherId: z.string().trim().min(1),
  questionIds: z
    .array(z.string().trim().min(1))
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length, "Question IDs must be unique")
    .default([]),
  day: z.string().trim().max(80).optional().default(""),
  period: z.number().int().min(1).max(12).nullable().optional().default(null),
  subjectName: z.string().trim().max(160).optional().default(""),
  className: z.string().trim().max(160).optional().default(""),
  publishedMode: z.enum(["single", "batch"]).default("single"),
  teachingGoal: z.string().trim().max(1000).optional().default(""),
  boardOpeningPrompt: z.string().trim().max(1000).optional().default(""),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

export async function validateSmartTeacherSessionDraft(
  input: z.infer<typeof smartTeacherSessionDraftSchema>,
) {
  const issues: Array<{ type: string; message: string; ref?: string }> = [];

  const classroomPromise = Types.ObjectId.isValid(input.classId)
    ? GroupModel.findOne({
        _id: input.classId,
        type: "CLASS",
        parentId: input.schoolId,
      })
        .select("_id name parentId")
        .lean()
    : Promise.resolve(null);

  const [entitlement, classroom, teacher, assignment] = await Promise.all([
    resolveSchoolEntitlement(input.schoolId, "SMART_CLASSROOM"),
    classroomPromise,
    UserModel.findById(input.teacherId)
      .select("_id name email role isActive schoolId")
      .lean(),
    TeachingAssignmentModel.findOne({
      schoolId: input.schoolId,
      classId: input.classId,
      teacherId: input.teacherId,
      status: "active",
    })
      .select("_id subjectId")
      .lean(),
  ]);

  if (!entitlement.allowed) {
    issues.push({
      type: "smart_classroom_not_entitled",
      message: "Smart Classroom is not enabled for this school",
      ref: input.schoolId,
    });
  }
  if (!classroom) {
    issues.push({
      type: "class_scope_mismatch",
      message: "Class does not belong to the selected school",
      ref: input.classId,
    });
  }
  if (
    !teacher ||
    teacher.isActive === false ||
    String(teacher.role || "") !== "teacher"
  ) {
    issues.push({
      type: "teacher_not_active",
      message: "Selected teacher is missing, inactive, or not a teacher",
      ref: input.teacherId,
    });
  }
  if (
    teacher?.schoolId &&
    String(teacher.schoolId) !== input.schoolId
  ) {
    issues.push({
      type: "teacher_school_mismatch",
      message: "Teacher belongs to another school",
      ref: input.teacherId,
    });
  }
  if (!assignment) {
    issues.push({
      type: "teacher_not_assigned",
      message: "Teacher is not actively assigned to this class",
      ref: input.teacherId,
    });
  }

  let snapshots: any[] = [];
  if (issues.length === 0 && input.questionIds.length > 0) {
    snapshots = await loadApprovedVisibleQuestions(
      input.questionIds,
      input.schoolId,
      input.teacherId,
    );
    if (snapshots.length !== input.questionIds.length) {
      issues.push({
        type: "question_visibility_mismatch",
        message:
          "All questions must be approved and visible to this school/teacher before session preparation",
      });
    }
  }

  const skillIds = [
    ...new Set(
      snapshots.flatMap((snapshot: any) =>
        Array.isArray(snapshot.skillIds) ? snapshot.skillIds.map(String) : [],
      ),
    ),
  ];

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      questionCount: input.questionIds.length,
      skillCount: skillIds.length,
      hasTeachingGoal: Boolean(input.teachingGoal),
      hasBoardOpeningPrompt: Boolean(input.boardOpeningPrompt),
    },
    plan: {
      operation: "smart_classroom_session_plan",
      schoolId: input.schoolId,
      classId: input.classId,
      teacherId: input.teacherId,
      questionIds: input.questionIds,
      day: input.day,
      period: input.period,
      subjectName: input.subjectName,
      className: input.className || String((classroom as any)?.name || ""),
      publishedMode: input.publishedMode,
      autoStart: false,
      teachingGoal: input.teachingGoal,
      boardOpeningPrompt: input.boardOpeningPrompt,
      skillIds,
      policy: {
        agentCanPrepare: true,
        agentCanStartLive: false,
        teacherLaunchRequired: true,
        smartClassroomRemainsAuthority: true,
      },
    },
  };
}
