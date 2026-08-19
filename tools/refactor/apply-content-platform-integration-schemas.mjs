import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { lessonSchema, librarySchema, libraryUpdateSchema, topicSchema, topicUpdateSchema } from "../modules/content/http/learningContentSchemas.js";';
const schemaImport = 'import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "../modules/content/http/platformIntegrationSchemas.js";';
const blockStart = 'const providerSettingsSchema = z.object({';
const blockEnd = 'const sanitizeAndValidateExternalPlatforms = (input: Array<Record<string, unknown>> | undefined) => {';

const localDeclarations = [
  blockStart,
  'const externalPlatformSchema = z.object({',
  'const seoSettingsSchema = z.object({',
  'const contactWidgetSchema = z.object({',
  'const platformIntegrationSettingsSchema = z.object({',
  'const providerSettingsPatchSchema = providerSettingsSchema.partial();',
  'const platformIntegrationSettingsPatchSchema = z.object({',
];
const alreadyApplied = source.includes(schemaImport) && localDeclarations.every((declaration) => !source.includes(declaration));

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-platform-integration-schemas' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Platform integration schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Platform integration schema import exists while local declarations still remain.');
const startIndex = source.indexOf(blockStart);
const endIndex = source.indexOf(blockEnd, startIndex + blockStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Platform integration schema range not found.');
if (source.indexOf(blockStart, startIndex + blockStart.length) >= 0) throw new Error('Platform integration schema start anchor is ambiguous.');
if (source.indexOf(blockEnd, endIndex + blockEnd.length) >= 0) throw new Error('Platform integration schema end anchor is ambiguous.');
for (const declaration of localDeclarations) {
  if (!source.slice(startIndex, endIndex).includes(declaration)) {
    throw new Error(`Platform integration schema range lost expected declaration: ${declaration}`);
  }
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'content-platform-integration-schemas',
  files: ['server/src/routes/content.routes.ts'],
}, null, 2));
