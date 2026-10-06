import mongoose from "mongoose";
import { env } from "../config/env.js";

const criticalCollections = [
  "reviewcards",
  "skillprogresses",
  "questionattempts",
  "quizresults",
  "schoolmemberships",
  "teachingassignments",
  "notificationdeliveries",
  "aiinteractions",
  "paymentrequests",
  "lessonprogresses",
];

const signature = (key: Record<string, unknown>) => JSON.stringify(Object.entries(key));

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");
    const exactDuplicates: Array<{ collection: string; key: Record<string, unknown>; indexes: string[] }> = [];
    const counts: Record<string, number> = {};
    for (const collection of criticalCollections) {
      const indexes = await db.collection(collection).listIndexes().toArray();
      counts[collection] = indexes.length;
      const byKey = new Map<string, { key: Record<string, unknown>; names: string[] }>();
      for (const index of indexes) {
        const key = index.key as Record<string, unknown>;
        const sig = signature(key);
        const current = byKey.get(sig) || { key, names: [] };
        current.names.push(String(index.name || ""));
        byKey.set(sig, current);
      }
      for (const value of byKey.values()) {
        if (value.names.length > 1) exactDuplicates.push({ collection, key: value.key, indexes: value.names });
      }
    }
    console.log(JSON.stringify({
      database: db.databaseName,
      readOnly: true,
      criticalCollections,
      indexCounts: counts,
      exactDuplicateKeyPatterns: exactDuplicates,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}
run().catch(async (error) => {
  console.error("DB-3 index audit failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
