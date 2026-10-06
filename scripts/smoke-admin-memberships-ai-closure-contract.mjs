import { readFile } from "node:fs/promises";

const adminDashboardSource = await readFile(new URL("../dashboards/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const membershipsSource = await readFile(new URL("../dashboards/admin/MembershipsManager.tsx", import.meta.url), "utf8").catch(() => "");
const integrationsWrapperSource = await readFile(new URL("../dashboards/admin/PlatformIntegrationsManager.tsx", import.meta.url), "utf8");
const integrationsLegacySource = await readFile(new URL("../dashboards/admin/PlatformIntegrationsManagerLegacy.tsx", import.meta.url), "utf8");
const integrationsSource = `${integrationsWrapperSource}\n${integrationsLegacySource}`;
const assistantSource = await readFile(new URL("../dashboards/admin/AiAssistantManager.tsx", import.meta.url), "utf8");
const aiRouteSource = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const packageJsonSource = await readFile(new URL("../package.json", import.meta.url), "utf8");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing fragment: ${fragment}`);
  }
}

check("admin dashboard exposes a first-class memberships tab", () => {
  assertIncludes(adminDashboardSource, "MembershipsManager");
  assertIncludes(adminDashboardSource, "id: 'memberships'");
  assertIncludes(adminDashboardSource, "label: 'العضويات'");
  assertIncludes(adminDashboardSource, "case 'memberships'");
});

check("memberships manager consolidates public packages and subscriber visibility", () => {
  assertIncludes(membershipsSource, "إدارة العضويات");
  assertIncludes(membershipsSource, "publicPackages");
  assertIncludes(membershipsSource, "premiumUsers");
  assertIncludes(membershipsSource, "paymentRequests");
  assertIncludes(membershipsSource, "window.location.hash = '#/admin-dashboard?tab=paths'");
  assertIncludes(membershipsSource, "window.location.hash = '#/admin-dashboard?tab=financial'");
});

check("integrations manager composition preserves student AI runtime diagnostics", () => {
  assertIncludes(integrationsWrapperSource, "PlatformIntegrationsManagerLegacy");
  assertIncludes(integrationsSource, "studentAiRuntimeSummary");
  assertIncludes(integrationsSource, "api.aiStatus()");
  assertIncludes(integrationsSource, "api.aiReadiness()");
  assertIncludes(integrationsSource, "api.getAiInteractions(12)");
  assertIncludes(integrationsSource, "lastStudentFallbackReason");
  assertIncludes(integrationsSource, "مساعد الطالب");
  assertIncludes(integrationsSource, "اختبار مزود الطالب");
});

check("assistant manager surfaces provider source and fallback state", () => {
  assertIncludes(assistantSource, "providerOrderSource");
  assertIncludes(assistantSource, "fallbackStudentChats24h");
  assertIncludes(assistantSource, "اختبر المزود");
});

check("ai route returns enough metadata to debug old/fallback student assistant", () => {
  assertIncludes(aiRouteSource, "providerErrors");
  assertIncludes(aiRouteSource, "fallbackReason");
  assertIncludes(aiRouteSource, "responseFailureMessage");
  assertIncludes(aiRouteSource, "providerOrderSource");
  assertIncludes(aiRouteSource, "usedFallback");
});

check("package exposes closure smoke script", () => {
  assertIncludes(packageJsonSource, '"smoke:admin-memberships-ai-closure"');
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Admin memberships + AI closure contract passed (${checks.length} checks).`);
