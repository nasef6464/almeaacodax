import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

const tsxCommand = process.platform === "win32" ? "tsx.cmd" : "tsx";
const alphaManifest = "../customer-instances/examples/alpha-learning.json";

const withoutRuntimeSecrets = () => {
  const env = { ...process.env };
  for (const key of [
    "MONGODB_URI",
    "JWT_SECRET",
    "CUSTOMER_INSTANCE_WRITE_ACK",
    "CUSTOMER_INSTANCE_PRODUCTION_WRITE_ACK",
  ]) {
    delete env[key];
  }
  return env;
};

const runBootstrap = (args: string[]) =>
  spawnSync(
    tsxCommand,
    ["src/scripts/bootstrapCustomerInstance.ts", `--manifest=${alphaManifest}`, ...args],
    {
      cwd: process.cwd(),
      env: withoutRuntimeSecrets(),
      encoding: "utf8",
    },
  );

const dryRun = runBootstrap([]);
assert.equal(dryRun.status, 0, dryRun.stderr || "Customer bootstrap dry-run must succeed.");
assert.match(dryRun.stdout, /"mode":\s*"DRY_RUN"/);
assert.match(dryRun.stdout, /"writesPerformed":\s*false/);
assert.match(dryRun.stdout, /"customerKey":\s*"alpha-learning"/);
assert.match(dryRun.stdout, /"configDigest":\s*"sha256:[a-f0-9]{64}"/);
assert.equal(dryRun.stderr.includes("MONGODB_URI is required"), false);
assert.equal(dryRun.stderr.includes("JWT_SECRET"), false);

const missingConfirm = runBootstrap(["--apply"]);
assert.notEqual(missingConfirm.status, 0, "Apply without customer confirmation must fail.");
assert.match(`${missingConfirm.stdout}\n${missingConfirm.stderr}`, /Apply requires --confirm=alpha-learning/);
assert.equal(`${missingConfirm.stdout}\n${missingConfirm.stderr}`.includes("MONGODB_URI is required"), false);

const missingAck = runBootstrap(["--apply", "--confirm=alpha-learning"]);
assert.notEqual(missingAck.status, 0, "Apply without deployment acknowledgement must fail.");
assert.match(`${missingAck.stdout}\n${missingAck.stderr}`, /CUSTOMER_INSTANCE_WRITE_ACK=alpha-learning/);
assert.equal(`${missingAck.stdout}\n${missingAck.stderr}`.includes("MONGODB_URI is required"), false);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      dryRunWithoutRuntimeSecrets: true,
      writesPerformed: false,
      configFingerprintVerified: true,
      applyGuardsVerified: ["confirm", "CUSTOMER_INSTANCE_WRITE_ACK"],
    },
    null,
    2,
  ),
);
