import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

const SUBJECT_ID = "sub_1777779748206";
const EXPECTED_FND26 = 858;
const EXPECTED_COL2627 = 946;

type GateFailure = { gate: string; detail: unknown };

function normalizeQuestionText(value: unknown) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalQuestionText(question: any) {
  return (
    question?.questionText ||
    question?.text ||
    question?.aiReadableText ||
    question?.aiContext?.aiReadableText ||
    ""
  );
}

async function run() {
  const cropQueuePath = path.resolve(
    process.cwd(),
    "../docs/content/mnsf26/MNSF26_CROP_QUEUE_V1.json",
  );
  const cropQueue = JSON.parse(fs.readFileSync(cropQueuePath, "utf8")) as {
    queue: Array<{
      questionCode: string;
      contentStatus: string;
      cropStatus: string;
      imageHash: string | null;
      imageUrl: string | null;
    }>;
  };
  const importableCropRows = cropQueue.queue.filter(
    (item) => item.contentStatus === "CONTENT_READY_CROP_PENDING",
  );
  const cropEvidenceFailures = importableCropRows.filter(
    (item) =>
      item.cropStatus !== "READY" ||
      !item.imageHash ||
      !item.imageUrl,
  );

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");

    const questions = db.collection("questions");
    const skills = db.collection("skills");
    const topics = db.collection("topics");

    const expectedMainIds = new Set(QUANT_TAXONOMY.map((item) => item.id));
    const expectedSubIds = new Set(
      QUANT_TAXONOMY.flatMap((item) => item.subSkills.map((sub) => sub.id)),
    );
    const expectedSubTopicRows = QUANT_TAXONOMY.flatMap((item) =>
      item.subSkills.map((sub) => ({
        subSkillId: sub.id,
        topicId: `top_quant_sub_${sub.id.replace("sub_", "")}`,
      })),
    );
    const expectedSubTopicIds = new Set(expectedSubTopicRows.map((row) => row.topicId));

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

    const liveSubTopics = await topics
      .find({
        subjectId: SUBJECT_ID,
        id: { $in: [...expectedSubTopicIds] },
      })
      .project({ _id: 0, id: 1, skillId: 1, skillIds: 1 })
      .toArray();

    const liveSubTopicById = new Map(
      liveSubTopics.map((topic) => [String(topic.id), topic]),
    );
    const missingSubTopicIds = expectedSubTopicRows
      .filter((row) => !liveSubTopicById.has(row.topicId))
      .map((row) => row.topicId);
    const mismatchedSubTopics = expectedSubTopicRows
      .map((row) => {
        const topic = liveSubTopicById.get(row.topicId);
        if (!topic) return null;
        const skillIds = Array.isArray(topic.skillIds)
          ? topic.skillIds.map((id: unknown) => String(id))
          : [];
        const valid =
          String(topic.skillId || "") === row.subSkillId &&
          skillIds.includes(row.subSkillId);
        return valid
          ? null
          : {
              topicId: row.topicId,
              expectedSubSkillId: row.subSkillId,
              liveSkillId: topic.skillId ?? null,
              liveSkillIds: skillIds,
            };
      })
      .filter(Boolean);

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

    const [baselineTexts, mnsfTexts] = await Promise.all([
      questions
        .find(
          { "sourceMeta.documentCode": { $in: ["FND26", "COL2627"] } },
          {
            projection: {
              _id: 0,
              questionCode: 1,
              questionText: 1,
              text: 1,
              aiReadableText: 1,
              "aiContext.aiReadableText": 1,
              "sourceMeta.documentCode": 1,
            },
          },
        )
        .toArray(),
      questions
        .find(
          { "sourceMeta.documentCode": "MNSF26" },
          {
            projection: {
              _id: 0,
              questionCode: 1,
              questionText: 1,
              text: 1,
              aiReadableText: 1,
              "aiContext.aiReadableText": 1,
            },
          },
        )
        .toArray(),
    ]);

    const baselineByNormalizedText = new Map<string, any[]>();
    for (const question of baselineTexts) {
      const normalized = normalizeQuestionText(canonicalQuestionText(question));
      if (!normalized) continue;
      const list = baselineByNormalizedText.get(normalized) || [];
      list.push(question);
      baselineByNormalizedText.set(normalized, list);
    }

    const crossBankTextDuplicates = mnsfTexts.flatMap((question) => {
      const normalized = normalizeQuestionText(canonicalQuestionText(question));
      if (!normalized) return [];
      const matches = baselineByNormalizedText.get(normalized) || [];
      return matches.map((match) => ({
        mnsfQuestionCode: question.questionCode ?? null,
        baselineQuestionCode: match.questionCode ?? null,
        baselineSource: match.sourceMeta?.documentCode ?? null,
        normalizedText: normalized,
      }));
    });

    const failures: GateFailure[] = [];
    if (importableCropRows.length !== 130 || cropEvidenceFailures.length) {
      failures.push({
        gate: "authoritative-crop-evidence",
        detail: {
          expectedImportableCrops: 130,
          actualImportableCrops: importableCropRows.length,
          missingOrUnready: cropEvidenceFailures.map((item) => item.questionCode),
        },
      });
    }
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
    if (missingSubTopicIds.length || mismatchedSubTopics.length) {
      failures.push({
        gate: "foundation-subtopic-parity",
        detail: {
          expected: expectedSubTopicIds.size,
          liveCanonical: liveSubTopics.length,
          missingSubTopicIds,
          mismatchedSubTopics,
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
    if (crossBankTextDuplicates.length) {
      failures.push({
        gate: "mnsf26-cross-bank-exact-text-dedupe",
        detail: crossBankTextDuplicates,
      });
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
      foundationSubTopics: {
        expected: expectedSubTopicIds.size,
        liveCanonical: liveSubTopics.length,
        missingSubTopicIds,
        mismatchedSubTopics,
      },
      bankCounts: { FND26: fnd26, COL2627: col2627, MNSF26: mnsf26 },
      mnsf26Qa: {
        malformedCount: malformedMnsf.length,
        invalidTaxonomyCount: taxonomyInvalidMnsf.length,
        duplicateQuestionCodeCount: duplicateQuestionCodes.length,
        crossBankExactTextDuplicateCount: crossBankTextDuplicates.length,
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
