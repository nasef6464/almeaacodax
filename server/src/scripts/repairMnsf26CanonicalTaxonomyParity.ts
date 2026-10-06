import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779639431";

const REQUIRED_SUBSKILL_IDS = new Set([
  "sub_quant_11_4",
  "sub_quant_18_3",
]);

function canonicalRows() {
  return QUANT_TAXONOMY.flatMap((skill, skillIndex) =>
    skill.subSkills
      .filter((sub) => REQUIRED_SUBSKILL_IDS.has(sub.id))
      .map((sub) => ({
        mainSkillId: skill.id,
        mainSkillName: skill.name,
        sectionId: `sec_${SUBJECT_ID}_${skillIndex + 1}`,
        parentTopicId: `top_quant_main_${skill.id.replace("skill_", "")}`,
        subSkill: sub,
        topicId: `top_quant_sub_${sub.id.replace("sub_", "")}`,
      })),
  );
}

async function run() {
  const rows = canonicalRows();
  if (rows.length !== REQUIRED_SUBSKILL_IDS.size) {
    throw new Error(
      `Canonical taxonomy lookup mismatch: expected ${REQUIRED_SUBSKILL_IDS.size}, found ${rows.length}`,
    );
  }

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");

    const skills = db.collection("skills");
    const topics = db.collection("topics");

    const before = await skills
      .find(
        {
          subjectId: SUBJECT_ID,
          id: { $in: rows.map((row) => row.mainSkillId) },
        },
        { projection: { _id: 0, id: 1, subSkills: 1 } },
      )
      .toArray();

    const changes: unknown[] = [];

    for (const row of rows) {
      const currentMain = before.find((item) => item.id === row.mainSkillId);
      if (!currentMain) {
        throw new Error(
          `Refusing repair because approved main skill is missing: ${row.mainSkillId}`,
        );
      }

      const currentSubSkills = Array.isArray(currentMain.subSkills)
        ? currentMain.subSkills
        : [];
      const alreadyPresent = currentSubSkills.some(
        (sub: any) => String(sub?.id || "") === row.subSkill.id,
      );

      if (!alreadyPresent) {
        const skillResult = await skills.updateOne(
          {
            subjectId: SUBJECT_ID,
            id: row.mainSkillId,
            "subSkills.id": { $ne: row.subSkill.id },
          },
          {
            $push: {
              subSkills: {
                id: row.subSkill.id,
                name: row.subSkill.name,
                code: row.subSkill.code,
                order: row.subSkill.order,
              },
            },
            $currentDate: { updatedAt: true },
          },
        );

        changes.push({
          kind: "skill-subskill",
          mainSkillId: row.mainSkillId,
          subSkillId: row.subSkill.id,
          matched: skillResult.matchedCount,
          modified: skillResult.modifiedCount,
        });
      }

      const topicResult = await topics.updateOne(
        { _id: row.topicId as any },
        {
          $setOnInsert: {
            _id: row.topicId,
            id: row.topicId,
            title: row.subSkill.name,
            description: `شرح وتدريبات مركزة على ${row.subSkill.name}`,
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            sectionId: row.sectionId,
            parentId: row.parentTopicId,
            order: row.subSkill.order,
            quizIds: [],
            lessonIds: [],
            isPublished: true,
            skillId: row.subSkill.id,
            skillIds: [row.subSkill.id],
            createdAt: new Date(),
          },
          $set: {
            id: row.topicId,
            title: row.subSkill.name,
            description: `شرح وتدريبات مركزة على ${row.subSkill.name}`,
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            sectionId: row.sectionId,
            parentId: row.parentTopicId,
            order: row.subSkill.order,
            isPublished: true,
            skillId: row.subSkill.id,
            skillIds: [row.subSkill.id],
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      changes.push({
        kind: "foundation-subtopic",
        topicId: row.topicId,
        matched: topicResult.matchedCount,
        modified: topicResult.modifiedCount,
        upserted: topicResult.upsertedCount,
      });
    }

    const liveSkills = await skills
      .find({ subjectId: SUBJECT_ID })
      .project({ _id: 0, id: 1, subSkills: 1 })
      .toArray();

    const mainCount = liveSkills.length;
    const subSkillIds = new Set(
      liveSkills.flatMap((skill) =>
        Array.isArray(skill.subSkills)
          ? skill.subSkills.map((sub: any) => String(sub?.id || "")).filter(Boolean)
          : [],
      ),
    );

    const expectedTopicIds = QUANT_TAXONOMY.flatMap((skill) =>
      skill.subSkills.map(
        (sub) => `top_quant_sub_${sub.id.replace("sub_", "")}`,
      ),
    );
    const liveTopicCount = await topics.countDocuments({
      subjectId: SUBJECT_ID,
      id: { $in: expectedTopicIds },
    });

    const missingRequired = [...REQUIRED_SUBSKILL_IDS].filter(
      (id) => !subSkillIds.has(id),
    );

    const report = {
      ok:
        mainCount === 25 &&
        subSkillIds.size === 95 &&
        liveTopicCount === 95 &&
        missingRequired.length === 0,
      mainCount,
      subSkillCount: subSkillIds.size,
      canonicalFoundationSubTopicCount: liveTopicCount,
      missingRequired,
      changes,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("MNSF26_CANONICAL_TAXONOMY_REPAIR_ERROR", error);
  process.exitCode = 1;
});
