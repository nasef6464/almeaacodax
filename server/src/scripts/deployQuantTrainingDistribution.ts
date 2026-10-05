import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const APPLY = process.argv.includes("--apply");
const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779639431";

const client = new MongoClient(uri);

type Q = {
  id: string;
  questionCode?: string;
  skillId: string;
  subSkillId: string;
  difficulty?: string;
  sourceMeta?: Record<string, any>;
};

function pageOf(q: Q) {
  return Number(q.sourceMeta?.printedPageNumber ?? q.sourceMeta?.page ?? 0);
}

function qnumOf(q: Q) {
  return Number(
    q.sourceMeta?.printedQuestionNumber ??
    q.sourceMeta?.printedNumber ??
    q.sourceMeta?.questionNumber ??
    0,
  );
}

function diverse(arr: Q[], limit: number, includeSub = false) {
  const buckets = new Map<string, Q[]>();
  for (const q of arr) {
    const key = [
      includeSub ? q.subSkillId : "",
      String(q.sourceMeta?.documentCode || ""),
      String(q.difficulty || ""),
    ].join("|");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(q);
  }

  for (const bucket of buckets.values()) {
    bucket.sort(
      (a, b) =>
        pageOf(a) - pageOf(b) ||
        qnumOf(a) - qnumOf(b) ||
        String(a.id).localeCompare(String(b.id)),
    );
  }

  const keys = [...buckets.keys()].sort();
  const out: Q[] = [];
  while (out.length < limit) {
    let moved = false;
    for (const key of keys) {
      const bucket = buckets.get(key)!;
      if (!bucket.length) continue;
      out.push(bucket.shift()!);
      moved = true;
      if (out.length >= limit) break;
    }
    if (!moved) break;
  }
  return out;
}

function splitBalanced<T>(arr: T[], n: number) {
  const out = Array.from({ length: n }, () => [] as T[]);
  arr.forEach((item, index) => out[index % n].push(item));
  return out;
}

function addUnique(out: Q[], q: Q) {
  if (!out.some((item) => item.id === q.id)) out.push(q);
}

