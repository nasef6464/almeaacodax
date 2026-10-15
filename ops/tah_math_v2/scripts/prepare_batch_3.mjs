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

// 2. Load publisher keys
const publisherKeys = JSON.parse(fs.readFileSync("ops/tah_math_v2/audit_repair/PUBLISHER_KEYS_2190.json", "utf8"));
const pubKeyMap = new Map();
for (const [k, v] of Object.entries(publisherKeys)) {
  pubKeyMap.set(k, v);
}

// 3. Load crops manifest
const cropsManifest = JSON.parse(fs.readFileSync("ops/tah_math_v2/CROPS_MANIFEST_2270.json", "utf8"));
const cropsMap = new Map();
for (const c of cropsManifest.items) {
  cropsMap.set(c.questionCode, c);
  cropsMap.set(c.questionCode.replace("TAH-MATH-V2-", "TAH-MATH-"), c);
}

// 4. Fetch all questions for tah math
const allQDocs = await db.collection("questions").find({ subjectId: "sub_1777784609152" }).toArray();
const qMap = new Map();
for (const q of allQDocs) {
  qMap.set(String(q._id), q);
  if (q.id) qMap.set(String(q.id), q);
  if (q.questionCode) qMap.set(String(q.questionCode), q);
}

// 5. Fetch unpublished drills (exclude section 1 and exams)
const quizzes = await db.collection("quizzes").find({
  subjectId: "sub_1777784609152",
  isPublished: false,
  sectionId: { $ne: null }
}).toArray();

const drillSummaries = [];
for (const qz of quizzes) {
  if (qz.sectionId === "sec_tah_math_v2_01") continue; // Hold questions exist in sec 1
  const qIds = qz.questionIds || [];
  let appCount = 0;
  let draftCount = 0;
  const draftIds = [];

  for (const qid of qIds) {
    const doc = qMap.get(qid);
    if (!doc) continue;
    if (doc.approvalStatus === "approved") {
      appCount++;
    } else {
      draftCount++;
      draftIds.push(qid);
    }
  }

  drillSummaries.push({
    quizId: qz._id,
    title: qz.title,
    sectionId: qz.sectionId,
    quizKind: qz.quizKind,
    isFree: qz.learningPlacements?.[0]?.accessType === "free" || qz.access?.type === "free",
    total: qIds.length,
    approved: appCount,
    drafts: draftCount,
    readiness: qIds.length > 0 ? (appCount / qIds.length) : 0,
    draftIds: draftIds,
    questionIds: qIds
  });
}

drillSummaries.sort((a, b) => {
  if (b.readiness !== a.readiness) return b.readiness - a.readiness;
  return a.drafts - b.drafts;
});

const letters = ["A", "B", "C", "D"];
const letterToIndex = { "A": 0, "B": 1, "C": 2, "D": 3 };

const targetDrafts = [];
const seenQIds = new Set();
const selectedDrills = [];

for (const drill of drillSummaries) {
  let newDraftsInDrill = 0;
  for (const qid of drill.draftIds) {
    if (!seenQIds.has(qid)) newDraftsInDrill++;
  }

  if (targetDrafts.length + newDraftsInDrill <= 450) {
    for (const qid of drill.draftIds) {
      if (!seenQIds.has(qid)) {
        seenQIds.add(qid);
        const doc = qMap.get(qid);
        const code = doc.questionCode || doc.id;
        const mf = manifestMap.get(code) || {};
        const crop = cropsMap.get(code);

        const page = doc.sourceMeta?.page || mf.sourcePDFPage1Based;
        const qNum = doc.sourceMeta?.questionNumber || mf.printedQuestionNo;
        const pubKey = pubKeyMap.get(`${page}-${qNum}`) || null;

        targetDrafts.push({
          _id: doc._id,
          id: doc.id,
          questionCode: code,
          sectionId: doc.sectionId,
          subSkillId: doc.subSkillId || mf.suggestedSubSkillCode_NOT_CERTIFIED,
          correctOptionIndex: doc.correctOptionIndex,
          storedLetter: letters[doc.correctOptionIndex],
          publisherKey: pubKey,
          imageUrl: crop?.imageUrl || doc.imageUrl,
          sha256: crop?.sha256 || "",
          page: page,
          questionNumber: qNum,
          lessonName: mf.lessonName || drill.title,
          excerpt: mf.sourceQuestionTextGeometricExcerpt_UNVERIFIED || "",
          reasoning: mf.priorIndependentMathReasoning_UNVERIFIED_NEW_PDF || ""
        });
      }
    }

    selectedDrills.push({
      drillId: drill.quizId,
      title: drill.title,
      sectionId: drill.sectionId,
      isFree: drill.isFree,
      total: drill.total,
      draftsNeeded: drill.drafts,
      questionIds: drill.questionIds
    });
  } else if (targetDrafts.length >= 400) {
    break;
  }
}

console.log(`=== BATCH 3 SUMMARY ===`);
console.log(`Selected ${selectedDrills.length} drills with ${targetDrafts.length} unique questions.`);

// Audit agreement between stored correctOptionIndex and publisherKey
let keyMatches = 0;
let keyDiscrepancies = 0;
let keyMissing = 0;
const discrepancyList = [];

for (const q of targetDrafts) {
  if (!q.publisherKey) {
    keyMissing++;
  } else if (q.storedLetter === q.publisherKey) {
    keyMatches++;
  } else {
    keyDiscrepancies++;
    discrepancyList.push({
      id: q.id,
      code: q.questionCode,
      page: q.page,
      qNum: q.questionNumber,
      stored: q.storedLetter,
      pubKey: q.publisherKey
    });
  }
}

console.log(`Publisher key audit for Batch 3:`);
console.log(`  Matches: ${keyMatches}`);
console.log(`  Discrepancies: ${keyDiscrepancies}`);
console.log(`  Missing: ${keyMissing}`);

if (keyDiscrepancies > 0) {
  console.log("Discrepancies found:", JSON.stringify(discrepancyList, null, 2));
}

fs.writeFileSync("ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_3.json", JSON.stringify({
  count: targetDrafts.length,
  drillsCount: selectedDrills.length,
  keyAudit: {
    matches: keyMatches,
    discrepancies: keyDiscrepancies,
    missing: keyMissing,
    discrepancyList: discrepancyList
  },
  drills: selectedDrills,
  questions: targetDrafts
}, null, 2));

console.log("Output saved to ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_3.json");

await client.close();
