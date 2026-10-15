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

// 1. Load current DB questions
const allQDocs = await db.collection("questions").find({ subjectId: "sub_1777784609152" }).toArray();
const qStatusMap = new Map();
for (const q of allQDocs) {
  qStatusMap.set(String(q._id), q.approvalStatus);
  if (q.id) qStatusMap.set(String(q.id), q.approvalStatus);
  if (q.questionCode) qStatusMap.set(String(q.questionCode), q.approvalStatus);
}

// 2. Simulate Batch 2 approvals
const batch2 = JSON.parse(fs.readFileSync("ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_2.json", "utf8"));
for (const q of batch2.questions) {
  qStatusMap.set(String(q._id), "approved");
  if (q.id) qStatusMap.set(String(q.id), "approved");
  if (q.questionCode) qStatusMap.set(String(q.questionCode), "approved");
}

// 3. Evaluate all quizzes
const allQuizzes = await db.collection("quizzes").find({ subjectId: "sub_1777784609152" }).toArray();
const newlyReadyDrills = [];
const stillDraftDrills = [];

for (const qz of allQuizzes) {
  if (qz.isPublished) continue;
  const qIds = qz.questionIds || [];
  if (qIds.length === 0) continue;

  let allApproved = true;
  let drafts = 0;
  for (const qid of qIds) {
    if (qStatusMap.get(qid) !== "approved") {
      allApproved = false;
      drafts++;
    }
  }

  if (allApproved) {
    newlyReadyDrills.push({
      quizId: qz._id,
      title: qz.title,
      sectionId: qz.sectionId,
      quizKind: qz.quizKind,
      isFree: qz.learningPlacements?.[0]?.accessType === "free" || qz.access?.type === "free",
      questionCount: qIds.length,
      questionIds: qIds
    });
  } else {
    stillDraftDrills.push({
      quizId: qz._id,
      title: qz.title,
      drafts
    });
  }
}

console.log(`=== BATCH 2 PUBLISHING SIMULATION ===`);
console.log(`Total unpublished quizzes tested: ${allQuizzes.filter(q => !q.isPublished).length}`);
console.log(`Drills that will reach 100% completion: ${newlyReadyDrills.length}`);
console.log(`Quizzes remaining as draft: ${stillDraftDrills.length}`);

console.log("\nSample of drills reaching 100% completion:");
console.table(newlyReadyDrills.slice(0, 20).map(d => ({
  quizId: d.quizId.replace("quiz_tahmath_v2_", ""),
  title: d.title.slice(0, 32),
  section: d.sectionId,
  free: d.isFree,
  qCount: d.questionCount
})));

await client.close();
