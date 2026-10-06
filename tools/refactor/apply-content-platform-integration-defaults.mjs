import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
const defaultsPath = path.join(root, 'server/src/modules/content/integrations/platformIntegrationDefaults.ts');
let routeSource = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "../modules/content/http/platformIntegrationSchemas.js";';
const defaultsImport = 'import { defaultPlatformIntegrationSettings } from "../modules/content/integrations/platformIntegrationDefaults.js";';
const rangeStart = 'const defaultPlatformIntegrationSettings = {';
const rangeEnd = 'const normalizeBaseUrl =';

const alreadyApplied =
  routeSource.includes(defaultsImport) &&
  !routeSource.includes(rangeStart) &&
  fs.existsSync(defaultsPath);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-platform-integration-defaults' }, null, 2));
  process.exit(0);
}

if (!routeSource.includes(importAnchor)) throw new Error('Platform integration schema import anchor not found.');
if (routeSource.includes(defaultsImport)) throw new Error('Platform integration defaults import exists while local ownership remains.');
if (fs.existsSync(defaultsPath)) throw new Error('Platform integration defaults module exists before route delegation.');

const startIndex = routeSource.indexOf(rangeStart);
const endIndex = routeSource.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Platform integration defaults range not found.');
if (routeSource.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Platform integration defaults anchor is ambiguous.');

const range = routeSource.slice(startIndex, endIndex).trimEnd();
for (const forbidden of [
  'const sanitizeAndValidateExternalPlatforms =',
  'const normalizeBaseUrl =',
  'const SENSITIVE_PROVIDER_FIELDS =',
  'const maskSensitiveProviderValues =',
  'const mergeSensitiveProviderValues =',
  'decryptIntegrationSecretsForRuntime',
  'encryptIntegrationSecretsAtRest',
]) {
  if (range.includes(forbidden)) throw new Error(`Integration defaults extraction crossed security/runtime ownership boundary: ${forbidden}`);
}

const defaultsSource = `${range.replace(rangeStart, 'export const defaultPlatformIntegrationSettings = {')}\n`;
const nextRouteSource = `${routeSource.slice(0, startIndex)}${routeSource.slice(endIndex)}`.replace(
  importAnchor,
  `${importAnchor}\n${defaultsImport}`,
);

if (nextRouteSource.includes(rangeStart)) throw new Error('Inline platform integration defaults remained after extraction.');
if (!nextRouteSource.includes(defaultsImport)) throw new Error('Platform integration defaults import insertion failed.');
if (!defaultsSource.includes('export const defaultPlatformIntegrationSettings = {')) throw new Error('Platform integration defaults export generation failed.');

fs.mkdirSync(path.dirname(defaultsPath), { recursive: true });
fs.writeFileSync(defaultsPath, defaultsSource);
fs.writeFileSync(routePath, nextRouteSource);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'content-platform-integration-defaults',
  files: [
    'server/src/routes/content.routes.ts',
    'server/src/modules/content/integrations/platformIntegrationDefaults.ts',
  ],
}, null, 2));
