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

// 1. Load manifest data for fast lookup
console.log("Loading ALL_2270_EXPECTED_QUESTION_MANIFEST.jsonl...");
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
    // Also store without TAH-MATH- prefix or with V2
    manifestMap.set(row.questionCode_EXPECTED.replace("TAH-MATH-", "TAH-MATH-V2-"), row);
  }
}
console.log(`Loaded ${manifestMap.size} manifest keys.`);

// 2. Load all math questions
const allQ = await db.collection("questions").find({ subjectId: "sub_1777784609152" }).toArray();
const qMap = new Map();
for (const q of allQ) {
  qMap.set(String(q._id), q);
  if (q.id) qMap.set(String(q.id), q);
  if (q.questionCode) qMap.set(String(q.questionCode), q);
}

// 3. Load drills readiness
const drillsData = JSON.parse(fs.readFileSync("ops/tah_math_v2/audit_repair/DRILLS_READINESS_ANALYSIS.json", "utf8"));

// Priority selection: drills with > 0 approved first, then drills in free sections (01 to 05), then remaining drills
const priorityDrills = drillsData.filter(d => !d.isPublished && d.totalQuestions > 0);
priorityDrills.sort((a, b) => {
  // Drills with approved questions come first
  if (a.approvedCount > 0 && b.approvedCount === 0) return -1;
  if (b.approvedCount > 0 && a.approvedCount === 0) return 1;
  // Then by readiness ratio DESC
  if (b.readinessRatio !== a.readinessRatio) return b.readinessRatio - a.readinessRatio;
  // Then by free first
  if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
  // Then smallest draft count to complete quicker
  return a.draftCount - b.draftCount;
});

console.log(`Analyzing ${priorityDrills.length} unpublished drills...`);

const targetDraftQuestions = [];
const seenQIds = new Set();
const targetDrillIds = [];

for (const drill of priorityDrills) {
  const drillDrafts = [];
  for (const qid of drill.questionIds) {
    const qDoc = qMap.get(qid);
    if (qDoc && qDoc.approvalStatus === "draft") {
      drillDrafts.push(qid);
      if (!seenQIds.has(String(qDoc._id))) {
        seenQIds.add(String(qDoc._id));
        const code = qDoc.questionCode || qDoc.id;
        const mf = manifestMap.get(code) || {};
        targetDraftQuestions.push({
          _id: qDoc._id,
          id: qDoc.id,
          questionCode: code,
          drillId: drill.quizId,
          drillTitle: drill.title,
          sectionId: drill.sectionId,
          isFree: drill.isFree,
          imageUrl: qDoc.imageUrl,
          currentText: qDoc.text,
          correctOptionIndex: qDoc.correctOptionIndex,
          page: qDoc.sourceMeta?.page || qDoc.sourceMeta?.printedPageNumber || mf.sourcePDFPage1Based,
          questionNumber: qDoc.sourceMeta?.questionNumber || qDoc.sourceMeta?.printedQuestionNumber || mf.printedQuestionNo,
          lessonName: mf.lessonName || drill.title,
          manifestExcerpt: mf.sourceQuestionTextGeometricExcerpt_UNVERIFIED,
          manifestReasoning: mf.priorIndependentMathReasoning_UNVERIFIED_NEW_PDF,
          subSkillId: qDoc.subSkillId || mf.suggestedSubSkillCode_NOT_CERTIFIED || drill.sectionId
        });
      }
    }
  }
  if (drillDrafts.length > 0) {
    targetDrillIds.push({
      drillId: drill.quizId,
      title: drill.title,
      isFree: drill.isFree,
      sectionId: drill.sectionId,
      total: drill.totalQuestions,
      currentApproved: drill.approvedCount,
      draftsNeeded: drillDrafts.length,
      questionIds: drill.questionIds
    });
  }
  if (targetDraftQuestions.length >= 450) {
    break; // We have enough for our 400+ heavy batch
  }
}

console.log(`Selected ${targetDraftQuestions.length} unique draft questions across ${targetDrillIds.length} candidate drills.`);

fs.writeFileSync("ops/tah_math_v2/audit_repair/HEAVY_BATCH_400_CANDIDATES.json", JSON.stringify({
  count: targetDraftQuestions.length,
  drillsCount: targetDrillIds.length,
  targetDrills: targetDrillIds,
  questions: targetDraftQuestions
}, null, 2));

console.log("Saved candidates to ops/tah_math_v2/audit_repair/HEAVY_BATCH_400_CANDIDATES.json");

await client.close();
