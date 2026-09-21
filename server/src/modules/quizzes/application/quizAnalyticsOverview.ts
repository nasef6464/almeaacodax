import { GroupModel } from "../../../models/Group.js";
import { QuestionAttemptModel } from "../../../models/QuestionAttempt.js";
import { QuizModel } from "../../../models/Quiz.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { SectionModel } from "../../../models/Section.js";
import { SkillModel } from "../../../models/Skill.js";
import { SubjectModel } from "../../../models/Subject.js";
import { dashboardAnalyticsQuerySchema } from "../http/questionQuerySchemas.js";
import { buildRecommendedAction } from "../analytics/skillAnalytics.js";
import { buildQuizReportAttemptGaps } from "./quizReportAttemptGaps.js";
import { buildWeakestStudentSummaries, MIN_ANALYTICS_SKILL_EVIDENCE_COUNT } from "./quizAnalyticsWeakestStudents.js";
import { matchesManagedContentScope } from "./quizManagedContentScope.js";
import { resolveScopedStudents } from "./quizReportScope.js";
import { resolveAuthUserByAuthId } from "./quizUserLookup.js";
import { buildDocumentsByIdsQuery, uniqueStrings } from "../infrastructure/quizDocumentQuery.js";

const idOf = (item: any) => String(item?.id || item?._id || "");

