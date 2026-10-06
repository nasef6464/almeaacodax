import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertCustomerInstanceManifestHasNoSecrets,
  compileCustomerInstanceManifest,
} from "../modules/product-config/application/customerInstanceManifest.js";
import { buildPublicProductConfig } from "../modules/product-config/application/publicProductConfig.js";

const readManifest = async (relativePath: string) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8")) as unknown;

const alphaManifest = await readManifest("../../../customer-instances/examples/alpha-learning.json");
const betaManifest = await readManifest("../../../customer-instances/examples/beta-academy.json");

assert.equal(assertCustomerInstanceManifestHasNoSecrets(alphaManifest), true);
assert.equal(assertCustomerInstanceManifestHasNoSecrets(betaManifest), true);

const alphaPlan = compileCustomerInstanceManifest(alphaManifest);
const betaPlan = compileCustomerInstanceManifest(betaManifest);

const buildVariantFromPlan = (
  plan: ReturnType<typeof compileCustomerInstanceManifest>,
  secretSeed: string,
) =>
  buildPublicProductConfig({
    homepage: {
      key: "default",
      ...plan.homepagePatch,
    },
    fonts: plan.fontSettings,
    integrations: {
      key: "default",
      ...plan.integrationPatch,
      providers: Object.fromEntries(
        Object.entries(plan.integrationPatch.providers).map(([provider, settings]) => [
          provider,
          {
            ...settings,
            clientId: `${secretSeed}-${provider}-client`,
            clientSecret: `${secretSeed}-${provider}-secret`,
            apiKey: `${secretSeed}-${provider}-api-key`,
            accessToken: `${secretSeed}-${provider}-token`,
          },
        ]),
      ),
      externalPlatforms: [
        {
          id: `${secretSeed}-lms`,
          name: "Customer LMS",
          enabled: true,
          platformType: "lms",
          baseUrl: `${plan.domain}/lms`,
          apiKey: `${secretSeed}-external-api-key`,
          apiSecret: `${secretSeed}-external-api-secret`,
          webhookSecret: `${secretSeed}-webhook-secret`,
        },
      ],
    },
  });

const alpha = buildVariantFromPlan(alphaPlan, "alpha-proof");
const beta = buildVariantFromPlan(betaPlan, "beta-proof");

assert.equal(alphaPlan.customerKey, "alpha-learning");
assert.equal(betaPlan.customerKey, "beta-academy");
assert.equal(alpha.productName, "Alpha Learning");
assert.equal(beta.productName, "Beta Academy");
assert.equal(alpha.domain, "https://alpha.example.test");
assert.equal(beta.domain, "https://beta.example.test");
assert.notDeepEqual(alpha.branding, beta.branding);
assert.notDeepEqual(alpha.typography, beta.typography);
assert.notDeepEqual(alpha.navigation, beta.navigation);
assert.equal(alpha.features.selfRegistration, true);
assert.equal(beta.features.selfRegistration, false);
assert.equal(alpha.features.socialLogin.google, true);
assert.equal(beta.features.socialLogin.google, false);
assert.equal(alpha.providers.google.enabled, true);
assert.equal(beta.providers.google.enabled, false);

for (const [label, plan, config, secretSeed] of [
  ["alpha", alphaPlan, alpha, "alpha-proof"],
  ["beta", betaPlan, beta, "beta-proof"],
] as const) {
  const serializedPlan = JSON.stringify(plan);
  const serializedConfig = JSON.stringify(config);
  for (const forbiddenKey of [
    "clientId",
    "clientSecret",
    "apiKey",
    "apiKeys",
    "apiSecret",
    "accessToken",
    "webhookSecret",
    "externalPlatforms",
  ]) {
    assert.equal(serializedPlan.includes(`\"${forbiddenKey}\"`), false, `${label} plan contains ${forbiddenKey}`);
    assert.equal(serializedConfig.includes(`\"${forbiddenKey}\"`), false, `${label} public config exposes ${forbiddenKey}`);
  }
  for (const forbiddenValue of [
    `${secretSeed}-google-client`,
    `${secretSeed}-google-secret`,
    `${secretSeed}-email-api-key`,
    `${secretSeed}-zoom-secret`,
    `${secretSeed}-external-api-key`,
    `${secretSeed}-external-api-secret`,
    `${secretSeed}-webhook-secret`,
  ]) {
    assert.equal(serializedConfig.includes(forbiddenValue), false, `${label} exposes a provider secret value`);
  }
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      manifests: [
        { customerKey: alphaPlan.customerKey, productName: alpha.productName, domain: alpha.domain },
        { customerKey: betaPlan.customerKey, productName: beta.productName, domain: beta.domain },
      ],
      sameCoreCompiler: true,
      secretLeakage: false,
    },
    null,
    2,
  ),
);
