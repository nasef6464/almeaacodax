import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dashboards/admin/UsersManager.tsx', import.meta.url), 'utf8');
assert.match(source, /const \[pageUsers, setPageUsers\]/, 'page-specific user state is missing');
assert.match(source, /setPageUsers\(\(response\.users \|\| \[\]\)\.map\(buildStoreUser\)\)/, 'page load still does not target local state');
assert.doesNotMatch(source, /hydrateUsers\(\(response\.users/, 'page load still replaces global users');
assert.match(source, /persistPageUserPatch/, 'user mutations are not awaited through the page command');
assert.match(source, /disabled=\{relationshipActionUserId === currentUser\.id\}/, 'status action has no saving guard');
console.log('G17 users manager contract: PASS');
