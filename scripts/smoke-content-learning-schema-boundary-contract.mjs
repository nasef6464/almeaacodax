import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeFile = 'server/src/routes/content.routes.ts';
const schemaFile = 'server/src/modules/content/http/learningContentSchemas.ts';
const routeSource = fs.readFileSync(path.join(root, routeFile), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, schemaFile), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { lessonSchema, librarySchema, libraryUpdateSchema, topicSchema, topicUpdateSchema } from "../modules/content/http/learningContentSchemas.js";';
const delegated = routeSource.includes(schemaImport);

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

check('learning content transport schemas are available in one bounded backend module', () => {
  for (const name of ['topicSchema', 'topicUpdateSchema', 'lessonSchema', 'librarySchema', 'libraryUpdateSchema']) {
    assert.ok(schemaSource.includes(`export const ${name} = z.object({`), `missing exported ${name}`);
  }
  assert.ok(schemaSource.includes('import { z } from "zod";'));
});

check('topic schema preserves required scope, defaults, and update optionality', () => {
  for (const fragment of [
    'pathId: z.string().min(1)',
    'subjectId: z.string().min(1)',
    'order: z.number().default(0)',
    'showOnPlatform: z.boolean().default(true)',
    'lessonIds: z.array(z.string()).default([])',
    'quizIds: z.array(z.string()).default([])',
    'libraryItemIds: z.array(z.string()).default([])',
    'pathId: z.string().min(1).optional()',
    'subjectId: z.string().min(1).optional()',
  ]) {
    assert.ok(schemaSource.includes(fragment), `topic contract missing ${fragment}`);
  }
});

check('lesson schema preserves learning types, interactive questions, skills, and workflow metadata', () => {
  for (const fragment of [
    'z.enum(["video", "quiz", "file", "assignment", "text", "live_youtube", "zoom", "google_meet", "teams"])',
    'interactiveQuestions: z',
    'options: z.array(z.string()).min(2)',
    'actionOnFail: z.enum(["rewatch", "continue"]).default("continue")',
    'skillIds: z.array(z.string()).min(1)',
    'ownerType: z.enum(["platform", "teacher", "school"]).optional()',
    'approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional()',
    'revenueSharePercentage: z.number().nullable().optional()',
  ]) {
    assert.ok(schemaSource.includes(fragment), `lesson contract missing ${fragment}`);
  }
});

check('library create/update schemas preserve file types, skill scope, and workflow fields', () => {
  for (const fragment of [
    'type: z.enum(["pdf", "doc", "video"]).default("pdf")',
    'skillIds: z.array(z.string()).min(1)',
    'type: z.enum(["pdf", "doc", "video"]).optional()',
    'skillIds: z.array(z.string()).min(1).optional()',
    'createdBy: z.string().optional()',
    'assignedTeacherId: z.string().optional()',
  ]) {
    assert.ok(schemaSource.includes(fragment), `library contract missing ${fragment}`);
  }
});

check('content routes preserve the same parser call sites before and after ownership moves', () => {
  for (const fragment of [
    'topicSchema.parse(req.body)',
    'topicUpdateSchema.parse(req.body)',
    'sanitizeLessonPayload(lessonSchema.parse(req.body))',
    'sanitizeLessonPayload(lessonSchema.partial().parse(req.body))',
    'librarySchema.parse(req.body)',
    'libraryUpdateSchema.parse(req.body)',
  ]) {
    assert.ok(routeSource.includes(fragment), `route parser call missing ${fragment}`);
  }
});

check('schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  const localDeclarations = [
    'const topicSchema = z.object({',
    'const topicUpdateSchema = z.object({',
    'const lessonSchema = z.object({',
    'const librarySchema = z.object({',
    'const libraryUpdateSchema = z.object({',
  ];
  if (delegated) {
    for (const declaration of localDeclarations) {
      assert.ok(!routeSource.includes(declaration), `delegated route still owns ${declaration}`);
    }
  } else {
    for (const declaration of localDeclarations) {
      assert.ok(routeSource.includes(declaration), `pre-apply route lost ${declaration}`);
    }
  }
});

check('learning content schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'bcrypt']) {
    assert.ok(!schemaSource.includes(forbidden), `schema module must not include ${forbidden}`);
  }
  assert.ok(lineCount(schemaSource) <= 170, `learningContentSchemas.ts exceeded 170 lines (${lineCount(schemaSource)}).`);
  if (delegated) {
    assert.ok(lineCount(routeSource) <= 3300, `content.routes.ts did not shrink below 3300 lines (${lineCount(routeSource)}).`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'content-learning-schema-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  ownership: delegated ? 'content-module' : 'route-staging',
  routeLines: lineCount(routeSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
