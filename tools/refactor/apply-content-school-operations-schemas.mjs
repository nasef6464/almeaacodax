import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { announcementAdSchema, announcementAdUpdateSchema, homepageSettingsSchema, platformFontSettingsSchema } from "../modules/content/http/platformPresentationSchemas.js";';
const schemaImport = 'import { accessCodeRedemptionsListQuerySchema, accessCodeSchema, accessCodesListQuerySchema, b2bPackageSchema, groupSchema, schoolImportSchema, schoolRelationSchema } from "../modules/content/http/schoolOperationsSchemas.js";';
const firstStart = 'const groupSchema = z.object({';
const firstEnd = 'const escapeRegExp = (value: string) =>';
const secondStart = 'const schoolImportRowSchema = z.object({';
const secondEnd = 'const defaultHomepageSettings = {';
const localDeclarations = [
  firstStart,
  'const b2bPackageSchema = z.object({',
  'const accessCodeSchema = z.object({',
  'const accessCodesListQuerySchema = z.object({',
  'const accessCodeRedemptionsListQuerySchema = z.object({',
  secondStart,
  'const schoolImportSchema = z.object({',
  'const schoolRelationRowSchema = z.object({',
  'const schoolRelationSchema = z.object({',
];

const alreadyApplied = source.includes(schemaImport) && localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-school-operations-schemas' }, null, 2));
  process.exit(0);
}
if (!source.includes(importAnchor)) throw new Error('School operations schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('School operations schema import exists while local declarations remain.');

const firstStartIndex = source.indexOf(firstStart);
const firstEndIndex = source.indexOf(firstEnd, firstStartIndex + firstStart.length);
const secondStartIndex = source.indexOf(secondStart, firstEndIndex);
const secondEndIndex = source.indexOf(secondEnd, secondStartIndex + secondStart.length);
if (firstStartIndex < 0 || firstEndIndex < 0) throw new Error('School commercial schema range not found.');
if (secondStartIndex < 0 || secondEndIndex < 0) throw new Error('School import/relation schema range not found.');
if (source.indexOf(firstStart, firstStartIndex + firstStart.length) >= 0) throw new Error('School commercial schema anchor is ambiguous.');
if (source.indexOf(secondStart, secondStartIndex + secondStart.length) >= 0) throw new Error('School import schema anchor is ambiguous.');

const firstRange = source.slice(firstStartIndex, firstEndIndex);
const secondRange = source.slice(secondStartIndex, secondEndIndex);
for (const declaration of localDeclarations.slice(0, 5)) {
  if (!firstRange.includes(declaration)) throw new Error(`School commercial range lost ${declaration}`);
}
for (const declaration of localDeclarations.slice(5)) {
  if (!secondRange.includes(declaration)) throw new Error(`School import/relation range lost ${declaration}`);
}
if (secondRange.includes('const studyPlanSchema = z.object({') || secondRange.includes('const interventionStudyPlanSchema = z.object({')) {
  throw new Error('Study plan schemas must remain outside the school operations extraction.');
}

source = `${source.slice(0, secondStartIndex)}${source.slice(secondEndIndex)}`;
source = `${source.slice(0, firstStartIndex)}${source.slice(firstEndIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({ status: 'APPLIED', phase: 'content-school-operations-schemas', files: ['server/src/routes/content.routes.ts'] }, null, 2));
