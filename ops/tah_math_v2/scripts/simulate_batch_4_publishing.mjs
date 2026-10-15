import fs from "node:fs";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch(e){}
const env = fs.readFileSync("server/.env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const client = new MongoClient(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
await client.connect();
const db = client.db("almeaa");

// Load batch 4 questions
const batch4Data = JSON.parse(fs.readFileSync("ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_4.json", "utf8"));
const holdIds = new Set([
  "q_tahmath_v2_col26old_p129_q87",
  "q_tahmath_v2_col26old_p130_q105"
]);

// Build simulated approval map
const simulatedStatus = new Map();

// 1. Current status in DB
const existingQ = await db.collection("questions").find({ subjectId: "sub_1777784609152" }).toArray();
for (const q of existingQ) {
  simulatedStatus.set(String(q._id), q.approvalStatus);
  if (q.id) simulatedStatus.set(String(q.id), q.approvalStatus);
  if (q.questionCode) simulatedStatus.set(String(q.questionCode), q.approvalStatus);
}

// 2. Apply Batch 4 approvals
let simApproved = 0;
let simHold = 0;
for (const q of batch4Data.questions) {
  const qid = String(q._id);
  if (holdIds.has(q.id) || holdIds.has(qid) || holdIds.has(q.questionCode)) {
    simulatedStatus.set(qid, "draft");
    if (q.id) simulatedStatus.set(String(q.id), "draft");
    if (q.questionCode) simulatedStatus.set(String(q.questionCode), "draft");
    simHold++;
  } else {
    simulatedStatus.set(qid, "approved");
    if (q.id) simulatedStatus.set(String(q.id), "approved");
    if (q.questionCode) simulatedStatus.set(String(q.questionCode), "approved");
    simApproved++;
  }
}

console.log(`Simulation counts: ${simApproved} approved, ${simHold} on HOLD.`);

// 3. Check which unpublished drills become 100% approved
const quizzes = await db.collection("quizzes").find({
  subjectId: "sub_1777784609152",
  isPublished: false,
  sectionId: { $ne: null }
}).toArray();

const readyDrills = [];
const blockedDrills = [];

for (const qz of quizzes) {
  const qIds = qz.questionIds || [];
  if (qIds.length === 0) continue;

  let allApproved = true;
  const missingDrafts = [];
  for (const qid of qIds) {
    if (simulatedStatus.get(qid) !== "approved") {
      allApproved = false;
      missingDrafts.push(qid);
    }
  }

  if (allApproved) {
    readyDrills.push({
      quizId: qz._id,
      title: qz.title,
      sectionId: qz.sectionId,
      questionCount: qIds.length,
      isFree: qz.learningPlacements?.[0]?.accessType === "free" || qz.access?.type === "free"
    });
  } else {
    blockedDrills.push({
      quizId: qz._id,
      title: qz.title,
      missingDraftsCount: missingDrafts.length
    });
  }
}

console.log(`\n=== PUBLISHING SIMULATION RESULTS FOR BATCH 4 ===`);
console.log(`Ready to publish (100% approved): ${readyDrills.length} drills!`);
console.log(`Remaining blocked drills: ${blockedDrills.length}`);

console.log("\nReady Drills List:");
for (const d of readyDrills) {
  console.log(`  [${d.isFree ? "FREE" : "PAID"}] (${d.questionCount} qs) ${d.quizId} - ${d.title}`);
}

await client.close();
