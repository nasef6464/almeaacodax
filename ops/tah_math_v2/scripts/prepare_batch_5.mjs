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

// Visual tables for pages that weren't plain text
const visualTables = {
  "84": { "1": "D", "2": "D", "3": "A", "4": "B", "5": "D", "6": "B", "7": "A", "8": "A", "9": "C", "10": "B", "11": "B", "12": "C", "13": "D", "14": "B", "15": "A", "16": "A", "17": "B" },
  "91": { "17": "A", "18": "D", "19": "C", "20": "C", "21": "A", "22": "D", "23": "C", "24": "D", "25": "B", "26": "C", "27": "C", "28": "B", "29": "B", "30": "B", "31": "A", "32": "A", "33": "B" },
  "132": { "15": "A", "16": "A", "17": "B", "18": "C", "19": "B", "20": "C", "21": "A", "22": "A", "23": "A", "24": "C", "25": "A", "26": "B", "27": "B", "28": "B", "29": "D", "30": "C", "31": "B", "32": "D", "33": "B" }
};

for (const [p, table] of Object.entries(visualTables)) {
  for (const [qNum, key] of Object.entries(table)) {
    pubKeyMap.set(`${p}-${qNum}`, key);
  }
}

// 3. Load crops manifest
const cropsManifest = JSON.parse(fs.readFileSync("ops/tah_math_v2/CROPS_MANIFEST_2270.json", "utf8"));
const cropsMap = new Map();
for (const c of cropsManifest.items) {
  cropsMap.set(c.questionCode, c);
  cropsMap.set(c.questionCode.replace("TAH-MATH-V2-", "TAH-MATH-"), c);
}

// 4. Fetch all remaining draft questions
const draftDocs = await db.collection("questions").find({
  subjectId: "sub_1777784609152",
  approvalStatus: "draft"
}).toArray();

console.log(`Found exactly ${draftDocs.length} draft questions in MongoDB Atlas.`);

// Known HOLD IDs
const holdIds = new Set([
  "q_tahmath_v2_col26_p005_q02",
  "TAH-MATH-V2-COL26-P005-Q02",
  "q_tahmath_v2_col26_p006_q15",
  "TAH-MATH-V2-COL26-P006-Q15",
  "q_tahmath_v2_col26_p131_q06",
  "TAH-MATH-V2-COL26-P131-Q06",
  "q_tahmath_v2_col26_p132_q29",
  "TAH-MATH-V2-COL26-P132-Q29",
  "q_tahmath_v2_col26_p132_q30",
  "TAH-MATH-V2-COL26-P132-Q30",
  "q_tahmath_v2_col26old_p129_q87",
  "TAH-MATH-V2-COL26OLD-P129-Q87",
  "q_tahmath_v2_col26old_p130_q105",
  "TAH-MATH-V2-COL26OLD-P130-Q105"
]);

const letters = ["A", "B", "C", "D"];
const targetDrafts = [];

for (const doc of draftDocs) {
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
    lessonName: mf.lessonName || doc.sectionId,
    excerpt: mf.sourceQuestionTextGeometricExcerpt_UNVERIFIED || "",
    reasoning: mf.priorIndependentMathReasoning_UNVERIFIED_NEW_PDF || "",
    isKnownHold: holdIds.has(doc.id) || holdIds.has(String(doc._id)) || holdIds.has(code)
  });
}

// 5. Inspect publisher key audit
let keyMatches = 0;
let keyDiscrepancies = 0;
let keyMissing = 0;
const missingList = [];
const discrepancyList = [];

for (const q of targetDrafts) {
  if (q.isKnownHold) continue; // Skip known hold

  if (!q.publisherKey) {
    keyMissing++;
    missingList.push({ id: q.id, code: q.questionCode, page: q.page, qNum: q.questionNumber });
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

console.log(`=== BATCH 5 (FINAL) DRAFT AUDIT ===`);
console.log(`Total Drafts: ${targetDrafts.length}`);
console.log(`Known Hold: ${targetDrafts.filter(q => q.isKnownHold).length}`);
console.log(`Candidate Approvals: ${targetDrafts.length - targetDrafts.filter(q => q.isKnownHold).length}`);
console.log(`Publisher Key Matches: ${keyMatches}`);
console.log(`Publisher Key Discrepancies: ${keyDiscrepancies}`);
console.log(`Publisher Key Missing: ${keyMissing}`);

if (missingList.length > 0) {
  console.log("Missing keys sample:", JSON.stringify(missingList.slice(0, 10), null, 2));
}
if (discrepancyList.length > 0) {
  console.log("Discrepancies:", JSON.stringify(discrepancyList, null, 2));
}

// 6. Inspect 12 remaining unpublished section drills
const quizzes = await db.collection("quizzes").find({
  subjectId: "sub_1777784609152",
  isPublished: false,
  sectionId: { $ne: null }
}).toArray();

console.log(`\nRemaining unpublished section drills: ${quizzes.length}`);
const unpubDrillList = quizzes.map(q => ({
  quizId: q._id,
  title: q.title,
  sectionId: q.sectionId,
  questionCount: (q.questionIds || []).length,
  hasHold: (q.questionIds || []).some(id => holdIds.has(id))
}));

for (const d of unpubDrillList) {
  console.log(`  - [${d.hasHold ? "CONTAINS_HOLD" : "CLEAN"}] (${d.questionCount} qs) ${d.quizId}: ${d.title}`);
}

fs.writeFileSync("ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_5.json", JSON.stringify({
  count: targetDrafts.length,
  keyAudit: {
    matches: keyMatches,
    discrepancies: keyDiscrepancies,
    missing: keyMissing,
    missingList: missingList,
    discrepancyList: discrepancyList
  },
  unpublishedDrills: unpubDrillList,
  questions: targetDrafts
}, null, 2));

console.log("\nOutput saved to ops/tah_math_v2/audit_repair/DRAFT_QUESTIONS_BATCH_5.json");

await client.close();
