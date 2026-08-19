import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeFile = 'server/src/routes/content.routes.ts';
const defaultsFile = 'server/src/modules/content/presentation/platformPresentationDefaults.ts';
const integrationDefaultsFile = 'server/src/modules/content/integrations/platformIntegrationDefaults.ts';
const homepageContractFile = 'scripts/smoke-homepage-hero-contract.mjs';
const routeSource = fs.readFileSync(path.join(root, routeFile), 'utf8').replace(/\r\n/g, '\n');
const homepageContractSource = fs.readFileSync(path.join(root, homepageContractFile), 'utf8').replace(/\r\n/g, '\n');
const defaultsExists = fs.existsSync(path.join(root, defaultsFile));
const defaultsSource = defaultsExists ? fs.readFileSync(path.join(root, defaultsFile), 'utf8').replace(/\r\n/g, '\n') : '';
const integrationDefaultsExists = fs.existsSync(path.join(root, integrationDefaultsFile));
const integrationDefaultsSource = integrationDefaultsExists
  ? fs.readFileSync(path.join(root, integrationDefaultsFile), 'utf8').replace(/\r\n/g, '\n')
  : '';
const lineCount = (source) => source.split(/\r?\n/).length;

const defaultsImport = 'import { defaultHomepageSettings, defaultPlatformFontSettings } from "../modules/content/presentation/platformPresentationDefaults.js";';
const integrationDefaultsImport = 'import { defaultPlatformIntegrationSettings } from "../modules/content/integrations/platformIntegrationDefaults.js";';
const homepageDeclaration = 'const defaultHomepageSettings = {';
const fontDeclaration = 'const defaultPlatformFontSettings = {';
const integrationDefaultsDeclaration = 'const defaultPlatformIntegrationSettings = {';
const delegated = routeSource.includes(defaultsImport);
const integrationDefaultsDelegated = routeSource.includes(integrationDefaultsImport);
const ownerSource = delegated ? defaultsSource : routeSource;
const oldHomepageOwnerAssertion = `assertIncludes('server/src/routes/content.routes.ts', 'imageUrl: "/images/homepage-hero-boy-platform.jpg');`;
const newHomepageOwnerAssertion = `assertIncludes('server/src/modules/content/presentation/platformPresentationDefaults.ts', 'imageUrl: "/images/homepage-hero-boy-platform.jpg');`;

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('homepage presentation defaults preserve their public fallback semantics', () => {
  for (const fragment of [
    'key: "default"',
    'badgeText: "المنصة الأولى للقدرات والتحصيلي"',
    'imageUrl: "/images/homepage-hero-boy-platform.jpg?v=20260512"',
    'imageAlt: "طالب يستخدم منصة المئة"',
    'showAutoPaths: true',
    'featuredPathIds: []',
    'featuredCourseIds: []',
    'featuredArticleLessonIds: []',
  ]) assert.ok(ownerSource.includes(fragment), `homepage presentation defaults missing ${fragment}`);
});

check('platform font defaults preserve their fallback semantics', () => {
  for (const fragment of [
    'bodyFont: "tajawal"',
    'headingFont: "tajawal"',
    'navigationFont: "tajawal"',
    'buttonFont: "tajawal"',
    'bodyCustomFont: {}',
    'headingCustomFont: {}',
  ]) assert.ok(ownerSource.includes(fragment), `platform font defaults missing ${fragment}`);
});

check('presentation default ownership is exclusive after delegation while pre-apply stays valid', () => {
  if (delegated) {
    assert.ok(defaultsExists, 'delegated route requires platformPresentationDefaults.ts');
    assert.ok(defaultsSource.includes('export const defaultHomepageSettings = {'), 'homepage defaults export missing');
    assert.ok(defaultsSource.includes('export const defaultPlatformFontSettings = {'), 'platform font defaults export missing');
    assert.ok(!routeSource.includes(homepageDeclaration), 'route retained homepage defaults after delegation');
    assert.ok(!routeSource.includes(fontDeclaration), 'route retained platform font defaults after delegation');
  } else {
    assert.ok(routeSource.includes(homepageDeclaration), 'pre-apply route lost homepage defaults');
    assert.ok(routeSource.includes(fontDeclaration), 'pre-apply route lost platform font defaults');
    assert.ok(!defaultsExists, 'presentation defaults module exists before route delegation');
  }
});

check('homepage source-coupled contract follows the active owner', () => {
  if (delegated) {
    assert.ok(homepageContractSource.includes(newHomepageOwnerAssertion), 'homepage contract does not follow delegated defaults owner');
    assert.ok(!homepageContractSource.includes(oldHomepageOwnerAssertion), 'homepage contract still pins default image to route owner');
  } else {
    assert.ok(homepageContractSource.includes(oldHomepageOwnerAssertion), 'pre-apply homepage contract lost route owner assertion');
  }
});

check('homepage and platform-font HTTP behavior remains route-owned', () => {
  for (const fragment of [
    'homepageSettingsSchema.parse(req.body)',
    'platformFontSettingsSchema.parse(req.body)',
    'HomepageSettingsModel',
    'PlatformFontSettingsModel',
    'requireRole(["admin"])',
    '"/homepage-settings"',
    '"/platform-font-settings"',
  ]) assert.ok(routeSource.includes(fragment), `content route lost presentation HTTP behavior: ${fragment}`);
});

check('presentation defaults module remains data-only and bounded after delegation', () => {
  if (!delegated) return;
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'StatusCodes',
    'findOne', 'findById', 'findOneAndUpdate', 'sanitizeAndValidateExternalPlatforms',
    'defaultPlatformIntegrationSettings', 'SENSITIVE_PROVIDER_FIELDS',
  ]) assert.ok(!defaultsSource.includes(forbidden), `presentation defaults module must not include ${forbidden}`);
  assert.ok(lineCount(defaultsSource) <= 180, `platformPresentationDefaults.ts exceeded 180 lines (${lineCount(defaultsSource)}).`);
});

check('integration defaults keep their own owner and never cross into presentation defaults', () => {
  assert.ok(!defaultsSource.includes('defaultPlatformIntegrationSettings'), 'presentation defaults absorbed integration defaults');
  if (integrationDefaultsDelegated) {
    assert.ok(integrationDefaultsExists, 'delegated integration defaults module is missing');
    assert.ok(
      integrationDefaultsSource.includes('export const defaultPlatformIntegrationSettings = {'),
      'delegated integration defaults export is missing',
    );
    assert.ok(!routeSource.includes(integrationDefaultsDeclaration), 'route retained integration defaults after dedicated delegation');
  } else {
    assert.ok(routeSource.includes(integrationDefaultsDeclaration), 'pre-integration-delegation route lost integration defaults');
  }
});

check('security and runtime ownership stays outside the presentation-default batch', () => {
  for (const fragment of [
    'const sanitizeAndValidateExternalPlatforms =',
    'const hasSchoolIdManagementScope = async (',
    'const buildScopedGroupCreatePayload = async (',
    'const SENSITIVE_PROVIDER_FIELDS =',
    'const maskSensitiveProviderValues =',
    'const mergeSensitiveProviderValues =',
    'decryptIntegrationSecretsForRuntime',
    'encryptIntegrationSecretsAtRest',
  ]) assert.ok(routeSource.includes(fragment), `content route lost security/runtime ownership: ${fragment}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'content-platform-presentation-defaults-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  integrationDefaultsDelegated,
  routeLines: lineCount(routeSource),
  defaultsLines: defaultsExists ? lineCount(defaultsSource) : 0,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
