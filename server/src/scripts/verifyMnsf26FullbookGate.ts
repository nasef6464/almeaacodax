// MNSF26 full-book verifier (current canonical bank, not Run022/legacy 130).
// This stage runs offline and MUST fail closed until independent QA,
// cross-bank dedupe and R2 remote SHA certification are complete.
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(process.cwd(), "..");
const verifier = path.join(repoRoot, "scripts/verifyMnsf26CurrentFullbookGate.mjs");
const child = spawnSync(process.execPath, [verifier], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});
if (child.error) {
  console.error("MNSF26_CURRENT_FULLBOOK_GATE_ERROR", child.error.message);
  process.exitCode = 1;
} else if (child.status !== 0) {
  process.exitCode = 1;
}
