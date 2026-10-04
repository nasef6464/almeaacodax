import mongoose from "mongoose";
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "../config/env.js";
import {
  VERBAL_PATH_ID,
  VERBAL_SUBJECT_ID,
  VERBAL_SUBSKILL_TO_MAIN,
  VERBAL_SUBSKILL_TO_SECTION,
  VERBAL_TAXONOMY,
  deploy as deployTaxonomy,
  validateVerbalTaxonomyV2,
} from "./deployVerbalTaxonomy22.js";

const idOf = (value: unknown) => String(value ?? "").trim();

const subskillFromQuestion = (question: any) => {
  const canonical = idOf(question?.subSkillId);
  if (canonical && VERBAL_SUBSKILL_TO_MAIN[canonical]) return canonical;
  return (Array.isArray(question?.skillIds) ? question.skillIds : [])
    .map(idOf)
    .find((id: string) => Boolean(VERBAL_SUBSKILL_TO_MAIN[id])) || "";
};

export async function migrateVerbalTaxonomy22() {
  validateVerbalTaxonomyV2();
  const ledgerPath = path.join(process.cwd(), "server", "data", "verbal26_source_ledger.json");
  const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : {};
  if (ledger?.migrationReady !== true) {
    throw new Error("Refusing migration: VERBAL26 canonical bank is not marked migrationReady.");
  }
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  let db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const questions = db.collection("questions");
  const verbalFilter = {
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
  };

  const beforeQuestions = await questions.countDocuments(verbalFilter);
  if (beforeQuestions === 0) {
    throw new Error(
      "Refusing migration: no verbal questions found. Restore the canonical verbal bank before taxonomy migration.",
    );
  }

  // PRE-WRITE SAFETY GATE: prove the complete 22/76 question mapping before deployTaxonomy()
  // can mutate sections/skills/topics. This intentionally runs before the first production write.
  const preflightQuestions = await questions.find(verbalFilter).toArray();
  const preflightUnmapped: string[] = [];
  const coveredMain = new Set<string>();
  const coveredSub = new Set<string>();
  for (const question of preflightQuestions) {
    const subSkillId = subskillFromQuestion(question);
    if (!subSkillId) {
      preflightUnmapped.push(idOf(question.id || question._id) || "(missing-id)");
      continue;
    }
    coveredSub.add(subSkillId);
    coveredMain.add(VERBAL_SUBSKILL_TO_MAIN[subSkillId]);
  }
  const expectedMain = VERBAL_TAXONOMY.map((main) => main.id);
  const expectedSub = Object.keys(VERBAL_SUBSKILL_TO_MAIN);
  const missingMain = expectedMain.filter((id) => !coveredMain.has(id));
  const missingSub = expectedSub.filter((id) => !coveredSub.has(id));
  if (preflightUnmapped.length || missingMain.length) {
    throw new Error(
      `Refusing migration before first write: unmapped=${preflightUnmapped.length}; ` +
      `main coverage=${coveredMain.size}/22 (missing: ${missingMain.join(", ") || "none"}); ` +
      `source-backed subskill coverage=${coveredSub.size}/76 (not a completeness gate; missing: ${missingSub.join(", ") || "none"}).`,
    );
  }

  // Taxonomy deployment changes taxonomy/topics only. Student result/mastery collections are never rewritten.
  await mongoose.disconnect();
  await deployTaxonomy();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  db = mongoose.connection.db;
  if (!db) throw new Error("Database reconnection failed");

  const qCol = db.collection("questions");
  const skillCol = db.collection("skills");
  const topicCol = db.collection("topics");

  const verbalQuestions = await qCol.find(verbalFilter).toArray();
  const unmapped: string[] = [];

  const mainQuestionIds = new Map<string, string[]>();
  const subQuestionIds = new Map<string, string[]>();
  for (const main of VERBAL_TAXONOMY) {
    mainQuestionIds.set(main.id, []);
    for (const sub of main.subSkills) subQuestionIds.set(sub.id, []);
  }

  const questionOps: any[] = [];
  for (const question of verbalQuestions) {
    const subSkillId = subskillFromQuestion(question);
    if (!subSkillId) {
      unmapped.push(idOf(question.id || question._id));
      continue;
    }

    const mainSkillId = VERBAL_SUBSKILL_TO_MAIN[subSkillId];
    const sectionId = VERBAL_SUBSKILL_TO_SECTION[subSkillId];
    const questionId = idOf(question.id || question._id);
    if (!questionId) {
      unmapped.push("(missing-id)");
      continue;
    }

    mainQuestionIds.get(mainSkillId)?.push(questionId);
    subQuestionIds.get(subSkillId)?.push(questionId);

    questionOps.push({
      updateOne: {
        filter: { _id: question._id },
        update: {
          $set: {
            pathId: VERBAL_PATH_ID,
            subject: VERBAL_SUBJECT_ID,
            subjectId: VERBAL_SUBJECT_ID,
            sectionId,
            skillId: mainSkillId,
            subSkillId,
            skillIds: [mainSkillId, subSkillId],
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  if (unmapped.length > 0) {
    throw new Error(
      `Refusing migration: ${unmapped.length} verbal questions have no recognized subskill. First IDs: ${unmapped.slice(0, 10).join(", ")}`,
    );
  }
  if (questionOps.length !== beforeQuestions) {
    throw new Error(`Refusing migration: question mapping count changed (${questionOps.length}/${beforeQuestions})`);
  }

  if (questionOps.length) await qCol.bulkWrite(questionOps, { ordered: true });

  for (const main of VERBAL_TAXONOMY) {
    await skillCol.updateOne(
      { id: main.id, subjectId: VERBAL_SUBJECT_ID },
      { $set: { questionIds: mainQuestionIds.get(main.id) || [], updatedAt: new Date() } },
    );
  }

  // Owner rule: VERBAL26 migration must never create or approve new training drills,
  // training banks, or mock exams. This migration only reconciles canonical
  // taxonomy/question links. Existing quizzes are left untouched.

  const afterQuestions = await qCol.countDocuments(verbalFilter);
  const mainSkills = await skillCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID });
  const parentTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: null });
  const childTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: { $ne: null } });
  const canonicalQuestions = await qCol.countDocuments({
    ...verbalFilter,
    skillId: { $in: VERBAL_TAXONOMY.map((main) => main.id) },
    subSkillId: { $in: Object.keys(VERBAL_SUBSKILL_TO_MAIN) },
  });
  const failures = [
    afterQuestions !== beforeQuestions && `question count changed ${beforeQuestions} -> ${afterQuestions}`,
    canonicalQuestions !== afterQuestions && `canonical question coverage is ${canonicalQuestions}/${afterQuestions}`,
    mainSkills !== 22 && `main skills = ${mainSkills}`,
    parentTopics !== 22 && `parent topics = ${parentTopics}`,
    childTopics !== 76 && `child topics = ${childTopics}`,
  ].filter(Boolean);

  if (failures.length) throw new Error(`V2 verification failed: ${failures.join("; ")}`);

  console.log(JSON.stringify({
    status: "PASS",
    questions: afterQuestions,
    canonicalQuestions,
    mainSkills,
    subSkills: Object.keys(VERBAL_SUBSKILL_TO_MAIN).length,
    parentTopics,
    childTopics,
    note: "No new drills/banks/mocks are created. Existing quizzes, QuizResult, and SkillProgress are intentionally untouched.",
  }, null, 2));

  await mongoose.disconnect();
}

migrateVerbalTaxonomy22().catch(async (error) => {
  console.error("Verbal taxonomy V2 migration failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
