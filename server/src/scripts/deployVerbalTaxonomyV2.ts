import mongoose from "mongoose";
import { env } from "../config/env.js";
import { VERBAL_TAXONOMY_V2, VERBAL_TAXONOMY_V2_COUNTS } from "../data/verbalTaxonomyV2.js";

const PATH_ID = "p_1777779639431";
const SUBJECT_ID = "sub_1777779759038";
const MIGRATION_KEY = "verbal-foundation-v2-22x95";

const applyRequested = process.argv.includes("--apply");

const topicMainId = (order: number) => `top_verbal_v2_main_${String(order).padStart(2, "0")}`;
const topicSubId = (mainOrder: number, subOrder: number) =>
  `top_verbal_v2_sub_${String(mainOrder).padStart(2, "0")}_${String(subOrder).padStart(2, "0")}`;

export async function deployVerbalTaxonomyV2() {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const sections = db.collection("sections");
  const skills = db.collection("skills");
  const topics = db.collection("topics");
  const quizzes = db.collection("quizzes");
  const skillProgress = db.collection("skillprogresses");
  const backups = db.collection("migrationbackups");

  const [previousSections, previousSkills, previousTopics, previousQuizzes, previousProgress] = await Promise.all([
    sections.find({ subjectId: SUBJECT_ID }).toArray(),
    skills.find({ subjectId: SUBJECT_ID }).toArray(),
    topics.find({ subjectId: SUBJECT_ID }).toArray(),
    quizzes.find({ subjectId: SUBJECT_ID }).toArray(),
    skillProgress.find({ subjectId: SUBJECT_ID }).toArray(),
  ]);

  const snapshot = {
    migrationKey: MIGRATION_KEY,
    kind: "verbal-taxonomy-v2-preapply",
    capturedAt: new Date().toISOString(),
    sourceCollection: "multi",
    counts: {
      sections: previousSections.length,
      skills: previousSkills.length,
      topics: previousTopics.length,
      quizzes: previousQuizzes.length,
      skillProgress: previousProgress.length,
    },
    originalDocument: {
      sections: previousSections,
      skills: previousSkills,
      topics: previousTopics,
      quizzes: previousQuizzes,
      skillProgress: previousProgress,
    },
  };

  console.log("=== ALMEAA verbal taxonomy V2 preflight ===");
  console.log(`Current: ${previousSections.length} sections / ${previousSkills.length} skills / ${previousTopics.length} topics / ${previousQuizzes.length} quizzes`);
  console.log(`Target: ${VERBAL_TAXONOMY_V2_COUNTS.mainSkills} main skills / ${VERBAL_TAXONOMY_V2_COUNTS.subSkills} subskills`);
  console.log(`Existing learner progress rows retained: ${previousProgress.length}`);

  if (!applyRequested) {
    console.log("DRY RUN ONLY. Re-run with --apply after preflight verification.");
    await mongoose.disconnect();
    return;
  }

  await backups.insertOne(snapshot);

  // Questions are intentionally untouched here. Bank ingestion is a separate,
  // auditable phase after source-text verification and de-duplication.
  await Promise.all([
    sections.deleteMany({ subjectId: SUBJECT_ID }),
    skills.deleteMany({ subjectId: SUBJECT_ID }),
    topics.deleteMany({ subjectId: SUBJECT_ID }),
    quizzes.deleteMany({ subjectId: SUBJECT_ID }),
  ]);

  const now = new Date();

  await sections.insertMany(
    VERBAL_TAXONOMY_V2.map((item, index) => ({
      _id: item.sectionId as any,
      id: item.sectionId,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      name: item.name,
      order: index + 1,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await skills.insertMany(
    VERBAL_TAXONOMY_V2.map((item, index) => ({
      _id: item.id as any,
      id: item.id,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: item.sectionId,
      name: item.name,
      description: item.description,
      order: index + 1,
      lessonIds: [],
      questionIds: [],
      subSkills: item.subSkills.map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        order: sub.order,
      })),
      createdAt: now,
      updatedAt: now,
    })),
  );

  const topicDocs: any[] = [];
  VERBAL_TAXONOMY_V2.forEach((item, index) => {
    const mainOrder = index + 1;
    const parentId = topicMainId(mainOrder);
    topicDocs.push({
      _id: parentId,
      id: parentId,
      title: item.name,
      description: item.description,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: item.sectionId,
      skillId: item.id,
      parentId: null,
      order: mainOrder,
      quizIds: [],
      lessonIds: [],
      libraryItemIds: [],
      isPublished: true,
      showOnPlatform: true,
      createdAt: now,
      updatedAt: now,
    });
    item.subSkills.forEach((sub) => {
      const childId = topicSubId(mainOrder, sub.order);
      topicDocs.push({
        _id: childId,
        id: childId,
        title: sub.name,
        description: `شرح وتدريب تأسيسي مركز على مهارة: ${sub.name}`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: item.sectionId,
        skillId: sub.id,
        parentId,
        order: sub.order,
        quizIds: [],
        lessonIds: [],
        libraryItemIds: [],
        isPublished: true,
        showOnPlatform: true,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  await topics.insertMany(topicDocs);

  const [sectionCount, skillCount, parentTopicCount, childTopicCount] = await Promise.all([
    sections.countDocuments({ subjectId: SUBJECT_ID }),
    skills.countDocuments({ subjectId: SUBJECT_ID }),
    topics.countDocuments({ subjectId: SUBJECT_ID, parentId: null }),
    topics.countDocuments({ subjectId: SUBJECT_ID, parentId: { $ne: null } }),
  ]);

  if (
    sectionCount !== 22 ||
    skillCount !== 22 ||
    parentTopicCount !== 22 ||
    childTopicCount !== 95
  ) {
    throw new Error(
      `Verbal V2 integrity failure: sections=${sectionCount}, skills=${skillCount}, parents=${parentTopicCount}, children=${childTopicCount}`,
    );
  }

  console.log(`VERIFIED: ${sectionCount} sections / ${skillCount} skills / ${parentTopicCount} parent topics / ${childTopicCount} child topics`);
  console.log("Questions and learner progress were not deleted.");
  await mongoose.disconnect();
}

deployVerbalTaxonomyV2().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect failure after deployment error
  }
  process.exit(1);
});
