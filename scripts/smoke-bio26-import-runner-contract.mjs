import fs from "node:fs";

const importer = fs.readFileSync("server/src/app/bootstrap/runBio26PackageImport.ts", "utf8");
const verifier = fs.readFileSync("server/src/scripts/verifyBio26PostImport.ts", "utf8");
const bootstrap = fs.readFileSync("server/src/app/bootstrap/bootstrapServer.ts", "utf8");
const questionModel = fs.readFileSync("server/src/models/Question.ts", "utf8");
const questionSchemas = fs.readFileSync("server/src/modules/quizzes/http/questionQuerySchemas.ts", "utf8");
const finalClosure = fs.readFileSync("server/src/scripts/runBio26FinalClosure.ts", "utf8");

const must = [
  'const MODE_PREFIX = "bio26-import";',
  'const BATCH_ID = "TAH-BIO-BIO26-FULL-V1";',
  'const EXPECTED_COUNT = 2832;',
  'const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";',
  'const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";',
  'BIO26_IMPORT_MANIFEST_READY.json',
  '"r2", "dry-run", "canary", "full", "verify"',
  'PILOT_WRITE_AUTHORIZATION !== "YES"',
  'BIO26 machine-readable optionTexts missing',
  'BIO26_R2_VERIFIED_PASS',
  'BIO26_DRY_RUN_PASS',
  'BIO26_CANARY_PASS count=5 drafts=5',
  'BIO26_IMPORT_DRAFT_PASS',
];
for (const fragment of must) if (!importer.includes(fragment)) throw new Error(`missing BIO26 importer contract: ${fragment}`);
if (!importer.includes("process.env.BIO26_IMPORT_PHASE")) throw new Error("BIO26 importer must support a dedicated plain phase");
if (!importer.includes("process.env.BIO26_PACKAGE_URL") || !importer.includes("process.env.BIO26_PACKAGE_SHA256")) throw new Error("BIO26 importer must support dedicated package transport vars");
if (!importer.includes("process.env.BIO26_IMPORT_MODE || process.env.QUESTION_PILOT_MODE")) throw new Error("BIO26 importer must retain envelope compatibility");
if (!importer.includes("process.env.BIO26_IMPORT_BATCH_ID || process.env.QUESTION_PILOT_BATCH_ID")) throw new Error("BIO26 importer must prefer a dedicated batch id");
if (!importer.includes("process.env.BIO26_IMPORT_EXPECTED_COUNT || process.env.QUESTION_PILOT_EXPECTED_COUNT")) throw new Error("BIO26 importer must prefer a dedicated expected count");
if (!verifier.includes("optionTextsSource") || !verifier.includes("optionTextsVerified")) throw new Error("BIO26 post-import verifier does not enforce option-text provenance");
if (!questionModel.includes("optionTextsSource") || !questionModel.includes("optionTextsVerified")) throw new Error("Question model drops BIO26 option-text provenance");
if (!questionSchemas.includes("optionTextsSource") || !questionSchemas.includes("optionTextsVerified")) throw new Error("Question validation schema drops BIO26 option-text provenance");
if (!importer.includes("insertedThisRun=") || !importer.includes("canary contains unexpected resume state")) throw new Error("BIO26 canary is not restart-safe");
if (!verifier.includes("BIO26_POST_IMPORT_DRAFT_GATE_PASS")) throw new Error("BIO26 post-import verifier missing");
if (!verifier.includes("BIO26_POST_APPROVAL_GATE_PASS")) throw new Error("BIO26 approval verifier missing");
if (!importer.includes("r.status !== 429") || !importer.includes("attempt <= 6") || !importer.includes("pool(verified, 4, verifyRemote)")) throw new Error("BIO26 R2 verification must retry/throttle transient rate limits");
if (!finalClosure.includes('BIO26_FINAL_CLOSURE_AUTHORIZATION') || !finalClosure.includes('BIO26_APPROVE_2832')) throw new Error("BIO26 final closure lacks dedicated explicit authorization");
if (!finalClosure.includes("withTransaction") || !finalClosure.includes("BIO26_APPROVAL_ROLLBACK_PASS")) throw new Error("BIO26 final approval must be transactional and rollback-safe");
for (const marker of ["BIO26_POST_IMPORT_DRAFT_GATE_PASS", "BIO26_LIVE_E2E_DRAFT_PASS", "BIO26_APPROVAL_WRITE_PASS", "BIO26_LIVE_E2E_APPROVED_PASS", "BIO26_POST_APPROVAL_GATE_PASS"]) {
  if (!finalClosure.includes(marker)) throw new Error(`BIO26 final closure marker missing: ${marker}`);
}
if (!finalClosure.includes("learner answer/provenance leak") || !finalClosure.includes("publicQuestionLookup")) throw new Error("BIO26 final closure must prove learner-safe API visibility");
if (!finalClosure.includes("verifyLiveImages")) throw new Error("BIO26 final closure must re-verify live R2 images");
if (!bootstrap.includes("runBio26PackageImportIfRequested")) throw new Error("BIO26 importer is not wired into bootstrap");
if (!bootstrap.includes("runBio26FinalClosureIfRequested")) throw new Error("BIO26 final closure is not wired into bootstrap");
const learningPlan = await import("../server/dist/app/bootstrap/bio26LearningStructurePlan.js");
const standardPlan = await import("../server/dist/app/bootstrap/bio26StandardTestsPlan.js");

