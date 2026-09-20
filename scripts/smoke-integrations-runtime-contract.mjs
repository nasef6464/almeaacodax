import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const contentRoutes = read("server/src/routes/content.routes.ts");
const integrationRoutes = read("server/src/modules/content/http/contentPlatformIntegrationRoutes.ts");
const integrationRuntime = read("server/src/modules/content/integrations/platformIntegrationRuntime.ts");
const notificationRoutes = read("server/src/routes/notification.routes.ts");
const notificationService = read("server/src/services/notificationService.ts");
const api = read("services/api.ts");
const managerWrapper = read("dashboards/admin/PlatformIntegrationsManager.tsx");
const managerLegacy = read("dashboards/admin/PlatformIntegrationsManagerLegacy.tsx");
const manager = `${managerWrapper}\n${managerLegacy}`;

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const includes = (source, snippet) => {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${snippet}`);
  }
};

check("platform integrations response masks secrets and preserves old values on partial save", () => {
  includes(integrationRuntime, "maskSensitiveProviderValues");
  includes(integrationRuntime, "mergeSensitiveProviderValues");
  includes(integrationRoutes, "decryptIntegrationSecretsForRuntime");
  includes(integrationRoutes, "encryptIntegrationSecretsAtRest");
  includes(integrationRuntime, "providerSecretState");
  includes(integrationRoutes, '"/platform-integrations"');
});

check("platform integrations route uses encryption helper import", () => {
  includes(integrationRoutes, 'from "../../../utils/integrationSecretsCrypto.js"');
});

check("integration history list returns masked secret state only", () => {
  includes(integrationRoutes, "/platform-integrations/history");
  includes(integrationRoutes, "safeHistory");
  includes(integrationRuntime, "providerSecretState");
  includes(integrationRoutes, "snapshot");
  includes(integrationRuntime, "maskIntegrationSnapshot");
});

check("integration restore endpoint returns masked settings", () => {
  includes(integrationRoutes, "/platform-integrations/history/:id/restore");
  includes(integrationRoutes, "runtimeSnapshot");
  includes(integrationRoutes, "encryptedPayload");
  includes(integrationRoutes, "safeSettings");
  includes(integrationRoutes, "return res.json({ settings: safeSettings, restoredFrom");
});

check("runtime audit endpoint exists and includes env/runtime readiness checks", () => {
  includes(integrationRoutes, '"/platform-integrations/runtime-audit"');
  includes(integrationRoutes, "runtimeReady");
  includes(integrationRoutes, "getRedisHealth(\"queue\"");
  includes(integrationRoutes, "WHATSAPP_PROVIDER");
  includes(integrationRoutes, "EMAIL_PROVIDER");
  includes(integrationRoutes, "SENTRY_DSN");
});

check("setup checklist endpoint still exists with callback/webhook guidance", () => {
  includes(integrationRoutes, '"/platform-integrations/setup-checklist"');
  includes(integrationRoutes, "callbackUrl");
  includes(integrationRoutes, "webhookUrl");
  includes(integrationRoutes, "GOOGLE_CLIENT_ID");
  includes(integrationRoutes, "WHATSAPP_ACCESS_TOKEN");
});

check("admin test-delivery endpoint exists for email and whatsapp", () => {
  includes(notificationRoutes, '"/admin/test-delivery"');
  includes(notificationRoutes, "integrationTestSchema");
  includes(notificationRoutes, "recipientEmail is required for email test.");
  includes(notificationRoutes, "recipientPhone is required for whatsapp test.");
  includes(notificationRoutes, "sendExternalNotification");
});

check("notification service forwards recipient phone for whatsapp deliveries", () => {
  includes(notificationService, "phone?: string;");
  includes(notificationService, '.select("_id id name email role phone")');
  includes(notificationService, "recipientPhone: recipient.phone || \"\",");
});

check("frontend API exposes runtime audit and test delivery actions", () => {
  includes(api, "getPlatformIntegrationsRuntimeAudit");
  includes(api, "testIntegrationDelivery");
  includes(api, '"/notifications/admin/test-delivery"');
});

check("integrations manager composition preserves runtime audit and send test controls", () => {
  includes(managerWrapper, "PlatformIntegrationsManagerLegacy");
  includes(manager, "فحص التشغيل الفعلي (Runtime)");
  includes(manager, "اختبار إرسال التكاملات");
  includes(manager, "sendIntegrationTest");
  includes(manager, "testChannel");
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} integrations runtime checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} integrations runtime checks passed.`);
