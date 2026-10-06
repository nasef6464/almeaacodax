import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assertIncludes = (path, needle, message) => {
  const source = read(path);
  if (!source.includes(needle)) {
    throw new Error(`${message}\nMissing in ${path}: ${needle}`);
  }
};
const assertMatches = (path, pattern, message) => {
  const source = read(path);
  if (!pattern.test(source)) {
    throw new Error(`${message}\nPattern not found in ${path}: ${pattern}`);
  }
};

assertIncludes(
  'services/api.ts',
  'pathId?: string;',
  'PaginationOptions must support scoped pathId so learning pages can request the exact course path.',
);
assertIncludes(
  'services/api.ts',
  'subjectId?: string;',
  'PaginationOptions must support scoped subjectId so learning pages can request the exact subject.',
);
assertIncludes(
  'services/apiGroups/coursesApi.ts',
  'query.pathId || "all-paths"',
  'Public course cache key must include pathId to avoid returning stale unscoped course lists.',
);
assertIncludes(
  'services/apiGroups/coursesApi.ts',
  'query.subjectId || "all-subjects"',
  'Public course cache key must include subjectId to avoid returning stale unscoped course lists.',
);

assertIncludes(
  'server/src/routes/course.routes.ts',
  'const courseListQuerySchema = z.object',
  'Course list route must validate scoped query parameters.',
);
assertIncludes(
  'server/src/routes/course.routes.ts',
  'if (query.pathId) scopedFilter.pathId = query.pathId;',
  'Course list route must filter by pathId when requested.',
);
assertIncludes(
  'server/src/routes/course.routes.ts',
  'if (query.subjectId) {',
  'Course list route must filter by subjectId/legacy subject when requested.',
);

assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'requestedPathId || "all-paths"',
  'Quiz list cache key must include pathId for scoped learning tabs.',
);
assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'requestedSubjectId || "all-subjects"',
  'Quiz list cache key must include subjectId for scoped learning tabs.',
);
assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'if (requestedPathId) scopeFilter.pathId = requestedPathId;',
  'Quiz list route must filter by pathId when requested.',
);
assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'if (requestedSubjectId) scopeFilter.subjectId = requestedSubjectId;',
  'Quiz list route must filter by subjectId when requested.',
);

assertIncludes(
  'components/LearningSection.tsx',
  "api.getCourses({ pathId: category, subjectId: subject, limit: 100 })",
  'LearningSection must backfill scoped courses for the active path/subject.',
);
assertIncludes(
  'components/LearningSection.tsx',
  "api.getQuizzes({ pathId: category, subjectId: subject, limit: 100 })",
  'LearningSection must backfill scoped quizzes for the active path/subject.',
);
assertIncludes(
  'components/LearningSection.tsx',
  'hydrateCourses(Array.from(mergedCourses.values()))',
  'Scoped course backfill must merge into the store instead of replacing unrelated courses blindly.',
);
assertIncludes(
  'components/LearningSection.tsx',
  'hydrateQuizzes(Array.from(mergedQuizzes.values()))',
  'Scoped quiz backfill must merge into the store instead of replacing unrelated quizzes blindly.',
);

assertMatches(
  'dashboards/admin/AdvancedCourseBuilder.tsx',
  /max-h-\[60vh\].*overflow-y-auto/s,
  'Existing lesson/quiz import dropdowns must stay tall and scrollable for large libraries.',
);
assertIncludes(
  'dashboards/admin/AdvancedCourseBuilder.tsx',
  'value={lessonSearch}',
  'Existing lesson import must keep search capability.',
);
assertIncludes(
  'dashboards/admin/AdvancedCourseBuilder.tsx',
  'value={quizSearch}',
  'Existing quiz import must keep search capability.',
);

console.log('BATCH100O contract passed: scoped course/quiz linkage and admin import search are guarded.');
