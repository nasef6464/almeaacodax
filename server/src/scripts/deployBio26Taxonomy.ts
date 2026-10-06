import fs from "node:fs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { locateTaxonomy, unique, type TaxonomyFile } from "./bio26TaxonomySupport.js";

const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";
const EXPECTED_SUBJECT_NAME = "الأحياء";
const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";
const EXPECTED_MAIN = 29;
const EXPECTED_SUB = 98;
const APPLY = process.argv.includes("--apply");

const validateTaxonomy = (taxonomy: TaxonomyFile) => {
  if (taxonomy.project !== "BIO26" || taxonomy.status !== "FROZEN_PRODUCTION_V1") {
    throw new Error("BIO26 taxonomy must be project=BIO26 and status=FROZEN_PRODUCTION_V1");
  }
  if (
    taxonomy.pathId !== EXPECTED_PATH_ID ||
    taxonomy.subjectId !== EXPECTED_SUBJECT_ID ||
    taxonomy.subjectName !== EXPECTED_SUBJECT_NAME ||
    taxonomy.protectedLegacySubjectId !== PROTECTED_LEGACY_SUBJECT_ID
  ) {
    throw new Error("BIO26 production scope does not match the frozen deployment contract");
  }
  if (!Array.isArray(taxonomy.items) || taxonomy.items.length !== EXPECTED_MAIN) {
    throw new Error(`BIO26 must contain exactly ${EXPECTED_MAIN} main skills`);
  }
  const subs = taxonomy.items.flatMap((item) => item.subSkills || []);
  if (subs.length !== EXPECTED_SUB) throw new Error(`BIO26 must contain exactly ${EXPECTED_SUB} subskills`);
  if (taxonomy.mainSkillCount !== EXPECTED_MAIN || taxonomy.subSkillCount !== EXPECTED_SUB) {
    throw new Error("BIO26 declared taxonomy counts drifted");
  }
  if (taxonomy.sourceQuestionOccurrences !== 2835 || taxonomy.canonicalQuestionCount !== 2832) {
    throw new Error("BIO26 source/canonical question counts drifted");
  }
  const mainIds = taxonomy.items.map((item) => item.id);
  const sectionIds = taxonomy.items.map((item) => item.sectionId);
  const subIds = subs.map((sub) => sub.id);
  if (!unique(mainIds) || !unique(sectionIds) || !unique(subIds)) {
    throw new Error("BIO26 production taxonomy contains duplicate ids");
  }
  taxonomy.items.forEach((item, index) => {
    if (item.order !== index + 1) throw new Error(`Unexpected main skill order for ${item.id}`);
    if (item.sourceMainSkillId !== `BIO26-M${String(index + 1).padStart(2, "0")}`) {
      throw new Error(`Unexpected frozen main mapping for ${item.id}`);
    }
    if (!item.id.startsWith("skill_tah_bio_")) throw new Error(`Invalid BIO26 main id ${item.id}`);
    if (!item.sectionId.startsWith("sec_sub_biology_")) throw new Error(`Invalid BIO26 section id ${item.sectionId}`);
    item.subSkills.forEach((sub, subIndex) => {
      if (sub.order !== subIndex + 1) throw new Error(`Unexpected subskill order for ${sub.id}`);
      if (!sub.id.startsWith(`sub_tah_bio_${String(index + 1).padStart(2, "0")}_`)) {
        throw new Error(`Invalid BIO26 subskill id ${sub.id}`);
      }
      if (!sub.name.trim() || !sub.sourceSubSkillId.startsWith("BIO26-S")) {
        throw new Error(`Incomplete BIO26 subskill mapping for ${sub.id}`);
      }
      const sourceMatch = sub.sourceSubSkillId.match(/^BIO26-S(\d{2})-(\d{2})$/);
      if (!sourceMatch) throw new Error(`Invalid BIO26 frozen subskill source id ${sub.sourceSubSkillId}`);
      const expectedId = `sub_tah_bio_${sourceMatch[1]}_${sourceMatch[2]}`;
      if (sub.id !== expectedId || sub.code !== sub.sourceSubSkillId) {
        throw new Error(
          `BIO26 subskill identity drift: source=${sub.sourceSubSkillId} id=${sub.id} code=${sub.code} expectedId=${expectedId}`,
        );
      }
    });
  });
};

