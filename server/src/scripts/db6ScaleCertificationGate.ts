import assert from "node:assert/strict";
import mongoose from "mongoose";
import { performance } from "node:perf_hooks";
import { env } from "../config/env.js";
import { QuestionAttemptModel } from "../models/QuestionAttempt.js";

const uri = String(env.MONGODB_URI || "");
assert.match(uri, /mongodb:\/\/(127\.0\.0\.1|localhost):27017\/almeaa_platform_v3_ci_/, "DB-6 scale gate requires isolated CI Mongo");
const marker = `db6_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const focusUser = `${marker}_user`;
const pathId = `${marker}_path`;
const subjectId = `${marker}_subject`;
const sectionId = `${marker}_section`;
const checkpoints = [1_000, 10_000, 100_000];
const queryRepeats = 25;
const limit = 50;

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

const hasIxscan = (plan: unknown) => JSON.stringify(plan).includes("IXSCAN");

async function timeQuery(collection: any, filter: Record<string, unknown>, sort: Record<string, 1 | -1>) {
  const durations: number[] = [];
  for (let index = 0; index < queryRepeats; index += 1) {
    const started = performance.now();
    await collection.find(filter).sort(sort).limit(limit).project({ _id: 1, userId: 1, questionId: 1, createdAt: 1 }).toArray();
    durations.push(performance.now() - started);
  }
  const explain = await collection.find(filter).sort(sort).limit(limit).explain("executionStats");
  const stats = explain.executionStats || {};
  return {
    p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    p99Ms: Number(percentile(durations, 0.99).toFixed(2)),
    nReturned: Number(stats.nReturned || 0),
    totalKeysExamined: Number(stats.totalKeysExamined || 0),
    totalDocsExamined: Number(stats.totalDocsExamined || 0),
    executionTimeMillis: Number(stats.executionTimeMillis || 0),
    usesIxscan: hasIxscan(explain.queryPlanner?.winningPlan),
  };
}

async function insertUntil(collection: any, current: number, target: number) {
  const batchSize = 2_000;
  const batchDurations: number[] = [];
  for (let offset = current; offset < target; offset += batchSize) {
    const end = Math.min(target, offset + batchSize);
    const docs = [];
    for (let i = offset; i < end; i += 1) {
      const createdAt = new Date(1_700_000_000_000 + i * 1_000);
      docs.push({
        userId: focusUser,
        questionId: `${marker}_q_${i}`,
        selectedOptionIndex: i % 4,
        isCorrect: i % 3 !== 0,
        timeSpentSeconds: (i % 90) + 1,
        date: createdAt.toISOString().slice(0, 10),
        pathId,
        subjectId,
        sectionId,
        skillIds: [`${marker}_skill_${i % 10}`],
        evidenceType: i % 5 === 0 ? "remediation" : "assessment",
        createdAt,
        updatedAt: createdAt,
      });
    }
    const started = performance.now();
    await collection.insertMany(docs, { ordered: false });
    batchDurations.push(performance.now() - started);
  }
  return {
    batches: batchDurations.length,
    p50BatchMs: Number(percentile(batchDurations, 0.5).toFixed(2)),
    p95BatchMs: Number(percentile(batchDurations, 0.95).toFixed(2)),
    p99BatchMs: Number(percentile(batchDurations, 0.99).toFixed(2)),
  };
}

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12_000 });
  const collection = mongoose.connection.collection("questionattempts");
  try {
    await QuestionAttemptModel.createIndexes();
    const reports = [];
    let current = 0;
    for (const target of checkpoints) {
      const write = await insertUntil(collection, current, target);
      current = target;
      const [recent, skill, scoped] = await Promise.all([
        timeQuery(collection, { userId: focusUser }, { createdAt: -1 }),
        timeQuery(collection, { userId: focusUser, skillIds: `${marker}_skill_3` }, { createdAt: -1 }),
        timeQuery(collection, { pathId, subjectId, sectionId }, { createdAt: -1 }),
      ]);
      for (const [name, result] of Object.entries({ recent, skill, scoped })) {
        assert.equal(result.usesIxscan, true, `${name} at ${target} rows must use IXSCAN`);
        assert.ok(result.totalDocsExamined <= limit + 5, `${name} at ${target} rows examined too many documents: ${result.totalDocsExamined}`);
        assert.ok(result.totalKeysExamined <= limit + 10, `${name} at ${target} rows examined too many keys: ${result.totalKeysExamined}`);
        assert.ok(result.p95Ms < 500, `${name} at ${target} rows exceeded isolated p95 budget: ${result.p95Ms}ms`);
      }
      reports.push({ rows: target, write, queries: { recent, skill, scoped } });
    }
    assert.equal(await collection.countDocuments({ userId: focusUser }), 100_000);
    console.log(JSON.stringify({
      phase: "DB6",
      status: "PASS",
      kind: "isolated-data-scale-certification",
      disclaimer: "100K rows data-scale validation; not a 100K concurrent-user claim.",
      thresholds: { maxP95QueryMs: 500, maxDocsExamined: limit + 5, maxKeysExamined: limit + 10 },
      reports,
    }, null, 2));
  } finally {
    await collection.deleteMany({ userId: focusUser });
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("DB-6 scale certification failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
