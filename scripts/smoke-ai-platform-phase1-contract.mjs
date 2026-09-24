import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const policy = await readFile(new URL("../server/src/modules/ai/application/aiCapabilityPolicy.ts", import.meta.url), "utf8");
const admin = await readFile(new URL("../dashboards/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const manager = await readFile(new URL("../dashboards/admin/AiAssistantManager.tsx", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });
const sliceRoute = (start, end) => {
  const from = routes.indexOf(start);
  const to = end ? routes.indexOf(end, from + start.length) : routes.length;
  return from >= 0 ? routes.slice(from, to >= 0 ? to : routes.length) : "";
};

check("guest external AI is disabled by policy",
  policy.includes("export const AI_GUEST_EXTERNAL_ENABLED = false") &&
  routes.includes("!req.authUser && !AI_GUEST_EXTERNAL_ENABLED"));

check("AI chat images have a decoded byte limit",
  policy.includes("AI_CHAT_IMAGE_MAX_BYTES = 600 * 1024") &&
  routes.includes("estimateBase64DecodedBytes(value.data)") &&
  routes.includes("AI chat image exceeds the allowed size"));

check("local providers require explicit env/admin configuration instead of defaults",
  policy.includes("process.env[baseEnvName]") &&
  policy.includes('input.source === "admin"') &&
  routes.includes("isExplicitLocalProviderConfigured"));

for (const [label, start, end, endpoint] of [
  ["study plan", '"/study-plan"', '"/learning-path"', 'endpoint: "/ai/study-plan"'],
  ["learning path", '"/learning-path"', '"/remediation-plan"', 'endpoint: "/ai/learning-path"'],
  ["remediation plan", '"/remediation-plan"', '"/question"', 'endpoint: "/ai/remediation-plan"'],
  ["question authoring", '"/question"', '"/course-summary"', 'endpoint: "/ai/question"'],
  ["course summary", '"/course-summary"', "", 'endpoint: "/ai/course-summary"'],
]) {
  const section = sliceRoute(start, end);
  check(`${label} uses the shared budgeted gateway`,
    section.includes("runBudgetedAiRequest") && section.includes(endpoint));
}

check("course summary cannot spend for guests by default",
  sliceRoute('"/course-summary"', "").includes("optionalAuth") &&
  sliceRoute('"/course-summary"', "").includes("AI_GUEST_EXTERNAL_ENABLED"));

check("admin navigation exposes one AI management entry",
  admin.includes("إدارة الذكاء الاصطناعي") &&
  manager.includes("إدارة الذكاء الاصطناعي والمساعدين"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-1-secure-gateway", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
