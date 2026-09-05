import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

const tsxCommand = process.platform === "win32" ? "tsx.cmd" : "tsx";
const alphaManifest = "../customer-instances/examples/alpha-learning.json";
const betaManifest = "../customer-instances/examples/beta-academy.json";

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

const runBootstrap = (manifest: string, args: string[] = []) =>
  spawnSync(
    tsxCommand,
    ["src/scripts/bootstrapCustomerInstance.ts", `--manifest=${manifest}`, ...args],
    {
      cwd: process.cwd(),
      env: withoutRuntimeSecrets(),
      encoding: "utf8",
    },
  );

const parseDryRun = (manifest: string, expectedCustomerKey: string) => {
  const result = runBootstrap(manifest);
  assert.equal(result.status, 0, result.stderr || `Customer bootstrap dry-run must succeed for ${expectedCustomerKey}.`);
  assert.equal(result.stderr.includes("MONGODB_URI is required"), false);
  assert.equal(result.stderr.includes("JWT_SECRET"), false);

  const payload = JSON.parse(result.stdout) as {
    mode: string;
    writesPerformed: boolean;
    configDigest: string;
    customerKey: string;
    productName: string;
    domain: string;
    settings: {
      homepageFields: number;
      fontFields: number;
      integrationFields: number;
    };
  };

  assert.equal(payload.mode, "DRY_RUN");
  assert.equal(payload.writesPerformed, false);
  assert.equal(payload.customerKey, expectedCustomerKey);
  assert.match(payload.configDigest, /^sha256:[a-f0-9]{64}$/);
  assert.ok(payload.settings.homepageFields > 0);
  assert.ok(payload.settings.fontFields > 0);
  assert.ok(payload.settings.integrationFields > 0);
  return payload;
};

const alpha = parseDryRun(alphaManifest, "alpha-learning");
const beta = parseDryRun(betaManifest, "beta-academy");

assert.equal(alpha.productName, "Alpha Learning");
assert.equal(beta.productName, "Beta Academy");
assert.equal(alpha.domain, "https://alpha.example.test");
assert.equal(beta.domain, "https://beta.example.test");
assert.notEqual(alpha.configDigest, beta.configDigest, "Distinct customer manifests must produce distinct fingerprints.");

const missingConfirm = runBootstrap(alphaManifest, ["--apply"]);
assert.notEqual(missingConfirm.status, 0, "Apply without customer confirmation must fail.");
assert.match(`${missingConfirm.stdout}\n${missingConfirm.stderr}`, /Apply requires --confirm=alpha-learning/);
assert.equal(`${missingConfirm.stdout}\n${missingConfirm.stderr}`.includes("MONGODB_URI is required"), false);

const missingAck = runBootstrap(alphaManifest, ["--apply", "--confirm=alpha-learning"]);
assert.notEqual(missingAck.status, 0, "Apply without deployment acknowledgement must fail.");
assert.match(`${missingAck.stdout}\n${missingAck.stderr}`, /CUSTOMER_INSTANCE_WRITE_ACK=alpha-learning/);
assert.equal(`${missingAck.stdout}\n${missingAck.stderr}`.includes("MONGODB_URI is required"), false);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      customerVariants: [
        { customerKey: alpha.customerKey, productName: alpha.productName, domain: alpha.domain, configDigest: alpha.configDigest },
        { customerKey: beta.customerKey, productName: beta.productName, domain: beta.domain, configDigest: beta.configDigest },
      ],
      dryRunWithoutRuntimeSecrets: true,
      writesPerformed: false,
      distinctFingerprints: true,
      applyGuardsVerified: ["confirm", "CUSTOMER_INSTANCE_WRITE_ACK"],
    },
    null,
    2,
  ),
);
