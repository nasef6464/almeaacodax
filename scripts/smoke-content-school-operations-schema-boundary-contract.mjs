import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const groupRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentGroupRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const commercialRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentSchoolCommercialRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const reportImportRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentSchoolReportImportRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const relationsRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentSchoolRelationsRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const queryUtilitySource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentQueryUtilities.ts'), 'utf8').replace(/\r\n/g, '\n');
const scopeSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/schoolOperationsScope.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/schoolOperationsSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const delegated =
  routeSource.includes('contentRouter.use(contentGroupRouter);') &&
  routeSource.includes('contentRouter.use(contentSchoolCommercialRouter);') &&
  routeSource.includes('contentRouter.use(contentSchoolReportImportRouter);') &&
  routeSource.includes('contentRouter.use(contentSchoolRelationsRouter);') &&
  groupRouteSource.includes('from "./schoolOperationsSchemas.js"') &&
  commercialRouteSource.includes('from "./schoolOperationsSchemas.js"') &&
  reportImportRouteSource.includes('from "./schoolOperationsSchemas.js"') &&
  relationsRouteSource.includes('from "./schoolOperationsSchemas.js"');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('group and commercial package transport semantics are preserved', () => {
  for (const fragment of [
    'type: z.enum(["SCHOOL", "CLASS", "PRIVATE_GROUP"])',
    'supervisorIds: z.array(z.string()).default([])',
    'studentIds: z.array(z.string()).default([])',
    'courseIds: z.array(z.string()).default([])',
    'contentTypes: z.array(z.enum(["courses", "foundation", "banks", "tests", "mockExams", "library", "all"])).default(["all"])',
    'type: z.enum(["free_access", "discounted"]).default("free_access")',
    'maxStudents: z.number().min(0).default(0)',
    'status: z.enum(["active", "expired"]).default("active")',
  ]) assert.ok(schemaSource.includes(fragment), `school operations schema missing ${fragment}`);
});

check('access code create/list/redemption contracts remain unchanged', () => {
  for (const fragment of [
    'maxUses: z.number().min(1).default(1)',
    'currentUses: z.number().min(0).default(0)',
    'status: z.enum(["active", "expired", "exhausted"]).optional()',
    'sortBy: z.enum(["createdAt", "expiresAt", "currentUses", "maxUses", "code"]).default("createdAt")',
    'status: z.enum(["active", "revoked", "expired"]).optional()',
    'sortBy: z.enum(["grantedAt", "expiresAt", "createdAt"]).default("grantedAt")',
    'sortOrder: z.enum(["asc", "desc"]).default("desc")',
  ]) assert.ok(schemaSource.includes(fragment), `access code schema missing ${fragment}`);
});

check('school import and relation payload semantics are preserved', () => {
  for (const fragment of [
    'name: z.string().min(2)',
    'email: z.string().email()',
    'password: z.string().min(6).optional()',
    'rows: z.array(schoolImportRowSchema).min(1)',
    'parentEmail: z.string().email().optional().or(z.literal(""))',
    'supervisorEmail: z.string().email().optional().or(z.literal(""))',
    'rows: z.array(schoolRelationRowSchema).min(1)',
    'createMissingUsers: z.boolean().default(true)',
  ]) assert.ok(schemaSource.includes(fragment), `school import/relation schema missing ${fragment}`);
});

check('route parser call sites remain unchanged after schema ownership moves', () => {
  for (const fragment of [
    'const payload = groupSchema.parse(req.body);',
  ]) assert.ok(groupRouteSource.includes(fragment), `group route parser call missing ${fragment}`);
  for (const fragment of [
    'const payload = b2bPackageSchema.parse(req.body);',
    'const payload = accessCodeSchema.parse(req.body);',
    'const query = accessCodesListQuerySchema.parse(req.query);',
    'const query = accessCodeRedemptionsListQuerySchema.parse(req.query);',
  ]) assert.ok(commercialRouteSource.includes(fragment), `commercial route parser call missing ${fragment}`);
  assert.ok(reportImportRouteSource.includes('const payload = schoolImportSchema.parse(req.body);'), 'report/import route parser call missing school import parser');
  assert.ok(relationsRouteSource.includes('const payload = schoolRelationSchema.parse(req.body);'), 'relations route parser call missing school relation parser');
});

check('school schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  const declarations = [
    'const groupSchema = z.object({',
    'const b2bPackageSchema = z.object({',
    'const accessCodeSchema = z.object({',
    'const accessCodesListQuerySchema = z.object({',
    'const accessCodeRedemptionsListQuerySchema = z.object({',
    'const schoolImportRowSchema = z.object({',
    'const schoolImportSchema = z.object({',
    'const schoolRelationRowSchema = z.object({',
    'const schoolRelationSchema = z.object({',
  ];
  for (const declaration of declarations) {
    assert.ok(!routeSource.includes(declaration), `root route retained transport schema ${declaration}`);
    assert.ok(!groupRouteSource.includes(declaration), `group route retained local transport schema ${declaration}`);
    assert.ok(!commercialRouteSource.includes(declaration), `commercial route retained local transport schema ${declaration}`);
    assert.ok(!reportImportRouteSource.includes(declaration), `report/import route retained local transport schema ${declaration}`);
    assert.ok(!relationsRouteSource.includes(declaration), `relations route retained local transport schema ${declaration}`);
  }
});

check('authorization, pagination and school workflow ownership follows bounded modules', () => {
  assert.ok(groupRouteSource.includes('const buildScopedGroupCreatePayload = async ('), 'group route lost create-scope orchestration');
  for (const fragment of [
    'export const hasSchoolIdManagementScope = async (',
    'export const assertSchoolManagementScope = async (',
    'export const resolveSupervisorManagementScope = async (',
  ]) assert.ok(scopeSource.includes(fragment), `school scope module lost ${fragment}`);
  assert.ok(commercialRouteSource.includes('const normalizeAccessCodeResponse = (code: any) => ({'), 'commercial route lost access-code response normalization');
  assert.ok(queryUtilitySource.includes('export const buildPaginationMeta = (total: number, page: number, limit: number) => {'), 'shared query utility lost pagination metadata helper');
  assert.ok(queryUtilitySource.includes('export const parseDateToTimestamp = (value?: string) => {'), 'shared query utility lost date parsing helper');
  assert.ok(queryUtilitySource.includes('export const escapeRegExp = (value: string) =>'), 'shared query utility lost search escaping helper');
});

check('school operations schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'StatusCodes', 'findOne', 'findById']) {
    assert.ok(!schemaSource.includes(forbidden), `school operations schema module must not include ${forbidden}`);
  }
  assert.ok(lineCount(schemaSource) <= 130, `schoolOperationsSchemas.ts exceeded 130 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-school-operations-schema-boundary', status: failed.length ? 'FAIL' : 'PASS', delegated, routeLines: lineCount(routeSource), groupRouteLines: lineCount(groupRouteSource), commercialRouteLines: lineCount(commercialRouteSource), reportImportRouteLines: lineCount(reportImportRouteSource), relationsRouteLines: lineCount(relationsRouteSource), queryUtilityLines: lineCount(queryUtilitySource), scopeLines: lineCount(scopeSource), schemaLines: lineCount(schemaSource), checks }, null, 2));
if (failed.length) process.exit(1);
