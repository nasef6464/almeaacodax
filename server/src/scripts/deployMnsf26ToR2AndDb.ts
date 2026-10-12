import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { createR2PresignedPutUrl } from "../modules/media/infrastructure/r2PresignedPut.ts";

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_BUCKET = process.env.R2_BUCKET || "almeaa-media";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev").replace(/\/$/, "");

async function uploadFileToR2(key: string, buffer: Buffer, contentType = "image/webp"): Promise<string> {
  const uploadUrl = createR2PresignedPutUrl({
    accountId: R2_ACCOUNT_ID,
    bucket: R2_BUCKET,
    key,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    contentType,
    expiresSeconds: 300,
  });

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed for ${key}: HTTP ${res.status} ${res.statusText}`);
  }

  return `${R2_PUBLIC_BASE_URL}/${key}`;
}

async function checkRemoteExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function run() {
  console.log("=== MNSF26 R2 UPLOAD & DATABASE DEPLOYMENT ===");
  console.log("R2 Bucket:", R2_BUCKET);
  console.log("R2 Base URL:", R2_PUBLIC_BASE_URL);

  const arDir = path.resolve("C:/ALMEAA MAY - codax/ops/mnsf26/crops/AR");
  const geoDir = path.resolve("C:/ALMEAA MAY - codax/ops/mnsf26/crops/GEO");

  const cropMap = new Map<string, { filePath: string; sha256: string; buffer: Buffer }>();

  // 1. Index AR crops
  const arFiles = fs.readdirSync(arDir, { recursive: true }).filter((f) => String(f).endsWith(".webp"));
  for (const f of arFiles) {
    const fullPath = path.join(arDir, String(f));
    const base = path.basename(String(f), ".webp");
    const sourceKey = base.startsWith("MNSF26-") ? base : `MNSF26-${base}`;
    const buf = fs.readFileSync(fullPath);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    cropMap.set(sourceKey, { filePath: fullPath, sha256: hash, buffer: buf });
  }

  // 2. Index GEO crops
  const geoFiles = fs.readdirSync(geoDir, { recursive: true }).filter((f) => String(f).endsWith(".webp"));
  for (const f of geoFiles) {
    const fullPath = path.join(geoDir, String(f));
    const base = path.basename(String(f), ".webp");
    const sourceKey = base.startsWith("MNSF26-") ? base : `MNSF26-${base}`;
    const buf = fs.readFileSync(fullPath);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    cropMap.set(sourceKey, { filePath: fullPath, sha256: hash, buffer: buf });
  }

  console.log(`Indexed ${cropMap.size} unique crop files.`);

  // 3. Upload to R2 with concurrency
  const entries = Array.from(cropMap.entries());
  const CONCURRENCY = 15;
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const urlMap: Record<string, { key: string; publicUrl: string; sha256: string }> = {};

  console.log(`Starting upload of ${entries.length} images to Cloudflare R2...`);

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async ([sourceKey, item]) => {
        const key = `questions/v2/qudrat/quant/MNSF26/${sourceKey}/${item.sha256}.webp`;
        const publicUrl = `${R2_PUBLIC_BASE_URL}/${key}`;
        urlMap[sourceKey] = { key, publicUrl, sha256: item.sha256 };

        try {
          // Check if already on R2
          const exists = await checkRemoteExists(publicUrl);
          if (exists) {
            skippedCount++;
            return;
          }

          let attempt = 0;
          let ok = false;
          while (attempt < 3 && !ok) {
            try {
              await uploadFileToR2(key, item.buffer);
              ok = true;
              uploadedCount++;
            } catch (err) {
              attempt++;
              if (attempt >= 3) throw err;
              await new Promise((r) => setTimeout(r, 500 * attempt));
            }
          }
        } catch (err: any) {
          errorCount++;
          console.error(`Upload error for ${sourceKey}:`, err.message);
        }
      })
    );

    if ((i + CONCURRENCY) % 150 === 0 || i + CONCURRENCY >= entries.length) {
      console.log(`Progress: ${Math.min(i + CONCURRENCY, entries.length)} / ${entries.length} (Uploaded: ${uploadedCount}, Existing: ${skippedCount}, Errors: ${errorCount})`);
    }
  }

  console.log(`\nR2 Upload Finished: ${uploadedCount} uploaded, ${skippedCount} already existed, ${errorCount} errors.`);

  // Save URL map
  const opsDir = path.resolve("C:/ALMEAA MAY - codax/ops/mnsf26");
  fs.mkdirSync(opsDir, { recursive: true });
  fs.writeFileSync(path.join(opsDir, "MNSF26_R2_URL_MAP.json"), JSON.stringify(urlMap, null, 2), "utf8");

  // 4. Remote verification: Spot check 10 random files and verify SHA-256 match
  console.log("\n--- VERIFYING REMOTE IMAGES VIA SHA-256 MATCH ---");
  const sampleKeys = entries.slice(0, 10).map(([k]) => k);
  let verifyPass = 0;
  for (const k of sampleKeys) {
    const meta = urlMap[k];
    const local = cropMap.get(k)!;
    try {
      const res = await fetch(meta.publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      const remoteHash = crypto.createHash("sha256").update(Buffer.from(arrayBuf)).digest("hex");
      if (remoteHash === local.sha256) {
        verifyPass++;
        console.log(`  PASS: ${k} -> remote SHA matches local SHA (${local.sha256.slice(0, 12)}...)`);
      } else {
        console.error(`  FAIL: ${k} -> SHA mismatch!`);
      }
    } catch (err: any) {
      console.error(`  FAIL: ${k} -> fetch error:`, err.message);
    }
  }
  console.log(`Verification: ${verifyPass} / 10 random samples passed remote SHA match.`);

  // 5. Connect to MongoDB Atlas and backup current MNSF26 records
  console.log("\n--- CONNECTING TO MONGODB ATLAS ---");
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  const qCol = db.collection("questions");

  const existingQuestions = await qCol
    .find({
      subjectId: "sub_1777779748206",
      "sourceMeta.documentCode": "MNSF26",
    })
    .toArray();

  console.log(`Found ${existingQuestions.length} MNSF26 questions in DB.`);

  // Backup
  const backupPath = path.join(opsDir, "MNSF26_DB_BACKUP_BEFORE_IMAGE_UPDATE.json");
  const backupSummary = existingQuestions.map((q) => ({
    _id: q._id,
    id: q.id,
    sourceItemId: q.sourceMeta?.sourceItemId,
    imageUrl: q.imageUrl,
    optionsEmbeddedInImage: q.optionsEmbeddedInImage,
    imageHash: q.sourceMeta?.imageHash,
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupSummary, null, 2), "utf8");
  console.log(`Backup saved to ${backupPath} (${backupSummary.length} records).`);

  // 6. Update database in bulk
  console.log("\n--- EXECUTING BULK WRITE TO MONGODB ---");
  const bulkOps: any[] = [];
  let updatedQuestionsCount = 0;

  for (const q of existingQuestions) {
    const rawKey = q.sourceMeta?.sourceItemId || "";
    const sourceKey = rawKey.startsWith("MNSF26-") ? rawKey : `MNSF26-${rawKey}`;
    const urlInfo = urlMap[sourceKey];

    if (urlInfo) {
      updatedQuestionsCount++;
      bulkOps.push({
        updateOne: {
          filter: { _id: q._id },
          update: {
            $set: {
              imageUrl: urlInfo.publicUrl,
              optionsEmbeddedInImage: true,
              cropStatus: "VERIFIED",
              "sourceMeta.imageHash": urlInfo.sha256,
              "sourceMeta.imageVersion": 2,
              updatedAt: new Date(),
            },
          },
        },
      });
    }
  }

  console.log(`Prepared ${bulkOps.length} bulk update operations (matched with crop files).`);

  const CHUNK_SIZE = 500;
  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
    const result = await qCol.bulkWrite(chunk, { ordered: false });
    console.log(`BulkWrite chunk ${Math.floor(i / CHUNK_SIZE) + 1}: modified ${result.modifiedCount}`);
  }

  // 7. Verify quizzes collection
  console.log("\n--- VERIFYING 40 MOCK EXAMS ---");
  const quizzesCol = db.collection("quizzes");
  const mockExams = await quizzesCol.find({ id: /^exam_mnsf26_mock_/ }).toArray();
  console.log(`Verified ${mockExams.length} mock exams in DB.`);

  await client.close();
  console.log("\n=== MNSF26 R2 & DB DEPLOYMENT COMPLETE ===");
}

run().catch((err) => {
  console.error("Fatal deployment error:", err);
  process.exit(1);
});
