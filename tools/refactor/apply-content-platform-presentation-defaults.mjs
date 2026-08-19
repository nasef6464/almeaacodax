import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
const defaultsPath = path.join(root, 'server/src/modules/content/presentation/platformPresentationDefaults.ts');
const homepageContractPath = path.join(root, 'scripts/smoke-homepage-hero-contract.mjs');

let routeSource = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');
let homepageContractSource = fs.readFileSync(homepageContractPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { announcementAdSchema, announcementAdUpdateSchema, homepageSettingsSchema, platformFontSettingsSchema } from "../modules/content/http/platformPresentationSchemas.js";';
const defaultsImport = 'import { defaultHomepageSettings, defaultPlatformFontSettings } from "../modules/content/presentation/platformPresentationDefaults.js";';
const rangeStart = 'const defaultHomepageSettings = {';
const secondDeclaration = 'const defaultPlatformFontSettings = {';
const rangeEnd = 'const sanitizeAndValidateExternalPlatforms =';
const oldHomepageOwnerAssertion = `assertIncludes('server/src/routes/content.routes.ts', 'imageUrl: "/images/homepage-hero-boy-platform.jpg');`;
const newHomepageOwnerAssertion = `assertIncludes('server/src/modules/content/presentation/platformPresentationDefaults.ts', 'imageUrl: "/images/homepage-hero-boy-platform.jpg');`;

const alreadyApplied =
  routeSource.includes(defaultsImport) &&
  !routeSource.includes(rangeStart) &&
  !routeSource.includes(secondDeclaration) &&
  fs.existsSync(defaultsPath) &&
  homepageContractSource.includes(newHomepageOwnerAssertion) &&
  !homepageContractSource.includes(oldHomepageOwnerAssertion);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-platform-presentation-defaults' }, null, 2));
  process.exit(0);
}

if (!routeSource.includes(importAnchor)) throw new Error('Platform presentation schema import anchor not found.');
if (routeSource.includes(defaultsImport)) throw new Error('Presentation defaults import exists while local ownership is incomplete.');
if (fs.existsSync(defaultsPath)) throw new Error('Presentation defaults module exists before route delegation.');

const startIndex = routeSource.indexOf(rangeStart);
const endIndex = routeSource.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Platform presentation defaults range not found.');
if (routeSource.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Homepage defaults anchor is ambiguous.');
if (routeSource.indexOf(secondDeclaration, routeSource.indexOf(secondDeclaration) + secondDeclaration.length) >= 0) {
  throw new Error('Platform font defaults anchor is ambiguous.');
}

const range = routeSource.slice(startIndex, endIndex).trimEnd();
for (const declaration of [rangeStart, secondDeclaration]) {
  if (!range.includes(declaration)) throw new Error(`Presentation defaults range lost ${declaration}`);
}
for (const forbidden of [
  'const sanitizeAndValidateExternalPlatforms =',
  'const defaultPlatformIntegrationSettings =',
  'const hasSchoolIdManagementScope = async (',
  'const buildScopedGroupCreatePayload = async (',
]) {
  if (range.includes(forbidden)) throw new Error(`Presentation defaults extraction crossed ownership boundary: ${forbidden}`);
}

const oldAssertionCount = homepageContractSource.split(oldHomepageOwnerAssertion).length - 1;
if (oldAssertionCount !== 1) {
  throw new Error(`Homepage hero contract owner assertion expected once, found ${oldAssertionCount}.`);
}
if (homepageContractSource.includes(newHomepageOwnerAssertion)) {
  throw new Error('Homepage hero contract already references new owner while route still owns defaults.');
}

const defaultsSource = `${range
  .replace(rangeStart, 'export const defaultHomepageSettings = {')
  .replace(secondDeclaration, 'export const defaultPlatformFontSettings = {')}\n`;
const nextRouteSource = `${routeSource.slice(0, startIndex)}${routeSource.slice(endIndex)}`.replace(
  importAnchor,
  `${importAnchor}\n${defaultsImport}`,
);
const nextHomepageContractSource = homepageContractSource.replace(oldHomepageOwnerAssertion, newHomepageOwnerAssertion);

if (nextRouteSource.includes(rangeStart) || nextRouteSource.includes(secondDeclaration)) {
  throw new Error('Inline presentation defaults remained after extraction.');
}
if (!nextRouteSource.includes(defaultsImport)) throw new Error('Presentation defaults import insertion failed.');
if (!defaultsSource.includes('export const defaultHomepageSettings = {')) throw new Error('Homepage defaults export generation failed.');
if (!defaultsSource.includes('export const defaultPlatformFontSettings = {')) throw new Error('Platform font defaults export generation failed.');

fs.mkdirSync(path.dirname(defaultsPath), { recursive: true });
fs.writeFileSync(defaultsPath, defaultsSource);
fs.writeFileSync(routePath, nextRouteSource);
fs.writeFileSync(homepageContractPath, nextHomepageContractSource);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'content-platform-presentation-defaults',
  files: [
    'server/src/routes/content.routes.ts',
    'server/src/modules/content/presentation/platformPresentationDefaults.ts',
    'scripts/smoke-homepage-hero-contract.mjs',
  ],
}, null, 2));
