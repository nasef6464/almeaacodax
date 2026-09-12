import { ClassroomParticipantModel } from "../../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { Types } from "mongoose";
import { resolveSchoolContexts } from "./schoolContextResolver.js";

export type ClassroomSupervisorUser = { id: string; role: string; schoolId?: string | null };

const idOf = (value: unknown) => String(value || "");

/** A school membership grants school-wide scope; a directly supervised class grants that class only. */
export const resolveClassroomSupervisorScope = async (user: ClassroomSupervisorUser) => {
  if (user.role === "admin") return { all: true as const, schoolIds: [], classIds: [] };
  const contexts = await resolveSchoolContexts(user);
  const schoolIds = contexts.filter((context) => context.role === "supervisor").map((context) => context.schoolId);
  const directlySupervised = await GroupModel.find({ supervisorIds: user.id }).select("id _id type parentId").lean();
  const classIds = directlySupervised
    .filter((group: any) => group.type === "CLASS")
    .map((group: any) => idOf(group.id || group._id));
  directlySupervised
    .filter((group: any) => group.type === "SCHOOL")
    .forEach((group: any) => schoolIds.push(idOf(group.id || group._id)));
  return {
    all: false as const,
    schoolIds: Array.from(new Set(schoolIds.filter(Boolean))),
    classIds: Array.from(new Set(classIds.filter(Boolean))),
  };
};

export const classroomScopeFilter = (scope: Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>) =>
  scope.all ? {} : { $or: [{ schoolId: { $in: scope.schoolIds } }, { classId: { $in: scope.classIds } }] };

export const buildClassroomSessionReport = async (session: any) => {
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

  // group.studentIds is retained for legacy compatibility, while User.groupIds is
  // the runtime authorization source. Union them so reports remain correct during
  // migration and never under-count a legitimate class roster because one side drifted.
  const expectedStudentIds = new Set<string>([
    ...(((classroom as any)?.studentIds || []).map(idOf)),
    ...rosterUsers.map((student: any) => idOf(student.id || student._id)),
  ].filter(Boolean));
  const joinedStudentIds = new Set(participants.map((participant: any) => idOf(participant.studentId)));

  const questionReports = (session.questionSnapshots || []).map((question: any, index: number) => {
    const questionResponses = responses.filter((response: any) => idOf(response.questionId) === idOf(question.questionId));
    const correct = questionResponses.filter((response: any) => response.isCorrect).length;
    return {
      index,
      questionId: question.questionId,
      text: question.text,
      skillIds: question.skillIds || [],
      pathId: question.pathId || "",
      sectionId: question.sectionId || "",
      subject: question.subject || "",
      answered: questionResponses.length,
      correct,
      wrong: questionResponses.length - correct,
      unanswered: Math.max(0, joinedStudentIds.size - questionResponses.length),
    };
  });

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
    startedAt: session.createdAt,
    endedAt: session.endedAt,
    roster: {
      expected: expectedStudentIds.size,
      joined: joinedStudentIds.size,
      absentFromSession: Math.max(0, expectedStudentIds.size - joinedStudentIds.size),
    },
    questions: questionReports,
    totals: {
      responses: responses.length,
      correct: responses.filter((response: any) => response.isCorrect).length,
    },
  };
};

export const buildClassroomTeacherReports = async (scope: Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>) => {
  const sessions = await ClassroomSessionModel.find(classroomScopeFilter(scope)).sort({ createdAt: -1 }).lean();
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
