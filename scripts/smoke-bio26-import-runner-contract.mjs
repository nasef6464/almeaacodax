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
console.log("BIO26_IMPORT_RUNNER_CONTRACT_PASS");
