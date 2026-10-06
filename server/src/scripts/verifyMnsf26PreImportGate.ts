import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

const SUBJECT_ID = "sub_1777779748206";
const EXPECTED_FND26 = 858;
const EXPECTED_COL2627 = 946;

type GateFailure = { gate: string; detail: unknown };

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");

    const questions = db.collection("questions");
    const skills = db.collection("skills");

    const expectedMainIds = new Set(QUANT_TAXONOMY.map((item) => item.id));
    const expectedSubIds = new Set(
      QUANT_TAXONOMY.flatMap((item) => item.subSkills.map((sub) => sub.id)),
    );

    const liveSkills = await skills
      .find({ subjectId: SUBJECT_ID })
      .project({ _id: 0, id: 1, subSkills: 1 })
      .toArray();

    const liveMainIds = new Set(liveSkills.map((skill) => String(skill.id)));
    const liveSubIds = new Set(
      liveSkills.flatMap((skill) =>
        Array.isArray(skill.subSkills)
          ? skill.subSkills.map((sub: any) => String(sub?.id || "")).filter(Boolean)
          : [],
      ),
    );

    const missingMainIds = [...expectedMainIds].filter((id) => !liveMainIds.has(id));
    const extraMainIds = [...liveMainIds].filter((id) => !expectedMainIds.has(id));
    const missingSubIds = [...expectedSubIds].filter((id) => !liveSubIds.has(id));
    const extraSubIds = [...liveSubIds].filter((id) => !expectedSubIds.has(id));

    const [fnd26, col2627, mnsf26] = await Promise.all([
      questions.countDocuments({ "sourceMeta.documentCode": "FND26" }),
      questions.countDocuments({ "sourceMeta.documentCode": "COL2627" }),
      questions.countDocuments({ "sourceMeta.documentCode": "MNSF26" }),
    ]);

    const malformedMnsf = await questions
      .find(
        {
          "sourceMeta.documentCode": "MNSF26",
          $or: [
            { questionCode: { $not: /^QDR-QNT-MNSF26-/ } },
            { skillId: { $not: /^skill_quant_/ } },
            { subSkillId: { $not: /^sub_quant_/ } },
            { explanation: { $in: ["", null] } },
            { "aiContext.speechText": { $in: ["", null] } },
            { difficulty: { $nin: ["Easy", "Medium", "Hard"] } },
            { fingerprint: { $in: ["", null] } },
            { correctOptionIndex: { $not: { $type: "number" } } },
          ],
        },
        {
          projection: {
            _id: 1,
            questionCode: 1,
            skillId: 1,
            subSkillId: 1,
            difficulty: 1,
          },
        },
      )
      .limit(100)
      .toArray();

    const unknownTaxonomyMnsf = await questions
      .find(
        { "sourceMeta.documentCode": "MNSF26" },
        { projection: { _id: 1, questionCode: 1, skillId: 1, subSkillId: 1 } },
      )
      .toArray();

    const taxonomyInvalidMnsf = unknownTaxonomyMnsf.filter(
      (q) =>
        !expectedMainIds.has(String(q.skillId || "")) ||
        !expectedSubIds.has(String(q.subSkillId || "")),
    );

    const duplicateQuestionCodes = await questions
      .aggregate([
        { $match: { "sourceMeta.documentCode": "MNSF26", questionCode: { $type: "string" } } },
        { $group: { _id: "$questionCode", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray();

    const failures: GateFailure[] = [];
    if (expectedMainIds.size !== 25 || expectedSubIds.size !== 95) {
      failures.push({
        gate: "canonical-code-taxonomy",
        detail: { main: expectedMainIds.size, sub: expectedSubIds.size },
      });
    }
    if (
      liveMainIds.size !== expectedMainIds.size ||
      liveSubIds.size !== expectedSubIds.size ||
      missingMainIds.length ||
      missingSubIds.length ||
      extraMainIds.length ||
      extraSubIds.length
    ) {
      failures.push({
        gate: "live-taxonomy-parity",
        detail: {
          expected: { main: expectedMainIds.size, sub: expectedSubIds.size },
          live: { main: liveMainIds.size, sub: liveSubIds.size },
          missingMainIds,
          missingSubIds,
          extraMainIds,
          extraSubIds,
        },
      });
    }
    if (fnd26 !== EXPECTED_FND26 || col2627 !== EXPECTED_COL2627) {
      failures.push({
        gate: "quant-baseline",
        detail: {
          expected: { FND26: EXPECTED_FND26, COL2627: EXPECTED_COL2627 },
          live: { FND26: fnd26, COL2627: col2627 },
        },
      });
    }
    if (malformedMnsf.length) {
      failures.push({ gate: "mnsf26-required-fields", detail: malformedMnsf });
    }
    if (taxonomyInvalidMnsf.length) {
      failures.push({ gate: "mnsf26-taxonomy-membership", detail: taxonomyInvalidMnsf });
    }
    if (duplicateQuestionCodes.length) {
      failures.push({ gate: "mnsf26-question-code-uniqueness", detail: duplicateQuestionCodes });
    }

    const report = {
      ok: failures.length === 0,
      database: db.databaseName,
      canonicalTaxonomy: { main: expectedMainIds.size, sub: expectedSubIds.size },
      liveTaxonomy: {
        main: liveMainIds.size,
        sub: liveSubIds.size,
        missingMainIds,
        missingSubIds,
        extraMainIds,
        extraSubIds,
      },
      bankCounts: { FND26: fnd26, COL2627: col2627, MNSF26: mnsf26 },
      mnsf26Qa: {
        malformedCount: malformedMnsf.length,
        invalidTaxonomyCount: taxonomyInvalidMnsf.length,
        duplicateQuestionCodeCount: duplicateQuestionCodes.length,
      },
      failures,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("MNSF26_PREIMPORT_GATE_ERROR", error);
  process.exitCode = 1;
});
