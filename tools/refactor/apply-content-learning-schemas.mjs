import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/content.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { decryptIntegrationSecretsForRuntime, encryptIntegrationSecretsAtRest } from "../utils/integrationSecretsCrypto.js";';
const schemaImport = 'import { lessonSchema, librarySchema, libraryUpdateSchema, topicSchema, topicUpdateSchema } from "../modules/content/http/learningContentSchemas.js";';
const firstStart = 'const topicSchema = z.object({';
const firstEnd = 'const sanitizeVideoUrl = (rawUrl?: string | null) => {';
const secondStart = 'const librarySchema = z.object({';
const secondEnd = 'const groupSchema = z.object({';

const alreadyApplied = source.includes(schemaImport)
  && !source.includes(firstStart)
  && !source.includes('const topicUpdateSchema = z.object({')
  && !source.includes('const lessonSchema = z.object({')
  && !source.includes(secondStart)
  && !source.includes('const libraryUpdateSchema = z.object({');

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'content-learning-schemas' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Content learning schema import anchor not found.');
const firstStartIndex = source.indexOf(firstStart);
const firstEndIndex = source.indexOf(firstEnd, firstStartIndex + firstStart.length);
if (firstStartIndex < 0 || firstEndIndex < 0) throw new Error('Topic/lesson schema range not found.');
const secondStartIndex = source.indexOf(secondStart, firstEndIndex);
const secondEndIndex = source.indexOf(secondEnd, secondStartIndex + secondStart.length);
if (secondStartIndex < 0 || secondEndIndex < 0) throw new Error('Library schema range not found.');
if (source.indexOf(firstStart, firstStartIndex + firstStart.length) >= 0) throw new Error('Topic schema anchor is ambiguous.');
if (source.indexOf(secondStart, secondStartIndex + secondStart.length) >= 0) throw new Error('Library schema anchor is ambiguous.');

source = `${source.slice(0, secondStartIndex)}${source.slice(secondEndIndex)}`;
source = `${source.slice(0, firstStartIndex)}${source.slice(firstEndIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);

fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'content-learning-schemas',
  files: ['server/src/routes/content.routes.ts'],
}, null, 2));
