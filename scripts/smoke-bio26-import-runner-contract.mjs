import fs from "node:fs";

const importer = fs.readFileSync("server/src/app/bootstrap/runBio26PackageImport.ts", "utf8");
const verifier = fs.readFileSync("server/src/scripts/verifyBio26PostImport.ts", "utf8");
const bootstrap = fs.readFileSync("server/src/app/bootstrap/bootstrapServer.ts", "utf8");

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
if (!verifier.includes("BIO26_POST_IMPORT_DRAFT_GATE_PASS")) throw new Error("BIO26 post-import verifier missing");
if (!verifier.includes("BIO26_POST_APPROVAL_GATE_PASS")) throw new Error("BIO26 approval verifier missing");
if (!bootstrap.includes("runBio26PackageImportIfRequested")) throw new Error("BIO26 importer is not wired into bootstrap");
console.log("BIO26_IMPORT_RUNNER_CONTRACT_PASS");
