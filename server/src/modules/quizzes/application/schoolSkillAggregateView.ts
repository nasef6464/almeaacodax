import { SchoolSkillAggregateModel } from "../../../models/SchoolSkillAggregate.js";
import { SUPPORT_MASTERY_THRESHOLD } from "../analytics/skillAnalytics.js";
import { resolveScopedStudents } from "./quizReportScope.js";
import { resolveAuthUserByAuthId } from "./quizUserLookup.js";

const STAFF_ROLES = new Set(["admin", "supervisor", "teacher", "school_admin"]);
const idOf = (value: any) => String(value?.id || value?._id || "");

const buildManagedScopeClause = (
  role: string,
  managedPathIds: Set<string>,
  managedSubjectIds: Set<string>,
) => {
  if (role !== "teacher") return null;
  const clauses: Record<string, unknown>[] = [];
  if (managedPathIds.size > 0) clauses.push({ pathId: { $in: [...managedPathIds] } });
  if (managedSubjectIds.size > 0) clauses.push({ subjectId: { $in: [...managedSubjectIds] } });
  return clauses.length ? { $or: clauses } : null;
};

export const buildSchoolSkillAggregateView = async (
  authUserId: string,
  query: {
    groupBy: "skill" | "class" | "student";
    pathId?: string;
    subjectId?: string;
    classId?: string;
    studentId?: string;
    skillId?: string;
    limit: number;
  },
) => {
  const authUser = await resolveAuthUserByAuthId(authUserId);
  if (!authUser) return { status: "not_found" as const };
  if (!STAFF_ROLES.has(String(authUser.role || ""))) {
    return { status: "forbidden" as const };
  }

  const {
    students,
    totalStudents,
    isTruncated,
    managedPathIds,
    managedSubjectIds,
  } = await resolveScopedStudents(authUser, { limit: 1000 });

  const eligibleStudents = students.filter((student: any) => {
    const studentId = idOf(student);
    if (query.studentId && studentId !== query.studentId) return false;
    if (query.classId && !(student.groupIds || []).map(String).includes(query.classId)) return false;
    return true;
  });
  const studentIds = eligibleStudents.map(idOf).filter(Boolean);
  const studentNameById = new Map(eligibleStudents.map((student: any) => [idOf(student), String(student.name || "طالب")]));
  if (studentIds.length === 0) {
    return {
      status: "ok" as const,
      scope: {
        role: authUser.role,
        totalStudents,
        sampledStudents: 0,
        isTruncated,
        groupBy: query.groupBy,
        pathId: query.pathId || undefined,
        subjectId: query.subjectId || undefined,
        classId: query.classId || undefined,
        skillId: query.skillId || undefined,
      },
      rows: [],
    };
  }

  const baseMatch: Record<string, unknown> = {
    userId: { $in: studentIds },
    ...(query.pathId ? { pathId: query.pathId } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.classId ? { classId: query.classId } : {}),
    ...(query.skillId ? { skillId: query.skillId } : {}),
  };
  const managedClause = buildManagedScopeClause(String(authUser.role || ""), managedPathIds, managedSubjectIds);
  const match = managedClause ? { $and: [baseMatch, managedClause] } : baseMatch;
  const sampledStudentCount = eligibleStudents.length;

  if (query.groupBy === "student") {
    const docs = await SchoolSkillAggregateModel.find(match)
      .select("schoolId classId userId pathId subjectId sectionId skillId skill totalEvidence mastery recentMastery trend confidence lastEvidenceAt")
      .sort({ mastery: 1, totalEvidence: -1, lastEvidenceAt: -1 })
      .limit(query.limit)
      .lean();

    return {
      status: "ok" as const,
      scope: {
        role: authUser.role,
        totalStudents,
        sampledStudents: sampledStudentCount,
        isTruncated,
        groupBy: query.groupBy,
        pathId: query.pathId || undefined,
        subjectId: query.subjectId || undefined,
        classId: query.classId || undefined,
        skillId: query.skillId || undefined,
      },
      rows: docs.map((row: any) => ({
        schoolId: String(row.schoolId || ""),
        classId: String(row.classId || ""),
        userId: String(row.userId || ""),
        studentName: studentNameById.get(String(row.userId || "")) || "طالب",
        pathId: String(row.pathId || ""),
        subjectId: String(row.subjectId || ""),
        sectionId: String(row.sectionId || ""),
        skillId: String(row.skillId || ""),
        skill: String(row.skill || "مهارة"),
        mastery: Number(row.mastery || 0),
        recentMastery: Number(row.recentMastery || 0),
        trend: String(row.trend || "stable"),
        confidence: Number(row.confidence || 0),
        evidenceCount: Number(row.totalEvidence || 0),
        needsSupport: Number(row.mastery || 0) < SUPPORT_MASTERY_THRESHOLD,
        lastEvidenceAt: row.lastEvidenceAt,
      })),
    };
  }

  const groupId = query.groupBy === "class"
    ? {
        classId: "$classId",
        pathId: "$pathId",
        subjectId: "$subjectId",
        skillId: "$skillId",
      }
    : {
        pathId: "$pathId",
        subjectId: "$subjectId",
        skillId: "$skillId",
      };

  const rows = await SchoolSkillAggregateModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupId,
        skill: { $first: "$skill" },
        sectionId: { $first: "$sectionId" },
        totalEvidence: { $sum: "$totalEvidence" },
        totalCorrect: { $sum: "$totalCorrect" },
        studentIds: { $addToSet: "$userId" },
        supportStudents: {
          $sum: { $cond: [{ $lt: ["$mastery", SUPPORT_MASTERY_THRESHOLD] }, 1, 0] },
        },
        averageRecentMastery: { $avg: "$recentMastery" },
        averageConfidence: { $avg: "$confidence" },
        improving: { $sum: { $cond: [{ $eq: ["$trend", "improving"] }, 1, 0] } },
        declining: { $sum: { $cond: [{ $eq: ["$trend", "declining"] }, 1, 0] } },
        stable: { $sum: { $cond: [{ $eq: ["$trend", "stable"] }, 1, 0] } },
        lastEvidenceAt: { $max: "$lastEvidenceAt" },
      },
    },
    { $sort: { supportStudents: -1, totalEvidence: -1 } },
    { $limit: query.limit },
  ]);

  return {
    status: "ok" as const,
    scope: {
      role: authUser.role,
      totalStudents,
      sampledStudents: sampledStudentCount,
      isTruncated,
      groupBy: query.groupBy,
      pathId: query.pathId || undefined,
      subjectId: query.subjectId || undefined,
      classId: query.classId || undefined,
      skillId: query.skillId || undefined,
      supportThreshold: SUPPORT_MASTERY_THRESHOLD,
    },
    rows: rows.map((row: any) => {
      const evidenceCount = Math.max(0, Number(row.totalEvidence || 0));
      const correctCount = Math.max(0, Number(row.totalCorrect || 0));
      const studentCount = Array.isArray(row.studentIds) ? row.studentIds.length : 0;
      const supportStudents = Math.max(0, Number(row.supportStudents || 0));
      return {
        classId: String(row._id?.classId || ""),
        pathId: String(row._id?.pathId || ""),
        subjectId: String(row._id?.subjectId || ""),
        skillId: String(row._id?.skillId || ""),
        skill: String(row.skill || "مهارة"),
        sectionId: String(row.sectionId || ""),
        mastery: evidenceCount > 0 ? Math.round((correctCount / evidenceCount) * 100) : 0,
        recentMastery: Math.round(Number(row.averageRecentMastery || 0)),
        confidence: Math.round(Number(row.averageConfidence || 0)),
        evidenceCount,
        studentCount,
        coverage: sampledStudentCount > 0 ? Math.round((studentCount / sampledStudentCount) * 100) : 0,
        supportStudents,
        supportRate: studentCount > 0 ? Math.round((supportStudents / studentCount) * 100) : 0,
        trendBreakdown: {
          improving: Number(row.improving || 0),
          stable: Number(row.stable || 0),
          declining: Number(row.declining || 0),
        },
        lastEvidenceAt: row.lastEvidenceAt,
      };
    }),
  };
};