async function main() {
  const taxonomyPath = locateTaxonomy();
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf8")) as TaxonomyFile;
  validateTaxonomy(taxonomy);

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");

  try {
    const subjects = db.collection("subjects");
    const sections = db.collection("sections");
    const skills = db.collection("skills");
    const topics = db.collection("topics");
    const questions = db.collection("questions");

    const legacyBefore = await subjects.findOne({ _id: PROTECTED_LEGACY_SUBJECT_ID as any });
    if (!legacyBefore) throw new Error("Protected علم البيئة subject is missing; refusing BIO26 deployment");
    if (
      String(legacyBefore.pathId || "") !== EXPECTED_PATH_ID ||
      !String(legacyBefore.name || "").includes("البيئة")
    ) {
      throw new Error("Protected legacy subject identity changed; refusing BIO26 deployment");
    }

    const target = await subjects.findOne({ _id: EXPECTED_SUBJECT_ID as any });
    if (target && (
      String(target.pathId || "") !== EXPECTED_PATH_ID ||
      String(target.name || "") !== EXPECTED_SUBJECT_NAME
    )) {
      throw new Error("BIO26 dedicated subject id is occupied by a different subject");
    }

    const competingBiology = await subjects.find({
      pathId: EXPECTED_PATH_ID,
      _id: { $nin: [EXPECTED_SUBJECT_ID as any, PROTECTED_LEGACY_SUBJECT_ID as any] },
      name: { $regex: /أحياء|احياء|biology/i },
    }).toArray();
    if (competingBiology.length) {
      throw new Error(`Another dedicated biology subject already exists: ${competingBiology.map((s: any) => String(s._id)).join(",")}`);
    }

    const targetMainIds = taxonomy.items.map((item) => item.id);
    const targetSectionIds = taxonomy.items.map((item) => item.sectionId);
    const targetTopicIds = taxonomy.items.flatMap((item) => [
      `top_tah_bio_main_${String(item.order).padStart(2, "0")}`,
      ...item.subSkills.map((sub) => `top_tah_bio_sub_${sub.id.replace("sub_tah_bio_", "")}`),
    ]);

    const [skillCollision, sectionCollision, topicCollision] = await Promise.all([
      skills.findOne({ _id: { $in: targetMainIds as any[] }, subjectId: { $ne: EXPECTED_SUBJECT_ID } }),
      sections.findOne({ _id: { $in: targetSectionIds as any[] }, subjectId: { $ne: EXPECTED_SUBJECT_ID } }),
      topics.findOne({ _id: { $in: targetTopicIds as any[] }, subjectId: { $ne: EXPECTED_SUBJECT_ID } }),
    ]);
    if (skillCollision || sectionCollision || topicCollision) {
      throw new Error("BIO26 target taxonomy ids collide with another subject");
    }

    const [questionCount, foreignCodeCount, existingSections, existingSkills, existingTopics] = await Promise.all([
      questions.countDocuments({ $or: [{ subject: EXPECTED_SUBJECT_ID }, { subjectId: EXPECTED_SUBJECT_ID }] }),
      questions.countDocuments({
        questionCode: { $regex: "^TAH-BIO-BIO26-" },
        $and: [
          { subject: { $ne: EXPECTED_SUBJECT_ID } },
          { subjectId: { $ne: EXPECTED_SUBJECT_ID } },
        ],
      }),
      sections.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      skills.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      topics.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
    ]);
    const currentSubCount = existingSkills.reduce(
      (sum: number, item: any) => sum + (Array.isArray(item.subSkills) ? item.subSkills.length : 0), 0,
    );

    console.log(JSON.stringify({
      project: "BIO26",
      mode: APPLY ? "APPLY" : "DRY_RUN",
      taxonomyPath,
      protectedLegacy: {
        subjectId: PROTECTED_LEGACY_SUBJECT_ID,
        name: legacyBefore.name,
        pathId: legacyBefore.pathId,
      },
      scope: {
        pathId: EXPECTED_PATH_ID,
        subjectId: EXPECTED_SUBJECT_ID,
        subjectName: EXPECTED_SUBJECT_NAME,
        subjectExists: Boolean(target),
      },
      current: {
        questions: questionCount,
        foreignCodeCount,
        sections: existingSections.length,
        mainSkills: existingSkills.length,
        subSkills: currentSubCount,
        topics: existingTopics.length,
      },
      target: {
        sections: EXPECTED_MAIN,
        mainSkills: EXPECTED_MAIN,
        subSkills: EXPECTED_SUB,
        topics: EXPECTED_MAIN + EXPECTED_SUB,
      },
    }, null, 2));

    if (!APPLY) {
      console.log("BIO26_TAXONOMY_DRY_RUN_PASS");
      return;
    }

    if (questionCount !== 0 || foreignCodeCount !== 0) {
      throw new Error(`BIO26 first taxonomy apply requires zero BIO26 questions; target=${questionCount}, foreign=${foreignCodeCount}`);
    }

    const timestamp = new Date();
    const snapshotId = `bio26-taxonomy-${timestamp.toISOString()}`;
    await db.collection("content_snapshots").insertOne({
      _id: snapshotId as any,
      kind: "BIO26_TAXONOMY_PRE_APPLY",
      pathId: EXPECTED_PATH_ID,
      subjectId: EXPECTED_SUBJECT_ID,
      protectedLegacySubject: {
        _id: legacyBefore._id,
        pathId: legacyBefore.pathId,
        name: legacyBefore.name,
      },
      createdAt: timestamp,
      targetSubjectBefore: target || null,
      sections: existingSections,
      skills: existingSkills,
      topics: existingTopics,
    });

    if (!target) {
      await subjects.insertOne({
        _id: EXPECTED_SUBJECT_ID as any,
        pathId: EXPECTED_PATH_ID,
        levelId: null,
        name: EXPECTED_SUBJECT_NAME,
        icon: "biotech",
        color: "emerald",
        iconUrl: "",
        iconStyle: "modern",
        settings: {
          showCourses: true,
          showSkills: true,
          showBanks: true,
          showTests: true,
          showLibrary: true,
          lockSkillsForNonSubscribers: false,
          lockBanksForNonSubscribers: false,
          lockTestsForNonSubscribers: false,
          lockLibraryForNonSubscribers: false,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await Promise.all([
      sections.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
      skills.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
      topics.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
    ]);

    const sectionDocs = taxonomy.items.map((item) => ({
      _id: item.sectionId,
      id: item.sectionId,
      subjectId: EXPECTED_SUBJECT_ID,
      name: item.name,
      order: item.order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    const skillDocs = taxonomy.items.map((item) => ({
      _id: item.id,
      id: item.id,
      pathId: EXPECTED_PATH_ID,
      subjectId: EXPECTED_SUBJECT_ID,
      sectionId: item.sectionId,
      name: item.name,
      description: `BIO26 frozen production main skill; source=${item.sourceMainSkillId}`,
      order: item.order,
      lessonIds: [],
      questionIds: [],
      subSkills: item.subSkills.map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        description: `BIO26 frozen subskill; source=${sub.sourceSubSkillId}`,
        order: sub.order,
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    const topicDocs: any[] = [];
    for (const item of taxonomy.items) {
      const mainTopicId = `top_tah_bio_main_${String(item.order).padStart(2, "0")}`;
      topicDocs.push({
        _id: mainTopicId,
        id: mainTopicId,
        title: item.name,
        pathId: EXPECTED_PATH_ID,
        subjectId: EXPECTED_SUBJECT_ID,
        sectionId: item.sectionId,
        skillId: item.id,
        skillIds: [item.id],
        parentId: null,
        order: item.order,
        showOnPlatform: true,
        isLocked: false,
        lessonIds: [],
        quizIds: [],
        libraryItemIds: [],
        sourceMeta: {
          project: "BIO26",
          sourceMainSkillId: item.sourceMainSkillId,
          sourceQuestionOccurrences: item.sourceQuestionOccurrences,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      for (const sub of item.subSkills) {
        const subTopicId = `top_tah_bio_sub_${sub.id.replace("sub_tah_bio_", "")}`;
        topicDocs.push({
          _id: subTopicId,
          id: subTopicId,
          title: sub.name,
          pathId: EXPECTED_PATH_ID,
          subjectId: EXPECTED_SUBJECT_ID,
          sectionId: item.sectionId,
          skillId: sub.id,
          skillIds: [item.id, sub.id],
          parentId: mainTopicId,
          order: sub.order,
          showOnPlatform: true,
          isLocked: false,
          lessonIds: [],
          quizIds: [],
          libraryItemIds: [],
          sourceMeta: {
            project: "BIO26",
            sourceMainSkillId: item.sourceMainSkillId,
            sourceSubSkillId: sub.sourceSubSkillId,
            targetFoundationVideoMinutes: sub.targetFoundationVideoMinutes,
            sourceQuestionOccurrences: sub.sourceQuestionOccurrences,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    await sections.insertMany(sectionDocs, { ordered: true });
    await skills.insertMany(skillDocs, { ordered: true });
    await topics.insertMany(topicDocs, { ordered: true });

    const [finalSubject, finalSections, finalSkills, finalTopics, legacyAfter] = await Promise.all([
      subjects.findOne({ _id: EXPECTED_SUBJECT_ID as any }),
      sections.countDocuments({ subjectId: EXPECTED_SUBJECT_ID }),
      skills.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      topics.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      subjects.findOne({ _id: PROTECTED_LEGACY_SUBJECT_ID as any }),
    ]);
    const finalSubCount = finalSkills.reduce(
      (sum: number, item: any) => sum + (Array.isArray(item.subSkills) ? item.subSkills.length : 0), 0,
    );
    const parentTopics = finalTopics.filter((item: any) => !item.parentId).length;
    const childTopics = finalTopics.filter((item: any) => Boolean(item.parentId)).length;
    const legacyUnchanged =
      String(legacyAfter?._id || "") === String(legacyBefore._id || "") &&
      String(legacyAfter?.pathId || "") === String(legacyBefore.pathId || "") &&
      String(legacyAfter?.name || "") === String(legacyBefore.name || "");

    if (
      !finalSubject ||
      String(finalSubject.pathId || "") !== EXPECTED_PATH_ID ||
      String(finalSubject.name || "") !== EXPECTED_SUBJECT_NAME ||
      finalSections !== EXPECTED_MAIN ||
      finalSkills.length !== EXPECTED_MAIN ||
      finalSubCount !== EXPECTED_SUB ||
      finalTopics.length !== EXPECTED_MAIN + EXPECTED_SUB ||
      parentTopics !== EXPECTED_MAIN ||
      childTopics !== EXPECTED_SUB ||
      !legacyUnchanged
    ) {
      throw new Error("BIO26 taxonomy post-apply verification failed");
    }

    console.log(JSON.stringify({
      status: "PASS",
      snapshotId,
      subject: { id: EXPECTED_SUBJECT_ID, name: EXPECTED_SUBJECT_NAME, pathId: EXPECTED_PATH_ID },
      protectedLegacyUnchanged: legacyUnchanged,
      final: {
        sections: finalSections,
        mainSkills: finalSkills.length,
        subSkills: finalSubCount,
        parentTopics,
        childTopics,
        topics: finalTopics.length,
      },
    }, null, 2));
    console.log("BIO26_TAXONOMY_APPLY_PASS");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("BIO26_TAXONOMY_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
