import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentRoute = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const operationsRoute = fs.readFileSync(path.join(root, 'server/src/routes/operations.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/content/domain/learningResourceUrl.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('content and operations routes delegate the same URL normalization', () => {
  assert.ok(contentRoute.includes('import { sanitizeLessonResourcePayload } from "../modules/content/domain/learningResourceUrl.js";'));
  assert.ok(contentRoute.includes('const sanitizeLessonPayload = sanitizeLessonResourcePayload;'));
  assert.ok(operationsRoute.includes('import { sanitizeLearningResourceUrl } from "../modules/content/domain/learningResourceUrl.js";'));
  assert.ok(operationsRoute.includes('sanitizeLearningResourceUrl(lesson?.videoUrl)'));
  assert.ok(!contentRoute.includes('const sanitizeVideoUrl ='));
  assert.ok(!operationsRoute.includes('const sanitizeVideoUrl ='));
});

check('URL cleanup and lesson-field behavior remain explicit', () => {
  for (const fragment of ['replace(/^https?:\\/\\/https?:\\/\\//i, "https://")', 'youtube\\.com|youtu\\.be|m\\.youtube\\.com', 'videoUrl:', 'meetingUrl:', 'recordingUrl:', 'fileUrl:']) {
    assert.ok(moduleSource.includes(fragment), `learning resource URL module missing ${fragment}`);
  }
});

check('unsafe executable/local resource schemes are rejected before lesson persistence', () => {
  assert.ok(moduleSource.includes('BLOCKED_RESOURCE_SCHEME'));
  for (const blockedScheme of ['javascript', 'vbscript', 'file']) {
    assert.ok(moduleSource.includes(blockedScheme), `missing blocked resource scheme ${blockedScheme}`);
  }
  assert.ok(moduleSource.includes('if (BLOCKED_RESOURCE_SCHEME.test(trimmedUrl))'));
  assert.ok(moduleSource.includes('return "";'));
});

check('URL module stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'Model', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `learning resource URL module must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 50, 'learningResourceUrl.ts exceeded 50 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-learning-resource-url-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
