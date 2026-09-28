import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [routes, adapters, usage, interactions, fallbackAudit, phase8, failoverContract, tutorPanel, examEstimate] = await Promise.all([
  read("server/src/routes/ai.routes.ts"),
  read("server/src/modules/ai/infrastructure/providers/aiProviderAdapters.ts"),
  read("server/src/modules/ai/application/aiUsageDaily.ts"),
  read("server/src/models/AiInteraction.ts"),
  read("scripts/live-ai-runtime-audit.mjs"),
  read("scripts/smoke-ai-platform-phase8-contract.mjs"),
  read("server/src/scripts/plan7AiFailoverContract.ts"),
  read("components/results/QuestionAssistantPanel.tsx"),
  read("server/src/modules/quizzes/analytics/examReadinessEstimate.ts"),
]);

const assert = (ok, message) => { if (!ok) throw new Error(message); };

assert(routes.includes('aiRouter.get("/status"') || routes.includes('"/status"'), "AI status endpoint missing");
assert(routes.includes('"/providers/test"') && routes.includes("quotaPoolId"), "per-pool live provider test missing");
assert(routes.includes("dailySpendCapUsd") && routes.includes("paidAllowed"), "AI spend controls missing");
assert(routes.includes("incrementAiUsageDaily"), "usage ledger write path missing");
assert(routes.includes("AiInteractionModel.create"), "interaction ledger missing");
assert(adapters.includes("response.status === 429") && adapters.includes("if (poolRateLimited) break"), "429 pool failover handling missing");
assert(adapters.includes("allowPaid || pool.plan !== \"paid\""), "paid pool kill switch missing");
assert(usage.includes("estimatedCostMicrosUsd") && usage.includes("cachedTokens"), "token/cost daily accounting missing");
assert(interactions.includes("totalTokens") && interactions.includes("estimatedCostMicrosUsd"), "interaction token/cost schema missing");
assert(fallbackAudit.includes("student chat used a real provider"), "live AI runtime audit no longer requires real provider");
assert(fallbackAudit.includes("usedFallback"), "live fallback proof missing");
assert(phase8.includes('liveProviderCertification: "REQUIRES_POST_MERGE_REAL_PROVIDER"'), "pre-production certification must not impersonate live certification");
assert(failoverContract.includes("429 advances to next free quota pool") && failoverContract.includes("paid pool must not be called"), "executable PLAN 7 failover contract missing");
assert(tutorPanel.includes("SpeechRecognition") && tutorPanel.includes("speechSynthesis") && !tutorPanel.includes("<input"), "student tutor must remain voice-only");
assert(examEstimate.includes("calibratedToQiyas: false") && examEstimate.includes("qiyasScoreEstimate: null"), "Qiyas estimate must remain calibration-gated");

console.log("PASS PLAN 7 non-provider certification contract");
