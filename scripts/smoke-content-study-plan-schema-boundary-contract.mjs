import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/studyPlanSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { interventionStudyPlanSchema, studyPlanSchema } from "../modules/content/http/studyPlanSchemas.js";';
const delegated = routeSource.includes(schemaImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('student study plan transport semantics are preserved', () => {
  for (const fragment of [
    'id: z.string().min(1)',
    'userId: z.string().optional()',
    'name: z.string().min(1)',
    'pathId: z.string().min(1)',
    'subjectIds: z.array(z.string()).default([])',
    'courseIds: z.array(z.string()).default([])',
    'startDate: z.string().min(1)',
    'endDate: z.string().min(1)',
    'skipCompletedQuizzes: z.boolean().default(true)',
    'offDays: z.array(z.enum(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"])).default([])',
    'dailyMinutes: z.number().min(15).default(90)',
    'preferredStartTime: z.string().optional()',
    'status: z.enum(["active", "archived"]).default("active")',
  ]) assert.ok(schemaSource.includes(fragment), `study plan schema missing ${fragment}`);
});

check('intervention study plan transport semantics are preserved', () => {
  for (const fragment of [
    'studentId: z.string().min(1).max(120)',
    'studentName: z.string().max(160).optional().default("")',
    'subjectId: z.string().optional().default("")',
    'skillId: z.string().optional().default("")',
    'skillName: z.string().max(180).optional().default("")',
    'dailyMinutes: z.number().min(15).max(240).optional().default(90)',
    'preferredStartTime: z.string().optional().default("17:00")',
  ]) assert.ok(schemaSource.includes(fragment), `intervention study plan schema missing ${fragment}`);
});

check('study plan parser call sites remain route-owned and unchanged', () => {
  for (const fragment of [
    'const payload = studyPlanSchema.parse(req.body);',
    'const payload = interventionStudyPlanSchema.parse(req.body);',
  ]) assert.ok(routeSource.includes(fragment), `route parser call missing ${fragment}`);
});

check('study plan HTTP route surface remains stable', () => {
  for (const fragment of ['"/study-plans"', '"/study-plans/intervention"']) {
    assert.ok(routeSource.includes(fragment), `study plan route missing ${fragment}`);
  }
});

check('study plan schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const studyPlanSchema = z.object({',
    'const interventionStudyPlanSchema = z.object({',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'pre-apply'} ownership mismatch for ${declaration}`);
  }
});

check('study plan authorization, persistence and intervention orchestration remain route-owned', () => {
  for (const fragment of [
    'StudyPlanModel.findOneAndUpdate(',
    'const now = Date.now();',
    'const student = await UserModel.findOne({',
    'QuizResultModel.find(',
    'getActivePathIds()',
  ]) assert.ok(routeSource.includes(fragment), `route lost study-plan orchestration ownership: ${fragment}`);
});

check('study plan schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'StatusCodes', 'findOne', 'findById', 'findOneAndUpdate']) {
    assert.ok(!schemaSource.includes(forbidden), `study plan schema module must not include ${forbidden}`);
  }
  assert.ok(!schemaSource.includes('defaultHomepageSettings'), 'study plan schema module must not absorb homepage defaults');
  assert.ok(lineCount(schemaSource) <= 60, `studyPlanSchemas.ts exceeded 60 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-study-plan-schema-boundary', status: failed.length ? 'FAIL' : 'PASS', delegated, routeLines: lineCount(routeSource), schemaLines: lineCount(schemaSource), checks }, null, 2));
if (failed.length) process.exit(1);
