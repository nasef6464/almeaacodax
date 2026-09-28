import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import fs from "fs";
import path from "path";
import { createR2PresignedPutUrl } from "../modules/media/infrastructure/r2PresignedPut.js";

async function run() {
  const manifestPath = fs.existsSync("scratch/col2627_batch73_p081_manifest.json")
    ? path.resolve("scratch/col2627_batch73_p081_manifest.json")
    : path.resolve("../scratch/col2627_batch73_p081_manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const items = Array.isArray(raw) ? raw : raw.items;
  console.log(`Starting R2 upload of ${items.length} questions for Book 2 Page 81 (COL2627 Batch 73)...`);

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const bucket = process.env.R2_BUCKET || "almeaa-media";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const publicBase =
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.R2_PUBLIC_URL ||
    "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev";

  let successCount = 0;

  for (const item of items) {
    const qCode = item.code || item.questionCode;
    const filename = `${qCode}.webp`;
    const localImg = path.resolve(`public/questions/v2/qudrat/quant/COL2627/p081/${filename}`);

    if (!fs.existsSync(localImg)) {
      throw new Error(`Local image not found for ${qCode}: ${localImg}`);
    }

    const fileBuffer = fs.readFileSync(localImg);
    const key = `questions/v2/qudrat/quant/COL2627/p081/${filename}`;
    const publicUrl = `${publicBase}/${key}`;

    item.publicImageUrl = publicUrl;

    let uploaded = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const presignedUrl = createR2PresignedPutUrl({
          accountId,
          bucket,
          key,
          accessKeyId,
          secretAccessKey,
          contentType: "image/webp",
          now: new Date(),
        });

        const resp = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: fileBuffer,
        });

        if (!resp.ok) {
          throw new Error(`R2 PUT failed HTTP ${resp.status}: ${await resp.text()}`);
        }

        // Verify public access
        const verifyResp = await fetch(publicUrl, { method: "HEAD" });
        if (verifyResp.status !== 200) {
          throw new Error(`Public verification failed HTTP ${verifyResp.status} on ${publicUrl}`);
        }

        console.log(`[OK] ${qCode} -> ${publicUrl} (${fileBuffer.length} bytes)`);
        uploaded = true;
        successCount++;
        break;
      } catch (err: any) {
        console.warn(`Attempt ${attempt} failed for ${qCode}: ${err.message}`);
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // Save updated manifest with publicImageUrl
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2), "utf-8");

  // Also update public directory manifest
  const publicManifestDir = path.resolve("public/questions/v2/qudrat/quant/COL2627/p081");
  os_save_manifest: {
    const publicManifest = path.join(publicManifestDir, "manifest.json");
    fs.writeFileSync(publicManifest, JSON.stringify(items, null, 2), "utf-8");
  }

  console.log(`\nSuccessfully uploaded and verified all ${successCount}/${items.length} questions for Batch 73!`);
}

run().catch((err) => {
  console.error("Batch 73 upload failed:", err);
  process.exit(1);
});
