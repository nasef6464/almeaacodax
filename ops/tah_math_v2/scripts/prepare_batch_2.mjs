import fs from "node:fs";
import dns from "node:dns";
import readline from "node:readline";
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

// 1. Load manifest data
const manifestMap = new Map();
const rl = readline.createInterface({
  input: fs.createReadStream("ops/tah_math_v2/handoff/03_ALL_QUESTIONS/ALL_2270_EXPECTED_QUESTION_MANIFEST.jsonl"),
  crlfDelay: Infinity
});
for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  if (row.questionCode_EXPECTED) {
    manifestMap.set(row.questionCode_EXPECTED, row);
    manifestMap.set(row.questionCode_EXPECTED.replace("TAH-MATH-", "TAH-MATH-V2-"), row);
  }
}

// 2. Load drills analysis
const data = JSON.parse(fs.readFileSync("ops/tah_math_v2/audit_repair/DRILLS_READINESS_ANALYSIS.json", "utf8"));

// We want unpublished drills from:
// sec_tah_math_v2_09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
const targetSections = [
  "sec_tah_math_v2_09",
  "sec_tah_math_v2_10",
  "sec_tah_math_v2_11",
  "sec_tah_math_v2_12",
  "sec_tah_math_v2_13",
  "sec_tah_math_v2_14",
  "sec_tah_math_v2_15",
  "sec_tah_math_v2_16",
  "sec_tah_math_v2_17",
  "sec_tah_math_v2_18"
];

const candidateDrills = data.filter(d => !d.isPublished && targetSections.includes(d.sectionId));
candidateDrills.sort((a, b) => {
  if (b.readinessRatio !== a.readinessRatio) return b.readinessRatio - a.readinessRatio;
  return a.draftCount - b.draftCount;
});

console.log(`Found ${candidateDrills.length} unpublished drills in sections 09 to 18.`);

// Collect question IDs
const targetDrafts = [];
const seenQIds = new Set();
const targetDrillSummaries = [];

// Load questions for these drills
const allCandidateQIds = new Set();
for (const d of candidateDrills) {
  for (const qid of d.questionIds) allCandidateQIds.add(qid);
}

const qIdsArr = Array.from(allCandidateQIds);
const docs = await db.collection("questions").find({
  $or: [
    { _id: { $in: qIdsArr } },
    { id: { $in: qIdsArr } }
  ]
}).toArray();

const docMap = new Map();
for (const d of docs) {
  docMap.set(String(d._id), d);
  if (d.id) docMap.set(String(d.id), d);
  if (d.questionCode) docMap.set(String(d.questionCode), d);
}

for (const drill of candidateDrills) {
  const neededDrafts = [];
  for (const qid of drill.questionIds) {
    const doc = docMap.get(qid);
    if (doc && doc.approvalStatus === "draft") {
      neededDrafts.push(qid);
      if (!seenQIds.has(String(doc._id))) {
        seenQIds.add(String(doc._id));
        const code = doc.questionCode || doc.id;
        const mf = manifestMap.get(code) || {};
        targetDrafts.push({
          _id: doc._id,
          id: doc.id,
          questionCode: code,
          sectionId: doc.sectionId,
          subSkillId: doc.subSkillId || mf.suggestedSubSkillCode_NOT_CERTIFIED,
          correctOptionIndex: doc.correctOptionIndex,
          imageUrl: doc.imageUrl,
          page: doc.sourceMeta?.page || mf.sourcePDFPage1Based,
          questionNumber: doc.sourceMeta?.questionNumber || mf.printedQuestionNo,
          lessonName: mf.lessonName || drill.title,
          excerpt: mf.sourceQuestionTextGeometricExcerpt_UNVERIFIED || "",
          reasoning: mf.priorIndependentMathReasoning_UNVERIFIED_NEW_PDF || "",
          currentNotes: doc.reviewerNotes || ""
        });
      }
    }
  }

  targetDrillSummaries.push({
    drillId: drill.quizId,
    title: drill.title,
    sectionId: drill.sectionId,
    isFree: drill.isFree,
    total: drill.totalQuestions,
    currentApproved: drill.approvedCount,
    draftsNeeded: neededDrafts.length,
    questionIds: drill.questionIds
  });

  if (targetDrafts.length >= 440) {
    break; // target ~400-450
  }
}

console.log(`Selected exactly ${targetDrafts.length} unique draft questions across ${targetDrillSummaries.length} drills.`);

fs.writeFileSync("ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_2.json", JSON.stringify({
  count: targetDrafts.length,
  drillsCount: targetDrillSummaries.length,
  drills: targetDrillSummaries,
  questions: targetDrafts
}, null, 2));

console.log("Written to ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_2.json");

await client.close();