async function run() {
  await client.connect();
  const db = client.db("almeaa");
  const questionsCol = db.collection("questions");
  const topicsCol = db.collection("topics");
  const skillsCol = db.collection("skills");
  const quizzesCol = db.collection("quizzes");

  const questions = (await questionsCol.find(
    { "sourceMeta.documentCode": { $in: ["FND26", "COL2627"] } },
    { projection: { _id: 0, id: 1, questionCode: 1, skillId: 1, subSkillId: 1, difficulty: 1, sourceMeta: 1 } },
  ).toArray()) as Q[];

  if (questions.length !== 1804) {
    throw new Error(`Refusing to build training: expected 1804 audited quant questions, got ${questions.length}`);
  }

  const topics = await topicsCol.find(
    { subjectId: SUBJECT_ID, parentId: { $ne: null } },
    { projection: { _id: 1, id: 1, title: 1, skillId: 1, parentId: 1, sectionId: 1, order: 1, quizIds: 1 } },
  ).toArray();

  const skills = await skillsCol.find(
    { id: /^skill_quant_/ },
    { projection: { _id: 0, id: 1, name: 1, sectionId: 1, order: 1, subSkills: 1 } },
  ).sort({ id: 1 }).toArray();

  if (topics.length !== 93) throw new Error(`Expected 93 quant subtopics, got ${topics.length}`);
  if (skills.length !== 25) throw new Error(`Expected 25 quant main skills, got ${skills.length}`);

  const topicBySub = new Map(topics.map((topic) => [String(topic.skillId), topic]));
  const bySub = new Map<string, Q[]>();
  const byMain = new Map<string, Q[]>();

  for (const q of questions) {
    if (!q.id || !q.skillId || !q.subSkillId) {
      throw new Error(`Malformed audited question: ${q.questionCode || q.id}`);
    }
    if (!bySub.has(q.subSkillId)) bySub.set(q.subSkillId, []);
    if (!byMain.has(q.skillId)) byMain.set(q.skillId, []);
    bySub.get(q.subSkillId)!.push(q);
    byMain.get(q.skillId)!.push(q);
  }

  const now = Date.now();
  const docs: any[] = [];
  const usedInFoundation = new Set<string>();

  for (const skill of skills) {
    const subs = [...(skill.subSkills || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    for (const sub of subs) {
      const subId = String(sub.id);
      const topic = topicBySub.get(subId);
      if (!topic) throw new Error(`Missing foundation topic for ${subId}`);

      const available = bySub.get(subId) || [];
      const selected = diverse(available, Math.min(15, available.length));
      selected.forEach((q) => usedInFoundation.add(q.id));

      const drillId = `drill_${subId}`;
      docs.push({
        _id: drillId,
        id: drillId,
        title: `تدريب: ${sub.name}`,
        description: `تدريب تأسيسي متنوع على ${sub.name} مرتبط مباشرة بموضوع التأسيس، من بنك قدرات الكمي المعتمد.`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: topic.sectionId || skill.sectionId || null,
        type: "quiz",
        quizKind: "drill",
        mode: "regular",
        questionIds: selected.map((q) => q.id),
        skillIds: [subId],
        learningPlacements: [{
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "foundation",
          accessType: "inherit",
          isVisible: true,
          order: Number(sub.order || topic.order || 0),
          courseId: null,
          lessonId: null,
          topicId: String(topic.id || topic._id),
          createdAt: now,
          updatedAt: now,
        }],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          returnToSourceOnFinish: true,
          maxAttempts: 5,
          passingScore: 60,
          timeLimit: 20,
          randomizeQuestions: true,
          randomizeOptions: false,
          showProgressBar: true,
          requireAnswerBeforeNext: false,
          allowQuestionReview: true,
          optionLayout: "auto",
        },
        access: { type: "free", price: 0, allowedGroupIds: [] },
        targetGroupIds: [],
        targetUserIds: [],
        isPublished: true,
        showOnPlatform: true,
        ownerType: "platform",
        approvalStatus: "approved",
        approvedAt: now,
        reviewerNotes: "Audited FND26 + COL2627 source-first mapping.",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    }
  }

  for (let skillIndex = 0; skillIndex < skills.length; skillIndex += 1) {
    const skill = skills[skillIndex];
    const mainId = String(skill.id);
    const all = diverse(byMain.get(mainId) || [], (byMain.get(mainId) || []).length, true);
    const residual = all.filter((q) => !usedInFoundation.has(q.id));
    const reused = all.filter((q) => usedInFoundation.has(q.id));

    const groupCount = Math.max(1, Math.ceil(residual.length / 40));
    const chunks = residual.length
      ? splitBalanced(diverse(residual, residual.length, true), groupCount)
      : [[] as Q[]];

    const targetMin = all.length >= 30 ? 30 : all.length;

    for (let groupIndex = 0; groupIndex < chunks.length; groupIndex += 1) {
      let cursor = groupIndex;
      while (chunks[groupIndex].length < targetMin && reused.length) {
        addUnique(chunks[groupIndex], reused[cursor % reused.length]);
        cursor += 1;
        if (cursor > reused.length * 4) break;
      }
    }

    const seenResidual = new Set(chunks.flat().map((q) => q.id));
    for (const q of residual) {
      if (seenResidual.has(q.id)) continue;
      let target = chunks.find((chunk) => chunk.length < 40);
      if (!target) {
        target = [];
        chunks.push(target);
      }
      target.push(q);
      seenResidual.add(q.id);
    }

    for (let groupIndex = 0; groupIndex < chunks.length; groupIndex += 1) {
      const selected = diverse(chunks[groupIndex], Math.min(40, chunks[groupIndex].length), true);
      const bankId = `bank_${mainId}_g${String(groupIndex + 1).padStart(2, "0")}`;
      docs.push({
        _id: bankId,
        id: bankId,
        title: `تدريب: ${skill.name}${chunks.length > 1 ? ` — مجموعة ${groupIndex + 1}` : ""}`,
        description: `تدريب شامل على المهارة الأساسية ${skill.name}. أولوية الاختيار للأسئلة غير المستخدمة في تدريب التأسيس مع موازنة المهارات الفرعية والمصدر والصعوبة.`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId || null,
        type: "bank",
        quizKind: "drill",
        placement: "training",
        showInTraining: true,
        showInMock: false,
        mode: "regular",
        questionIds: selected.map((q) => q.id),
        skillIds: [mainId],
        learningPlacements: [{
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "training",
          accessType: "free",
          isVisible: true,
          order: (skillIndex + 1) * 10 + groupIndex,
          courseId: null,
          lessonId: null,
          topicId: null,
          createdAt: now,
          updatedAt: now,
        }],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          returnToSourceOnFinish: true,
          maxAttempts: 5,
          passingScore: 60,
          timeLimit: 45,
          randomizeQuestions: true,
          randomizeOptions: false,
          showProgressBar: true,
          requireAnswerBeforeNext: false,
          allowQuestionReview: true,
          optionLayout: "auto",
        },
        access: { type: "free", price: 0, allowedGroupIds: [] },
        targetGroupIds: [],
        targetUserIds: [],
        isPublished: true,
        showOnPlatform: true,
        ownerType: "platform",
        approvalStatus: "approved",
        approvedAt: now,
        reviewerNotes: "Audited FND26 + COL2627 coverage-first training distribution.",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    }
  }

  const coverage = new Set(docs.flatMap((doc) => doc.questionIds));
  if (coverage.size !== 1804) {
    throw new Error(`Training coverage gate failed: ${coverage.size}/1804 unique questions`);
  }

  const foundationCount = docs.filter((doc) => doc.learningPlacements?.[0]?.slot === "foundation").length;
  const trainingCount = docs.filter((doc) => doc.learningPlacements?.[0]?.slot === "training").length;

  console.log({
    apply: APPLY,
    sourceQuestions: questions.length,
    foundationDrills: foundationCount,
    mainTrainingGroups: trainingCount,
    generatedQuizzes: docs.length,
    uniqueQuestionCoverage: coverage.size,
  });

  if (!APPLY) {
    await client.close();
    return;
  }

  const existing = await quizzesCol.find({
    subjectId: SUBJECT_ID,
    $or: [
      { "learningPlacements.slot": { $in: ["training", "foundation"] } },
      { placement: "training" },
    ],
  }).toArray();

  if (existing.length) {
    const backup = existing.map((doc, index) => ({
      ...doc,
      _id: `quant_training_${now}_${index}_${String(doc._id)}`,
      originalId: String(doc._id),
      backupReason: "pre quant training redistribution",
      backedUpAt: new Date(now),
    }));
    await db.collection("quizzes_backup_quant_training").insertMany(backup);
  }

  await quizzesCol.deleteMany({
    subjectId: SUBJECT_ID,
    $or: [
      { "learningPlacements.slot": { $in: ["training", "foundation"] } },
      { placement: "training" },
    ],
  });

  await quizzesCol.insertMany(docs);

  const topicOps = topics.map((topic) => ({
    updateOne: {
      filter: { _id: topic._id },
      update: { $set: { quizIds: [`drill_${String(topic.skillId)}`], updatedAt: new Date(now) } },
    },
  }));
  await topicsCol.bulkWrite(topicOps);

  const persisted = await quizzesCol.find({
    subjectId: SUBJECT_ID,
    _id: { $regex: /^(drill_sub_quant_|bank_skill_quant_)/ },
  }).toArray();

  const persistedCoverage = new Set(
    persisted.flatMap((doc) => Array.isArray(doc.questionIds) ? doc.questionIds.map(String) : []),
  );

  if (persistedCoverage.size !== 1804) {
    throw new Error(`Post-write coverage failed: ${persistedCoverage.size}/1804`);
  }

  console.log("QUANT_TRAINING_DISTRIBUTION_OK", {
    quizzes: persisted.length,
    uniqueQuestionCoverage: persistedCoverage.size,
  });

  await client.close();
}

run().catch(async (error) => {
  console.error(error);
  try { await client.close(); } catch {}
  process.exit(1);
});
