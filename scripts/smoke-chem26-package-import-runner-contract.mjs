import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importer = await readFile(
  new URL("../server/src/app/bootstrap/runChem26PackageImport.ts", import.meta.url),
  "utf8",
);
const bootstrap = await readFile(
  new URL("../server/src/app/bootstrap/bootstrapServer.ts", import.meta.url),
  "utf8",
);
const support = await readFile(
  new URL("../server/src/app/bootstrap/questionPilotPackageImportSupport.ts", import.meta.url),
  "utf8",
);

for (const token of [
  'const CHEM26_MODE = "chem26-import"',
  'const DOCUMENT_CODE = "CHEM26"',
  'const CODE_PREFIX = "TAH-CHEM-CHEM26-"',
  'const BATCH_ID = "TAH-CHEM-CHEM26-S1S2-V1"',
  'const EXPECTED_COUNT = 1708',
  'CHEM26_DRY_RUN_PASS',
  'CHEM26_CANARY_PASS',
  'CHEM26_IMPORT_PASS',
  'sourceCoverage || 1709',
  'sec_sub_chemistry_',
  'skill_tah_chem_',
  'sub_tah_chem_',
  'oaiusercontent.com',
]) {
  assert.ok(importer.includes(token), `missing CHEM26 import invariant: ${token}`);
}

assert.ok(
  importer.indexOf('dryRun: true') < importer.indexOf('dryRun: false'),
  "CHEM26 must perform full dry-run before writes",
);
assert.ok(importer.includes('Math.max(0, 5 - current.length)'), "CHEM26 canary must target 5 records");
assert.ok(importer.includes('chunk(remaining, 100)'), "CHEM26 full import must use <=100-record chunks");
assert.ok(importer.includes('verifyLiveImages(finalBatch.questions || [])'), "CHEM26 must verify live R2 hashes");
assert.ok(
  bootstrap.includes('runChem26PackageImportIfRequested'),
  "bootstrap must invoke CHEM26 import runner",
);
assert.ok(
  support.includes('controlled question import'),
  "shared env helper must not be COL26OLD-specific",
);

console.log("CHEM26_PACKAGE_IMPORT_RUNNER_CONTRACT_PASS");
