import fs from "node:fs";

const importer = fs.readFileSync("server/src/app/bootstrap/runBio26PackageImport.ts", "utf8");
const verifier = fs.readFileSync("server/src/scripts/verifyBio26PostImport.ts", "utf8");
const bootstrap = fs.readFileSync("server/src/app/bootstrap/bootstrapServer.ts", "utf8");
const taxonomyDeploy = fs.readFileSync("server/src/scripts/deployBio26Taxonomy.ts", "utf8");
const taxonomy = JSON.parse(fs.readFileSync("ops/bio26/BIO26_TAXONOMY_PRODUCTION.json", "utf8"));

const must = [
  'const MODE_PREFIX = "bio26-import";',
  'const BATCH_ID = "TAH-BIO-BIO26-FULL-V1";',
  'const EXPECTED_COUNT = 2832;',
  'const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";',
  'BIO26_IMPORT_MODE',
  'BIO26_IMPORT_ALLOW_EXTERNAL_RUN',
  'BIO26_IMPORT_WRITE_AUTHORIZATION',
  'BIO26_IMPORT_EXPECTED_COUNT',
  'BIO26_IMPORT_BATCH_ID',
  'const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";',
  'BIO26_IMPORT_MANIFEST_READY.json',
  '"r2", "dry-run", "canary", "full", "verify"',
  'PILOT_WRITE_AUTHORIZATION !== "YES"',
  'BIO26 machine-readable optionTexts missing',
  'BIO26 machine-readable optionTexts are placeholder labels',
  'BIO26_R2_VERIFIED_PASS',
  'BIO26_DRY_RUN_PASS',
  'BIO26_CANARY_PASS count=5 drafts=5',
  'BIO26_IMPORT_DRAFT_PASS',
];
for (const fragment of must) if (!importer.includes(fragment)) throw new Error(`missing BIO26 importer contract: ${fragment}`);
if (importer.includes("PLACEHOLDER_OPTION_LABELS")) throw new Error("BIO26 importer must not reject legitimate source option values by label alone");
if (!verifier.includes("optionTextsSource") || !verifier.includes("optionTextsVerified")) throw new Error("BIO26 post-import verifier does not enforce option-text provenance");
if (!importer.includes("insertedThisRun=") || !importer.includes("canary contains unexpected resume state")) throw new Error("BIO26 canary is not restart-safe");
if (!verifier.includes("BIO26_POST_IMPORT_DRAFT_GATE_PASS")) throw new Error("BIO26 post-import verifier missing");
if (!verifier.includes("BIO26_POST_APPROVAL_GATE_PASS")) throw new Error("BIO26 approval verifier missing");
if (!bootstrap.includes("runBio26PackageImportIfRequested")) throw new Error("BIO26 importer is not wired into bootstrap");
console.log("BIO26_IMPORT_RUNNER_CONTRACT_PASS");

const frozenSubs = taxonomy.items.flatMap((main) => main.subSkills || []);
for (const sub of frozenSubs) {
  const match = String(sub.sourceSubSkillId || "").match(/^BIO26-S(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`invalid BIO26 source subskill id: ${sub.sourceSubSkillId}`);
  const expectedId = `sub_tah_bio_${match[1]}_${match[2]}`;
  if (sub.id !== expectedId || sub.code !== sub.sourceSubSkillId) {
    throw new Error(`BIO26 frozen subskill identity drift: ${sub.sourceSubSkillId} -> ${sub.id}/${sub.code}`);
  }
}
if (!taxonomyDeploy.includes("BIO26 subskill identity drift")) throw new Error("BIO26 taxonomy deploy lacks exact frozen-id guard");