export const buildQuizAnalyticsOverview = async (
  authUserId: string,
  query: ReturnType<typeof dashboardAnalyticsQuerySchema.parse>,
) => {
  const authUser = await resolveAuthUserByAuthId(authUserId);
  
    if (!authUser) {
  return null;
    }
  
  const { students: scopedStudents, totalStudents, isTruncated, managedPathIds, managedSubjectIds } =
    await resolveScopedStudents(authUser, { limit: query.studentLimit });
  
  const scopedStudentIds = scopedStudents.map((student) => idOf(student));
  const selectedPathId = String(query.pathId || "").trim();
  const selectedSubjectId = String(query.subjectId || "").trim();
  const resultScopeClauses: Record<string, unknown>[] = [];
  if (selectedPathId && selectedSubjectId) {
    resultScopeClauses.push({
      $or: [
        { "quizSnapshot.pathId": selectedPathId, "quizSnapshot.subjectId": selectedSubjectId },
        { skillsAnalysis: { $elemMatch: { pathId: selectedPathId, subjectId: selectedSubjectId } } },
      ],
    });
  } else if (selectedPathId) {
    resultScopeClauses.push({
      $or: [
        { "quizSnapshot.pathId": selectedPathId },
        { skillsAnalysis: { $elemMatch: { pathId: selectedPathId } } },
      ],
    });
  } else if (selectedSubjectId) {
    resultScopeClauses.push({
      $or: [
        { "quizSnapshot.subjectId": selectedSubjectId },
        { skillsAnalysis: { $elemMatch: { subjectId: selectedSubjectId } } },
      ],
    });
  }
  const matchesSelectedTaxonomyScope = (gap: any) =>
    (!selectedPathId || String(gap?.pathId || "") === selectedPathId) &&
    (!selectedSubjectId || String(gap?.subjectId || "") === selectedSubjectId);
  const relatedGroupIds = uniqueStrings([
    ...scopedStudents.flatMap((student) => (student.groupIds || []).map(String)),
    ...(authUser.groupIds || []).map(String),
    authUser.schoolId ? String(authUser.schoolId) : undefined,
  ]);
  
  const groups = relatedGroupIds.length
    ? await GroupModel.find(buildDocumentsByIdsQuery(relatedGroupIds)).select("id name").lean()
    : [];
  
  const groupNameById = new Map(groups.map((group: any) => [idOf(group), String(group.name || "")]));
  
  let quizResults = scopedStudentIds.length
    ? await QuizResultModel.find({
        userId: { $in: scopedStudentIds },
        ...(resultScopeClauses.length ? { $and: resultScopeClauses } : {}),
      }).sort({ createdAt: -1 }).limit(query.resultLimit).lean()
    : [];
  
  if (authUser.role === "teacher" && (managedPathIds.size > 0 || managedSubjectIds.size > 0)) {
    quizResults = quizResults.filter((result) => {
      const skills = Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : [];
      return skills.some((gap: any) => matchesManagedContentScope(gap, managedPathIds, managedSubjectIds));
    });
  }
  
  let questionAttempts = scopedStudentIds.length
    ? await QuestionAttemptModel.find({
        userId: { $in: scopedStudentIds },
        ...(selectedPathId ? { pathId: selectedPathId } : {}),
        ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
      }).sort({ createdAt: -1 }).limit(query.attemptLimit).lean()
    : [];
  
  if (authUser.role === "teacher" && (managedPathIds.size > 0 || managedSubjectIds.size > 0)) {
    questionAttempts = questionAttempts.filter((attempt) => matchesManagedContentScope(attempt, managedPathIds, managedSubjectIds));
  }
  
  const attemptSkillIds = uniqueStrings(questionAttempts.flatMap((attempt) => (attempt.skillIds || []).map(String)));
  const attemptSkills = attemptSkillIds.length ? await SkillModel.find(buildDocumentsByIdsQuery(attemptSkillIds)).lean() : [];
  const skillById = new Map(attemptSkills.map((skill: any) => [idOf(skill), skill]));
  const attemptSubjectIds = uniqueStrings([
    ...questionAttempts.map((attempt) => String(attempt.subjectId || "")),
    ...attemptSkills.map((skill) => String(skill.subjectId || "")),
  ]);
  const attemptSectionIds = uniqueStrings([
    ...questionAttempts.map((attempt) => String(attempt.sectionId || "")),
    ...attemptSkills.map((skill) => String(skill.sectionId || "")),
  ]);
  const attemptSubjects = attemptSubjectIds.length ? await SubjectModel.find(buildDocumentsByIdsQuery(attemptSubjectIds)).select("id name").lean() : [];
  const attemptSections = attemptSectionIds.length ? await SectionModel.find(buildDocumentsByIdsQuery(attemptSectionIds)).select("id name").lean() : [];
  const subjectNameById = new Map(attemptSubjects.map((subject: any) => [idOf(subject), String(subject.name || "")]));
  const sectionNameById = new Map(attemptSections.map((section: any) => [idOf(section), String(section.name || "")]));
  const attemptsByStudent = new Map<string, any[]>();
  questionAttempts.forEach((attempt) => {
    const key = String(attempt.userId || "");
    const bucket = attemptsByStudent.get(key) || [];
    bucket.push(attempt);
    attemptsByStudent.set(key, bucket);
  });
  
  const resultsByStudent = new Map<string, any[]>();
  quizResults.forEach((result) => {
    const key = String(result.userId || "");
    const bucket = resultsByStudent.get(key) || [];
    bucket.push(result);
    resultsByStudent.set(key, bucket);
  });
  
  const weakestStudents = buildWeakestStudentSummaries({
    scopedStudents,
    resultsByStudent,
    attemptsByStudent,
    authUserRole: authUser.role,
    managedPathIds,
    managedSubjectIds,
    groupNameById,
    skillById,
    subjectNameById,
    sectionNameById,
  });
  
  const weakSkillMap = new Map<
    string,
    {
      skillId?: string;
      skill: string;
      pathId?: string;
      subjectId?: string;
      sectionId?: string;
      section?: string;
      masterySum: number;
      attempts: number;
      studentIds: Set<string>;
    }
  >();
  
  quizResults.forEach((result) => {
    const skills = (Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : []).filter((gap: any) =>
      matchesSelectedTaxonomyScope(gap) &&
      (authUser.role === "teacher"
        ? matchesManagedContentScope(gap, managedPathIds, managedSubjectIds)
        : true),
    );
    skills.forEach((gap: any) => {
      const mastery = Number(gap?.mastery || 0);
      if (mastery >= 75) return;
  
      const key = [
        String(gap?.pathId || ""),
        String(gap?.subjectId || ""),
        String(gap?.skillId || gap?.skill || gap?.sectionId || "unknown"),
      ].join("::");
      const current = weakSkillMap.get(key) || {
        skillId: gap?.skillId,
        skill: String(gap?.skill || "مهارة غير مسماة"),
        pathId: gap?.pathId,
        subjectId: gap?.subjectId,
        sectionId: gap?.sectionId,
        section: gap?.section,
        masterySum: 0,
        attempts: 0,
        studentIds: new Set<string>(),
      };
  
      current.masterySum += mastery;
      current.attempts += 1;
      current.studentIds.add(String(result.userId || ""));
      weakSkillMap.set(key, current);
    });
  });
  
  questionAttempts.forEach((attempt) => {
    buildQuizReportAttemptGaps(attempt, skillById, subjectNameById, sectionNameById).forEach((gap) => {
      const mastery = Number(gap?.mastery || 0);
      if (mastery >= 75) return;
  
      const key = [
        String(gap?.pathId || attempt.pathId || ""),
        String(gap?.subjectId || attempt.subjectId || ""),
        String(gap?.skillId || gap?.skill || gap?.sectionId || "unknown"),
      ].join("::");
      const current = weakSkillMap.get(key) || {
        skillId: gap?.skillId,
        skill: String(gap?.skill || "مهارة غير مسماة"),
        pathId: gap?.pathId || attempt.pathId,
        subjectId: gap?.subjectId || attempt.subjectId,
        sectionId: gap?.sectionId,
        section: gap?.section,
        masterySum: 0,
        attempts: 0,
        studentIds: new Set<string>(),
      };
  
      current.masterySum += mastery;
      current.attempts += 1;
      current.studentIds.add(String(attempt.userId || ""));
      weakSkillMap.set(key, current);
    });
  });
  
  const earlyWeakSkillSignalCount = Array.from(weakSkillMap.values()).filter((item) => item.attempts < MIN_ANALYTICS_SKILL_EVIDENCE_COUNT).length;
  const weakestSkills = Array.from(weakSkillMap.values())
    .filter((item) => item.attempts >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT)
    .map((item) => {
      const mastery = Math.round(item.masterySum / Math.max(item.attempts, 1));
      return {
        skillId: item.skillId,
        skill: item.skill,
        pathId: item.pathId,
        subjectId: item.subjectId,
        sectionId: item.sectionId,
        section: item.section,
        mastery,
        attempts: item.attempts,
        isReliable: true,
        evidenceThreshold: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT,
        affectedStudents: item.studentIds.size,
        recommendedAction: buildRecommendedAction(mastery, item.attempts),
      };
    })
    .sort((a, b) => a.mastery - b.mastery || b.affectedStudents - a.affectedStudents)
    .slice(0, 12);
  
  const subjectMap = new Map<
    string,
    {
      pathId?: string;
      subjectId?: string;
      subjectName: string;
      masterySum: number;
      count: number;
      weakStudents: Set<string>;
    }
  >();
  
  quizResults.forEach((result) => {
    const skills = (Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : []).filter((gap: any) =>
      matchesSelectedTaxonomyScope(gap) &&
      (authUser.role === "teacher"
        ? matchesManagedContentScope(gap, managedPathIds, managedSubjectIds)
        : true),
    );
    skills.forEach((gap: any) => {
      if (!gap?.subjectId && !gap?.subjectName && !result.quizTitle) return;
      const gapPathId = String(gap?.pathId || (result as any)?.quizSnapshot?.pathId || "");
      const key = [gapPathId, String(gap?.subjectId || gap?.subjectName || result.quizTitle)].join("::");
      const current = subjectMap.get(key) || {
        pathId: gapPathId || undefined,
        subjectId: gap?.subjectId,
        subjectName: String(gap?.subjectName || result.quizTitle || "مادة غير مسماة"),
        masterySum: 0,
        count: 0,
        weakStudents: new Set<string>(),
      };
  
      current.masterySum += Number(gap?.mastery || 0);
      current.count += 1;
      if (Number(gap?.mastery || 0) < 75) {
        current.weakStudents.add(String(result.userId || ""));
      }
      subjectMap.set(key, current);
    });
  });
  
  questionAttempts.forEach((attempt) => {
    buildQuizReportAttemptGaps(attempt, skillById, subjectNameById, sectionNameById).forEach((gap) => {
      if (!gap?.subjectId) return;
      const gapPathId = String(gap.pathId || attempt.pathId || "");
      const key = [gapPathId, String(gap.subjectId)].join("::");
      const current = subjectMap.get(key) || {
        pathId: gapPathId || undefined,
        subjectId: gap.subjectId,
        subjectName: String(gap.subjectName || subjectNameById.get(String(gap.subjectId)) || "مادة غير مسماة"),
        masterySum: 0,
        count: 0,
        weakStudents: new Set<string>(),
      };
  
      current.masterySum += Number(gap.mastery || 0);
      current.count += 1;
      if (Number(gap.mastery || 0) < 75) {
        current.weakStudents.add(String(attempt.userId || ""));
      }
      subjectMap.set(key, current);
    });
  });
  
  const subjectSummaries = Array.from(subjectMap.values())
    .map((item) => ({
      pathId: item.pathId,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      mastery: Math.round(item.masterySum / Math.max(item.count, 1)),
      weakStudents: item.weakStudents.size,
    }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 10);
  
  let assignedFollowUps = await QuizModel.find({
    isPublished: true,
    mode: { $in: ["saher", "central"] },
    ...(selectedPathId ? { pathId: selectedPathId } : {}),
    ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
    $or: [
      { targetUserIds: { $in: scopedStudentIds } },
      { targetGroupIds: { $in: relatedGroupIds } },
    ],
  }).sort({ createdAt: -1 }).limit(12).lean();
  
  if (authUser.role === "teacher" && (managedPathIds.size > 0 || managedSubjectIds.size > 0)) {
    assignedFollowUps = assignedFollowUps.filter((quiz) => {
      const quizPathId = String(quiz.pathId || "");
      const quizSubjectId = String(quiz.subjectId || "");
  
      if (managedSubjectIds.size > 0 && quizSubjectId && managedSubjectIds.has(quizSubjectId)) {
        return true;
      }
  
      if (managedPathIds.size > 0 && quizPathId && managedPathIds.has(quizPathId)) {
        return true;
      }
  
      return false;
    });
  }
  
  return {
    scope: {
      role: authUser.role,
      studentCount: totalStudents,
      sampledStudentCount: scopedStudents.length,
      isTruncated,
      groupCount: relatedGroupIds.length,
      quizAttempts: quizResults.length,
      questionAttempts: questionAttempts.length,
      earlyWeakSkillSignalCount,
      minSkillEvidence: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT,
      selectedPathId: selectedPathId || undefined,
      selectedSubjectId: selectedSubjectId || undefined,
      limits: {
        studentLimit: query.studentLimit,
        resultLimit: query.resultLimit,
        attemptLimit: query.attemptLimit,
      },
    },
    weakestStudents,
    weakestSkills,
    subjectSummaries,
    assignedFollowUps: assignedFollowUps.map((quiz) => ({
      id: String(quiz.id),
      title: quiz.title,
      mode: quiz.mode || "regular",
      pathId: quiz.pathId,
      subjectId: quiz.subjectId,
      targetGroupIds: quiz.targetGroupIds || [],
      targetUserIds: quiz.targetUserIds || [],
      dueDate: quiz.dueDate || undefined,
    })),
  };
  
};
