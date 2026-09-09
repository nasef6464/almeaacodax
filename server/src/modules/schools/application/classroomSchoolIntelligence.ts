import { ClassroomResponseModel } from "../../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { UserModel } from "../../../models/User.js";
import { Types } from "mongoose";
import { classroomScopeFilter, type resolveClassroomSupervisorScope } from "./classroomSupervisorReport.js";

type ClassroomSupervisorScope = Awaited<ReturnType<typeof resolveClassroomSupervisorScope>>;

const SESSION_LIMIT = 200;
const RESPONSE_LIMIT = 5_000;
const STUDENT_LIMIT = 1_000;
const RESULT_LIMIT = 2_000;
const TREND_DAYS = 14;
const idOf = (value: unknown) => String(value || "");
const percentage = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 100) : null;

const scopedClassGroups = async (scope: ClassroomSupervisorScope) => {
  if (scope.all) return GroupModel.find({ type: "CLASS" }).select("_id studentIds").limit(STUDENT_LIMIT).lean();
  const clauses: Record<string, unknown>[] = [];
  if (scope.schoolIds.length) clauses.push({ parentId: { $in: scope.schoolIds } });
  const directClassObjectIds = scope.classIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (directClassObjectIds.length) clauses.push({ _id: { $in: directClassObjectIds } });
  if (!clauses.length) return [];
  return GroupModel.find({ type: "CLASS", $or: clauses }).select("_id studentIds").limit(STUDENT_LIMIT).lean();
};

/** Resolve the supervisor's actual learners from explicit membership, legacy fields, and assigned classes. */
const scopedStudents = async (scope: ClassroomSupervisorScope) => {
  const classGroups = await scopedClassGroups(scope);
  const classIds = classGroups.map((group: any) => idOf(group._id));
  const classStudentIds = classGroups.flatMap((group: any) => (group.studentIds || []).map(idOf));
  const membershipStudentIds = scope.all || !scope.schoolIds.length
    ? []
    : (await SchoolMembershipModel.find({ schoolId: { $in: scope.schoolIds }, role: "student", status: "active" }).select("userId").limit(STUDENT_LIMIT).lean()).map((membership: any) => idOf(membership.userId));
  const filters: Record<string, unknown>[] = [];
  if (scope.all) filters.push({});
  if (scope.schoolIds.length) filters.push({ schoolId: { $in: scope.schoolIds } });
  if (classIds.length) filters.push({ groupIds: { $in: classIds } });
  if (classStudentIds.length || membershipStudentIds.length) {
    const rawIds = [...new Set([...classStudentIds, ...membershipStudentIds])];
    const objectIds = rawIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    filters.push({ $or: [{ _id: { $in: objectIds } }, { id: { $in: rawIds } }] });
  }
  if (!filters.length) return [];
  return UserModel.find({ role: "student", $or: filters }).select("_id id name").limit(STUDENT_LIMIT).lean();
};

const skillSummary = (records: Array<{ skillIds: string[]; correct: boolean }>) => {
  const skills = new Map<string, { skillId: string; evidenceCount: number; correct: number }>();
  records.forEach((record) => record.skillIds.forEach((skillId) => {
    const current = skills.get(skillId) || { skillId, evidenceCount: 0, correct: 0 };
    current.evidenceCount += 1;
    if (record.correct) current.correct += 1;
    skills.set(skillId, current);
  }));
  return Array.from(skills.values())
    .map((skill) => ({ ...skill, accuracy: percentage(skill.correct, skill.evidenceCount) }))
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101) || right.evidenceCount - left.evidenceCount);
};

const trendKey = (value: Date | string | undefined) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
};

/**
 * Bounded, raw-source intelligence read model. It deliberately exposes separate
 * source cards; there is no blended score or stored aggregate in this MVP.
 */
