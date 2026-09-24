import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const context = await readFile(new URL("../server/src/modules/ai/application/studentTutorContext.ts", import.meta.url), "utf8");
const questionAssistant = await readFile(new URL("../server/src/modules/ai/application/questionAssistant.ts", import.meta.url), "utf8");
const chatWidget = await readFile(new URL("../components/ChatWidget.tsx", import.meta.url), "utf8");
const questionPanel = await readFile(new URL("../components/results/QuestionAssistantPanel.tsx", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("student and question tutors share one bounded context gateway",
  routes.includes("buildStudentTutorContext(req.authUser?.id") &&
  routes.includes("buildStudentTutorContext(userId, {") &&
  context.includes("export const buildStudentTutorContext"));

check("context reads deterministic learning evidence instead of asking the model to calculate mastery",
  context.includes("SkillProgressModel.find") &&
  context.includes("QuizResultModel.find") &&
  !context.includes("callAiWithMeta") &&
  !context.includes("fetch("));

check("tutor memory is explicitly bounded and does not load full history",
  context.includes("maxRecentTutorTurns") &&
  context.includes(".limit(maxRecentTutorTurns)") &&
  context.includes("Math.min(Math.max(Number(options.maxRecentTutorTurns || 2), 1), 3)") &&
  !context.includes("find({ userId: normalizedUserId }).lean()"));

check("question tutor prioritizes the question skill scope",
  context.includes("focusSkillIds") &&
  routes.includes("focusSkillIds: skillIds"));

check("question prompt receives a compact student context",
  questionAssistant.includes("studentContextSummary?: string") &&
  questionAssistant.includes("safeStudentContext") &&
  questionAssistant.includes(".slice(0, 2200)") &&
  routes.includes("studentContextSummary: tutorContext?.summary ||"));

check("student and question UIs send explicit bounded tutor session identifiers",
  routes.includes("tutorSessionIdSchema") &&
  routes.includes("sessionId: tutorSessionId") &&
  routes.includes("sessionId: payload.tutorSessionId") &&
  chatWidget.includes("tutorSessionIdRef") &&
  questionPanel.includes("tutorSessionIdRef"));

check("cache and interaction memory are scoped to the explicit tutor session",
  routes.includes('String(payload.tutorSessionId || "")') &&
  routes.includes('tutorSessionId: payload.tutorSessionId || ""') &&
  routes.includes('tutorSessionId: tutorSessionId || ""'));

check("AI interaction log is reused for bounded recent turns instead of a new tutor-session collection",
  context.includes("AiInteractionModel.find") &&
  context.includes('endpoint: { $in: ["/ai/chat", "/ai/question-assistant"] }'));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-5-tutor-context", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
