/**
 * Read-only, source-aware Einstein quantitative skill audit.
 *
 * Usage (isolated environment with DB access):
 *   cd server && npx tsx src/scripts/auditEinsteinTaxonomySource.ts [output.json]
 *
 * NEVER writes to MongoDB, changes quizzes, or treats a source chapter as the
 * canonical subskill by itself. Explicitly blocks "fix by page location".
 */
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const PATH_ID = "p_1777779639431";
const SUBJECT_ID = "sub_1777779748206";
const manifestPaths = [
  "source_first_chapter_crosswalk_20261012.json",
  "source_second_chapter_crosswalk_20261012.json",
  "source_third_chapter_fractions_crosswalk_20261012.json",
].map((name) => path.resolve(process.cwd(), "../ops/einstein-taxonomy", name));
const sourceBanks = ["FND26", "COL2627"] as const;
const chapterBands: Record<string, Array<[number, number, number]>> = {
  FND26: [[5,9,1],[10,14,2],[15,22,3],[23,27,4],[28,37,5],[38,46,6],[47,53,7],[54,60,8],[61,64,9],[65,69,10],[70,75,11],[76,80,12],[81,85,13],[94,98,17],[99,102,18],[103,106,19],[107,118,20],[119,122,21],[123,126,22],[127,130,23],[131,141,24],[142,145,25]],
  COL2627: [[5,6,1],[7,8,2],[9,16,3],[17,19,4],[20,23,5],[24,30,6],[31,35,7],[36,38,8],[39,41,9],[42,43,10],[44,46,11],[48,50,12],[51,52,13],[57,58,17],[59,60,18],[61,66,19],[67,73,20],[74,75,21],[76,77,22],[78,79,23],[80,83,24],[84,84,25]],
};

const str = (s: unknown) => String(s ?? "").trim();
const pageFromCode = (code: string) => Number(/-P(\d+)-Q\d+$/.exec(code)?.[1] || 0);

async function main() {
  const reportPath = path.resolve(process.argv[2] || path.join("/tmp", "einstein-taxonomy-source-audit.json"));
  const manifests = await Promise.all(manifestPaths.map(async (file) => JSON.parse(await fs.readFile(file, "utf8"))));
  const requiredCodes = new Map<string, any>(manifests.flatMap((m) => m.questions as any[]).map((q) => [q.questionCode, q]));
  if (requiredCodes.size !== manifests.reduce((n, m) => n + m.questions.length, 0)) throw new Error("Duplicate questionCode across source manifests");
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("Missing database handle");
  try {
    const taxonomy = await db.collection("skills").find({ pathId: PATH_ID, subjectId: SUBJECT_ID })
      .project({ _id: 0, id: 1, name: 1, subSkills: 1 }).toArray();
    const subs = new Map<string, string>();
    for (const s of taxonomy as any[]) for (const x of s.subSkills || []) subs.set(str(x.id), str(s.id));
    const questions = await db.collection("questions").find({
      pathId: PATH_ID, "sourceMeta.documentCode": { $in: sourceBanks },
    }).project({
      _id: 0, questionCode: 1, skillId: 1, subSkillId: 1, skillIds: 1,
      imageUrl: 1, correctOptionIndex: 1, approvalStatus: 1,
      "sourceMeta.documentCode": 1, "sourceMeta.printedPageNumber": 1,
    }).sort({ questionCode: 1 }).toArray();

    const byCode = new Map(questions.map((q: any) => [str(q.questionCode), q]));
    const issues: any[] = [];
    const chapterCrossovers: any[] = [];
    const bankCounts: Record<string, number> = { FND26: 0, COL2627: 0 };
    for (const q of questions as any[]) {
      const code = str(q.questionCode), bank = str(q.sourceMeta?.documentCode);
      bankCounts[bank] = (bankCounts[bank] || 0) + 1;
      const sub = str(q.subSkillId);
      const expectedMain = subs.get(sub);
      const skills = q.skillIds || [];
      if (!expectedMain || expectedMain !== str(q.skillId) ||
          !Array.isArray(skills) || !skills.includes(expectedMain) || !skills.includes(sub)) {
        issues.push({code, type: "STRUCTURAL_TAXONOMY_MISMATCH", skillId: q.skillId, subSkillId: sub, skillIds: skills});
      }
      if (!str(q.imageUrl) || !str(q.imageUrl).includes(code)) {
        issues.push({code, type: "IMAGE_IDENTITY_CHECK_REQUIRED"});
      }
      if (!(Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3)) {
        issues.push({code, type: "INVALID_ANSWER_INDEX"});
      }
      const pg = pageFromCode(code);
      const bookBand = chapterBands[bank]?.find(([start,end]) => pg >= start && pg <= end);
      if (bookBand && expectedMain !== `skill_quant_${String(bookBand[2]).padStart(2,"0")}`) {
        chapterCrossovers.push({code, page:pg, mappedSubskill:sub, bookChapterMain:bookBand[2],
          note:"Review SOURCE QUESTION CONCEPT visually before any move. Many are correct cross-topic exceptions."});
      }
    }
    const sourceMappedQuestions: any[] = [];
    for (const [code, expected] of requiredCodes) {
      const live: any = byCode.get(code);
      const targetSubskill = expected.proposedSubskillId || expected.recommendedSubskillId;
      if (!targetSubskill) throw new Error(`Manifest row missing target subskill: ${code}`);
      sourceMappedQuestions.push({
        code, sourceRule: expected.sourceRule || expected.bookConcept || expected.bookRule,
        state: !live ? "CODE_MISSING" : live.subSkillId !== targetSubskill ? "LIVE_MAPPING_CHANGED"
            : (expected.auditState === "PEDAGOGY_REVIEW" || ["PEDAGOGY_REVIEW", "SOURCE_TRANSITION_VISUAL_CHECK"].includes(expected.status)) ? "REVIEW_REQUIRED" : "SOURCE_RULE_ALIGNED_PENDING_INDIVIDUAL_IMAGE_CHECK",
        expectedSubskill: targetSubskill,
        currentSubskill: live?.subSkillId ?? null,
      });
    }
    const missingSourceCandidates = manifests.flatMap((m) => m.missingSourceCandidates || []).map((x: any) => ({
      expectedCode:x.expectedQuestionCode, existsInLive:byCode.has(x.expectedQuestionCode),
      state:"VERIFY_SOURCE_QUESTION_OCCURRENCE_AND_LEGACY_ALIAS_BEFORE_IMPORT",
    }));
    const summary = {
      checkedAt:new Date().toISOString(), readonly:true, total:questions.length,
      banks:bankCounts, canonicalMain:taxonomy.length, canonicalSubskills:subs.size,
      sourceMappedQuestionRows:sourceMappedQuestions.length,
      flaggedCrossChapter:chapterCrossovers.length, structuralIssues:issues.length,
      note:"Chapter crossovers are TRIAGE ONLY: never auto-remap by chapter/page proximity.",
    };
    await fs.mkdir(path.dirname(reportPath), { recursive:true });
    await fs.writeFile(reportPath, JSON.stringify({
      summary, issues, chapterCrossovers, sourceMappedQuestions, missingSourceCandidates,
    }, null, 2) + "\n");
    console.log(JSON.stringify({summary,output:reportPath},null,2));
    if (issues.length || subs.size !== 95 || taxonomy.length !== 25) process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
