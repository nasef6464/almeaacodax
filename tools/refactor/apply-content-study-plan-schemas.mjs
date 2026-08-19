import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { accessCodeRedemptionsListQuerySchema, accessCodeSchema, accessCodesListQuerySchema, b2bPackageSchema, groupSchema, schoolImportSchema, schoolRelationSchema } from "../modules/content/http/schoolOperationsSchemas.js";';
const schemaImport = 'import { interventionStudyPlanSchema, studyPlanSchema } from "../modules/content/http/studyPlanSchemas.js";';
const rangeStart = 'const studyPlanSchema = z.object({';
const rangeEnd = 'const defaultHomepageSettings = {';
const localDeclarations = [
  rangeStart,
  'const interventionStudyPlanSchema = z.object({',
];

const alreadyApplied = source.includes(schemaImport) && localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-study-plan-schemas' }, null, 2));
  process.exit(0);
}
if (!source.includes(importAnchor)) throw new Error('Study plan schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Study plan schema import exists while local declarations remain.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Study plan schema range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Study plan schema anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const declaration of localDeclarations) {
  if (!range.includes(declaration)) throw new Error(`Study plan schema range lost ${declaration}`);
}
for (const forbidden of ['const defaultHomepageSettings = {', 'const groupSchema = z.object({', 'const schoolImportSchema = z.object({']) {
  if (range.includes(forbidden)) throw new Error(`Study plan extraction crossed ownership boundary: ${forbidden}`);
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({ status: 'APPLIED', phase: 'content-study-plan-schemas', files: ['server/src/routes/content.routes.ts'] }, null, 2));
