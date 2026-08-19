import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/platformPresentationSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { announcementAdSchema, announcementAdUpdateSchema, homepageSettingsSchema, platformFontSettingsSchema } from "../modules/content/http/platformPresentationSchemas.js";';
const delegated = routeSource.includes(schemaImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('announcement transport contract preserves audience, display and timing rules', () => {
  for (const fragment of [
    'audience: z.enum(["all", "guest", "student", "parent", "staff"]).default("all")',
    'displayMode: z.enum(["modal", "top-banner"]).default("modal")',
    'frequency: z.enum(["always", "session", "once"]).default("session")',
    'imageFit: z.enum(["cover", "contain"]).default("cover")',
    'delaySeconds: z.number().min(0).max(30).default(0)',
    'startsAt: z.number().nullable().optional()',
    'endsAt: z.number().nullable().optional()',
  ]) assert.ok(schemaSource.includes(fragment), `announcement schema missing ${fragment}`);
});

check('font transport contract keeps upload safety and typography constraints', () => {
  for (const fragment of [
    '.max(700_000)',
    '.regex(/^data:font\\/(woff2?|ttf|otf);base64,[A-Za-z0-9+/=]+$/)',
    'size: z.number().min(0).max(500_000).optional().default(0)',
    '"ibm-plex-sans-arabic"',
    '"noto-kufi-arabic"',
    'const platformFontSizeSchema = z.string().regex(/^\\d{1,2}(\\.\\d)?(px|rem)$/)',
    'const platformFontColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)',
  ]) assert.ok(schemaSource.includes(fragment), `font schema missing ${fragment}`);
});

check('homepage transport contract preserves hero, navigation, stats and featured scopes', () => {
  for (const fragment of [
    'mode: z.enum(["dynamic", "manual"]).default("dynamic")',
    'source: z.enum(["students", "courses", "assets", "rating"]).default("students")',
    'primaryCtaLink: z.string().optional()',
    'floatingCardProgressValue: z.string().optional()',
    'headingFont: z.enum(["tajawal", "system", "serif"]).optional()',
    'showAutoPaths: z.boolean().optional()',
    'featuredPathIds: z.array(z.string()).optional()',
    'featuredCourseIds: z.array(z.string()).optional()',
    'featuredArticleLessonIds: z.array(z.string()).optional()',
  ]) assert.ok(schemaSource.includes(fragment), `homepage schema missing ${fragment}`);
});

check('route parser call sites remain stable', () => {
  for (const fragment of [
    'const payload = homepageSettingsSchema.parse(req.body);',
    'const payload = platformFontSettingsSchema.parse(req.body);',
    'const payload = announcementAdSchema.parse(req.body);',
    'const payload = announcementAdUpdateSchema.parse(req.body);',
  ]) assert.ok(routeSource.includes(fragment), `route parser call missing ${fragment}`);
});

check('presentation schema ownership moves exclusively after delegation', () => {
  const declarations = [
    'const announcementAdSchema = z.object({',
    'const announcementAdUpdateSchema = z.object({',
    'const platformFontUploadSchema = z.object({',
    'const platformFontSettingsSchema = z.object({',
    'const homepageStatSchema = z.object({',
    'const homepageTestimonialSchema = z.object({',
    'const homepageSettingsSchema = z.object({',
  ];
  for (const declaration of declarations) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'pre-apply'} ownership mismatch for ${declaration}`);
  }
});

check('presentation schema module stays transport-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now', 'findOne', 'findOneAndUpdate']) {
    assert.ok(!schemaSource.includes(forbidden), `presentation schema module must not include ${forbidden}`);
  }
  assert.ok(lineCount(schemaSource) <= 230, `platformPresentationSchemas.ts exceeded 230 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-platform-presentation-schema-boundary', status: failed.length ? 'FAIL' : 'PASS', delegated, routeLines: lineCount(routeSource), schemaLines: lineCount(schemaSource), checks }, null, 2));
if (failed.length) process.exit(1);
