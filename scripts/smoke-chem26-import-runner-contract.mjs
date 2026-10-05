import fs from "node:fs";

const src = fs.readFileSync("server/src/app/bootstrap/runQuestionPilotPackageImport.ts", "utf8");
const must = [
  'mode: "chem26-import"',
  'project: "CHEM26"',
  'documentCode: "CHEM26"',
  'codePrefix: "TAH-CHEM-CHEM26-"',
  'sourceItemPrefix: "CHEM26-PDF"',
  'batchId: "TAH-CHEM-CHEM26-FULL-V1"',
  'expectedCount: 1708',
  'manifestName: "CHEM26_IMPORT_MANIFEST_READY.json"',
  'PILOT_ALLOW_EXTERNAL_RUN !== "YES"',
  'PILOT_WRITE_AUTHORIZATION !== "YES"',
  'dryRun: true',
  'Math.max(0, 5 - current.length)',
  'chunk(remaining, 100)',
];
for (const fragment of must) {
  if (!src.includes(fragment)) throw new Error(`missing CHEM26 importer contract: ${fragment}`);
}
if (!src.includes('mode: "col26old-import"')) throw new Error("COL26OLD importer regression");
console.log("CHEM26_IMPORT_RUNNER_CONTRACT_PASS");
