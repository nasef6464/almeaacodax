import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const builder = read('server/src/modules/product-config/application/publicProductConfig.ts');
const adminDashboard = read('dashboards/admin/AdminDashboard.tsx');
const homepage = read('dashboards/admin/HomepageManager.tsx');
const fonts = read('dashboards/admin/PlatformFontsManager.tsx');
const integrationsWrapper = read('dashboards/admin/PlatformIntegrationsManager.tsx');
const integrationsLegacy = read('dashboards/admin/PlatformIntegrationsManagerLegacy.tsx');
const sellablePanel = read('dashboards/admin/ProductConfigSellableSettingsPanel.tsx');
const integrationSchemas = read('server/src/modules/content/http/platformIntegrationSchemas.ts');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('ProductConfig composes the existing settings owners instead of a parallel configuration store', () => {
  assertIncludes(builder, 'homepageSettingsSchema');
  assertIncludes(builder, 'platformFontSettingsSchema');
  assertIncludes(builder, 'platformIntegrationSettingsSchema');
  assertIncludes(builder, 'defaultHomepageSettings');
  assertIncludes(builder, 'defaultPlatformFontSettings');
  assertIncludes(builder, 'defaultPlatformIntegrationSettings');
  assertNotIncludes(builder, 'ProductConfigModel');
  assertNotIncludes(builder, 'mongoose');
});

check('admin dashboard exposes each authoritative settings surface', () => {
  assertIncludes(adminDashboard, "import('./HomepageManager')");
  assertIncludes(adminDashboard, "import('./PlatformFontsManager')");
  assertIncludes(adminDashboard, "import('./PlatformIntegrationsManager')");
  assertIncludes(adminDashboard, "id: 'homepage'");
  assertIncludes(adminDashboard, "id: 'platform-fonts'");
  assertIncludes(adminDashboard, "id: 'platform-integrations'");
  assertIncludes(adminDashboard, '<HomepageManager />');
  assertIncludes(adminDashboard, '<PlatformFontsManager />');
  assertIncludes(adminDashboard, '<PlatformIntegrationsManager />');
});

check('branding and navigation remain owned by HomepageSettings admin APIs', () => {
  assertIncludes(homepage, 'api.getHomepageSettings()');
  assertIncludes(homepage, 'api.updateHomepageSettings(payload)');
  for (const field of ['logoUrl', 'logoAlt', 'logoText', 'logoAccentText', 'showAutoPaths', 'moreLabel']) {
    assertIncludes(homepage, field, `Homepage admin does not expose ${field}`);
  }
});

check('typography remains owned by PlatformFontSettings admin APIs', () => {
  assertIncludes(fonts, 'api.getPlatformFontSettings()');
  assertIncludes(fonts, 'api.updatePlatformFontSettings(settings)');
  for (const field of [
    'bodyFont', 'headingFont', 'navigationFont', 'buttonFont',
    'bodySize', 'headingSize', 'navigationSize', 'buttonSize',
    'bodyWeight', 'headingWeight', 'navigationWeight', 'buttonWeight',
    'bodyColor', 'headingColor', 'navigationColor', 'buttonColor',
  ]) {
    assertIncludes(fonts, field, `Font admin does not expose ${field}`);
  }
});

check('platform integration admin keeps existing auth provider SEO and contact ownership', () => {
  assertIncludes(integrationsWrapper, "import { ProductConfigSellableSettingsPanel } from './ProductConfigSellableSettingsPanel';");
  assertIncludes(integrationsWrapper, "import { PlatformIntegrationsManager as LegacyPlatformIntegrationsManager } from './PlatformIntegrationsManagerLegacy';");
  assertIncludes(integrationsLegacy, 'getPlatformIntegrations()');
  assertIncludes(integrationsLegacy, 'api.updatePlatformIntegrations(normalized)');
  for (const field of ['allowSelfRegistration', 'allowEmailPassword', 'requireEmailVerification', 'requireAdminApproval']) {
    assertIncludes(integrationsLegacy, `updateAuth("${field}"`, `Integration admin does not expose ${field}`);
  }
  for (const field of ['enabled', 'siteName', 'defaultTitle', 'defaultDescription', 'canonicalBaseUrl', 'defaultOgImage', 'robotsIndexingEnabled']) {
    assertIncludes(integrationsLegacy, `updateSeo("${field}"`, `Integration admin does not expose SEO ${field}`);
  }
  for (const field of ['enabled', 'channel', 'whatsappNumber', 'whatsappMessage', 'openInNewTab', 'showOnPublicPages', 'showOnDashboardPages']) {
    assertIncludes(integrationsLegacy, `updateContactWidget("${field}"`, `Integration admin does not expose contact ${field}`);
  }
});

