import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeFile = 'server/src/routes/content.routes.ts';
const integrationRouteFile = 'server/src/modules/content/http/contentPlatformIntegrationRoutes.ts';
const runtimeFile = 'server/src/modules/content/integrations/platformIntegrationRuntime.ts';
const defaultsFile = 'server/src/modules/content/integrations/platformIntegrationDefaults.ts';
const routeSource = fs.readFileSync(path.join(root, routeFile), 'utf8').replace(/\r\n/g, '\n');
const integrationRouteSource = fs.readFileSync(path.join(root, integrationRouteFile), 'utf8').replace(/\r\n/g, '\n');
const runtimeSource = fs.readFileSync(path.join(root, runtimeFile), 'utf8').replace(/\r\n/g, '\n');
const defaultsExists = fs.existsSync(path.join(root, defaultsFile));
const defaultsSource = defaultsExists ? fs.readFileSync(path.join(root, defaultsFile), 'utf8').replace(/\r\n/g, '\n') : '';
const lineCount = (source) => source.split(/\r?\n/).length;

const defaultsImport = 'from "../integrations/platformIntegrationDefaults.js";';
const localDeclaration = 'const defaultPlatformIntegrationSettings = {';
const delegated =
  routeSource.includes('contentRouter.use(contentPlatformIntegrationRouter);') &&
  integrationRouteSource.includes(defaultsImport);
const ownerSource = delegated ? defaultsSource : routeSource;

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('integration fallback data remains semantically stable', () => {
  for (const fragment of [
    'allowSelfRegistration: true',
    'allowEmailPassword: true',
    'defaultRole: "student"',
    'maxAccountsPerDevice: 3',
    'google: { enabled: false, mode: "oauth"',
    'whatsapp: { enabled: false, mode: "otp"',
    'sentry: { enabled: false, mode: "dsn"',
    'redis: { enabled: false, mode: "managed"',
    'robotsIndexingEnabled: true',
    'channel: "whatsapp"',
    'id: "eduoma"',
    'platformType: "lms"',
    '{ id: "full_name", key: "name"',
    '{ id: "email", key: "email"',
    '{ id: "phone", key: "phone"',
  ]) assert.ok(ownerSource.includes(fragment), `platform integration defaults missing ${fragment}`);
});

check('integration defaults ownership is exclusive after delegation while pre-apply stays valid', () => {
  if (delegated) {
    assert.ok(defaultsExists, 'delegated route requires platformIntegrationDefaults.ts');
    assert.ok(defaultsSource.includes('export const defaultPlatformIntegrationSettings = {'), 'integration defaults export missing');
    assert.ok(!routeSource.includes(localDeclaration), 'route retained integration defaults after delegation');
  } else {
    assert.ok(routeSource.includes(localDeclaration), 'pre-apply route lost integration defaults');
    assert.ok(!defaultsExists, 'integration defaults module exists before route delegation');
  }
});

check('platform integration HTTP and persistence behavior stays route-owned', () => {
  for (const fragment of [
    '"/platform-integrations"',
    'PlatformIntegrationSettingsModel',
    'platformIntegrationSettingsSchema.parse(',
    'platformIntegrationSettingsPatchSchema.parse(',
    'sanitizeAndValidateExternalPlatforms',
    'requireRole(["admin"])',
  ]) assert.ok(integrationRouteSource.includes(fragment), `integration route lost platform integration behavior: ${fragment}`);
});

check('secret handling and runtime integration security stay route-owned', () => {
  for (const fragment of [
    'const SENSITIVE_PROVIDER_FIELDS =',
    'const SENSITIVE_EXTERNAL_PLATFORM_FIELDS =',
    'export const maskSensitiveProviderValues =',
    'export const mergeSensitiveProviderValues =',
    'export const maskIntegrationSnapshot =',
    'export const normalizeBaseUrl =',
    'export const buildPublicBaseUrl =',
  ]) assert.ok(runtimeSource.includes(fragment), `integration runtime helper lost ${fragment}`);
  for (const fragment of [
    'decryptIntegrationSecretsForRuntime',
    'encryptIntegrationSecretsAtRest',
  ]) assert.ok(integrationRouteSource.includes(fragment), `integration route lost crypto ownership: ${fragment}`);
});

check('integration defaults module remains data-only and bounded after delegation', () => {
  if (!delegated) return;
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'StatusCodes',
    'findOne', 'findById', 'findOneAndUpdate', 'process.env',
    'sanitizeAndValidateExternalPlatforms', 'maskSensitiveProviderValues', 'mergeSensitiveProviderValues',
    'decryptIntegrationSecretsForRuntime', 'encryptIntegrationSecretsAtRest', 'SENSITIVE_PROVIDER_FIELDS',
  ]) assert.ok(!defaultsSource.includes(forbidden), `integration defaults module must not include ${forbidden}`);
  assert.ok(lineCount(defaultsSource) <= 120, `platformIntegrationDefaults.ts exceeded 120 lines (${lineCount(defaultsSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'content-platform-integration-defaults-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  integrationRouteLines: lineCount(integrationRouteSource),
  runtimeLines: lineCount(runtimeSource),
  defaultsLines: defaultsExists ? lineCount(defaultsSource) : 0,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
