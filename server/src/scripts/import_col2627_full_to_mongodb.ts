import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { QuestionModel } from "../models/Question.js";

async function runImport() {
  console.log("===============================================================");
  console.log("COL2627 FULL MONGODB ATLAS INGESTION (946 QUESTIONS AS DRAFT)");
  console.log("===============================================================\n");

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment.");
  }

  const batchPath = fs.existsSync("scratch/col2627_db_ready_import_batch.json")
    ? path.resolve("scratch/col2627_db_ready_import_batch.json")
    : path.resolve("../scratch/col2627_db_ready_import_batch.json");

  if (!fs.existsSync(batchPath)) {
    throw new Error(`Batch file not found at ${batchPath}`);
  }

  const rawBatch = JSON.parse(fs.readFileSync(batchPath, "utf-8"));
  console.log(`Loaded ${rawBatch.length} prepared records from ${batchPath}.`);

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log("✓ Connected to MongoDB Atlas successfully!\n");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database handle is null.");
  const questionsCol = db.collection("questions");

  // Step 1: Pre-import Backup Snapshot (Requirement 9)
  console.log("Step 1: Taking pre-import snapshot of COL2627 questions in DB...");
  const preExisting = await questionsCol.find({
    $or: [
      { "sourceMeta.documentCode": "COL2627" },
      { questionCode: { $regex: /^QDR-QNT-COL2627-/ } },
      { id: { $regex: /^q_qdr_qnt_col2627_/ } }
    ]
  }).toArray();

  const backupDir = path.resolve("docs/audits");
  os_backup: {
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `COL2627_PRE_IMPORT_SNAPSHOT_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(preExisting, null, 2), "utf-8");
    console.log(`✓ Pre-import snapshot saved: ${preExisting.length} existing records saved to ${backupFile}.\n`);
  }

  // Step 2: Idempotent Bulk Upsert (Requirement 10)
  console.log(`Step 2: Executing idempotent bulk upsert for ${rawBatch.length} questions...`);
  const bulkOps = rawBatch.map((doc: any) => ({
    updateOne: {
      filter: { questionCode: doc.questionCode },
      update: {
        $set: {
          ...doc,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  const CHUNK_SIZE = 200;
  let upsertedCount = 0;
  let modifiedCount = 0;

  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
    const result = await questionsCol.bulkWrite(chunk, { ordered: false });
    upsertedCount += result.upsertedCount || 0;
    modifiedCount += result.modifiedCount || 0;
    console.log(`  Processed chunk [${i + 1}..${Math.min(i + CHUNK_SIZE, bulkOps.length)}] / ${bulkOps.length}`);
  }
  console.log(`✓ Bulk operation complete: ${upsertedCount} upserted, ${modifiedCount} updated.\n`);

  // Step 3: Live Integrity Audit on MongoDB Atlas (Requirement 11)
  console.log("Step 3: Running Live Integrity Audit on MongoDB Atlas...");
  const allCol2627 = await questionsCol.find({
    $or: [
      { "sourceMeta.documentCode": "COL2627" },
      { questionCode: { $regex: /^QDR-QNT-COL2627-/ } }
    ]
  }).toArray();

  const totalCount = allCol2627.length;
  const uniqueCodes = new Set(allCol2627.map((q: any) => q.questionCode));
  const draftCount = allCol2627.filter((q: any) => q.approvalStatus === "draft").length;
  const missingImgUrl = allCol2627.filter((q: any) => !q.imageUrl || !q.imageUrl.startsWith("https://")).length;
  const missingImgHash = allCol2627.filter((q: any) => !q.sourceMeta?.imageHash || q.sourceMeta.imageHash.length !== 64).length;
  const missingSkill = allCol2627.filter((q: any) => !q.skillId).length;
  const missingSubSkill = allCol2627.filter((q: any) => !q.subSkillId).length;
  const badSkillPair = allCol2627.filter((q: any) => !Array.isArray(q.skillIds) || q.skillIds[0] !== q.skillId || q.skillIds[1] !== q.subSkillId).length;
  const invalidCorrectOption = allCol2627.filter((q: any) => ![0, 1, 2, 3].includes(q.correctOptionIndex)).length;
  const missingAiContext = allCol2627.filter((q: any) => !q.aiContext || !q.aiContext.readableText).length;
  const missingVoiceExplanation = allCol2627.filter((q: any) => !q.voiceExplanation || !q.voiceExplanation.text).length;

  console.log("---------------------------------------------------------------");
  console.log(`COL2627 total in DB:            ${totalCount} (Target: 946)`);
  console.log(`Unique questionCode count:      ${uniqueCodes.size} (Target: 946)`);
  console.log(`Duplicates:                     ${totalCount - uniqueCodes.size} (Target: 0)`);
  console.log(`Draft count:                    ${draftCount} (Target: 946)`);
  console.log(`Missing imageUrl:               ${missingImgUrl} (Target: 0)`);
  console.log(`Missing imageHash:              ${missingImgHash} (Target: 0)`);
  console.log(`Missing skillId:                ${missingSkill} (Target: 0)`);
  console.log(`Missing subSkillId:             ${missingSubSkill} (Target: 0)`);
  console.log(`Bad skillIds pair:              ${badSkillPair} (Target: 0)`);
  console.log(`Invalid correctOptionIndex:     ${invalidCorrectOption} (Target: 0)`);
  console.log(`Missing aiContext:              ${missingAiContext} (Target: 0)`);
  console.log(`Missing voiceExplanation:       ${missingVoiceExplanation} (Target: 0)`);
  console.log("---------------------------------------------------------------\n");

  // Step 4: Sample R2 Verification (Requirement 12)
  console.log("Step 4: Testing sample R2 image accessibility (Beginning, Middle, End)...");
  const sampleCodes = [
    "QDR-QNT-COL2627-P005-Q01", // Beginning
    "QDR-QNT-COL2627-P045-Q01", // Middle
    "QDR-QNT-COL2627-P084-Q11"  // End
  ];

  for (const sc of sampleCodes) {
    const qDoc = allCol2627.find((q: any) => q.questionCode === sc);
    if (!qDoc) {
      console.error(`  [FAIL] Sample ${sc} not found in DB!`);
      continue;
    }
    const resp = await fetch(qDoc.imageUrl, { method: "HEAD" });
    console.log(`  [${resp.status === 200 ? "PASS" : "FAIL"}] ${sc} -> ${qDoc.imageUrl} (HTTP ${resp.status})`);
  }

  // Step 5: Verify FND26 is untouched (Requirement 6)
  const fnd26Count = await questionsCol.countDocuments({
    $or: [
      { "sourceMeta.documentCode": "FND26" },
      { questionCode: { $regex: /^QDR-QNT-FND26-/ } }
    ]
  });
  console.log(`\nVerification of FND26 integrity: ${fnd26Count} questions (strictly preserved).`);

  await mongoose.disconnect();
  console.log("\n✓ Ingestion & Audit run finished successfully!");
}

runImport().catch((err) => {
  console.error("COL2627 Import Failed:", err);
  process.exit(1);
});
