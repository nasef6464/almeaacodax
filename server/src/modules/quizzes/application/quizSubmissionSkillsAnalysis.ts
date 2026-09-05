import { buildResultSkillStatus, buildSkillRecommendation } from "../analytics/skillAnalytics.js";

type QuizSubmissionSkillsAnalysisInput = {
  skillStats: Map<string, { total: number; correct: number }>;
  skillById: Map<string, any>;
  quiz: any;
  subjectNameById: Map<string, string>;
  sectionNameById: Map<string, string>;
};

export const buildQuizSubmissionSkillsAnalysis = ({
  skillStats,
  skillById,
  quiz,
  subjectNameById,
  sectionNameById,
}: QuizSubmissionSkillsAnalysisInput) =>
  Array.from(skillStats.entries()).map(([skillId, stats]) => {
    const skill = skillById.get(skillId);
    const mastery = Math.round((stats.correct / Math.max(stats.total, 1)) * 100);
    const status = buildResultSkillStatus(mastery);
    const subjectId = String(skill?.subjectId || quiz.subjectId || "");
    const sectionId = String(skill?.sectionId || quiz.sectionId || "");

    return {
      skillId,
      pathId: String(skill?.pathId || quiz.pathId || ""),
      subjectId,
      sectionId,
      skill: String(skill?.name || "مهارة غير مسماة"),
      mastery,
      status,
      recommendation: buildSkillRecommendation(mastery),
      section: sectionNameById.get(sectionId) || subjectNameById.get(subjectId) || "",
    };
  });
