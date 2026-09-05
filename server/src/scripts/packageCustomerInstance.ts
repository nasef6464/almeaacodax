import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fingerprintCustomerInstancePlan } from "../modules/product-config/application/customerInstanceFingerprint.js";
import {
  assertCustomerInstanceManifestHasNoSecrets,
  compileCustomerInstanceManifest,
} from "../modules/product-config/application/customerInstanceManifest.js";
import { buildCustomerInstanceSettingsSetPlan } from "../modules/product-config/application/customerInstanceSettingsPlan.js";

const manifestArgument = process.argv.find((argument) => argument.startsWith("--manifest="));
if (!manifestArgument) {
  throw new Error("Usage: npm run package:customer-instance -- --manifest=<path-to-json> [--out=<directory>]");
}

const outArgument = process.argv.find((argument) => argument.startsWith("--out="));
const manifestPath = path.resolve(process.cwd(), manifestArgument.slice("--manifest=".length));
const rawManifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
assertCustomerInstanceManifestHasNoSecrets(rawManifest);

const customerPlan = compileCustomerInstanceManifest(rawManifest);
const settingsSetPlan = buildCustomerInstanceSettingsSetPlan(customerPlan);
const configDigest = fingerprintCustomerInstancePlan(customerPlan);
const outputRoot = path.resolve(
  process.cwd(),
  outArgument?.slice("--out=".length) || path.join("dist", "customer-instances"),
);
const outputDirectory = path.join(outputRoot, customerPlan.customerKey);
const packagePath = path.join(outputDirectory, "customer-instance.package.json");

const deploymentPackage = {
  schemaVersion: 1,
  customerKey: customerPlan.customerKey,
  productName: customerPlan.productName,
  domain: customerPlan.domain,
  configDigest,
  sourceManifest: path.basename(manifestPath),
  deploymentModel: "single-customer-single-deployment",
  runtime: {
    frontendBuild: "npm ci && npm run build",
    apiBuild: "npm --prefix server ci && npm run server:build",
    apiStart: "npm --prefix server start",
    requiredSecretEnvironmentKeys: ["MONGODB_URI", "JWT_SECRET"],
    optionalProviderSecrets: "Configure provider credentials in the deployment secret store or the existing secure admin integration path; never place them in the manifest/package.",
  },
  verification: {
    preApply: [
      "npm --prefix server run verify:product-config",
      `npm --prefix server run plan:customer-instance -- --manifest=${manifestPath}`,
    ],
    postApply: ["GET /api/product-config", "public landing smoke", "login smoke"],
    rollback: "Re-apply the previously approved manifest using the same guarded bootstrap command.",
  },
  ownership: {
    homepage: "HomepageSettings",
    fonts: "PlatformFontSettings",
    integrations: "PlatformIntegrationSettings",
  },
  settingsSetPlan,
};

assertCustomerInstanceManifestHasNoSecrets(deploymentPackage);
await mkdir(outputDirectory, { recursive: true });
await writeFile(packagePath, `${JSON.stringify(deploymentPackage, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      status: "PACKAGED",
      writesPerformed: false,
      customerKey: customerPlan.customerKey,
      configDigest,
      packagePath,
    },
    null,
    2,
  ),
);
