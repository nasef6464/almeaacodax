import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });

import fs from "fs";
import path from "path";
import { createR2PresignedPutUrl } from "../modules/media/infrastructure/r2PresignedPut.js";
import { MongoClient } from "mongodb";

async function run() {
  const manifestPath = path.resolve("scratch/fnd26_batch25_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`Starting ingestion of ${manifest.totalQuestions} questions for ${manifest.batch}...`);

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const bucket = process.env.R2_BUCKET || "almeaa-media";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const publicBase = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev";

  // 1. Upload images to R2
  for (const item of manifest.items) {
    const fileBuffer = fs.readFileSync(item.localImagePath);
    const pageFolder = `p${String(item.pdfPageIndex).padStart(3, "0")}`;
    const key = `questions/v2/qudrat/quant/FND26/${pageFolder}/${item.imageFileName}`;

    const presignedUrl = createR2PresignedPutUrl({
      accountId,
      bucket,
      key,
      accessKeyId,
      secretAccessKey,
      contentType: "image/webp",
    });

    const res = await fetch(presignedUrl, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": "image/webp",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to upload ${item.imageFileName} to R2: ${res.status} ${res.statusText}`);
    }

    item.publicImageUrl = `${publicBase}/${key}`;
    console.log(`✓ Uploaded ${item.imageFileName} to R2 -> ${item.publicImageUrl}`);
  }

  // 2. Connect to MongoDB Atlas
  const mongoUri =
    process.env.MONGODB_DIRECT_URI ||
    process.env.MONGODB_URI ||
    "mongodb://nasef64:Nn0508438250@ac-5fh0moi-shard-00-00.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-01.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-02.5y2fzx5.mongodb.net:27017/almeaa?ssl=true&replicaSet=atlas-915t4d-shard-0&authSource=admin&retryWrites=true&w=majority";

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("almeaa");
  const questionsColl = db.collection("questions");

  for (const item of manifest.items) {
    const questionDoc = {
      id: `q_${item.questionCode}`,
      questionCode: item.questionCode,
      text: item.questionText,
      imageUrl: item.publicImageUrl,
      imageAlt: `صورة السؤال ${item.questionCode} من كتاب التأسيس FND26`,
      options: ["أ", "ب", "ج", "د"],
      optionsEmbeddedInImage: true,
      correctOptionIndex: item.correctOptionIndex,
      explanation: "", // Clean UI: No written explanation
      hint: "", // Clean UI: No written hint
      solvingStrategy: "", // Clean UI
      videoUrl: "",
      pathId: "p_1777779639431",
      subject: "sub_1777779748206",
      subjectId: "sub_1777779748206",
      sectionId: item.sectionId,
      skillIds: [item.subSkillId],
      skillId: item.mainSkillId,
      subSkillId: item.subSkillId,
      examType: "qudurat",
      source: "imported",
      year: 2026,
      difficulty: "Medium",
      type: item.type || "mcq",
      ownerType: "platform",
      ownerId: "",
      assignedTeacherId: "",
      createdBy: "platform_admin",
      approvalStatus: "approved",
      approvedBy: "platform_admin",
      approvedAt: Date.now(),
      reviewerNotes: "V2 Ultra-HD 600 DPI - Audio-First Voice Teacher Ingestion",
      voiceExplanation: {
        text: item.voiceExplanationText,
        audioUrl: "",
        audioMimeType: "",
        version: 1,
      },
      aiContext: {
        readableText: item.aiContext?.readableText || item.questionText,
        speechText: item.aiContext?.speechText || item.voiceExplanationText,
        visualDescription: item.aiContext?.visualDescription || "لا يوجد رسم هندسي.",
        optionTexts: item.optionTexts,
        mathExpressions: item.aiContext?.mathExpressions || [],
        concepts: item.aiContext?.concepts || [],
        requiredData: item.aiContext?.requiredData || [],
        version: 1,
      },
      sourceMeta: item.sourceMeta,
      updatedAt: new Date(),
    };

    await questionsColl.updateOne(
      { questionCode: item.questionCode },
      { $set: questionDoc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`✓ Inserted question ${item.questionCode} into MongoDB Atlas!`);
  }

  const count = await questionsColl.countDocuments();
  console.log(`\n🎉 Ingestion of Batch 25 complete! Total questions in MongoDB: ${count}`);

  await client.close();
}

run().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
