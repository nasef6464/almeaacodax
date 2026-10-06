import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rootRoute = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'server/src/modules/content/http/contentBootstrapRoutes.ts'), 'utf8');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/contentBootstrapCache.ts'), 'utf8');

assert.ok(rootRoute.includes('import { contentBootstrapRouter, clearContentBootstrapCache }'));
assert.ok(rootRoute.includes('clearContentBootstrapCache();'));
assert.ok(rootRoute.includes('contentRouter.use(contentBootstrapRouter);'));
assert.ok(route.includes('resolveContentBootstrapCache({'));
assert.ok(route.includes('cache: contentBootstrapCache'));
assert.ok(route.includes('pending: contentBootstrapPromises'));
assert.ok(route.includes('res.setHeader("X-Content-Cache", cacheStatus)'));
assert.ok(route.includes('export const clearContentBootstrapCache = () =>'));
for (const fragment of [
  'cacheStatus: "hit"',
  'cacheStatus: "shared"',
  'cacheStatus: "miss"',
  'pending.set(cacheKey, inflight)',
  'pending.delete(cacheKey)',
  'expiresAt: now() + ttlMs',
]) assert.ok(moduleSource.includes(fragment), `missing ${fragment}`);

console.log(JSON.stringify({ phase: 'content-bootstrap-cache-boundary', status: 'PASS' }, null, 2));
