import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, authApi, authRoutes] = await Promise.all([
  readFile(new URL('../dashboards/admin/UsersManager.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../services/apiGroups/authApi.ts', import.meta.url), 'utf8'),
  readFile(new URL('../server/src/routes/auth.routes.ts', import.meta.url), 'utf8'),
]);
assert.match(source, /const \[pageUsers, setPageUsers\]/, 'page-specific user state is missing');
assert.match(source, /setPageUsers\(\(response\.users \|\| \[\]\)\.map\(buildStoreUser\)\)/, 'page load still does not target local state');
assert.doesNotMatch(source, /hydrateUsers\(\(response\.users/, 'page load still replaces global users');
assert.match(source, /persistPageUserPatch/, 'user mutations are not awaited through the page command');
assert.match(source, /disabled=\{relationshipActionUserId === currentUser\.id\}/, 'status action has no saving guard');
assert.match(source, /bulkSetAdminUsersStatus/, 'bulk UI does not use the server command');
assert.match(authApi, /getAdminUsersSummary/, 'client has no server summary API');
assert.match(authRoutes, /"\/admin\/users\/summary"/, 'server summary endpoint is missing');
assert.match(authRoutes, /"\/admin\/users\/bulk-status"/, 'server bulk-status command is missing');
assert.match(authRoutes, /cannot_deactivate_last_admin/, 'bulk status does not protect the last active admin');
console.log('G17 users manager contract: PASS');
