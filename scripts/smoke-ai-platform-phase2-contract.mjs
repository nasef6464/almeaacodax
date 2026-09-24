import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const dailyModel = await readFile(new URL("../server/src/models/AiUsageDaily.ts", import.meta.url), "utf8");
const dailyService = await readFile(new URL("../server/src/modules/ai/application/aiUsageDaily.ts", import.meta.url), "utf8");
const interactionModel = await readFile(new URL("../server/src/models/AiInteraction.ts", import.meta.url), "utf8");
const adapters = await readFile(new URL("../server/src/modules/ai/infrastructure/providers/aiProviderAdapters.ts", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("provider adapters normalize real or estimated token usage",
  adapters.includes("AiProviderUsage") &&
  adapters.includes("usageMetadata") &&
  adapters.includes("usage?: { prompt_tokens?: number") &&
  adapters.includes("estimated: true"));

check("interaction ledger persists normalized token fields",
  interactionModel.includes("inputTokens") &&
  interactionModel.includes("outputTokens") &&
  interactionModel.includes("totalTokens") &&
  interactionModel.includes("usageEstimated"));

check("daily usage has one indexed rollup model instead of scanning interaction history per request",
  dailyModel.includes("AiUsageDaily") &&
  dailyModel.includes('scopeType: { type: String, enum: ["global", "user", "school", "capability"]') &&
  dailyModel.includes("{ dayKey: 1, scopeType: 1, scopeId: 1 }, { unique: true }"));

check("daily usage service can bootstrap and increment rollups",
  dailyService.includes("readAiUsageDaily") &&
  dailyService.includes("incrementAiUsageDaily") &&
  dailyService.includes("AiInteractionModel.aggregate") &&
  dailyService.includes("$inc: inc"));

check("AI budget reads indexed daily usage snapshots",
  routes.includes('readAiUsageDaily("global", "*", dayKey)') &&
  routes.includes('readAiUsageDaily("user", userId, dayKey)') &&
  routes.includes('readAiUsageDaily("school", schoolId, dayKey)') &&
  !routes.includes("AiInteractionModel.countDocuments(billableFilter)"));

check("billable interactions update daily counters and budget-limited fallbacks do not",
  routes.includes("await incrementAiUsageDaily({") &&
  routes.includes("payload.metadata?.billable !== false") &&
  routes.includes("billable: false"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-2-usage-ledger", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
