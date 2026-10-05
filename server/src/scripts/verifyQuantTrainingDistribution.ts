import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db("almeaa");

  const quizzes = await db.collection("quizzes").find({
    subjectId: "sub_1777779748206",
    _id: { $regex: /^(drill_sub_quant_|bank_skill_quant_)/ },
  }).toArray();

  const foundation = quizzes.filter((q) => q.learningPlacements?.some((p: any) => p.slot === "foundation"));
  const training = quizzes.filter((q) => q.learningPlacements?.some((p: any) => p.slot === "training"));

  if (foundation.length !== 95) throw new Error(`Expected 95 foundation drills, got ${foundation.length}`);
  if (training.length < 25) throw new Error(`Expected at least 25 main-skill training groups, got ${training.length}`);

  const coverage = new Set(
    quizzes.flatMap((q) => Array.isArray(q.questionIds) ? q.questionIds.map(String) : []),
  );
  if (coverage.size !== 1804) throw new Error(`Expected 1804 unique covered questions, got ${coverage.size}`);

  const topics = await db.collection("topics").find({
    subjectId: "sub_1777779748206",
    parentId: { $ne: null },
  }, { projection: { _id: 1, skillId: 1, quizIds: 1 } }).toArray();

  if (topics.length !== 95) throw new Error(`Expected 95 subtopics, got ${topics.length}`);

  const badLinks = topics.filter((topic) => {
    const expected = `drill_${String(topic.skillId)}`;
    return !Array.isArray(topic.quizIds) || topic.quizIds.length !== 1 || topic.quizIds[0] !== expected;
  });
  if (badLinks.length) throw new Error(`Found ${badLinks.length} invalid subtopic -> drill links`);

  const tooLargeSub = foundation.filter((q) => (q.questionIds?.length || 0) > 15);
  if (tooLargeSub.length) throw new Error(`Found ${tooLargeSub.length} foundation drills above 15 questions`);

  const tooLargeMain = training.filter((q) => (q.questionIds?.length || 0) > 40);
  if (tooLargeMain.length) throw new Error(`Found ${tooLargeMain.length} main training groups above 40 questions`);

  console.log("QUANT_TRAINING_VERIFY_OK", {
    foundationDrills: foundation.length,
    mainTrainingGroups: training.length,
    uniqueQuestionCoverage: coverage.size,
    linkedSubtopics: topics.length,
  });

  await client.close();
}

run().catch(async (error) => {
  console.error(error);
  try { await client.close(); } catch {}
  process.exit(1);
});
