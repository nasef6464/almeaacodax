import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const learning = readFileSync(path.join(root, 'components/LearningSection.tsx'), 'utf8');
const routes = readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8');
const placements = readFileSync(path.join(root, 'utils/quizLearningPlacement.ts'), 'utf8');
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: String(error) }); }
};

check('TAH-MATH V2 preview is admin-only and subject-scoped', () => {
  assert.ok(learning.includes("const adminPreviewQuizzes = isAdminViewer && subject === 'sub_1777784609152'"));
});
check('preview changes transient client copies, not persisted publication or placement', () => {
  assert.ok(learning.includes("learningPlacements: (quiz.learningPlacements || []).map"));
  assert.ok(learning.includes("isVisible: true,"));
  assert.equal((learning.match(/adminPreviewQuizzes\.filter\(isMaterialQuizCandidate\)/g) || []).length, 2);
});
check('authoring draft indicators are shown in training and test cards', () => {
  assert.ok(learning.includes("[معاينة مسودة]"));
  assert.ok(learning.includes("محاكي بأقسام"));
  assert.ok(learning.includes("اختبار عادي"));
});
check('ordinary placement filter still honors hidden content', () => {
  assert.ok(placements.includes("placement ? placement.isVisible !== false : false"));
});
check('draft quiz details are denied to non-staff before question hydration', () => {
  const getRoute = routes.indexOf('quizRouter.get(\n  "/:id"');
  assert.ok(getRoute >= 0);
  const guard = routes.indexOf('String(legacyQuiz.subjectId || "") === "sub_1777784609152"', getRoute);
  const hydration = routes.indexOf('const questionIds = getQuizQuestionIds(quiz);', getRoute);
  assert.ok(guard > getRoute && guard < hydration);
  assert.ok(routes.slice(guard, hydration).includes('!isStaffRole(req.authUser?.role)'));
  assert.ok(routes.slice(guard, hydration).includes('legacyQuiz.isPublished !== true || legacyQuiz.approvalStatus !== "approved"'));
  assert.ok(routes.slice(guard, hydration).includes('StatusCodes.NOT_FOUND'));
});
const failed = checks.filter(c => c.status === 'FAIL');
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);
