import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { HomepageSettingsModel } from "../models/HomepageSettings.js";
import { PlatformFontSettingsModel } from "../models/PlatformFontSettings.js";
import { PlatformIntegrationSettingsModel } from "../models/PlatformIntegrationSettings.js";
import {
  assertCustomerInstanceManifestHasNoSecrets,
  compileCustomerInstanceManifest,
} from "../modules/product-config/application/customerInstanceManifest.js";
import { buildCustomerInstanceSettingsSetPlan } from "../modules/product-config/application/customerInstanceSettingsPlan.js";

const getArgument = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || "";
};

const manifestArgument = getArgument("manifest");
if (!manifestArgument) {
  throw new Error("Usage: npm run bootstrap:customer-instance -- --manifest=<path> [--apply --confirm=<customerKey>]");
}

const manifestPath = path.resolve(process.cwd(), manifestArgument);
const rawManifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
assertCustomerInstanceManifestHasNoSecrets(rawManifest);

const customerPlan = compileCustomerInstanceManifest(rawManifest);
const settingsSetPlan = buildCustomerInstanceSettingsSetPlan(customerPlan);
const applyRequested = process.argv.includes("--apply");

const summary = {
  customerKey: customerPlan.customerKey,
  productName: customerPlan.productName,
  domain: customerPlan.domain,
  settings: {
    homepageFields: Object.keys(settingsSetPlan.homepage).length,
    fontFields: Object.keys(settingsSetPlan.fonts).length,
    integrationFields: Object.keys(settingsSetPlan.integrations).length,
  },
};

if (!applyRequested) {
  console.log(JSON.stringify({ mode: "DRY_RUN", writesPerformed: false, ...summary }, null, 2));
  process.exit(0);
}

const confirmation = getArgument("confirm");
if (confirmation !== customerPlan.customerKey) {
  throw new Error(`Apply requires --confirm=${customerPlan.customerKey}`);
}

if (process.env.CUSTOMER_INSTANCE_WRITE_ACK !== customerPlan.customerKey) {
  throw new Error(
    `Apply requires CUSTOMER_INSTANCE_WRITE_ACK=${customerPlan.customerKey} in the target deployment environment.`,
  );
}

// Keep the default dry-run path independent from runtime secrets and database
// configuration. Runtime environment validation is intentionally loaded only
// after an explicit apply request and the first customer acknowledgement.
const { env } = await import("../config/env.js");

if (
  env.NODE_ENV === "production" &&
  process.env.CUSTOMER_INSTANCE_PRODUCTION_WRITE_ACK !== customerPlan.customerKey
) {
  throw new Error(
    `Production apply requires CUSTOMER_INSTANCE_PRODUCTION_WRITE_ACK=${customerPlan.customerKey}. Do not set it without explicit owner approval for the target customer deployment.`,
  );
}

await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12000 });

try {
  const [homepageResult, fontsResult, integrationsResult] = await Promise.all([
    HomepageSettingsModel.updateOne(
      { key: "default" },
      { $set: settingsSetPlan.homepage, $setOnInsert: { key: "default" } },
      { upsert: true },
    ),
    PlatformFontSettingsModel.updateOne(
      { key: "default" },
      { $set: settingsSetPlan.fonts, $setOnInsert: { key: "default" } },
      { upsert: true },
    ),
    PlatformIntegrationSettingsModel.updateOne(
      { key: "default" },
      { $set: settingsSetPlan.integrations, $setOnInsert: { key: "default" } },
      { upsert: true },
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "APPLY",
        writesPerformed: true,
        ...summary,
        results: {
          homepage: { matched: homepageResult.matchedCount, modified: homepageResult.modifiedCount, upserted: homepageResult.upsertedCount },
          fonts: { matched: fontsResult.matchedCount, modified: fontsResult.modifiedCount, upserted: fontsResult.upsertedCount },
          integrations: { matched: integrationsResult.matchedCount, modified: integrationsResult.modifiedCount, upserted: integrationsResult.upsertedCount },
        },
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
