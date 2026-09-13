import { ClassroomParticipantModel } from "../../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { Types } from "mongoose";
import { resolveSchoolContexts } from "./schoolContextResolver.js";
import { resolveSchoolEntitlement } from "./schoolEntitlementResolver.js";

export type ClassroomSupervisorUser = { id: string; role: string; schoolId?: string | null };

const idOf = (value: unknown) => String(value || "");

/**
 * A school membership grants school-wide scope; a directly supervised class
 * grants that class only. Supervisor scope is also filtered by the school's
 * current SMART_CLASSROOM entitlement so expired/disabled commercial access
 * cannot keep historical or live classroom data visible through supervisor APIs.
 */
export const resolveClassroomSupervisorScope = async (user: ClassroomSupervisorUser) => {
  if (user.role === "admin") return { all: true as const, schoolIds: [], classIds: [] };

  const contexts = await resolveSchoolContexts(user);
  const schoolIds = contexts
    .filter((context) => context.role === "supervisor")
    .map((context) => String(context.schoolId));
  const directlySupervised = await GroupModel.find({ supervisorIds: user.id }).select("id _id type parentId").lean();
  const directClasses = directlySupervised
    .filter((group: any) => group.type === "CLASS")
    .map((group: any) => ({
      classId: idOf(group.id || group._id),
      schoolId: idOf(group.parentId),
    }))
    .filter((entry) => entry.classId && entry.schoolId);

  directlySupervised
    .filter((group: any) => group.type === "SCHOOL")
    .forEach((group: any) => schoolIds.push(idOf(group.id || group._id)));

  const candidateSchoolIds = Array.from(new Set([
    ...schoolIds.filter(Boolean),
    ...directClasses.map((entry) => entry.schoolId),
  ]));
  const entitlementResults = await Promise.all(
    candidateSchoolIds.map(async (schoolId) => ({
      schoolId,
      allowed: (await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM")).allowed,
    })),
  );
  const entitledSchools = new Set(
    entitlementResults.filter((entry) => entry.allowed).map((entry) => entry.schoolId),
  );

  return {
    all: false as const,
    schoolIds: Array.from(new Set(schoolIds.filter((schoolId) => entitledSchools.has(schoolId)))),
    classIds: Array.from(new Set(
      directClasses
        .filter((entry) => entitledSchools.has(entry.schoolId))
        .map((entry) => entry.classId),
    )),
  };
};

export const classroomScopeFilter = (scope: Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>) =>
  scope.all ? {} : { $or: [{ schoolId: { $in: scope.schoolIds } }, { classId: { $in: scope.classIds } }] };

export const buildClassroomSessionReport = async (session: any) => {
  if ((session.status === "ended" || session.status === "archived") && session.reportSnapshot) {
    return session.reportSnapshot;
  }

  const reportSessionId = idOf(session.id || session._id);
  const [participants, responses, classroom, rosterUsers] = await Promise.all([
    ClassroomParticipantModel.find({ sessionId: reportSessionId }).lean(),
    ClassroomResponseModel.find({ sessionId: reportSessionId }).lean(),
    GroupModel.findOne({
      $or: [
        { id: session.classId },
        ...(Types.ObjectId.isValid(session.classId) ? [{ _id: session.classId }] : []),
      ],
    }).select("studentIds").lean(),
    UserModel.find({
      role: "student",
      schoolId: String(session.schoolId),
      groupIds: String(session.classId),
      isActive: { $ne: false },
    }).select("id _id").lean(),
  ]);

  const expectedStudentIds = new Set<string>([
    ...(((classroom as any)?.studentIds || []).map(idOf)),
    ...rosterUsers.map((student: any) => idOf(student.id || student._id)),
  ].filter(Boolean));
  const joinedStudentIds = new Set(participants.map((participant: any) => idOf(participant.studentId)));

  const questionReports = (session.questionSnapshots || []).map((question: any, index: number) => {
    const questionResponses = responses.filter((response: any) => idOf(response.questionId) === idOf(question.questionId));
    const correct = questionResponses.filter((response: any) => response.isCorrect).length;
    const distribution = questionResponses.reduce((summary: Record<string, number>, response: any) => {
      const key = String(response.selectedOptionIndex);
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});
    return {
      index,
      questionId: question.questionId,
      text: question.text,
      imageUrl: question.imageUrl || "",
      options: question.options || [],
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation || "",
      skillIds: question.skillIds || [],
      pathId: question.pathId || "",
      sectionId: question.sectionId || "",
      subject: question.subject || "",
      difficulty: question.difficulty || "Medium",
      answered: questionResponses.length,
      correct,
      wrong: questionResponses.length - correct,
      unanswered: Math.max(0, joinedStudentIds.size - questionResponses.length),
      distribution,
    };
  });

  const startedAt = session.startedAt || session.createdAt || null;
  const endedAt = session.endedAt || null;
  const startedMs = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  const endedMs = endedAt ? new Date(endedAt).getTime() : Number.NaN;
  const durationMinutes = Number.isFinite(startedMs) && Number.isFinite(endedMs)
    ? Math.max(0, Math.round((endedMs - startedMs) / 60_000))
    : null;
  const batches = (session.questionBatches || []).map((batch: any, index: number) => ({
    batchId: idOf(batch.batchId),
    number: index + 1,
    label: batch.label || `الدفعة ${index + 1}`,
    questionIds: (batch.questionIds || []).map(idOf),
    startedAt: batch.startedAt || null,
    endedAt: batch.endedAt || null,
  }));

  return {
    sessionId: reportSessionId,
    schoolId: session.schoolId,
    classId: session.classId,
    className: session.className || "",
    subjectName: session.subjectName || "",
    day: session.day || "",
    period: session.period ?? null,
    teacherId: session.teacherId,
    status: session.status,
    startedAt,
    endedAt,
    durationMinutes,
    roster: {
      expected: expectedStudentIds.size,
      joined: joinedStudentIds.size,
      absentFromSession: Math.max(0, expectedStudentIds.size - joinedStudentIds.size),
    },
    batches,
    questions: questionReports,
    totals: {
      responses: responses.length,
      correct: responses.filter((response: any) => response.isCorrect).length,
    },
  };
};

export const buildClassroomTeacherReports = async (scope: Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>) => {
  const sessions = await ClassroomSessionModel.find({
    $and: [
      classroomScopeFilter(scope),
      { status: { $in: ["ended", "archived"] } },
    ],
  }).sort({ createdAt: -1 }).lean();
  const reports = await Promise.all(sessions.map(buildClassroomSessionReport));
  const byTeacher = new Map<string, { teacherId: string; sessions: number; joined: number; responses: number; correct: number }>();
  reports.forEach((report) => {
    const current = byTeacher.get(report.teacherId) || { teacherId: report.teacherId, sessions: 0, joined: 0, responses: 0, correct: 0 };
    current.sessions += 1;
    current.joined += report.roster.joined;
    current.responses += report.totals.responses;
    current.correct += report.totals.correct;
    byTeacher.set(report.teacherId, current);
  });
  return Array.from(byTeacher.values()).map((report) => ({
    ...report,
    accuracy: report.responses ? Math.round((report.correct / report.responses) * 100) : null,
  }));
};
