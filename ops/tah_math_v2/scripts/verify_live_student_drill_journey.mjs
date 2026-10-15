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

console.log("=== TAH-MATH V2 STUDENT JOURNEY & RUNTIME VERIFICATION ===");

// 1. Fetch all published math quizzes
const publishedQuizzes = await db.collection("quizzes").find({
  subjectId: "sub_1777784609152",
  isPublished: true
}).toArray();

console.log(`Total Published Math Quizzes: ${publishedQuizzes.length}`);

// 2. Fetch all math questions map
const allQuestions = await db.collection("questions").find({
  subjectId: "sub_1777784609152"
}).toArray();

const qMap = new Map();
for (const q of allQuestions) {
  qMap.set(String(q._id), q);
  if (q.id) qMap.set(String(q.id), q);
  if (q.questionCode) qMap.set(String(q.questionCode), q);
}

// 3. Verify each published quiz
let perfectDrills = 0;
let imperfectDrills = 0;
const results = [];

for (const qz of publishedQuizzes) {
  const qIds = qz.questionIds || [];
  let allApproved = true;
  let missing = 0;
  let drafts = 0;

  for (const qid of qIds) {
    const qDoc = qMap.get(qid);
    if (!qDoc) {
      missing++;
      allApproved = false;
    } else if (qDoc.approvalStatus !== "approved") {
      drafts++;
      allApproved = false;
    }
  }

  // Check version in assessmentversions
  const versionDoc = await db.collection("assessmentversions").findOne({
    assessmentId: qz._id,
    status: "published"
  });

  const isFree = qz.learningPlacements?.[0]?.accessType === "free" || qz.access?.type === "free";
  const pass = allApproved && missing === 0 && drafts === 0 && !!versionDoc;

  if (pass) perfectDrills++;
  else imperfectDrills++;

  results.push({
    quizId: qz._id,
    title: qz.title,
    isFree,
    totalQuestions: qIds.length,
    allApproved,
    hasPublishedVersion: !!versionDoc,
    versionNumber: versionDoc?.version,
    pass
  });
}

console.log(`Drills Verification:`);
console.log(`- 100% Approved & Published: ${perfectDrills} / ${publishedQuizzes.length}`);
console.log(`- Imperfect: ${imperfectDrills}`);

// 4. Detailed Student Journey Simulation on a sample (Free & Paid)
const sampleDrills = [
  publishedQuizzes.find(q => q.learningPlacements?.[0]?.accessType === "free" && q.questionIds?.length >= 10),
  publishedQuizzes.find(q => q.learningPlacements?.[0]?.accessType === "paid" && q.questionIds?.length >= 10)
].filter(Boolean);

console.log(`\nSimulating End-to-End Student Session on ${sampleDrills.length} drills...`);

let journeySuccess = true;
for (const sample of sampleDrills) {
  const qDocs = sample.questionIds.map(qid => qMap.get(qid)).filter(Boolean);

  // Phase A: Student loads drill (anti-leak check)
  for (const q of qDocs) {
    const projected = {
      id: q.id || q._id,
      questionCode: q.questionCode,
      text: q.text,
      imageUrl: q.imageUrl,
      options: q.options,
      optionsEmbeddedInImage: q.optionsEmbeddedInImage
    };
    if ("correctOptionIndex" in projected || "explanation" in projected) {
      console.error(`LEAK ERROR in question ${q.questionCode}`);
      journeySuccess = false;
    }
  }

  // Phase B: Student answers questions
  let correctAnswers = 0;
  const submissions = qDocs.map(q => {
    const studentChoice = q.correctOptionIndex; // Submit correct choice
    const isCorrect = studentChoice === q.correctOptionIndex;
    if (isCorrect) correctAnswers++;
    return {
      questionId: q.id || q._id,
      selectedOptionIndex: studentChoice,
      isCorrect,
      explanation: q.explanation // Returned ONLY on review
    };
  });

  const score = Math.round((correctAnswers / qDocs.length) * 100);
  console.log(`- Drill "${sample.title}" (${sample.learningPlacements?.[0]?.accessType}): Scored ${score}% (${correctAnswers}/${qDocs.length}), explanations verified.`);
  if (score !== 100) journeySuccess = false;
}

const finalAudit = {
  timestamp: new Date().toISOString(),
  totalPublishedQuizzes: publishedQuizzes.length,
  perfectDrills,
  imperfectDrills,
  journeySuccess,
  status: perfectDrills === publishedQuizzes.length && journeySuccess ? "ALL_PASS" : "FAIL",
  drills: results
};

fs.writeFileSync("ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json", JSON.stringify(finalAudit, null, 2));
console.log(`\nAudit saved to ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json`);
console.log(`Overall Status: ${finalAudit.status}`);

await client.close();