check('composed integration managers refresh legacy state after a sellable-field save', () => {
  assertIncludes(integrationsWrapper, 'const [legacyRevision, setLegacyRevision] = useState(0);');
  assertIncludes(integrationsWrapper, 'onSaved={() => setLegacyRevision((current) => current + 1)}');
  assertIncludes(integrationsWrapper, '<LegacyPlatformIntegrationsManager key={legacyRevision} />');
  assertIncludes(sellablePanel, 'onSaved?.();');
});

check('all public providers have one generic admin ownership loop and public output remains secret-free', () => {
  for (const provider of ['google', 'facebook', 'whatsapp', 'telegram', 'email', 'sentry', 'redis', 'zoom', 'googleMeet', 'teams', 'youtubeLive']) {
    assertIncludes(integrationsLegacy, `{ key: "${provider}"`, `Missing provider admin entry: ${provider}`);
    assertIncludes(builder, `${provider}: publicProvider(providers.${provider})`, `Missing public provider projection: ${provider}`);
  }
  assertIncludes(integrationsLegacy, 'updateProvider(provider.key, { enabled: e.target.checked })');
  const providerSchemaBlock = builder.slice(
    builder.indexOf('const publicProviderSchema'),
    builder.indexOf('export const publicProductConfigSchema'),
  );
  assertIncludes(providerSchemaBlock, 'enabled: z.boolean()');
  assertIncludes(providerSchemaBlock, 'mode: z.string()');
  for (const secret of ['clientSecret', 'appSecret', 'apiKey', 'accessToken', 'botToken', 'verifyToken', 'webhookSecret']) {
    assertNotIncludes(providerSchemaBlock, secret, `Public provider schema exposes secret field ${secret}`);
  }
});

check('sellable registration and organization fields have an explicit admin path on the same PlatformIntegrationSettings owner', () => {
  assertIncludes(sellablePanel, 'data-testid="product-config-sellable-settings-panel"');
  assertIncludes(sellablePanel, 'api.getPlatformIntegrations()');
  assertIncludes(sellablePanel, 'api.updatePlatformIntegrations(patch)');
  assertIncludes(integrationSchemas, 'auth: platformIntegrationSettingsSchema.shape.auth.partial().optional()');
  assertIncludes(integrationSchemas, 'seo: seoSettingsSchema.partial().optional()');

  for (const testId of [
    'product-config-default-role',
    'product-config-registration-title',
    'product-config-registration-subtitle',
    'product-config-terms-link',
    'product-config-privacy-link',
    'product-config-default-keywords',
    'product-config-organization-name',
    'product-config-organization-logo-url',
    'product-config-organization-url',
  ]) {
    assertIncludes(sellablePanel, `data-testid="${testId}"`, `Missing sellable admin control ${testId}`);
  }

  for (const field of ['registrationTitle', 'registrationSubtitle', 'termsLink', 'privacyLink']) {
    assertIncludes(builder, `integrationSettings.auth.${field}`, `ProductConfig does not project auth field ${field}`);
  }
  for (const field of ['defaultKeywords', 'organizationName', 'organizationLogoUrl', 'organizationUrl']) {
    assertIncludes(builder, `integrationSettings.seo.${field}`, `ProductConfig does not project SEO field ${field}`);
  }
});

check('supplemental sellable panel writes only nested auth and SEO patches, avoiding duplicate provider or secret ownership', () => {
  assertIncludes(sellablePanel, 'const patch: IntegrationPayload = {');
  assertIncludes(sellablePanel, 'auth: {');
  assertIncludes(sellablePanel, 'seo: {');
  assertNotIncludes(sellablePanel, 'providers:');
  assertNotIncludes(sellablePanel, 'contactWidget:');
  assertNotIncludes(sellablePanel, 'clientSecret');
  assertNotIncludes(sellablePanel, 'apiKey');
  assertNotIncludes(sellablePanel, 'accessToken');
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'product-config-admin-ownership',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
