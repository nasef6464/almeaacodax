import fs from 'node:fs';

const routePath = 'server/src/routes/discussions.routes.ts';
const routeSource = fs.readFileSync(routePath, 'utf8');
const checks = [];

function add(name, fn) {
  checks.push({ name, fn });
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Missing expected source: ${needle}`);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(message || `Unexpected source present: ${needle}`);
  }
}

add('staff discussions do not get unconditional access', () => {
  assertNotIncludes(
    routeSource,
    'if (["admin", "teacher", "supervisor"].includes(role)) return true;',
    'teacher/supervisor must not bypass discussion entity scope',
  );
});

add('discussion route defines scoped staff course helper', () => {
  assertIncludes(routeSource, 'const canStaffAccessCourseDiscussion =', 'Missing staff course scope helper');
  assertIncludes(routeSource, 'managedPathIds', 'Discussion staff scope must consider managed paths');
  assertIncludes(routeSource, 'managedSubjectIds', 'Discussion staff scope must consider managed subjects');
  assertIncludes(routeSource, 'assignedTeacherId', 'Discussion staff scope must consider assigned teacher ownership');
  assertIncludes(routeSource, 'schoolId', 'Discussion supervisor scope must consider school scope');
});

add('discussion entity access resolves course scope for lesson and quiz entities', () => {
  assertIncludes(routeSource, 'findCoursesForDiscussionEntity', 'Missing entity-to-course resolver');
  assertIncludes(routeSource, 'modules.lessons.quizId', 'Quiz discussions must be traced back to course modules');
  assertIncludes(routeSource, 'assessments.quizId', 'Quiz discussions must include course assessments');
});

add('resolve endpoint re-checks thread scope before resolving', () => {
  const resolveStart = routeSource.indexOf('/:threadId/resolve');
  if (resolveStart === -1) throw new Error('Missing resolve endpoint');
  const resolveBlock = routeSource.slice(resolveStart);
  const loadIndex = resolveBlock.indexOf('const thread = await DiscussionThreadModel.findOne({ id: threadId }).lean();');
  const scopeIndex = resolveBlock.indexOf('assertCanAccessEntity(');
  const updateIndex = resolveBlock.indexOf('findOneAndUpdate(');
  if (loadIndex === -1) throw new Error('Resolve endpoint must load thread before update');
  if (scopeIndex === -1) throw new Error('Resolve endpoint must enforce thread entity scope before update');
  if (updateIndex === -1) throw new Error('Resolve endpoint must still update resolved thread after scope check');
  if (!(loadIndex < scopeIndex && scopeIndex < updateIndex)) {
    throw new Error('Resolve endpoint must load thread, enforce scope, then update');
  }
  assertIncludes(resolveBlock, 'Not allowed to resolve this thread', 'Resolve endpoint must return scoped forbidden response');
});

let failed = 0;
for (const check of checks) {
  try {
    check.fn();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${check.name}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${checks.length} discussion RBAC scope checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} discussion RBAC scope checks passed.`);
