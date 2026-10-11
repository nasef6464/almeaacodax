import dotenv from "dotenv";
dotenv.config({ path: ".env.codex.local" });
dotenv.config({ path: "../.env.codex.local" });
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

const EXPECTED_MANIFEST_TOTAL = 2129;
const EXPECTED_ELIGIBLE_COUNT = 1989;
const EXPECTED_QUARANTINED_COUNT = 140;
const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779639431";
const SECTION_ID = "sec_sub_1777779748206_1";

export async function runMnsf26Import() {
  const isApply = process.argv.includes("--apply");
  console.log("==================================================================");
  console.log(`MNSF26 STAGE 6 DRAFT IMPORT (${isApply ? "LIVE APPLY" : "DRY RUN"})`);
  console.log("==================================================================\n");

  // 1. Locate and parse manifest
  const candidates = [
    path.resolve(process.cwd(), "docs/content/mnsf26/MNSF26_IMPORT_MANIFEST_READY_V1.json"),
    path.resolve(process.cwd(), "../docs/content/mnsf26/MNSF26_IMPORT_MANIFEST_READY_V1.json"),
  ];
  const manifestPath = candidates.find((p) => fs.existsSync(p));
  if (!manifestPath) {
    throw new Error(`Manifest file not found at any candidate path: ${candidates.join(", ")}`);
  }

  console.log(`[1] Reading import manifest from: ${manifestPath}`);
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
    records: Array<{
      sourceKey: string;
      questionCode: string;
      sourcePart: string;
      testNumber: number;
      questionNumber: number;
      pdfPage: number;
      imageHash: string;
      imageUrl: string;
      sourceProvenance: any;
      questionText: string;
      options: Array<{ text: string; isCorrect: boolean }>;
      correctAnswer: string;
      stepByStepSolution: string;
      educationalExplanation: string;
      difficulty: string;
      canonicalMainSkill: string;
      canonicalSubskill: string;
      status: string;
      importEligible: boolean;
      reviewReason: string | null;
      contentFingerprint: string;
      ideaFingerprint: string;
    }>;
  };

  const records = manifestData.records;
  console.log(`    Total records in manifest: ${records.length}`);
  if (records.length !== EXPECTED_MANIFEST_TOTAL) {
    throw new Error(`Manifest total mismatch: expected ${EXPECTED_MANIFEST_TOTAL}, found ${records.length}`);
  }

  // 2. Validate taxonomy reference
  const validMainSkills = new Set(QUANT_TAXONOMY.map((s) => s.id));
  const validSubSkills = new Set(QUANT_TAXONOMY.flatMap((s) => s.subSkills.map((sub) => sub.id)));

  // 3. Filter eligible vs quarantined
  const eligible = records.filter((r) => r.importEligible === true);
  const quarantined = records.filter((r) => r.importEligible === false);

  console.log(`    Import-eligible: ${eligible.length} (Expected: ${EXPECTED_ELIGIBLE_COUNT})`);
  console.log(`    Quarantined:     ${quarantined.length} (Expected: ${EXPECTED_QUARANTINED_COUNT})`);

  if (eligible.length !== EXPECTED_ELIGIBLE_COUNT) {
    throw new Error(`Eligible count mismatch: expected ${EXPECTED_ELIGIBLE_COUNT}, found ${eligible.length}`);
  }
  if (quarantined.length !== EXPECTED_QUARANTINED_COUNT) {
    throw new Error(`Quarantine count mismatch: expected ${EXPECTED_QUARANTINED_COUNT}, found ${quarantined.length}`);
  }

  // 4. Load GEMINI master for fallback correctOptionIndex resolution
  const geminiCandidates = [
    path.resolve(process.cwd(), "docs/content/mnsf26/MNSF26_GEMINI_FULLBOOK_MASTER_V1.json"),
    path.resolve(process.cwd(), "../docs/content/mnsf26/MNSF26_GEMINI_FULLBOOK_MASTER_V1.json"),
  ];
  const geminiPath = geminiCandidates.find((p) => fs.existsSync(p));
  const geminiMasterMap = new Map<string, any>();
  if (geminiPath) {
    const geminiData = JSON.parse(fs.readFileSync(geminiPath, "utf-8"));
    if (Array.isArray(geminiData.records)) {
      for (const gr of geminiData.records) {
        geminiMasterMap.set(gr.sourceKey, gr);
      }
    }
  }

  // 5. Validate all eligible records
  console.log("\n[2] Validating all 1,989 eligible records...");
  const preparedDocs: any[] = [];
  const seenCodes = new Set<string>();
  const arabicLetters = ["أ", "ب", "ج", "د"];

  for (let idx = 0; idx < eligible.length; idx++) {
    const r = eligible[idx];
    if (!r.questionCode || !r.questionCode.startsWith("QDR-QNT-MNSF26-")) {
      throw new Error(`Record ${r.sourceKey} invalid questionCode: ${r.questionCode}`);
    }
    if (seenCodes.has(r.questionCode)) {
      throw new Error(`Duplicate questionCode in eligible records: ${r.questionCode}`);
    }
    seenCodes.add(r.questionCode);

    if (!validMainSkills.has(r.canonicalMainSkill)) {
      throw new Error(`Record ${r.sourceKey} invalid mainSkill: ${r.canonicalMainSkill}`);
    }
    if (!validSubSkills.has(r.canonicalSubskill)) {
      throw new Error(`Record ${r.sourceKey} invalid subSkill: ${r.canonicalSubskill}`);
    }

    if (!r.imageUrl || !r.imageUrl.startsWith("https://media.almeaa.com/")) {
      throw new Error(`Record ${r.sourceKey} invalid imageUrl: ${r.imageUrl}`);
    }
    if (!r.imageHash || r.imageHash.length !== 64) {
      throw new Error(`Record ${r.sourceKey} invalid imageHash: ${r.imageHash}`);
    }

    if (!Array.isArray(r.options) || r.options.length !== 4) {
      throw new Error(`Record ${r.sourceKey} does not have exactly 4 options`);
    }

    let correctIdx = r.options.findIndex((o) => o.isCorrect);
    if (correctIdx === -1 && geminiMasterMap.has(r.sourceKey)) {
      const gRecord = geminiMasterMap.get(r.sourceKey);
      if (typeof gRecord?.correctOptionIndex === "number" && gRecord.correctOptionIndex >= 0 && gRecord.correctOptionIndex <= 3) {
        correctIdx = gRecord.correctOptionIndex;
      }
    }
    if (correctIdx === -1 && r.correctAnswer) {
      const firstChar = r.correctAnswer.trim()[0];
      const letterIdx = arabicLetters.indexOf(firstChar);
      if (letterIdx >= 0) {
        correctIdx = letterIdx;
      }
    }

    if (correctIdx === -1) {
      throw new Error(`Record ${r.sourceKey} has no correct option marked or resolvable`);
    }

    const docId = `q_qdr_qnt_mnsf26_${r.sourceKey.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
    const mapped = {
      id: docId,
      questionCode: r.questionCode,
      text: r.questionText || "اختر الإجابة الصحيحة من المعطيات الموضحة بالصورة:",
      options: r.options.map((o) => o.text),
      correctOptionIndex: correctIdx,
      explanation: r.stepByStepSolution || "",
      imageUrl: r.imageUrl,
      skillId: r.canonicalMainSkill,
      subSkillId: r.canonicalSubskill,
      skillIds: [r.canonicalMainSkill, r.canonicalSubskill],
      pathId: PATH_ID,
      subject: "qudurat_quantitative",
      subjectId: SUBJECT_ID,
      sectionId: SECTION_ID,
      examType: "qudurat",
      source: "imported",
      difficulty: r.difficulty || "Medium",
      type: "mcq",
      ownerType: "platform",
      approvalStatus: "approved",
      isPublished: true,
      fingerprint: r.contentFingerprint,
      aiContext: {
        readableText: r.questionText || "",
        speechText: r.educationalExplanation || r.stepByStepSolution || "",
      },
      voiceExplanation: {
        text: r.stepByStepSolution || "",
      },
      sourceMeta: {
        documentCode: "MNSF26",
        sourceItemId: r.sourceKey,
        pdfPageIndex: r.pdfPage,
        printedPageNumber: r.pdfPage,
        printedQuestionNumber: r.questionNumber,
        imageHash: r.imageHash,
        importBatchId: "MNSF26_STAGE6_DRAFT_V1",
      },
    };
    preparedDocs.push(mapped);
  }
  console.log(`    Successfully validated and prepared all ${preparedDocs.length} documents.`);

  if (!isApply) {
    console.log("\n==================================================================");
    console.log("DRY RUN COMPLETED SUCCESSFULLY (No database writes were performed).");
    console.log("To apply to live database, run with: --apply");
    console.log("==================================================================");
    return;
  }

  // 5. Connect to MongoDB Atlas
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment.");
  }

  console.log("\n[3] Connecting to MongoDB...");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });
  console.log("    Connected to database successfully!");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database handle is null.");
  const questionsCol = db.collection("questions");

  // 6. Pre-import snapshot
  console.log("\n[4] Taking pre-import snapshot for MNSF26...");
  const preExisting = await questionsCol
    .find({
      $or: [
        { "sourceMeta.documentCode": "MNSF26" },
        { questionCode: { $regex: /^QDR-QNT-MNSF26-/ } },
      ],
    })
    .toArray();

  const backupDir = path.resolve(process.cwd(), "docs/audits");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `MNSF26_PRE_IMPORT_SNAPSHOT_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(preExisting, null, 2), "utf-8");
  console.log(`    Saved snapshot with ${preExisting.length} existing records to: ${backupFile}`);

  // 7. Bulk upsert
  console.log(`\n[5] Executing bulk upsert for ${preparedDocs.length} questions...`);
  const bulkOps = preparedDocs.map((doc) => ({
    updateOne: {
      filter: { questionCode: doc.questionCode },
      update: {
        $set: {
          ...doc,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const CHUNK_SIZE = 200;
  let upsertedCount = 0;
  let modifiedCount = 0;

  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
    const res = await questionsCol.bulkWrite(chunk, { ordered: false });
    upsertedCount += res.upsertedCount || 0;
    modifiedCount += res.modifiedCount || 0;
    console.log(`    Chunk [${i + 1}..${Math.min(i + CHUNK_SIZE, bulkOps.length)}] / ${bulkOps.length} processed.`);
  }
  console.log(`    Bulk write finished: ${upsertedCount} inserted, ${modifiedCount} updated.`);

  // 8. Post-import verification
  console.log("\n[6] Post-import Verification on Database:");
  const mnsfInDb = await questionsCol
    .find({ "sourceMeta.documentCode": "MNSF26" })
    .toArray();

  const dbCount = mnsfInDb.length;
  const dbApproved = mnsfInDb.filter((q) => q.approvalStatus === "approved").length;
  const dbUniqueCodes = new Set(mnsfInDb.map((q) => q.questionCode)).size;

  console.log(`    Total MNSF26 in DB:       ${dbCount} (Expected: ${EXPECTED_ELIGIBLE_COUNT})`);
  console.log(`    Approved status count:   ${dbApproved} (Expected: ${EXPECTED_ELIGIBLE_COUNT})`);
  console.log(`    Unique question codes:    ${dbUniqueCodes} (Expected: ${EXPECTED_ELIGIBLE_COUNT})`);

  if (dbCount !== EXPECTED_ELIGIBLE_COUNT) {
    console.warn(`    WARNING: DB count (${dbCount}) does not match expected (${EXPECTED_ELIGIBLE_COUNT})!`);
  } else {
    console.log("    ✓ Post-import database count matches target exactly!");
  }

  await mongoose.disconnect();
  console.log("\n==================================================================");
  console.log("MNSF26 STAGE 6 DRAFT IMPORT COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

runMnsf26Import().catch((err) => {
  console.error("Import execution failed:", err);
  process.exit(1);
});
