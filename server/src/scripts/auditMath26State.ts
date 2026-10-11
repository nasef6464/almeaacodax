import dotenv from "dotenv";
dotenv.config({ path: ".env.codex.local" });
dotenv.config({ path: "../.env.codex.local" });
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1777784609152";

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) throw new Error("No MONGODB_URI");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB handle");

  const questionsCol = db.collection("questions");
  const skillsCol = db.collection("skills");
  const topicsCol = db.collection("topics");
  const quizzesCol = db.collection("quizzes");
  const subjectsCol = db.collection("subjects");

  const subj = await subjectsCol.findOne({ _id: SUBJECT_ID as any });
  console.log("Subject:", subj?.name, subj?._id, "pathId:", subj?.pathId);

  // 1. Questions count
  const allMathQs = await questionsCol.find({
    $or: [{ subjectId: SUBJECT_ID }, { subject: SUBJECT_ID }]
  }).toArray();
  console.log(`\nTotal Math questions in DB: ${allMathQs.length}`);

  let ylmCount = 0;
  let colCount = 0;
  let colOldCount = 0;
  let otherCount = 0;

  const approvalCounts: Record<string, number> = {};
  const bankBySkill: Record<string, { ylm: number; col: number; colOld: number; other: number }> = {};
  const bankBySubskill: Record<string, { ylm: number; col: number; colOld: number; other: number }> = {};

  for (const q of allMathQs) {
    const code = String(q.questionCode || "");
    const status = String(q.approvalStatus || "unknown");
    approvalCounts[status] = (approvalCounts[status] || 0) + 1;

    let bank = "other";
    if (code.startsWith("TAH-MATH-YLM26-")) {
      ylmCount++;
      bank = "ylm";
    } else if (code.startsWith("TAH-MATH-COL26OLD-")) {
      colOldCount++;
      bank = "colOld";
    } else if (code.startsWith("TAH-MATH-COL26-")) {
      colCount++;
      bank = "col";
    } else {
      otherCount++;
    }

    const sId = String(q.skillId || "unassigned");
    const subId = String(q.subSkillId || "unassigned");

    if (!bankBySkill[sId]) bankBySkill[sId] = { ylm: 0, col: 0, colOld: 0, other: 0 };
    (bankBySkill[sId] as any)[bank]++;

    if (!bankBySubskill[subId]) bankBySubskill[subId] = { ylm: 0, col: 0, colOld: 0, other: 0 };
    (bankBySubskill[subId] as any)[bank]++;
  }

  console.log(`- Bank 1 (YLM26): ${ylmCount}`);
  console.log(`- Bank 2 (COL26): ${colCount}`);
  console.log(`- Bank 3 (COL26OLD): ${colOldCount}`);
  console.log(`- Other: ${otherCount}`);
  console.log(`- Sum (B1 + B2): ${ylmCount + colCount}`);
  console.log("Approval Statuses:", approvalCounts);

  // 2. Existing Skills & Topics & Quizzes
  const existingSkills = await skillsCol.find({ subjectId: SUBJECT_ID }).toArray();
  const existingTopics = await topicsCol.find({ subjectId: SUBJECT_ID }).toArray();
  const existingQuizzes = await quizzesCol.find({ subjectId: SUBJECT_ID }).toArray();

  console.log(`\nExisting in DB:`);
  console.log(`- Skills: ${existingSkills.length}`);
  const totalSubInSkills = existingSkills.reduce((acc, s) => acc + (s.subSkills?.length || 0), 0);
  console.log(`- Subskills in skills: ${totalSubInSkills}`);
  console.log(`- Topics: ${existingTopics.length} (Parents: ${existingTopics.filter(t => !t.parentId).length}, Children: ${existingTopics.filter(t => t.parentId).length})`);
  const parents = existingTopics.filter(t => !t.parentId);
  for (const p of parents) {
    console.log(`  Parent Topic: ${p.id || p._id} | order: ${p.order} | title: ${p.title} | quizIds: ${(p.quizIds || []).length}`);
  }
  const children = existingTopics.filter(t => t.parentId);
  console.log(`  Sample Child Topic: ${children[0]?.id || children[0]?._id} | parentId: ${children[0]?.parentId} | quizIds: ${(children[0]?.quizIds || []).length}`);
  console.log(`- Quizzes: ${existingQuizzes.length}`);

  const quizzesBySlot: Record<string, number> = {};
  for (const qz of existingQuizzes) {
    const slots = (qz.learningPlacements || []).map((p: any) => p.slot).join(",") || "no_placement";
    quizzesBySlot[slots] = (quizzesBySlot[slots] || 0) + 1;
    console.log(`  Existing Quiz: ${qz.id || qz._id} | title: ${qz.title} | slot: ${slots} | qs: ${qz.questionIds?.length}`);
  }
  console.log("Quizzes by slot:", quizzesBySlot);

  // 3. Taxonomy file check
  const taxCandidates = [
    path.resolve(process.cwd(), "tahsili_math_taxonomy.json"),
    path.resolve(process.cwd(), "../tahsili_math_taxonomy.json"),
  ];
  const taxPath = taxCandidates.find(p => fs.existsSync(p));
  if (!taxPath) throw new Error("Taxonomy file not found");
  const tax = JSON.parse(fs.readFileSync(taxPath, "utf8"));
  console.log(`\nTaxonomy File (${taxPath}):`);
  console.log(`- Sections: ${tax.sections?.length}`);
  console.log(`- Skills: ${tax.skills?.length}`);
  const taxSubCount = tax.skills.reduce((acc: number, s: any) => acc + (s.subSkills?.length || 0), 0);
  console.log(`- Subskills in taxonomy: ${taxSubCount}`);

  // Check subskill coverage in Bank 1 + Bank 2
  let zeroSubskillsB1B2 = 0;
  let subWithLessThan10 = 0;
  console.log("\n--- Subskills Detailed Distribution in Banks 1 + 2 ---");
  for (const s of tax.skills) {
    console.log(`\nSkill [${s.order}] ${s.id} - ${s.name}:`);
    let mainTotalB1B2 = 0;
    for (const sub of s.subSkills) {
      const stats = bankBySubskill[sub.id] || { ylm: 0, col: 0, colOld: 0, other: 0 };
      const totalB1B2 = stats.ylm + stats.col;
      mainTotalB1B2 += totalB1B2;
      if (totalB1B2 === 0) {
        zeroSubskillsB1B2++;
        console.log(`  [0 Qs!] ${sub.id} (${sub.name}) | YLM: ${stats.ylm}, COL: ${stats.col}, OLD: ${stats.colOld}`);
      } else {
        if (totalB1B2 < 10) subWithLessThan10++;
        console.log(`  [${totalB1B2} Qs] ${sub.id} (${sub.name}) | YLM: ${stats.ylm}, COL: ${stats.col}, OLD: ${stats.colOld}`);
      }
    }
    console.log(`  >> Total for Skill ${s.id} in B1+B2: ${mainTotalB1B2} Qs`);
  }
  console.log(`\nSubskills with 0 questions in B1+B2: ${zeroSubskillsB1B2} / ${taxSubCount}`);
  console.log(`Subskills with < 10 questions in B1+B2: ${subWithLessThan10} / ${taxSubCount}`);

  // Bank 3 stats
  console.log("\n--- Bank 3 (COL26OLD) Details ---");
  console.log(`Total questions in Bank 3: ${colOldCount}`);
  const colOldWithSkills = allMathQs.filter(q => String(q.questionCode || "").startsWith("TAH-MATH-COL26OLD-") && q.skillId);
  console.log(`Bank 3 questions with skillId: ${colOldWithSkills.length} / ${colOldCount}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
