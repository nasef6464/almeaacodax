/**
 * migrateQuizKind.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migration: تحديث حقل quizKind في الاختبارات القديمة التي لا تملكه.
 *
 * المنطق:
 *   - إذا mockExam.enabled === true  → quizKind = 'mock'
 *   - إذا type === 'bank' أو placement === 'training' → quizKind = 'drill'
 *   - غير ذلك                        → quizKind = 'test'
 *
 * آمن: لا يُعدّل اختبارات تملك quizKind بالفعل.
 *
 * تشغيل:
 *   npx tsx src/scripts/migrateQuizKind.ts
 */

import { connectToDatabase } from "../config/db.js";
import { QuizModel } from "../models/Quiz.js";

async function migrateQuizKind() {
  await connectToDatabase();
  console.log("🔍 Starting quizKind migration...\n");

  // فقط الاختبارات التي لا تملك quizKind
  const legacy = await QuizModel.find({ quizKind: { $exists: false } })
    .select("_id id type placement showInTraining showInMock mockExam quizKind")
    .lean();

  console.log(`📊 Found ${legacy.length} quizzes without quizKind\n`);

  if (legacy.length === 0) {
    console.log("✅ Nothing to migrate. All quizzes already have quizKind.");
    process.exit(0);
  }

  const batches = {
    mock: [] as string[],
    drill: [] as string[],
    test: [] as string[],
  };

  for (const quiz of legacy) {
    const id = String((quiz as any).id || (quiz as any)._id);
    const mockEnabled = (quiz as any).mockExam?.enabled === true;
    const type = String((quiz as any).type || "quiz");
    const placement = String((quiz as any).placement || "");
    const showInTraining = (quiz as any).showInTraining;
    const showInMock = (quiz as any).showInMock;

    if (mockEnabled) {
      batches.mock.push(id);
    } else if (
      type === "bank" ||
      placement === "training" ||
      showInTraining === true && showInMock === false
    ) {
      batches.drill.push(id);
    } else {
      batches.test.push(id);
    }
  }

  console.log(`  → mock:  ${batches.mock.length} quizzes`);
  console.log(`  → drill: ${batches.drill.length} quizzes`);
  console.log(`  → test:  ${batches.test.length} quizzes\n`);

  // تنفيذ التحديثات بالتجميع
  const results = await Promise.all([
    batches.mock.length > 0
      ? QuizModel.updateMany(
          { $or: [{ id: { $in: batches.mock } }, { _id: { $in: batches.mock } }] },
          { $set: { quizKind: "mock", showInMock: true, showInTraining: false } }
        )
      : Promise.resolve({ modifiedCount: 0 }),

    batches.drill.length > 0
      ? QuizModel.updateMany(
          { $or: [{ id: { $in: batches.drill } }, { _id: { $in: batches.drill } }] },
          { $set: { quizKind: "drill", showInTraining: true, showInMock: false } }
        )
      : Promise.resolve({ modifiedCount: 0 }),

    batches.test.length > 0
      ? QuizModel.updateMany(
          { $or: [{ id: { $in: batches.test } }, { _id: { $in: batches.test } }] },
          { $set: { quizKind: "test", showInMock: true, showInTraining: true } }
        )
      : Promise.resolve({ modifiedCount: 0 }),
  ]);

  const totalModified = results.reduce((sum, r) => sum + (r as any).modifiedCount, 0);

  console.log(`✅ Migration complete!`);
  console.log(`   Modified: ${totalModified} / ${legacy.length} quizzes\n`);

  // تحقق: ابحث عن أي اختبار بدون quizKind بعد Migration
  const remaining = await QuizModel.countDocuments({ quizKind: { $exists: false } });
  if (remaining > 0) {
    console.warn(`⚠️  ${remaining} quizzes still without quizKind — check manually.`);
  } else {
    console.log("✅ All quizzes now have quizKind.");
  }

  process.exit(0);
}

migrateQuizKind().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
