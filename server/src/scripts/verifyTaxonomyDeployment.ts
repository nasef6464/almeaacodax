import mongoose from "mongoose";
import { env } from "../config/env.js";

async function verify() {
  const uri = env.MONGODB_URI || "mongodb://localhost:27017/almeaa";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB");

  const subjectId = "sub_1777779748206";

  console.log("=== Verification of Quant Taxonomy Deployment ===");

  // 1. Skills
  const skills = await db.collection("skills").find({ subjectId }).sort({ order: 1 }).toArray();
  console.log(`\n1. Skills: ${skills.length} main skills`);
  let totalSubskills = 0;
  skills.forEach((s) => {
    totalSubskills += s.subSkills?.length || 0;
  });
  console.log(`   Total Subskills in DB: ${totalSubskills}`);

  // 2. Topics
  const parentTopics = await db.collection("topics").find({ subjectId, parentId: null }).sort({ order: 1 }).toArray();
  const childTopics = await db.collection("topics").find({ subjectId, parentId: { $ne: null } }).toArray();
  console.log(`\n2. Topics:`);
  console.log(`   Parent Topics: ${parentTopics.length}`);
  console.log(`   Child Topics: ${childTopics.length}`);
  
  const subTopicsWithQuizzes = childTopics.filter((t) => t.quizIds && t.quizIds.length > 0);
  console.log(`   Child Topics with attached 10-question drills: ${subTopicsWithQuizzes.length} / ${childTopics.length}`);

  // 3. Questions
  const totalQuestions = await db.collection("questions").countDocuments({ subject: subjectId });
  const taggedQuestions = await db.collection("questions").countDocuments({ subject: subjectId, skillId: { $regex: /^skill_quant_/ } as any });
  const explainedQuestions = await db.collection("questions").countDocuments({ subject: subjectId, explanation: { $exists: true, $ne: "" } });
  console.log(`\n3. Questions:`);
  console.log(`   Total Questions: ${totalQuestions}`);
  console.log(`   Tagged Questions with new 25 skills: ${taggedQuestions}`);
  console.log(`   Questions with explanations: ${explainedQuestions}`);

  // Distribution across 25 skills
  console.log("\n   Distribution per Main Skill:");
  for (const s of skills) {
    const count = await db.collection("questions").countDocuments({ subject: subjectId, skillId: s.id });
    console.log(`   - [${s.order}] ${s.name}: ${count} questions`);
  }

  // 4. Quizzes
  const shortDrills = await db.collection("quizzes").countDocuments({ subjectId, "learningPlacements.slot": "foundation" });
  const trainingDrills = await db.collection("quizzes").countDocuments({ subjectId, "learningPlacements.slot": "training" });
  const mockExams = await db.collection("quizzes").countDocuments({ subjectId, "learningPlacements.slot": "tests" });
  console.log(`\n4. Quizzes:`);
  console.log(`   Short Foundation Drills (slot: foundation): ${shortDrills}`);
  console.log(`   Comprehensive Skill Drills (slot: training): ${trainingDrills}`);
  console.log(`   Standard Mock Exams (slot: tests): ${mockExams}`);

  // Check sample drill
  const sampleDrill = await db.collection("quizzes").findOne({ _id: { $regex: /^drill_sub_/ } as any });
  console.log(`\n   Sample Short Drill: ${sampleDrill?.title} | questions: ${sampleDrill?.questionIds?.length} | slot: ${sampleDrill?.learningPlacements?.[0]?.slot}`);
  
  // Check sample bank
  const sampleBank = await db.collection("quizzes").findOne({ _id: { $regex: /^bank_skill_/ } as any });
  console.log(`   Sample Training Drill: ${sampleBank?.title} | questions: ${sampleBank?.questionIds?.length} | slot: ${sampleBank?.learningPlacements?.[0]?.slot}`);

  // Check sample exam
  const sampleExam = await db.collection("quizzes").findOne({ _id: { $regex: /^exam_quant_mock_/ } as any });
  console.log(`   Sample Mock Exam: ${sampleExam?.title} | questions: ${sampleExam?.questionIds?.length} | slot: ${sampleExam?.learningPlacements?.[0]?.slot}`);

  await mongoose.disconnect();
}

verify().catch(console.error);
