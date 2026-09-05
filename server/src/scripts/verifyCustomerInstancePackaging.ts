import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const tsxCommand = process.platform === "win32" ? "tsx.cmd" : "tsx";
const manifests = [
  { path: "../customer-instances/examples/alpha-learning.json", customerKey: "alpha-learning", productName: "Alpha Learning" },
  { path: "../customer-instances/examples/beta-academy.json", customerKey: "beta-academy", productName: "Beta Academy" },
] as const;

const withoutRuntimeSecrets = () => {
  const env = { ...process.env };
  for (const key of ["MONGODB_URI", "JWT_SECRET", "CUSTOMER_INSTANCE_WRITE_ACK", "CUSTOMER_INSTANCE_PRODUCTION_WRITE_ACK"]) {
    delete env[key];
  }
  return env;
};

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "almeaa-customer-packages-"));

try {
  const packages = [] as Array<Record<string, unknown>>;

  for (const manifest of manifests) {
    const result = spawnSync(
      tsxCommand,
      ["src/scripts/packageCustomerInstance.ts", `--manifest=${manifest.path}`, `--out=${tempRoot}`],
      { cwd: process.cwd(), env: withoutRuntimeSecrets(), encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || `Packaging must succeed for ${manifest.customerKey}.`);
    assert.equal(`${result.stdout}\n${result.stderr}`.includes("MONGODB_URI is required"), false);
    assert.equal(`${result.stdout}\n${result.stderr}`.includes("JWT_SECRET"), false);

    const output = JSON.parse(result.stdout) as { status: string; writesPerformed: boolean; customerKey: string; configDigest: string; packagePath: string };
    assert.equal(output.status, "PACKAGED");
    assert.equal(output.writesPerformed, false);
    assert.equal(output.customerKey, manifest.customerKey);
    assert.match(output.configDigest, /^sha256:[a-f0-9]{64}$/);

    const deploymentPackage = JSON.parse(await readFile(output.packagePath, "utf8")) as Record<string, unknown>;
    assert.equal(deploymentPackage.customerKey, manifest.customerKey);
    assert.equal(deploymentPackage.productName, manifest.productName);
    assert.equal(deploymentPackage.deploymentModel, "single-customer-single-deployment");

    const serialized = JSON.stringify(deploymentPackage);
    for (const forbidden of ["clientSecret", "appSecret", "apiKey", "accessToken", "botToken", "webhookSecret"]) {
      assert.equal(serialized.includes(`\"${forbidden}\"`), false, `Package must not include ${forbidden}.`);
    }

    packages.push(deploymentPackage);
  }

  assert.notEqual(packages[0]?.configDigest, packages[1]?.configDigest, "Two customer packages must have distinct config fingerprints.");
  assert.notDeepEqual(packages[0]?.settingsSetPlan, packages[1]?.settingsSetPlan, "Two customer packages must carry distinct settings plans.");

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        packageCount: packages.length,
        customers: packages.map((item) => ({ customerKey: item.customerKey, productName: item.productName, configDigest: item.configDigest })),
        runtimeSecretsRequiredForPackaging: false,
        writesPerformed: false,
        distinctPackages: true,
        secretFieldsAbsent: true,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
