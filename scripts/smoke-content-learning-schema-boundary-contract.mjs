import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rootRouteSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const learningRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentLearningRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const workflowSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/learningContentWorkflow.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/learningContentSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;

const delegated =
  rootRouteSource.includes('contentRouter.use(contentLearningRouter);') &&
  learningRouteSource.includes('from "./learningContentSchemas.js"');

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
  ]) assert.ok(schemaSource.includes(fragment), `topic contract missing ${fragment}`);
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
  ]) assert.ok(schemaSource.includes(fragment), `lesson contract missing ${fragment}`);
});

check('library create/update schemas preserve file types, skill scope, and workflow fields', () => {
  for (const fragment of [
    'type: z.enum(["pdf", "doc", "video"]).default("pdf")',
    'skillIds: z.array(z.string()).min(1)',
    'type: z.enum(["pdf", "doc", "video"]).optional()',
    'skillIds: z.array(z.string()).min(1).optional()',
    'createdBy: z.string().optional()',
    'assignedTeacherId: z.string().optional()',
  ]) assert.ok(schemaSource.includes(fragment), `library contract missing ${fragment}`);
});

check('learning route parser call sites remain unchanged after extraction', () => {
  for (const fragment of [
    'topicSchema.parse(req.body)',
    'topicUpdateSchema.parse(req.body)',
    'sanitizeLessonPayload(lessonSchema.parse(req.body))',
    'sanitizeLessonPayload(lessonSchema.partial().parse(req.body))',
    'librarySchema.parse(req.body)',
    'libraryUpdateSchema.parse(req.body)',
  ]) assert.ok(learningRouteSource.includes(fragment), `learning route parser call missing ${fragment}`);
});

check('learning HTTP route surface remains stable', () => {
  for (const fragment of [
    '"/topics"',
    '"/topics/:id"',
    '"/lessons"',
    '"/lessons/:id"',
    '"/library-items"',
    '"/library-items/:id"',
    'requireRole(["admin", "teacher"])',
  ]) assert.ok(learningRouteSource.includes(fragment), `learning route missing ${fragment}`);
  assert.ok(rootRouteSource.includes('contentRouter.use(contentLearningRouter);'));
});

check('learning workflow ownership is extracted from the root route', () => {
  for (const fragment of [
    'export const buildOwnedDocumentQuery',
    'export const getWorkflowDefaults',
    'export const sanitizeWorkflowUpdate',
    'export const hasTopicManagementScope',
  ]) assert.ok(workflowSource.includes(fragment), `learning workflow lost ${fragment}`);

  for (const fragment of [
    'const buildOwnedDocumentQuery =',
    'const getWorkflowDefaults =',
    'const sanitizeWorkflowUpdate =',
    'const hasTopicManagementScope =',
  ]) assert.ok(!rootRouteSource.includes(fragment), `root route retained learning workflow helper ${fragment}`);
});

check('learning authorization and persistence remain intact', () => {
  for (const fragment of [
    'assertManagedContentScope(req.authUser!',
    'hasTopicManagementScope(req.authUser!',
    'buildOwnedDocumentQuery(req.params.id, req.authUser!)',
    'getWorkflowDefaults(req.authUser!)',
    'sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!)',
    'TopicModel.findOneAndUpdate',
    'LessonModel.findOneAndUpdate',
    'LibraryItemModel.findOneAndUpdate',
  ]) assert.ok(learningRouteSource.includes(fragment), `learning route lost ${fragment}`);
});

check('learning modules stay bounded and domain-specific', () => {
  assert.ok(delegated, 'learning router delegation is incomplete');
  assert.ok(lineCount(learningRouteSource) <= 300, `contentLearningRoutes.ts exceeded 300 lines (${lineCount(learningRouteSource)}).`);
  assert.ok(lineCount(workflowSource) <= 150, `learningContentWorkflow.ts exceeded 150 lines (${lineCount(workflowSource)}).`);
  for (const forbidden of ['GroupModel', 'B2BPackageModel', 'AccessCodeModel', 'PlatformIntegrationSettingsModel', 'StudyPlanModel']) {
    assert.ok(!learningRouteSource.includes(forbidden), `learning route absorbed unrelated owner ${forbidden}`);
    assert.ok(!workflowSource.includes(forbidden), `learning workflow absorbed unrelated owner ${forbidden}`);
  }
});

check('learning content schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'bcrypt']) {
    assert.ok(!schemaSource.includes(forbidden), `schema module must not include ${forbidden}`);
  }
  assert.ok(lineCount(schemaSource) <= 170, `learningContentSchemas.ts exceeded 170 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'content-learning-schema-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  ownership: delegated ? 'content-learning-module' : 'root-route',
  rootRouteLines: lineCount(rootRouteSource),
  learningRouteLines: lineCount(learningRouteSource),
  workflowLines: lineCount(workflowSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
