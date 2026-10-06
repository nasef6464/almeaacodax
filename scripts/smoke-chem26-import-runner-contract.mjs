import fs from "node:fs";

const chem = fs.readFileSync("server/src/app/bootstrap/runChem26PackageImport.ts", "utf8");
const legacy = fs.readFileSync("server/src/app/bootstrap/runQuestionPilotPackageImport.ts", "utf8");
const bootstrap = fs.readFileSync("server/src/app/bootstrap/bootstrapServer.ts", "utf8");

const must = [
  'const CHEM26_MODE = "chem26-import";',
  'const DOCUMENT_CODE = "CHEM26";',
  'const CODE_PREFIX = "TAH-CHEM-CHEM26-";',
  'TAH-CHEM-CHEM26-FULL-V1',
  'expectedCount !== 1708',
  'CHEM26_IMPORT_MANIFEST_READY.json',
  'CHEM26-PDF',
  'sec_sub_chemistry_',
  'skill_tah_chem_',
  'sub_tah_chem_',
  'PILOT_ALLOW_EXTERNAL_RUN !== "YES"',
  'PILOT_WRITE_AUTHORIZATION !== "YES"',
  'dryRun: true',
  'Math.max(0, 5 - current.length)',
  'chunk(remaining, 100)',
  'verifyLiveImages',
  'allDraft',
  'linkedQuizCount',
  'approvalStatus: "approved"',
  'CHEM26_IMPORT_CLOSED_NOOP',
  'closedBatchCount !== expectedCount',
];
for (const fragment of must) {
  if (!chem.includes(fragment)) throw new Error(`missing CHEM26 importer contract: ${fragment}`);
}
if (!legacy.includes('const COL26OLD_MODE = "col26old-import";')) {
  throw new Error("COL26OLD importer must remain isolated and unchanged in purpose");
}
if (!bootstrap.includes('runChem26PackageImportIfRequested')) {
  throw new Error("CHEM26 importer is not wired into bootstrap");
}
console.log("CHEM26_IMPORT_RUNNER_CONTRACT_PASS");

const closedNoopIndex = chem.indexOf("CHEM26_IMPORT_CLOSED_NOOP");
const transportDecodeIndex = chem.indexOf('Buffer.from(transportEncoded, "base64url")');
if (closedNoopIndex < 0 || transportDecodeIndex < 0 || closedNoopIndex > transportDecodeIndex) {
  throw new Error("CHEM26 closed-batch no-op must execute before transport decoding");
}
