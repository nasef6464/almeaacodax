import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rootRouteSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const studyRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentStudyPlanRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/studyPlanSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;

const delegated =
  rootRouteSource.includes('contentRouter.use(contentStudyPlanRouter);') &&
  studyRouteSource.includes('from "./studyPlanSchemas.js"');

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

check('study plan parser call sites remain unchanged at the extracted HTTP boundary', () => {
  for (const fragment of [
    'const payload = studyPlanSchema.parse(req.body);',
    'const payload = studyPlanSchema.partial().parse(req.body);',
    'const payload = interventionStudyPlanSchema.parse(req.body);',
  ]) assert.ok(studyRouteSource.includes(fragment), `study-plan route parser call missing ${fragment}`);
});

check('study plan HTTP route surface remains stable', () => {
  for (const fragment of [
    '"/study-plans/intervention"',
    '"/study-plans"',
    '"/study-plans/:id"',
  ]) assert.ok(studyRouteSource.includes(fragment), `study plan route missing ${fragment}`);
  assert.ok(rootRouteSource.includes('contentRouter.use(contentStudyPlanRouter);'), 'root content router no longer composes study-plan routes');
});

check('study plan schemas remain exclusively transport-owned', () => {
  for (const declaration of [
    'const studyPlanSchema = z.object({',
    'const interventionStudyPlanSchema = z.object({',
  ]) {
    assert.ok(!rootRouteSource.includes(declaration), `root route retained ${declaration}`);
    assert.ok(!studyRouteSource.includes(declaration), `study-plan route retained local schema ${declaration}`);
  }
  assert.ok(schemaSource.includes('export const studyPlanSchema = z.object({'));
  assert.ok(schemaSource.includes('export const interventionStudyPlanSchema = z.object({'));
});

check('study plan authorization and persistence remain intact after extraction', () => {
  for (const fragment of [
    'requireRole(["admin", "supervisor", "teacher"])',
    'getAuthorizedStudentIdsForSchoolStaffActor(',
    'StudyPlanModel.create({',
    'StudyPlanModel.findOneAndUpdate(',
    'StudyPlanModel.findOneAndDelete(',
    'const student = await UserModel.findOne({',
    'StatusCodes.FORBIDDEN',
    'StatusCodes.NOT_FOUND',
  ]) assert.ok(studyRouteSource.includes(fragment), `study-plan orchestration lost ${fragment}`);
});

check('study plan route module is bounded and owns only study-plan HTTP orchestration', () => {
  assert.ok(delegated, 'study-plan router delegation is incomplete');
  assert.ok(lineCount(studyRouteSource) <= 180, `contentStudyPlanRoutes.ts exceeded 180 lines (${lineCount(studyRouteSource)}).`);
  for (const forbidden of [
    'GroupModel',
    'B2BPackageModel',
    'AccessCodeModel',
    'TopicModel',
    'LessonModel',
    'LibraryItemModel',
    'PlatformIntegrationSettingsModel',
  ]) assert.ok(!studyRouteSource.includes(forbidden), `study-plan route absorbed unrelated owner ${forbidden}`);
});

check('study plan schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'StatusCodes', 'findOne', 'findById', 'findOneAndUpdate']) {
    assert.ok(!schemaSource.includes(forbidden), `study plan schema module must not include ${forbidden}`);
  }
  assert.ok(lineCount(schemaSource) <= 60, `studyPlanSchemas.ts exceeded 60 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'content-study-plan-schema-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  rootRouteLines: lineCount(rootRouteSource),
  studyRouteLines: lineCount(studyRouteSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
