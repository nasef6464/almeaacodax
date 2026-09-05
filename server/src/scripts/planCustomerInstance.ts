import { readFile } from "node:fs/promises";
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
  throw new Error("Usage: npm run plan:customer-instance -- --manifest=<path-to-json>");
}

const manifestPath = path.resolve(process.cwd(), manifestArgument.slice("--manifest=".length));
const rawManifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
assertCustomerInstanceManifestHasNoSecrets(rawManifest);

const customerPlan = compileCustomerInstanceManifest(rawManifest);
const settingsSetPlan = buildCustomerInstanceSettingsSetPlan(customerPlan);
const configDigest = fingerprintCustomerInstancePlan(customerPlan);

console.log(
  JSON.stringify(
    {
      mode: "DRY_RUN_ONLY",
      writesPerformed: false,
      configDigest,
      customer: {
        key: customerPlan.customerKey,
        productName: customerPlan.productName,
        domain: customerPlan.domain,
      },
      ownership: {
        homepage: "HomepageSettings",
        fonts: "PlatformFontSettings",
        integrations: "PlatformIntegrationSettings",
      },
      settingsSetPlan,
      next: "Apply through the separately guarded customer-instance bootstrap command only after selecting the target deployment/database.",
    },
    null,
    2,
  ),
);
