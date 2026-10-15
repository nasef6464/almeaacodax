import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

// Load server/.env
const envContent = fs.readFileSync("server/.env", "utf8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("FATAL: MONGODB_DIRECT_URI missing");
  process.exit(1);
}

const manifestPath = path.resolve("ops/tah_math_v2/CROPS_MANIFEST_2270.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const itemsMap = new Map();
for (const it of manifest.items) {
  itemsMap.set(it.questionCode, it);
}

const blemishJsonPath = path.resolve("ops/tah_math_v2/audit_repair/FAST_BLEMISHED_QUESTIONS_EXACT.json");
const blemishData = JSON.parse(fs.readFileSync(blemishJsonPath, "utf8"));
const targetList = blemishData.blemished_questions;

console.log(`=== SYNCING 257 REPAIRED CROPS TO MONGODB ALMEAA ===`);
console.log(`Target questions: ${targetList.length}`);

async function main() {
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db("almeaa");
    const col = db.collection("questions");

    const operations = [];
    for (const q of targetList) {
      const crop = itemsMap.get(q.questionCode);
      if (!crop) continue;

      operations.push({
        updateOne: {
          filter: {
            subjectId: "sub_1777784609152",
            questionCode: crop.questionCode,
          },
          update: {
            $set: {
              imageUrl: crop.imageUrl,
              "sourceMeta.imageHash": crop.sha256,
              "sourceMeta.fileSizeBytes": crop.fileSizeBytes,
              "sourceMeta.defectRepaired": true,
              "sourceMeta.repairedAt": new Date(),
              updatedAt: new Date(),
            },
          },
        },
      });
    }

    console.log(`Executing bulkWrite with ${operations.length} updates...`);
    const res = await col.bulkWrite(operations, { ordered: false });
    console.log(`Bulk write complete: matched=${res.matchedCount}, modified=${res.modifiedCount}`);

    // Verify sample question
    const q02Doc = await col.findOne({
      subjectId: "sub_1777784609152",
      questionCode: "TAH-MATH-V2-COL26-P008-Q02",
    });

    console.log(`\nSample Verification (P008-Q02):`);
    console.log(`  _id: ${q02Doc?._id}`);
    console.log(`  imageUrl: ${q02Doc?.imageUrl}`);
    console.log(`  imageHash: ${q02Doc?.sourceMeta?.imageHash}`);
    console.log(`  options: ${JSON.stringify(q02Doc?.options)}`);
    console.log(`  optionsEmbeddedInImage: ${q02Doc?.optionsEmbeddedInImage}`);
    console.log(`  defectRepaired: ${q02Doc?.sourceMeta?.defectRepaired}`);

    const report = {
      timestamp: new Date().toISOString(),
      targetCount: targetList.length,
      matchedCount: res.matchedCount,
      modifiedCount: res.modifiedCount,
      sampleVerified: {
        code: "TAH-MATH-V2-COL26-P008-Q02",
        imageUrl: q02Doc?.imageUrl,
        imageHash: q02Doc?.sourceMeta?.imageHash,
        options: q02Doc?.options,
      },
    };

    fs.writeFileSync(
      "ops/tah_math_v2/audit_repair/DB_SYNC_REPORT_257.json",
      JSON.stringify(report, null, 2),
      "utf8"
    );
    console.log(`Report written to ops/tah_math_v2/audit_repair/DB_SYNC_REPORT_257.json`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
