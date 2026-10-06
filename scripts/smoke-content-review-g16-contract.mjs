import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [contentRoutes, reviewRoutes, courseRoutes, dashboard, reviewUi] = await Promise.all([
  read('server/src/routes/content.routes.ts'),
  read('server/src/modules/content/http/contentReviewRoutes.ts'),
  read('server/src/routes/course.routes.ts'),
  read('dashboards/admin/AdminDashboard.tsx'),
  read('dashboards/admin/ContentReviewQueueManager.tsx'),
]);
assert.match(contentRoutes, /contentRouter\.use\(contentReviewRouter\)/, 'root content router does not compose review routes');
assert.match(reviewRoutes, /"\/review-queue"/, 'missing unified review queue route');
assert.match(reviewRoutes, /requireRole\(\["admin"\]\)/, 'review queue is not Admin-only');
assert.match(reviewRoutes, /reviewDecisionSchema/, 'review decision is not validated');
assert.doesNotMatch(courseRoutes, /requireRole\(\["admin", "teacher", "supervisor"\]\)/, 'supervisor still has general course CRUD');
assert.match(dashboard, /id: 'content-review'/, 'Admin has no review-center navigation');
assert.match(reviewUi, /مركز اعتماد المحتوى/, 'review-center surface is missing');
console.log('G16 content review contract: PASS');
