import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [contentRoutes, courseRoutes, dashboard, reviewUi] = await Promise.all([
  read('server/src/routes/content.routes.ts'), read('server/src/routes/course.routes.ts'),
  read('dashboards/admin/AdminDashboard.tsx'), read('dashboards/admin/ContentReviewQueueManager.tsx'),
]);
assert.match(contentRoutes, /"\/review-queue"/, 'missing unified review queue route');
assert.match(contentRoutes, /requireRole\(\["admin"\]\)/, 'review queue is not Admin-only');
assert.match(contentRoutes, /reviewDecisionSchema/, 'review decision is not validated');
assert.doesNotMatch(courseRoutes, /requireRole\(\["admin", "teacher", "supervisor"\]\)/, 'supervisor still has general course CRUD');
assert.match(dashboard, /id: 'content-review'/, 'Admin has no review-center navigation');
assert.match(reviewUi, /مركز اعتماد المحتوى/, 'review-center surface is missing');
console.log('G16 content review contract: PASS');
