import assert from "node:assert/strict";
import { buildPublicProductConfig } from "../modules/product-config/application/publicProductConfig.js";

const buildVariant = ({
  name,
  domain,
  logoText,
  logoAccentText,
  bodyColor,
  headingColor,
  googleEnabled,
  secretSeed,
}: {
  name: string;
  domain: string;
  logoText: string;
  logoAccentText: string;
  bodyColor: string;
  headingColor: string;
  googleEnabled: boolean;
  secretSeed: string;
}) =>
  buildPublicProductConfig({
    homepage: {
      key: "default",
      brand: {
        logoUrl: `/brands/${secretSeed}/logo.svg`,
        logoAlt: `${name} logo`,
        logoText,
        logoAccentText,
      },
    },
    fonts: {
      key: "default",
      bodyColor,
      headingColor,
    },
    integrations: {
      key: "default",
      seo: {
        siteName: name,
        canonicalBaseUrl: domain,
        organizationName: name,
        organizationUrl: domain,
      },
      providers: {
        google: {
          enabled: googleEnabled,
          mode: "oauth",
          clientId: `${secretSeed}-google-client`,
          callbackUrl: `${domain}/api/auth/google/callback`,
        },
        email: {
          enabled: true,
          mode: "smtp",
          apiKey: `${secretSeed}-email-api-key`,
          fromEmail: `hello@${new URL(domain).hostname}`,
        },
        sentry: {
          enabled: true,
          mode: "dsn",
          accessToken: `${secretSeed}-sentry-token`,
        },
        zoom: {
          enabled: true,
          mode: "oauth",
          clientId: `${secretSeed}-zoom-client`,
          clientSecret: `${secretSeed}-zoom-secret`,
        },
      },
      externalPlatforms: [
        {
          id: `${secretSeed}-lms`,
          name: "Customer LMS",
          enabled: true,
          platformType: "lms",
          baseUrl: `${domain}/lms`,
          apiKey: `${secretSeed}-external-api-key`,
          apiSecret: `${secretSeed}-external-api-secret`,
          webhookSecret: `${secretSeed}-webhook-secret`,
        },
      ],
    },
  });

const alpha = buildVariant({
  name: "Alpha Learning",
  domain: "https://alpha.example.test",
  logoText: "Alpha",
  logoAccentText: "Learning",
  bodyColor: "#20242b",
  headingColor: "#101828",
  googleEnabled: true,
  secretSeed: "alpha-proof",
});

const beta = buildVariant({
  name: "Beta Academy",
  domain: "https://beta.example.test",
  logoText: "Beta",
  logoAccentText: "Academy",
  bodyColor: "#30333a",
  headingColor: "#181b20",
  googleEnabled: false,
  secretSeed: "beta-proof",
});

assert.equal(alpha.productName, "Alpha Learning");
assert.equal(beta.productName, "Beta Academy");
assert.equal(alpha.domain, "https://alpha.example.test");
assert.equal(beta.domain, "https://beta.example.test");
assert.notDeepEqual(alpha.branding, beta.branding);
assert.notDeepEqual(alpha.typography, beta.typography);
assert.equal(alpha.features.socialLogin.google, true);
assert.equal(beta.features.socialLogin.google, false);
assert.equal(alpha.providers.google.enabled, true);
assert.equal(beta.providers.google.enabled, false);

for (const [label, config, secretSeed] of [
  ["alpha", alpha, "alpha-proof"],
  ["beta", beta, "beta-proof"],
] as const) {
  const serialized = JSON.stringify(config);
  for (const forbiddenKey of [
    "clientId",
    "clientSecret",
    "apiKey",
    "apiSecret",
    "accessToken",
    "webhookSecret",
    "externalPlatforms",
  ]) {
    assert.equal(serialized.includes(`\"${forbiddenKey}\"`), false, `${label} exposes ${forbiddenKey}`);
  }
  for (const forbiddenValue of [
    `${secretSeed}-google-client`,
    `${secretSeed}-email-api-key`,
    `${secretSeed}-sentry-token`,
    `${secretSeed}-zoom-secret`,
    `${secretSeed}-external-api-key`,
    `${secretSeed}-external-api-secret`,
    `${secretSeed}-webhook-secret`,
  ]) {
    assert.equal(serialized.includes(forbiddenValue), false, `${label} exposes a provider secret value`);
  }
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      variants: [
        { productName: alpha.productName, domain: alpha.domain },
        { productName: beta.productName, domain: beta.domain },
      ],
      secretLeakage: false,
    },
    null,
    2,
  ),
);