if (learningPlan.BATCH_ID !== "TAH-BIO-BIO26-FULL-V1") {
  throw new Error(`BIO26 learning structure batch drift: ${learningPlan.BATCH_ID}`);
}
if (standardPlan.BATCH_ID !== "TAH-BIO-BIO26-FULL-V1") {
  throw new Error(`BIO26 standard tests batch drift: ${standardPlan.BATCH_ID}`);
}

const sourceDistribution = {
  "01":[7,18,29,5],"02":[7,22,18],"03":[22,3,11,14],"04":[9,30,22],"05":[47,35,12],
  "06":[29,17,13],"07":[34,9,31],"08":[33,34,23],"09":[68,11,57],"10":[60,76,109,71],
  "11":[20,20],"12":[14,9,9],"13":[13,22,51],"14":[58,38],"15":[7,16,21,38],
  "16":[17,68,17,26],"17":[58,49,24,77],"18":[11,32,11,12],"19":[24,7,10],"20":[30,50,21,6],
  "21":[13,19,7],"22":[34,15,42],"23":[18,57,12,38],"24":[16,13,5,19],"25":[21,27,9,68],
  "26":[32,14,29,27],"27":[61,22,40,29],"28":[62,53,78],"29":[34,32,14],
};

const synthetic = [];
let ordinal = 1;
for (const [mainSuffix, subCounts] of Object.entries(sourceDistribution)) {
  const groups = subCounts.map((count, subIndex) =>
    Array.from({ length: count }, (_, itemIndex) => ({
      id: `bio26-contract-${mainSuffix}-${String(subIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(3, "0")}`,
      questionCode: `TAH-BIO-BIO26-L${mainSuffix}-Q${String(ordinal++).padStart(4, "0")}`,
      skillId: `skill_tah_bio_${mainSuffix}`,
      subSkillId: `sub_tah_bio_${mainSuffix}_${String(subIndex + 1).padStart(2, "0")}`,
    }))
  );
  const offsets = groups.map(() => 0);
  while (true) {
    let added = false;
    for (let index = 0; index < groups.length; index += 1) {
      const item = groups[index][offsets[index]];
      if (!item) continue;
      synthetic.push(item);
      offsets[index] += 1;
      added = true;
    }
    if (!added) break;
  }
}

if (synthetic.length !== 2832) throw new Error(`BIO26 synthetic runtime contract count drift: ${synthetic.length}`);
const built = standardPlan.buildBio26StandardTests(synthetic);
if (built.tests.length !== 71 || built.usedQuestionCount !== 2832 || built.reserveQuestionCount !== 0) {
  throw new Error("BIO26 standard-test runtime plan count contract failed");
}
const used = built.tests.flatMap((test) => test.questionIds);
if (used.length !== 2832 || new Set(used).size !== 2832) {
  throw new Error("BIO26 standard-test runtime plan must consume all 2832 questions exactly once");
}
for (const [index, test] of built.tests.entries()) {
  const expectedSize = index < 63 ? 40 : 39;
  if (test.questionIds.length !== expectedSize) {
    throw new Error(`BIO26 standard-test runtime size mismatch test=${index + 1}`);
  }
  if (test.skillIds.length < 20) {
    throw new Error(`BIO26 standard-test runtime main-skill diversity too low test=${index + 1}`);
  }
}
for (let trancheIndex = 0; trancheIndex < 14; trancheIndex += 1) {
  const tranche = built.tests.slice(trancheIndex * 5, trancheIndex * 5 + 5);
  const covered = new Set(tranche.flatMap((test) => test.skillIds));
  if (covered.size !== 29) {
    throw new Error(`BIO26 standard-test runtime tranche coverage failed tranche=${trancheIndex + 1} skills=${covered.size}`);
  }
}

console.log("BIO26_IMPORT_RUNNER_CONTRACT_PASS");
