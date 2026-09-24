import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const pools = await readFile(new URL("../server/src/modules/ai/application/aiQuotaPools.ts", import.meta.url), "utf8");
const adapters = await readFile(new URL("../server/src/modules/ai/infrastructure/providers/aiProviderAdapters.ts", import.meta.url), "utf8");
const manager = await readFile(new URL("../dashboards/admin/AiAssistantManager.tsx", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("quota pool domain distinguishes free, trial, paid and real quota scope",
  pools.includes('export type AiQuotaPlan = "free" | "trial" | "paid" | "unknown"') &&
  pools.includes('export type AiQuotaScope = "project" | "account" | "organization" | "workspace" | "model" | "unknown"'));

check("runtime loads multiple provider entries as independent quota pools",
  routes.includes("readExternalQuotaPools") &&
  routes.includes("id.startsWith") &&
  routes.includes("quotaPoolId") &&
  routes.includes("accountLabel") &&
  routes.includes("projectLabel"));

check("free and trial quota pools sort before unknown and paid pools",
  pools.includes("planRank") &&
  pools.includes("free: 0") &&
  pools.includes("trial: 1") &&
  pools.includes("paid: 3") &&
  pools.includes("sortAiQuotaPools"));

check("429 advances to the next pool instead of burning sibling keys in the same quota",
  adapters.includes("poolRateLimited") &&
  adapters.includes("response.status === 429") &&
  adapters.includes("if (poolRateLimited) break"));

check("credential failure can still try another key inside the same pool",
  adapters.includes("for (const apiKey of pool.apiKeys)") &&
  adapters.includes("for (const pool of pools)"));

check("status API exposes sanitized pool metadata only",
  routes.includes("keyCount: pool.apiKeys.length") &&
  routes.includes("quotaPools: Object.fromEntries") &&
  !routes.includes("apiKeys: pool.apiKeys"));

check("admin provider cards show real pool counts",
  manager.includes("quotaPoolCount") &&
  manager.includes("freeQuotaPoolCount") &&
  manager.includes("حصص:"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-3-quota-pools", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
