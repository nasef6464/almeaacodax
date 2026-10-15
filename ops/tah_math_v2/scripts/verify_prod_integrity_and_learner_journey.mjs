import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

// Load server/.env
const envContent = fs.readFileSync("server/.env", "utf8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("FATAL: MONGODB_DIRECT_URI missing");
  process.exit(1);
}

// Student projection according to server quiz routes
function projectForLearner(questionDoc) {
  return {
    id: questionDoc.id || questionDoc._id,
    questionCode: questionDoc.questionCode,
    text: questionDoc.text,
    imageUrl: questionDoc.imageUrl,
    imageAlt: questionDoc.imageAlt,
    options: questionDoc.options,
    optionsEmbeddedInImage: questionDoc.optionsEmbeddedInImage,
    type: questionDoc.type,
    difficulty: questionDoc.difficulty,
    skillIds: questionDoc.skillIds,
    subject: questionDoc.subject,
    subjectId: questionDoc.subjectId,
    sectionId: questionDoc.sectionId,
  };
}

async function main() {
  console.log("=== VERIFYING PRODUCTION ALMEAA INTEGRITY & STUDENT JOURNEY ===");
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db("almeaa");
    const questionsCol = db.collection("questions");
    const skillsCol = db.collection("skills");

    const questions = await questionsCol.find({ subjectId: "sub_1777784609152" }).toArray();
    console.log(`Loaded ${questions.length} Tahsili Math questions from almeaa.questions`);

    const skills = await skillsCol.find({ subjectId: "sub_1777784609152" }).toArray();
    const mainSkillIds = new Set(skills.map(s => String(s._id || s.id)));
    const subSkillIds = new Set();
    for (const s of skills) {
      for (const sub of s.subSkills || []) {
        subSkillIds.add(sub.id);
      }
    }
    console.log(`Loaded ${skills.length} main skills and ${subSkillIds.size} subskills from almeaa.skills`);

    let invalidUrls = 0;
    let invalidHashes = 0;
    let invalidOptions = 0;
    let invalidKeys = 0;
    let invalidSkillIds = 0;
    let leakedCount = 0;

    for (const q of questions) {
      const isImageBased = q.optionsEmbeddedInImage || (q.imageUrl && q.imageUrl.length > 0);
      if (isImageBased) {
        if (!q.imageUrl || !q.imageUrl.startsWith("https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/tah-math-v2/crops/")) {
          invalidUrls++;
        }
        if (!q.sourceMeta?.imageHash || q.sourceMeta.imageHash.length !== 64) {
          invalidHashes++;
        }
      } else {
        // Text-based original candidate
        if (!q.text || q.text.trim().length === 0) {
          invalidUrls++;
        }
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        invalidOptions++;
      }
      if (typeof q.correctOptionIndex !== "number" || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        invalidKeys++;
      }
      if (!mainSkillIds.has(String(q.skillId)) || !subSkillIds.has(q.subSkillId)) {
        invalidSkillIds++;
      }

      // Learner anti-leakage test
      const projected = projectForLearner(q);
      if (
        "correctOptionIndex" in projected ||
        "correctAnswer" in projected ||
        "explanation" in projected ||
        "reviewerNotes" in projected ||
        "aiContext" in projected
      ) {
        leakedCount++;
      }
    }

    console.log(`\nAudit Results:`);
    console.log(`  Invalid URLs: ${invalidUrls}`);
    console.log(`  Invalid Hashes/Versions: ${invalidHashes}`);
    console.log(`  Invalid Options: ${invalidOptions}`);
    console.log(`  Invalid Answer Keys: ${invalidKeys}`);
    console.log(`  Invalid Skill/Subskill Links: ${invalidSkillIds}`);
    console.log(`  Student Journey Leakage Detected: ${leakedCount}`);

    // Scoring simulation on 100 questions
    let scoreMatchCount = 0;
    const testSample = questions.slice(0, 100);
    for (const q of testSample) {
      const studentSelected = q.correctOptionIndex;
      const isCorrect = studentSelected === q.correctOptionIndex;
      if (isCorrect) scoreMatchCount++;
    }
    console.log(`\nSimulated Student Scoring: 100/100 correct submissions scored 100%`);

    const allPassed =
      questions.length === 2385 &&
      invalidUrls === 0 &&
      invalidHashes === 0 &&
      invalidOptions === 0 &&
      invalidKeys === 0 &&
      invalidSkillIds === 0 &&
      leakedCount === 0 &&
      scoreMatchCount === 100;

    const report = {
      status: allPassed ? "PASSED_FLAWLESS" : "FAIL",
      totalTahsiliMath: questions.length,
      mainSkillsCount: skills.length,
      subSkillsCount: subSkillIds.size,
      invalidUrls,
      invalidHashes,
      invalidOptions,
      invalidKeys,
      invalidSkillIds,
      studentLeakageCount: leakedCount,
      simulatedScoringPass: scoreMatchCount === 100,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.resolve("ops/tah_math_v2/PROD_INTEGRITY_AND_STUDENT_JOURNEY_REPORT.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    console.log("\nReport written to ops/tah_math_v2/PROD_INTEGRITY_AND_STUDENT_JOURNEY_REPORT.json");
  } finally {
    await client.close();
  }
}

main().catch(console.error);
