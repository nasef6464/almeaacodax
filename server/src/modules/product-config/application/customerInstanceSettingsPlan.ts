import type { CustomerInstancePlan } from "./customerInstanceManifest.js";

export type CustomerInstanceSettingsSetPlan = {
  homepage: Record<string, unknown>;
  fonts: Record<string, unknown>;
  integrations: Record<string, unknown>;
};

const setProviderCapability = (
  target: Record<string, unknown>,
  provider: string,
  settings: { enabled: boolean; mode: string },
) => {
  target[`providers.${provider}.enabled`] = settings.enabled;
  target[`providers.${provider}.mode`] = settings.mode;
};

export const buildCustomerInstanceSettingsSetPlan = (
  plan: CustomerInstancePlan,
): CustomerInstanceSettingsSetPlan => {
  const homepage: Record<string, unknown> = {
    "brand.logoUrl": plan.homepagePatch.branding?.logoUrl,
  };

  const brand = plan.homepagePatch.brand;
  const navigation = plan.homepagePatch.navigation;
  const homepageSet: Record<string, unknown> = {
    "brand.logoUrl": brand.logoUrl,
    "brand.logoAlt": brand.logoAlt,
    "brand.logoText": brand.logoText,
    "brand.logoAccentText": brand.logoAccentText,
    "navigation.showAutoPaths": navigation.showAutoPaths,
    "navigation.moreLabel": navigation.moreLabel,
    "navigation.items": navigation.items,
  };

  const fonts: Record<string, unknown> = {};
  for (const key of [
    "bodyFont",
    "headingFont",
    "navigationFont",
    "buttonFont",
    "bodySize",
    "headingSize",
    "navigationSize",
    "buttonSize",
    "bodyWeight",
    "headingWeight",
    "navigationWeight",
    "buttonWeight",
    "bodyColor",
    "headingColor",
    "navigationColor",
    "buttonColor",
  ] as const) {
    fonts[key] = plan.fontSettings[key];
  }

  const integrations: Record<string, unknown> = {
    "auth.allowSelfRegistration": plan.integrationPatch.auth.allowSelfRegistration,
    "auth.allowEmailPassword": plan.integrationPatch.auth.allowEmailPassword,
    "auth.requireEmailVerification": plan.integrationPatch.auth.requireEmailVerification,
    "auth.requireAdminApproval": plan.integrationPatch.auth.requireAdminApproval,
    "auth.registrationTitle": plan.integrationPatch.auth.registrationTitle,
    "auth.registrationSubtitle": plan.integrationPatch.auth.registrationSubtitle,
    "auth.termsLink": plan.integrationPatch.auth.termsLink,
    "auth.privacyLink": plan.integrationPatch.auth.privacyLink,
    "seo.enabled": plan.integrationPatch.seo.enabled,
    "seo.siteName": plan.integrationPatch.seo.siteName,
    "seo.defaultTitle": plan.integrationPatch.seo.defaultTitle,
    "seo.defaultDescription": plan.integrationPatch.seo.defaultDescription,
    "seo.defaultKeywords": plan.integrationPatch.seo.defaultKeywords,
    "seo.canonicalBaseUrl": plan.integrationPatch.seo.canonicalBaseUrl,
    "seo.defaultOgImage": plan.integrationPatch.seo.defaultOgImage,
    "seo.robotsIndexingEnabled": plan.integrationPatch.seo.robotsIndexingEnabled,
    "seo.organizationName": plan.integrationPatch.seo.organizationName,
    "seo.organizationLogoUrl": plan.integrationPatch.seo.organizationLogoUrl,
    "seo.organizationUrl": plan.integrationPatch.seo.organizationUrl,
    "contactWidget.enabled": plan.integrationPatch.contactWidget.enabled,
    "contactWidget.channel": plan.integrationPatch.contactWidget.channel,
    "contactWidget.whatsappNumber": plan.integrationPatch.contactWidget.whatsappNumber,
    "contactWidget.whatsappMessage": plan.integrationPatch.contactWidget.whatsappMessage,
    "contactWidget.openInNewTab": plan.integrationPatch.contactWidget.openInNewTab,
    "contactWidget.showOnPublicPages": plan.integrationPatch.contactWidget.showOnPublicPages,
    "contactWidget.showOnDashboardPages": plan.integrationPatch.contactWidget.showOnDashboardPages,
  };

  for (const [provider, settings] of Object.entries(plan.integrationPatch.providers)) {
    setProviderCapability(integrations, provider, settings);
  }

  return { homepage: homepageSet, fonts, integrations };
};
