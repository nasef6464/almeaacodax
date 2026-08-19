import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "../modules/content/http/platformIntegrationSchemas.js";';
const schemaImport = 'import { announcementAdSchema, announcementAdUpdateSchema, homepageSettingsSchema, platformFontSettingsSchema } from "../modules/content/http/platformPresentationSchemas.js";';
const firstStart = 'const announcementAdSchema = z.object({';
const firstEnd = 'const CONTENT_BOOTSTRAP_CACHE_TTL_MS = 3 * 60 * 1000;';
const secondStart = 'const homepageStatSchema = z.object({';
const secondEnd = 'const defaultHomepageSettings = {';
const localDeclarations = [
  firstStart,
  'const announcementAdUpdateSchema = z.object({',
  'const platformFontUploadSchema = z.object({',
  'const platformFontSettingsSchema = z.object({',
  secondStart,
  'const homepageTestimonialSchema = z.object({',
  'const homepageSettingsSchema = z.object({',
];

const alreadyApplied = source.includes(schemaImport) && localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-platform-presentation-schemas' }, null, 2));
  process.exit(0);
}
if (!source.includes(importAnchor)) throw new Error('Platform presentation schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Platform presentation schema import exists while local declarations remain.');

const firstStartIndex = source.indexOf(firstStart);
const firstEndIndex = source.indexOf(firstEnd, firstStartIndex + firstStart.length);
const secondStartIndex = source.indexOf(secondStart, firstEndIndex);
const secondEndIndex = source.indexOf(secondEnd, secondStartIndex + secondStart.length);
if (firstStartIndex < 0 || firstEndIndex < 0) throw new Error('Announcement/font schema range not found.');
if (secondStartIndex < 0 || secondEndIndex < 0) throw new Error('Homepage schema range not found.');
if (source.indexOf(firstStart, firstStartIndex + firstStart.length) >= 0) throw new Error('Announcement schema anchor is ambiguous.');
if (source.indexOf(secondStart, secondStartIndex + secondStart.length) >= 0) throw new Error('Homepage schema anchor is ambiguous.');

const firstRange = source.slice(firstStartIndex, firstEndIndex);
const secondRange = source.slice(secondStartIndex, secondEndIndex);
for (const declaration of localDeclarations.slice(0, 4)) {
  if (!firstRange.includes(declaration)) throw new Error(`First presentation schema range lost ${declaration}`);
}
for (const declaration of localDeclarations.slice(4)) {
  if (!secondRange.includes(declaration)) throw new Error(`Second presentation schema range lost ${declaration}`);
}

source = `${source.slice(0, secondStartIndex)}${source.slice(secondEndIndex)}`;
source = `${source.slice(0, firstStartIndex)}${source.slice(firstEndIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({ status: 'APPLIED', phase: 'content-platform-presentation-schemas', files: ['server/src/routes/content.routes.ts'] }, null, 2));
