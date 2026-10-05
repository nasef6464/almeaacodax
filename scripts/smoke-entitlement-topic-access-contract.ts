import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveFoundationTopicAccess } from '../utils/foundationTopicAccess.ts';
import { packageMatchesScope } from '../store/storeDomainHelpers.ts';

const baseContext = {
  isStaffViewer: false,
  hasFoundationPackageAccess: false,
  lockFoundationForSubject: false,
};

const paidParent = { id: 'parent-paid', isLocked: true, showOnPlatform: true };
const freeChild = { id: 'child-free', parentId: paidParent.id, isLocked: false, showOnPlatform: true };
const paidChild = { id: 'child-paid', isLocked: true, showOnPlatform: true };

const resolve = (topic: typeof freeChild, overrides: Partial<typeof baseContext> = {}) =>
  resolveFoundationTopicAccess(topic, { ...baseContext, ...overrides });

// A topic's own explicit free/paid setting is authoritative; a paid parent is
// only a grouping mechanism and must not silently change the child entitlement.
assert.equal(resolve(freeChild).hasAccess, true, 'explicitly free child of paid parent stays open');
assert.equal(resolve(freeChild).entitlementSource, 'free_topic');

assert.equal(resolve(paidChild).hasAccess, false, 'locked topic without package stays locked');
assert.equal(resolve(paidChild, { hasFoundationPackageAccess: true }).hasAccess, true, 'matching foundation package opens locked topic');
assert.equal(resolve(paidChild, { hasFoundationPackageAccess: false }).requiresPackage, true);
assert.equal(resolve(freeChild, { hasFoundationPackageAccess: true }).hasAccess, true, 'free topic remains open after a purchase');
assert.equal(
  resolve(freeChild, { lockFoundationForSubject: true }).hasAccess,
  false,
  'explicit subject-wide hard lock is the only policy allowed to override a free topic',
);

const matchingFoundationPackage = {
  id: 'foundation-quant-math', schoolId: 'school', name: 'Foundation Quant Math', courseIds: [],
  contentTypes: ['foundation'], pathIds: ['qudrat'], subjectIds: ['math'], type: 'free_access' as const,
  maxStudents: 0, status: 'active' as const, createdAt: Date.now(),
};
const unrelatedSubjectPackage = { ...matchingFoundationPackage, id: 'foundation-verbal', subjectIds: ['verbal'] };
const secondScopedPackage = { ...matchingFoundationPackage, id: 'foundation-tahsili', pathIds: ['tahsili'], subjectIds: ['physics'] };

assert.equal(packageMatchesScope(matchingFoundationPackage, 'foundation', 'qudrat', 'math'), true, 'matching scope opens');
assert.equal(packageMatchesScope(unrelatedSubjectPackage, 'foundation', 'qudrat', 'math'), false, 'different subject stays locked');
assert.equal(packageMatchesScope(matchingFoundationPackage, 'banks', 'qudrat', 'math'), false, 'foundation package does not unlock banks');
assert.equal(packageMatchesScope(matchingFoundationPackage, 'tests', 'qudrat', 'math'), false, 'foundation package does not unlock tests');
assert.equal(packageMatchesScope(matchingFoundationPackage, 'library', 'qudrat', 'math'), false, 'foundation package does not unlock library');
assert.equal(packageMatchesScope(secondScopedPackage, 'foundation', 'tahsili', 'physics'), true, 'multiple purchases union only their own scopes');
assert.equal(packageMatchesScope(secondScopedPackage, 'foundation', 'qudrat', 'math'), false, 'multiple purchases do not cross scopes');
const purchasedPackages = [matchingFoundationPackage, secondScopedPackage];
assert.equal(
  purchasedPackages.some((pkg) => packageMatchesScope(pkg, 'foundation', 'tahsili', 'physics')),
  true,
  'multiple package purchases combine only matching scopes',
);
assert.equal(
  purchasedPackages.some((pkg) => packageMatchesScope(pkg, 'foundation', 'qudrat', 'verbal')),
  false,
  'the union of purchases does not open an unrelated subject',
);

const [clientAccessSlice, grantService] = await Promise.all([
  readFile(new URL('../store/slices/accessEnrollmentSlice.ts', import.meta.url), 'utf8'),
  readFile(new URL('../server/src/services/accessGrantService.ts', import.meta.url), 'utf8'),
]);
assert.match(clientAccessSlice, /packageContentTypes\?\.length \? course\.packageContentTypes : \['courses'\]/);
assert.match(grantService, /packageId \? \["courses"\] : \["all"\]/);

console.log('FREE_REMAINS_FREE = PASS');
console.log('PACKAGE_UNLOCKS_ONLY_ITS_SCOPE = PASS');
console.log('UNRELATED_PAID_CONTENT_STAYS_LOCKED = PASS');
console.log('PARENT_LOCK_DOES_NOT_OVERRIDE_EXPLICIT_CHILD_FREE = PASS');
console.log('NO_GLOBAL_OVERGRANT = PASS');
