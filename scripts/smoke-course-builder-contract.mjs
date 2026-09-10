import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const builderSource = fs.readFileSync(path.join(root, 'dashboards/admin/AdvancedCourseBuilder.tsx'), 'utf8');
const typeSource = fs.readFileSync(path.join(root, 'types.ts'), 'utf8');
const serverCourseSource = fs.readFileSync(path.join(root, 'server/src/models/Course.ts'), 'utf8');
const authApiSource = fs.readFileSync(path.join(root, 'services/apiGroups/authApi.ts'), 'utf8');
const authRouteSource = fs.readFileSync(path.join(root, 'server/src/routes/auth.routes.ts'), 'utf8');
const courseRouteSource = fs.readFileSync(path.join(root, 'server/src/routes/course.routes.ts'), 'utf8');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${message}`);
  }
};

check('course model keeps teacher ownership and revenue share fields', () => {
  assertIncludes(typeSource, 'assignedTeacherId?: string;');
  assertIncludes(typeSource, 'revenueSharePercentage?: number;');
  assertIncludes(serverCourseSource, 'assignedTeacherId: { type: String');
  assertIncludes(serverCourseSource, 'revenueSharePercentage: { type: Number');
});

check('course builder loads real eligible trainers from the server', () => {
  assertIncludes(builderSource, 'api.getPlatformTrainers');
  assertIncludes(builderSource, 'canAssignPlatformTrainer');
  assertIncludes(builderSource, 'مدرب المنصة المكلف');
  assertIncludes(builderSource, 'ابحث بالاسم أو البريد الإلكتروني');
  assertIncludes(builderSource, 'تظهر الحسابات النشطة ذات المسارات أو المواد المسندة فقط.');
  assertIncludes(authApiSource, 'getPlatformTrainers:');
  assertIncludes(authApiSource, 'platformTrainer: true');
  assertIncludes(authRouteSource, 'platformTrainer: z.preprocess');
  assertIncludes(authRouteSource, '"managedPathIds.0"');
  assertIncludes(authRouteSource, 'Only platform administrators can browse the platform trainer directory.');
});

check('course builder lets admin assign a scoped trainer and share percentage', () => {
  assertIncludes(builderSource, 'assignedTeacherId: event.target.value');
  assertIncludes(builderSource, "revenueSharePercentage");
  assertIncludes(builderSource, "نسبة المدرب من دخل الدورة");
  assertIncludes(courseRouteSource, 'assertAssignedTrainerCanOwnCourse');
  assertIncludes(courseRouteSource, 'لا يمكن تعيين هذا المدرب لأن الدورة خارج المسارات أو المواد المسندة إليه.');
  assertIncludes(courseRouteSource, 'delete nextPayload.assignedTeacherId;');
});

check('course builder can import existing lessons into curriculum modules', () => {
  assertIncludes(builderSource, 'const attachExistingLesson =');
  assertIncludes(builderSource, 'استدعاء درس موجود');
  assertIncludes(builderSource, 'scopedLessons.map');
});

check('course builder can import existing quizzes into curriculum modules', () => {
  assertIncludes(builderSource, 'const attachExistingQuiz =');
  assertIncludes(builderSource, 'استدعاء اختبار موجود');
  assertIncludes(builderSource, 'quizId: existingQuiz.id');
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} course builder contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} course builder contract smoke checks passed.`);
