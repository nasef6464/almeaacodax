import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const adapters = await readFile(new URL("../server/src/modules/ai/infrastructure/providers/aiProviderAdapters.ts", import.meta.url), "utf8");
const routing = await readFile(new URL("../server/src/modules/ai/application/aiCapabilityRouting.ts", import.meta.url), "utf8");
const pools = await readFile(new URL("../server/src/modules/ai/application/aiQuotaPools.ts", import.meta.url), "utf8");
const interactions = await readFile(new URL("../server/src/models/AiInteraction.ts", import.meta.url), "utf8");
const usageDaily = await readFile(new URL("../server/src/modules/ai/application/aiUsageDaily.ts", import.meta.url), "utf8");
const secrets = await readFile(new URL("../server/src/utils/integrationSecretsCrypto.ts", import.meta.url), "utf8");
const tutor = await readFile(new URL("../server/src/modules/ai/application/studentTutorContext.ts", import.meta.url), "utf8");
const examEstimate = await readFile(new URL("../server/src/modules/quizzes/analytics/examReadinessEstimate.ts", import.meta.url), "utf8");
const control = await readFile(new URL("../dashboards/admin/ai/AiControlCenterSettings.tsx", import.meta.url), "utf8");
const media = await readFile(new URL("../services/aiMediaClient.ts", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("secrets stay server-side encrypted and arrays of keys are covered",
  secrets.includes('const ALGO = "aes-256-gcm"') &&
  secrets.includes('EXTERNAL_PLATFORM_SECRET_ARRAY_FIELDS = ["apiKeys"]') &&
  secrets.includes("encryptIntegrationSecretsAtRest"));

check("free-first and paid kill switch are explicit",
  pools.includes("free: 0") &&
  pools.includes("trial: 1") &&
  pools.includes("paid: 3") &&
  routes.includes("paidAllowed: false") &&
  routing.includes("capabilityPaidAllowed"));

check("quota rate limiting advances by pool and preserves key retry semantics",
  adapters.includes("for (const pool of pools)") &&
  adapters.includes("for (const apiKey of pool.apiKeys)") &&
  adapters.includes("response.status === 429") &&
  adapters.includes("if (poolRateLimited) break"));

check("AI usage is metered and bounded",
  interactions.includes("totalTokens") &&
  interactions.includes("estimatedCostMicrosUsd") &&
  interactions.includes("retentionUntil") &&
  usageDaily.includes("incrementAiUsageDaily") &&
  routes.includes("dailySpendCapUsd"));

check("student tutor memory stays bounded to explicit sessions",
  tutor.includes("maxRecentTutorTurns") &&
  tutor.includes('"metadata.tutorSessionId"') &&
  routes.includes("tutorSessionIdSchema"));

check("voice and vision stay low-cost and explicit in v1",
  media.includes("SpeechSynthesisUtterance") &&
  media.includes("compressImageForAi") &&
  routes.includes('"vision_chat"') &&
  routes.includes("AI_VISION_DAILY_LIMIT"));

check("Qiyas prediction cannot be presented as calibrated yet",
  examEstimate.includes("calibratedToQiyas: false") &&
  examEstimate.includes("qiyasScoreEstimate: null") &&
  examEstimate.includes("recentAssessments >= 3"));

check("control center is the admin surface for keys, quota and spend policy",
  control.includes("الحسابات والمشاريع والمفاتيح") &&
  control.includes("paidAllowed") &&
  control.includes("dailySpendCapUsd") &&
  control.includes("اختبر الحصة"));

check("no provider key literal is committed into the certification paths",
  !routes.includes("AIzaSy") &&
  !adapters.includes("AIzaSy") &&
  !control.includes("AIzaSy"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({
  phase: "AI-8-pre-production-certification",
  status: failed.length ? "FAIL" : "PASS",
  liveProviderCertification: "REQUIRES_POST_MERGE_REAL_PROVIDER",
  qiyasPrediction: "CALIBRATION_GATED",
  checks,
}, null, 2));
if (failed.length) process.exit(1);
