import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeFile = 'server/src/routes/content.routes.ts';
const defaultsFile = 'server/src/modules/content/integrations/platformIntegrationDefaults.ts';
const routeSource = fs.readFileSync(path.join(root, routeFile), 'utf8').replace(/\r\n/g, '\n');
const defaultsExists = fs.existsSync(path.join(root, defaultsFile));
const defaultsSource = defaultsExists ? fs.readFileSync(path.join(root, defaultsFile), 'utf8').replace(/\r\n/g, '\n') : '';
const lineCount = (source) => source.split(/\r?\n/).length;

const defaultsImport = 'import { defaultPlatformIntegrationSettings } from "../modules/content/integrations/platformIntegrationDefaults.js";';
const localDeclaration = 'const defaultPlatformIntegrationSettings = {';
const delegated = routeSource.includes(defaultsImport);
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
  ]) assert.ok(routeSource.includes(fragment), `content route lost platform integration behavior: ${fragment}`);
});

check('secret handling and runtime integration security stay route-owned', () => {
  for (const fragment of [
    'const SENSITIVE_PROVIDER_FIELDS =',
    'const SENSITIVE_EXTERNAL_PLATFORM_FIELDS =',
    'const maskSensitiveProviderValues =',
    'const mergeSensitiveProviderValues =',
    'decryptIntegrationSecretsForRuntime',
    'encryptIntegrationSecretsAtRest',
    'const maskIntegrationSnapshot =',
    'const normalizeBaseUrl =',
    'const buildPublicBaseUrl =',
  ]) assert.ok(routeSource.includes(fragment), `content route lost integration security/runtime ownership: ${fragment}`);
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
  defaultsLines: defaultsExists ? lineCount(defaultsSource) : 0,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