export const buildClassroomSchoolIntelligence = async (scope: ClassroomSupervisorScope) => {
  const [sessions, students] = await Promise.all([
    ClassroomSessionModel.find(classroomScopeFilter(scope)).select("_id schoolId classId createdAt questionSnapshots").sort({ createdAt: -1 }).limit(SESSION_LIMIT).lean(),
    scopedStudents(scope),
  ]);
  const sessionIds = sessions.map((session: any) => idOf(session._id));
  const studentIds = students.map((student: any) => idOf(student.id || student._id));
  const [responses, platformResults, schoolAssessmentResults, legacyResults] = await Promise.all([
    sessionIds.length ? ClassroomResponseModel.find({ sessionId: { $in: sessionIds } }).select("sessionId questionId studentId isCorrect submittedAt").sort({ submittedAt: -1 }).limit(RESPONSE_LIMIT).lean() : [],
    studentIds.length ? QuizResultModel.find({ userId: { $in: studentIds }, learningContext: "platform_self_study" }).select("userId score skillsAnalysis createdAt").sort({ createdAt: -1 }).limit(RESULT_LIMIT).lean() : [],
    studentIds.length ? QuizResultModel.find({ userId: { $in: studentIds }, learningContext: "school_assessment" }).select("userId score skillsAnalysis createdAt").sort({ createdAt: -1 }).limit(RESULT_LIMIT).lean() : [],
    studentIds.length ? QuizResultModel.find({ userId: { $in: studentIds }, $or: [{ learningContext: "legacy_unknown" }, { learningContext: { $exists: false } }] }).select("_id").limit(RESULT_LIMIT).lean() : [],
  ]);

  const questionSkills = new Map<string, string[]>();
  sessions.forEach((session: any) => (session.questionSnapshots || []).forEach((question: any) => {
    questionSkills.set(`${idOf(session._id)}:${idOf(question.questionId)}`, (question.skillIds || []).map(idOf).filter(Boolean));
  }));
  const studentNames = new Map(students.map((student: any) => [idOf(student.id || student._id), String(student.name || "طالب")])) ;
  const formativeSkillRecords = responses.map((response: any) => ({ skillIds: questionSkills.get(`${idOf(response.sessionId)}:${idOf(response.questionId)}`) || [], correct: Boolean(response.isCorrect) }));
  const weakStudents = new Map<string, { studentId: string; name: string; evidenceCount: number; correct: number }>();
  responses.forEach((response: any) => {
    const studentId = idOf(response.studentId);
    const current = weakStudents.get(studentId) || { studentId, name: studentNames.get(studentId) || "طالب", evidenceCount: 0, correct: 0 };
    current.evidenceCount += 1;
    if (response.isCorrect) current.correct += 1;
    weakStudents.set(studentId, current);
  });
  const dailyTrend = new Map<string, { day: string; sessions: number; responses: number; correct: number }>();
  const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - (TREND_DAYS - 1)); cutoff.setUTCHours(0, 0, 0, 0);
  sessions.filter((session: any) => new Date(session.createdAt) >= cutoff).forEach((session: any) => {
    const day = trendKey(session.createdAt); const current = dailyTrend.get(day) || { day, sessions: 0, responses: 0, correct: 0 }; current.sessions += 1; dailyTrend.set(day, current);
  });
  responses.filter((response: any) => new Date(response.submittedAt || response.createdAt) >= cutoff).forEach((response: any) => {
    const day = trendKey(response.submittedAt || response.createdAt); const current = dailyTrend.get(day) || { day, sessions: 0, responses: 0, correct: 0 }; current.responses += 1; if (response.isCorrect) current.correct += 1; dailyTrend.set(day, current);
  });
  const officialSummary = (results: any[]) => ({
    attempts: results.length,
    averageScore: results.length ? Math.round(results.reduce((sum, result) => sum + Number(result.score || 0), 0) / results.length) : null,
    skills: skillSummary(results.flatMap((result) => (result.skillsAnalysis || []).map((skill: any) => ({ skillIds: [idOf(skill.skillId)].filter(Boolean), correct: Number(skill.score ?? skill.mastery ?? 0) >= 60 })))),
  });

  return {
    generatedAt: new Date().toISOString(),
    bounds: { sessionLimit: SESSION_LIMIT, responseLimit: RESPONSE_LIMIT, studentLimit: STUDENT_LIMIT, resultLimit: RESULT_LIMIT, trendDays: TREND_DAYS, source: "raw_read_model" },
    schoolPerformance: {
      smartClassroom: {
        sessions: sessions.length,
        responses: responses.length,
        accuracy: percentage(responses.filter((response: any) => response.isCorrect).length, responses.length),
        skillHeatmap: skillSummary(formativeSkillRecords),
        weakStudents: Array.from(weakStudents.values()).map((student) => ({ ...student, accuracy: percentage(student.correct, student.evidenceCount) })).sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101) || right.evidenceCount - left.evidenceCount).slice(0, 20),
        trend: Array.from(dailyTrend.values()).map((day) => ({ ...day, accuracy: percentage(day.correct, day.responses) })).sort((left, right) => left.day.localeCompare(right.day)),
      },
      officialAssessments: officialSummary(schoolAssessmentResults),
    },
    platformSelfStudy: officialSummary(platformResults),
    legacyUnknown: { attempts: legacyResults.length, message: "سجلات تاريخية غير مصنفة ولا تدخل في أي مقارنة." },
    comparisonPolicy: "separate_sources_only_no_blended_score",
  };
};
