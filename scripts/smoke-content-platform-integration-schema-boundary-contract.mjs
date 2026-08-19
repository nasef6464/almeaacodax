import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeFile = 'server/src/routes/content.routes.ts';
const schemaFile = 'server/src/modules/content/http/platformIntegrationSchemas.ts';
const routeSource = fs.readFileSync(path.join(root, routeFile), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, schemaFile), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "../modules/content/http/platformIntegrationSchemas.js";';
const delegated = routeSource.includes(schemaImport);

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('platform integration transport schemas preserve provider secrets and defaults', () => {
  for (const fragment of [
    'enabled: z.boolean().default(false)',
    'mode: z.string().default("oauth")',
    'appSecret: z.string().optional().default("")',
    'clientSecret: z.string().optional().default("")',
    'apiKey: z.string().optional().default("")',
    'accessToken: z.string().optional().default("")',
    'botToken: z.string().optional().default("")',
    'verifyToken: z.string().optional().default("")',
  ]) assert.ok(schemaSource.includes(fragment), `provider contract missing ${fragment}`);
});

check('provider matrix and integration modes remain unchanged', () => {
  for (const fragment of [
    'google: providerSettingsSchema.default({ enabled: false, mode: "oauth" })',
    'facebook: providerSettingsSchema.default({ enabled: false, mode: "oauth" })',
    'whatsapp: providerSettingsSchema.default({ enabled: false, mode: "otp" })',
    'telegram: providerSettingsSchema.default({ enabled: false, mode: "bot" })',
    'email: providerSettingsSchema.default({ enabled: false, mode: "smtp" })',
    'sentry: providerSettingsSchema.default({ enabled: false, mode: "dsn" })',
    'redis: providerSettingsSchema.default({ enabled: false, mode: "managed" })',
    'zoom: providerSettingsSchema.default({ enabled: false, mode: "oauth" })',
    'googleMeet: providerSettingsSchema.default({ enabled: false, mode: "oauth" })',
    'teams: providerSettingsSchema.default({ enabled: false, mode: "oauth" })',
    'youtubeLive: providerSettingsSchema.default({ enabled: false, mode: "api" })',
  ]) assert.ok(schemaSource.includes(fragment), `provider matrix missing ${fragment}`);
});

check('auth, seo, contact, external platform and registration semantics are preserved', () => {
  for (const fragment of [
    'defaultRole: z.enum(["student", "parent"]).default("student")',
    'maxAccountsPerDevice: z.number().int().min(1).max(20).default(3)',
    'noIndexPaths: z.array(z.string()).default(["/#/admin-dashboard", "/#/dashboard", "/#/login"])',
    'channel: z.enum(["whatsapp", "telegram", "phone"]).default("whatsapp")',
    'apiKeys: z.array(z.string()).optional().default([])',
    'webhookSecret: z.string().optional().default("")',
    'syncStudents: z.boolean().default(false)',
    'syncCourses: z.boolean().default(false)',
    'syncOrders: z.boolean().default(false)',
    'type: z.enum(["text", "email", "phone", "select", "textarea"]).default("text")',
  ]) assert.ok(schemaSource.includes(fragment), `integration contract missing ${fragment}`);
});

check('patch schema keeps nested partial update behavior', () => {
  for (const fragment of [
    'const providerSettingsPatchSchema = providerSettingsSchema.partial();',
    'auth: platformIntegrationSettingsSchema.shape.auth.partial().optional()',
    '}).partial().optional()',
    'seo: seoSettingsSchema.partial().optional()',
    'contactWidget: contactWidgetSchema.partial().optional()',
    'externalPlatforms: z.array(externalPlatformSchema).optional()',
    'registrationFields: platformIntegrationSettingsSchema.shape.registrationFields.optional()',
  ]) assert.ok(schemaSource.includes(fragment), `patch contract missing ${fragment}`);
});

check('route parser call sites remain unchanged after ownership moves', () => {
  for (const fragment of [
    'const partialPayload = platformIntegrationSettingsPatchSchema.parse(req.body);',
    'const payload = platformIntegrationSettingsSchema.parse(nextPayload);',
    'const parsedSnapshot = platformIntegrationSettingsSchema.parse(runtimeSnapshot as Record<string, unknown>);',
  ]) assert.ok(routeSource.includes(fragment), `route parser call missing ${fragment}`);
});

check('schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  const localDeclarations = [
    'const providerSettingsSchema = z.object({',
    'const externalPlatformSchema = z.object({',
    'const seoSettingsSchema = z.object({',
    'const contactWidgetSchema = z.object({',
    'const platformIntegrationSettingsSchema = z.object({',
    'const providerSettingsPatchSchema = providerSettingsSchema.partial();',
    'const platformIntegrationSettingsPatchSchema = z.object({',
  ];
  if (delegated) {
    for (const declaration of localDeclarations) assert.ok(!routeSource.includes(declaration), `delegated route still owns ${declaration}`);
  } else {
    for (const declaration of localDeclarations) assert.ok(routeSource.includes(declaration), `pre-apply route lost ${declaration}`);
  }
});

check('platform integration schema module remains transport-only and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env',
    'encryptIntegrationSecretsAtRest', 'decryptIntegrationSecretsForRuntime', 'maskSensitiveProviderValues', 'Date.now',
  ]) assert.ok(!schemaSource.includes(forbidden), `schema module must not include ${forbidden}`);
  assert.ok(lineCount(schemaSource) <= 180, `platformIntegrationSchemas.ts exceeded 180 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length) {
  console.error('[content-platform-integration-schema-boundary] FAILED');
  console.error(JSON.stringify(checks, null, 2));
  process.exit(1);
}
console.log('[content-platform-integration-schema-boundary] PASS');
console.log(JSON.stringify({ delegated, routeLines: lineCount(routeSource), schemaLines: lineCount(schemaSource), checks }, null, 2));
