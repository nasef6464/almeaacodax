import { ClassroomParticipantModel } from "../../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
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
  const classIds = directlySupervised.filter((group: any) => group.type === "CLASS").map((group: any) => idOf(group.id || group._id));
  directlySupervised.filter((group: any) => group.type === "SCHOOL").forEach((group: any) => schoolIds.push(idOf(group.id || group._id)));
  return { all: false as const, schoolIds: Array.from(new Set(schoolIds.filter(Boolean))), classIds: Array.from(new Set(classIds.filter(Boolean))) };
};

export const classroomScopeFilter = (scope: Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>) =>
  scope.all ? {} : { $or: [{ schoolId: { $in: scope.schoolIds } }, { classId: { $in: scope.classIds } }] };

export const buildClassroomSessionReport = async (session: any) => {
  const sessionId = idOf(session.id || session._id);
  const [participants, responses, classroom] = await Promise.all([
    ClassroomParticipantModel.find({ sessionId }).lean(),
    ClassroomResponseModel.find({ sessionId }).lean(),
    GroupModel.findOne({ $or: [{ id: session.classId }, ...(Types.ObjectId.isValid(session.classId) ? [{ _id: session.classId }] : [])] }).select("studentIds").lean(),
  ]);
  const expectedStudentIds = new Set(((classroom as any)?.studentIds || []).map(idOf));
  const joinedStudentIds = new Set(participants.map((participant: any) => idOf(participant.studentId)));
  const questionReports = (session.questionSnapshots || []).map((question: any, index: number) => {
    const questionResponses = responses.filter((response: any) => idOf(response.questionId) === idOf(question.questionId));
    const correct = questionResponses.filter((response: any) => response.isCorrect).length;
    return { index, questionId: question.questionId, text: question.text, skillIds: question.skillIds || [], answered: questionResponses.length, correct, wrong: questionResponses.length - correct, unanswered: Math.max(0, joinedStudentIds.size - questionResponses.length) };
  });
  return { sessionId, schoolId: session.schoolId, classId: session.classId, teacherId: session.teacherId, status: session.status, startedAt: session.createdAt, endedAt: session.endedAt, roster: { expected: expectedStudentIds.size, joined: joinedStudentIds.size, absentFromSession: Math.max(0, expectedStudentIds.size - joinedStudentIds.size) }, questions: questionReports, totals: { responses: responses.length, correct: responses.filter((response: any) => response.isCorrect).length } };
};
