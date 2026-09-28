import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import fs from "fs";
import path from "path";
import mongoose from "mongoose";

async function runAudit() {
  console.log("===============================================================");
  console.log("COL2627 LIVE MONGODB ATLAS INTEGRITY AUDIT");
  console.log("===============================================================\n");

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment.");
  }

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log("✓ Connected to MongoDB Atlas successfully!\n");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database handle is null.");
  const questionsCol = db.collection("questions");

  // Step 1: Query all COL2627 questions
  const allCol2627 = await questionsCol.find({
    $or: [
      { "sourceMeta.documentCode": "COL2627" },
      { questionCode: { $regex: /^QDR-QNT-COL2627-/ } }
    ]
  }).toArray();

  const totalCount = allCol2627.length;
  const uniqueCodes = new Set(allCol2627.map((q: any) => q.questionCode));
  const draftCount = allCol2627.filter((q: any) => q.approvalStatus === "draft").length;
  const approvedCount = allCol2627.filter((q: any) => q.approvalStatus === "approved").length;
  const missingImgUrl = allCol2627.filter((q: any) => !q.imageUrl || !q.imageUrl.startsWith("https://")).length;
  const missingImgHash = allCol2627.filter((q: any) => !q.sourceMeta?.imageHash || q.sourceMeta.imageHash.length !== 64).length;
  const missingSkill = allCol2627.filter((q: any) => !q.skillId).length;
  const missingSubSkill = allCol2627.filter((q: any) => !q.subSkillId).length;
  const badSkillPair = allCol2627.filter((q: any) => !Array.isArray(q.skillIds) || q.skillIds[0] !== q.skillId || q.skillIds[1] !== q.subSkillId).length;
  const invalidCorrectOption = allCol2627.filter((q: any) => ![0, 1, 2, 3].includes(q.correctOptionIndex)).length;
  const missingAiContext = allCol2627.filter((q: any) => !q.aiContext || !q.aiContext.readableText).length;
  const missingVoiceExplanation = allCol2627.filter((q: any) => !q.voiceExplanation || !q.voiceExplanation.text).length;

  console.log("--- COL2627 AUDIT METRICS ---");
  console.log(`COL2627 total in Atlas:         ${totalCount} (Expected: 946)`);
  console.log(`Unique questionCode count:      ${uniqueCodes.size} (Expected: 946)`);
  console.log(`Duplicates:                     ${totalCount - uniqueCodes.size} (Expected: 0)`);
  console.log(`Draft count:                    ${draftCount} (Expected: 946)`);
  console.log(`Approved count:                 ${approvedCount} (Expected: 0)`);
  console.log(`Missing imageUrl:               ${missingImgUrl} (Expected: 0)`);
  console.log(`Missing imageHash:              ${missingImgHash} (Expected: 0)`);
  console.log(`Missing skillId:                ${missingSkill} (Expected: 0)`);
  console.log(`Missing subSkillId:             ${missingSubSkill} (Expected: 0)`);
  console.log(`Bad skillIds pair:              ${badSkillPair} (Expected: 0)`);
  console.log(`Invalid correctOptionIndex:     ${invalidCorrectOption} (Expected: 0)`);
  console.log(`Missing aiContext:              ${missingAiContext} (Expected: 0)`);
  console.log(`Missing voiceExplanation:       ${missingVoiceExplanation} (Expected: 0)`);
  console.log("-------------------------------\n");

  // Step 2: Test sample R2 images
  console.log("Testing sample R2 image accessibility (Beginning, Middle, End)...");
  const sampleCodes = [
    "QDR-QNT-COL2627-P005-Q01", // Beginning
    "QDR-QNT-COL2627-P045-Q18", // Middle
    "QDR-QNT-COL2627-P084-Q11"  // End
  ];

  const sampleResults: Record<string, { status: number; url: string }> = {};

  for (const sc of sampleCodes) {
    const qDoc = allCol2627.find((q: any) => q.questionCode === sc);
    if (!qDoc) {
      console.error(`  [FAIL] Sample ${sc} not found in DB!`);
      continue;
    }
    const resp = await fetch(qDoc.imageUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log(`  [${resp.status === 200 ? "PASS" : "FAIL"}] ${sc} -> ${qDoc.imageUrl} (HTTP ${resp.status})`);
    sampleResults[sc] = { status: resp.status, url: qDoc.imageUrl };
  }

  // Step 3: Verify FND26 is preserved untouched
  const fnd26Count = await questionsCol.countDocuments({
    $or: [
      { "sourceMeta.documentCode": "FND26" },
      { questionCode: { $regex: /^QDR-QNT-FND26-/ } }
    ]
  });
  const fnd26Approved = await questionsCol.countDocuments({
    questionCode: { $regex: /^QDR-QNT-FND26-/ },
    approvalStatus: "approved"
  });
  const fnd26Rejected = await questionsCol.countDocuments({
    questionCode: { $regex: /^QDR-QNT-FND26-/ },
    approvalStatus: "rejected"
  });

  console.log(`\n--- FND26 PRESERVATION METRICS ---`);
  console.log(`FND26 total in Atlas:           ${fnd26Count} (Expected: 858)`);
  console.log(`FND26 approved:                 ${fnd26Approved} (Expected: 856)`);
  console.log(`FND26 rejected:                 ${fnd26Rejected} (Expected: 2)`);
  console.log("----------------------------------\n");

  const totalBankQuestions = await questionsCol.countDocuments({
    pathId: "p_1777779639431",
    subjectId: "sub_1777779748206"
  });
  console.log(`Total Qudrat Quant Questions in DB (FND26 + COL2627): ${totalBankQuestions} (Expected: 1804)\n`);

  // Write audit results artifact
  const auditReport = {
    timestamp: new Date().toISOString(),
    atlasCluster: "Atlas MongoDB Production Cluster",
    dbTarget: "almeaa",
    collection: "questions",
    col2627: {
      total: totalCount,
      uniqueQuestionCodes: uniqueCodes.size,
      duplicates: totalCount - uniqueCodes.size,
      draftCount: draftCount,
      approvedCount: approvedCount,
      missingImageUrl: missingImgUrl,
      missingImageHash: missingImgHash,
      missingSkillId: missingSkill,
      missingSubSkillId: missingSubSkill,
      badSkillIdsPair: badSkillPair,
      invalidCorrectOptionIndex: invalidCorrectOption,
      missingAiContext: missingAiContext,
      missingVoiceExplanation: missingVoiceExplanation,
      sampleChecks: sampleResults
    },
    fnd26Preservation: {
      total: fnd26Count,
      approved: fnd26Approved,
      rejected: fnd26Rejected,
      untouched: fnd26Count === 858
    },
    totalPlatformQuestions: totalBankQuestions
  };

  const auditPath = path.resolve("docs/audits/COL2627_ATLAS_LIVE_AUDIT_REPORT.json");
  fs.writeFileSync(auditPath, JSON.stringify(auditReport, null, 2), "utf-8");
  console.log(`✓ Audit report saved to ${auditPath}`);

  await mongoose.disconnect();
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
