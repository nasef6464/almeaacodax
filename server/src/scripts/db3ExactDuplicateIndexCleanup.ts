import mongoose from "mongoose";
import { env } from "../config/env.js";

const APPLY = process.argv.includes("--apply");
const ROLLBACK = process.argv.includes("--rollback");
const COLLECTION = "lessonprogresses";
const CANONICAL = "user_lesson_unique";
const DUPLICATE = "userId_1_lessonId_1";
const EXPECTED_KEY = JSON.stringify({ userId: 1, lessonId: 1 });

const sameKey = (index: any) => JSON.stringify(index?.key || {}) === EXPECTED_KEY;

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");
    const collection = db.collection(COLLECTION);
    const indexes = await collection.listIndexes().toArray();
    const canonical = indexes.find((index) => index.name === CANONICAL);
    const duplicate = indexes.find((index) => index.name === DUPLICATE);

    if (!canonical || !sameKey(canonical) || canonical.unique !== true) {
      throw new Error("canonical_unique_index_not_verified");
    }

    if (ROLLBACK) {
      const summary = { mode: APPLY ? "rollback-apply" : "rollback-dry-run", duplicatePresent: Boolean(duplicate), canonical: CANONICAL };
      console.log(JSON.stringify(summary, null, 2));
      if (APPLY && !duplicate) {
        await collection.createIndex({ userId: 1, lessonId: 1 }, { name: DUPLICATE });
        console.log(JSON.stringify({ ...summary, recreated: DUPLICATE }, null, 2));
      }
      return;
    }

    const safeDuplicate = Boolean(duplicate && sameKey(duplicate));
    const summary = {
      mode: APPLY ? "apply" : "dry-run",
      canonical: { name: CANONICAL, unique: canonical.unique === true, key: canonical.key },
      duplicate: duplicate ? { name: DUPLICATE, unique: duplicate.unique === true, key: duplicate.key } : null,
      safeExactDuplicateCandidate: safeDuplicate,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (APPLY && safeDuplicate) {
      await collection.dropIndex(DUPLICATE);
      console.log(JSON.stringify({ ...summary, dropped: DUPLICATE }, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}
run().catch(async (error) => {
  console.error("DB-3 exact duplicate index cleanup failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
