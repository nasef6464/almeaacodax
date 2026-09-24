import mongoose from "mongoose";
import { AiInteractionModel } from "../../../models/AiInteraction.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { SkillProgressModel } from "../../../models/SkillProgress.js";
import { UserModel } from "../../../models/User.js";

export type StudentTutorWeakness = {
  skillId: string;
  skill: string;
  mastery: number;
  status: string;
  action: string;
};

export type StudentTutorRecentResult = {
  title: string;
  score: number;
  totalQuestions: number;
  wrongAnswers: number;
};

export type StudentTutorRecentTurn = {
  endpoint: string;
  userText: string;
  assistantText: string;
};

export type StudentTutorContext = {
  summary: string;
  weaknesses: StudentTutorWeakness[];
  recentResults: StudentTutorRecentResult[];
  recentTutorTurns: StudentTutorRecentTurn[];
  contextVersion: string;
};

type StudentTutorContextOptions = {
  focusSkillIds?: string[];
  includeRecentTutorTurns?: boolean;
  maxWeaknesses?: number;
  maxRecentResults?: number;
  maxRecentTutorTurns?: number;
  sessionId?: string;
};

const compact = (value: unknown, max = 180) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeWeakness = (item: any): StudentTutorWeakness => ({
  skillId: String(item?.skillId || "").trim(),
  skill: compact(item?.skill || item?.name || "مهارة تحتاج مراجعة", 100),
  mastery: Math.max(0, Math.min(100, Number(item?.mastery || 0))),
  status: compact(item?.status || "weak", 24),
  action: compact(item?.recommendedAction || item?.recommendation || "راجع شرحا قصيرا ثم حل تدريبا متدرجا.", 180),
});

const stableContextVersion = (input: {
  weaknesses: StudentTutorWeakness[];
  results: StudentTutorRecentResult[];
  turns: StudentTutorRecentTurn[];
}) =>
  [
    input.weaknesses.map((item) => `${item.skillId}:${item.mastery}:${item.status}`).join("|"),
    input.results.map((item) => `${item.title}:${item.score}:${item.wrongAnswers}`).join("|"),
    input.turns.map((item) => `${item.endpoint}:${item.userText.length}:${item.assistantText.length}`).join("|"),
  ].join("::").slice(0, 1200);

export const buildStudentTutorContext = async (
  userId?: string | null,
  options: StudentTutorContextOptions = {},
): Promise<StudentTutorContext | null> => {
  if (!userId) return null;

  const normalizedUserId = String(userId);
  const maxWeaknesses = Math.min(Math.max(Number(options.maxWeaknesses || 6), 1), 8);
  const maxRecentResults = Math.min(Math.max(Number(options.maxRecentResults || 3), 1), 4);
  const maxRecentTutorTurns = Math.min(Math.max(Number(options.maxRecentTutorTurns || 2), 1), 3);
  const focusSkillIds = new Set((options.focusSkillIds || []).map((value) => String(value || "").trim()).filter(Boolean));

  const [user, weaknesses, recentResults, recentTutorTurns] = await Promise.all([
    (mongoose.isValidObjectId(normalizedUserId)
      ? UserModel.findById(normalizedUserId)
      : UserModel.findOne({ id: normalizedUserId }))
      .select("id name role completedLessons")
      .lean(),
    SkillProgressModel.find({ userId: normalizedUserId, status: { $in: ["weak", "average"] } })
      .sort({ mastery: 1, lastAttemptAt: -1 })
      .limit(Math.max(maxWeaknesses * 2, 8))
      .lean(),
    QuizResultModel.find({ userId: normalizedUserId })
      .sort({ createdAt: -1 })
      .limit(maxRecentResults)
      .select("quizTitle score totalQuestions wrongAnswers skillsAnalysis")
      .lean(),
    options.includeRecentTutorTurns && options.sessionId
      ? AiInteractionModel.find({
          userId: normalizedUserId,
          audience: "student",
          endpoint: { $in: ["/ai/chat", "/ai/question-assistant"] },
          status: { $ne: "error" },
          "metadata.tutorSessionId": String(options.sessionId).slice(0, 120),
        })
          .sort({ createdAt: -1 })
          .limit(maxRecentTutorTurns)
          .select("endpoint messagePreview responsePreview")
          .lean()
      : Promise.resolve([]),
  ]);

  if (!user || user.role !== "student") return null;

  const progressWeaknesses = weaknesses
    .map(normalizeWeakness)
    .sort((left, right) => {
      const leftFocus = focusSkillIds.has(left.skillId) ? 0 : 1;
      const rightFocus = focusSkillIds.has(right.skillId) ? 0 : 1;
      return leftFocus - rightFocus || left.mastery - right.mastery;
    })
    .slice(0, maxWeaknesses);

  const resultRows: StudentTutorRecentResult[] = recentResults.map((item: any) => ({
    title: compact(item?.quizTitle || "اختبار سابق", 100),
    score: Math.max(0, Math.min(100, Number(item?.score || 0))),
    totalQuestions: Math.max(0, Number(item?.totalQuestions || 0)),
    wrongAnswers: Math.max(0, Number(item?.wrongAnswers || 0)),
  }));

  const resultWeaknesses = recentResults
    .flatMap((item: any) => (Array.isArray(item?.skillsAnalysis) ? item.skillsAnalysis : []))
    .filter((item: any) =>
      String(item?.status || "") === "weak"
      || String(item?.status || "") === "average"
      || Number(item?.mastery || 0) < 75,
    )
    .map(normalizeWeakness)
    .sort((left, right) => {
      const leftFocus = focusSkillIds.has(left.skillId) ? 0 : 1;
      const rightFocus = focusSkillIds.has(right.skillId) ? 0 : 1;
      return leftFocus - rightFocus || left.mastery - right.mastery;
    })
    .slice(0, maxWeaknesses);

  const weakRows = progressWeaknesses.length ? progressWeaknesses : resultWeaknesses;
  const turns: StudentTutorRecentTurn[] = recentTutorTurns
    .map((item: any) => ({
      endpoint: compact(item?.endpoint, 60),
      userText: compact(item?.messagePreview, 180),
      assistantText: compact(item?.responsePreview, 220),
    }))
    .filter((item) => item.userText || item.assistantText)
    .reverse();

  const summaryLines = [
    `اسم الطالب: ${compact((user as any).name || "طالب", 80)}`,
    weakRows.length
      ? `المهارات التي تحتاج دعمًا الآن: ${weakRows.map((item) => `${item.skill} (${item.mastery}%)`).join("، ")}`
      : "لا توجد مهارات ضعيفة مسجلة حاليًا.",
    resultRows.length
      ? `آخر النتائج: ${resultRows.map((item) => `${item.title}: ${item.score}%`).join("، ")}`
      : "لا توجد نتائج اختبارات حديثة.",
    `الدروس المكتملة: ${Array.isArray((user as any).completedLessons) ? (user as any).completedLessons.length : 0}`,
    turns.length
      ? `ذاكرة هذه الجلسة فقط: ${turns.map((item) => `الطالب: ${item.userText} | المساعد: ${item.assistantText}`).join(" || ")}`
      : "",
  ].filter(Boolean);

  return {
    summary: summaryLines.join("\n").slice(0, 2400),
    weaknesses: weakRows,
    recentResults: resultRows,
    recentTutorTurns: turns,
    contextVersion: stableContextVersion({ weaknesses: weakRows, results: resultRows, turns }),
  };
};
