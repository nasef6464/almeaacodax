import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { createR2PresignedPutUrl } from "../modules/media/infrastructure/r2PresignedPut.js";

interface CleanedItem {
  questionCode: string;
  cleanedSize: [number, number];
  sizeBytes: number;
  newHash: string;
  filePath: string;
  origKey: string;
}

const CONCURRENCY = 20;

async function uploadOne(
  item: { key: string; filePath: string; questionCode: string },
  maxRetries = 4,
): Promise<void> {
  const uploadUrl = createR2PresignedPutUrl({
    accountId: env.R2_ACCOUNT_ID,
    bucket: env.R2_BUCKET,
    key: item.key,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    contentType: "image/webp",
  });

  const fileBuf = fs.readFileSync(item.filePath);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: fileBuf,
      });
      if (res.ok) return;
      const text = await res.text();
      if (attempt === maxRetries) {
        throw new Error(`Upload failed for ${item.questionCode} HTTP ${res.status}: ${text}`);
      }
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

async function main() {
  console.log("--- 1. LOADING CLEANED IMAGES MANIFEST ---");
  const manifestPath = path.resolve(process.cwd(), "../ops/phys26/PHYS26_CLEANED_MANIFEST.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, CleanedItem>;
  const items = Object.values(manifest);
  console.log(`Loaded ${items.length} cleaned items.`);
  if (items.length !== 2064) {
    throw new Error(`Expected exactly 2064 items, got ${items.length}`);
  }

  const publicBaseUrl = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

  // Prepare upload items with new versioned hash keys
  const uploadItems = items.map((item) => {
    const key = `questions/v2/${item.questionCode}/${item.newHash}.webp`;
    const publicUrl = `${publicBaseUrl}/${key}`;
    const filePath = path.resolve(process.cwd(), "..", item.filePath);
    return {
      questionCode: item.questionCode,
      filePath,
      key,
      publicUrl,
      hash: item.newHash,
      sizeBytes: item.sizeBytes,
    };
  });

  console.log("--- 2. CONCURRENTLY UPLOADING TO CLOUDFLARE R2 ---");
  let completed = 0;
  let index = 0;
  const workers: Promise<void>[] = [];

  const worker = async () => {
    while (index < uploadItems.length) {
      const current = uploadItems[index++];
      await uploadOne(current);
      completed++;
      if (completed % 200 === 0 || completed === uploadItems.length) {
        console.log(`R2 Upload Progress: ${completed}/${uploadItems.length} (${Math.round((completed / uploadItems.length) * 100)}%)`);
      }
    }
  };

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  console.log("✓ All 2064 images uploaded to Cloudflare R2 successfully!");

  console.log("--- 3. SPOT-CHECK VERIFICATION ON LIVE R2 CDN ---");
  const sampleIndices = [0, 50, 100, 300, 500, 800, 1000, 1500, 1800, 2063];
  for (const idx of sampleIndices) {
    const sample = uploadItems[idx];
    const res = await fetch(sample.publicUrl);
    if (!res.ok) throw new Error(`Spot check HTTP failure for ${sample.questionCode}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");
    if (hash !== sample.hash) throw new Error(`Hash mismatch for ${sample.questionCode}`);
  }
  console.log(`✓ Spot-checked ${sampleIndices.length} random images from live CDN: 100% PASS!`);

  console.log("--- 4. UPDATING MONGODB QUESTIONS COLLECTION ---");
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle");

  const questionsCollection = db.collection("questions");

  // Build bulk write operations
  const bulkOps = uploadItems.map((item) => ({
    updateOne: {
      filter: {
        $or: [{ questionCode: item.questionCode }, { _id: `q_${item.questionCode}` as any }],
      },
      update: {
        $set: {
          imageUrl: item.publicUrl,
          optionsEmbeddedInImage: true,
          "sourceMeta.imageHash": item.hash,
          "sourceMeta.imageVersion": 2,
          updatedAt: new Date(),
        },
      },
    },
  }));

  console.log(`Executing bulkWrite for ${bulkOps.length} questions in chunks of 500...`);
  const CHUNK = 500;
  let modifiedCount = 0;
  for (let i = 0; i < bulkOps.length; i += CHUNK) {
    const chunk = bulkOps.slice(i, i + CHUNK);
    const result = await questionsCollection.bulkWrite(chunk, { ordered: false });
    modifiedCount += (result.modifiedCount || result.matchedCount || 0);
  }
  console.log(`✓ Bulk update complete. Matched/Modified: ${modifiedCount} questions.`);

  // Verify DB state
  const physSubjectId = "sub_1784980706034";
  const totalPhys = await questionsCollection.countDocuments({ subjectId: physSubjectId });
  const embeddedPhys = await questionsCollection.countDocuments({
    subjectId: physSubjectId,
    optionsEmbeddedInImage: true,
  });
  console.log(`✓ MongoDB verification: ${embeddedPhys}/${totalPhys} Physics questions have optionsEmbeddedInImage=true!`);

  await mongoose.disconnect();

  // Save new URL map
  const newUrlMap: Record<string, { key: string; publicUrl: string; hash: string; sizeBytes: number }> = {};
  for (const item of uploadItems) {
    newUrlMap[item.questionCode] = {
      key: item.key,
      publicUrl: item.publicUrl,
      hash: item.hash,
      sizeBytes: item.sizeBytes,
    };
  }
  const newMapPath = path.resolve(process.cwd(), "../ops/phys26/PHYS26_R2_URL_MAP.json");
  fs.writeFileSync(newMapPath, JSON.stringify(newUrlMap, null, 2), "utf8");
  console.log(`✓ Updated ops/phys26/PHYS26_R2_URL_MAP.json with new versioned clean image keys.`);

  console.log("\n=======================================================");
  console.log("🎉 PHYS26 FULL RE-CROP & CLOUD DEPLOYMENT COMPLETED 100%!");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in deployCleanedPhys26ToR2AndDb:", err);
  process.exit(1);
});
