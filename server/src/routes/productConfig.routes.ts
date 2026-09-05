import { Router } from "express";
import { z } from "zod";
import { HomepageSettingsModel } from "../models/HomepageSettings.js";
import { PlatformFontSettingsModel } from "../models/PlatformFontSettings.js";
import { PlatformIntegrationSettingsModel } from "../models/PlatformIntegrationSettings.js";
import {
  homepageSettingsSchema,
  platformFontSettingsSchema,
} from "../modules/content/http/platformPresentationSchemas.js";
import { platformIntegrationSettingsSchema } from "../modules/content/http/platformIntegrationSchemas.js";
import {
  defaultHomepageSettings,
  defaultPlatformFontSettings,
} from "../modules/content/presentation/platformPresentationDefaults.js";
import { defaultPlatformIntegrationSettings } from "../modules/content/integrations/platformIntegrationDefaults.js";

const publicProviderSchema = z.object({
  enabled: z.boolean(),
  mode: z.string(),
});

const publicProductConfigSchema = z.object({
  version: z.literal(1),
  key: z.literal("default"),
  productName: z.string(),
  domain: z.string(),
  branding: z.object({
    logoUrl: z.string(),
    logoAlt: z.string(),
    logoText: z.string(),
    logoAccentText: z.string(),
  }),
  navigation: z.object({
    showAutoPaths: z.boolean(),
    moreLabel: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        visible: z.boolean(),
        order: z.number(),
      }),
    ),
  }),
  typography: z.object({
    bodyFont: z.string(),
    headingFont: z.string(),
    navigationFont: z.string(),
    buttonFont: z.string(),
    bodySize: z.string(),
    headingSize: z.string(),
    navigationSize: z.string(),
    buttonSize: z.string(),
    bodyWeight: z.string(),
    headingWeight: z.string(),
    navigationWeight: z.string(),
    buttonWeight: z.string(),
    bodyColor: z.string(),
    headingColor: z.string(),
    navigationColor: z.string(),
    buttonColor: z.string(),
  }),
  features: z.object({
    selfRegistration: z.boolean(),
    emailPasswordLogin: z.boolean(),
    emailVerificationRequired: z.boolean(),
    adminApprovalRequired: z.boolean(),
    contactWidget: z.boolean(),
    socialLogin: z.object({
      google: z.boolean(),
      facebook: z.boolean(),
      telegram: z.boolean(),
    }),
    liveClasses: z.object({
      zoom: z.boolean(),
      googleMeet: z.boolean(),
      teams: z.boolean(),
      youtubeLive: z.boolean(),
    }),
  }),
  providers: z.object({
    google: publicProviderSchema,
    facebook: publicProviderSchema,
    whatsapp: publicProviderSchema,
    telegram: publicProviderSchema,
    email: publicProviderSchema,
    sentry: publicProviderSchema,
    redis: publicProviderSchema,
    zoom: publicProviderSchema,
    googleMeet: publicProviderSchema,
    teams: publicProviderSchema,
    youtubeLive: publicProviderSchema,
  }),
  registration: z.object({
    title: z.string(),
    subtitle: z.string(),
    termsLink: z.string(),
    privacyLink: z.string(),
  }),
  seo: z.object({
    enabled: z.boolean(),
    siteName: z.string(),
    defaultTitle: z.string(),
    defaultDescription: z.string(),
    defaultKeywords: z.array(z.string()),
    canonicalBaseUrl: z.string(),
    defaultOgImage: z.string(),
    robotsIndexingEnabled: z.boolean(),
    organizationName: z.string(),
    organizationLogoUrl: z.string(),
    organizationUrl: z.string(),
  }),
  contactWidget: z.object({
    enabled: z.boolean(),
    channel: z.enum(["whatsapp", "telegram", "phone"]),
    whatsappNumber: z.string(),
    whatsappMessage: z.string(),
    openInNewTab: z.boolean(),
    showOnPublicPages: z.boolean(),
    showOnDashboardPages: z.boolean(),
  }),
});

type UnknownRecord = Record<string, unknown>;

type PublicProviderInput = {
  enabled?: boolean;
  mode?: string;
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const mergeProviderSettings = (rawProviders: unknown) => {
  const raw = asRecord(rawProviders);
  const defaults = defaultPlatformIntegrationSettings.providers as Record<string, UnknownRecord>;

  return Object.fromEntries(
    Object.entries(defaults).map(([provider, providerDefaults]) => [
      provider,
      { ...providerDefaults, ...asRecord(raw[provider]) },
    ]),
  );
};

const normalizeHomepageSettings = (rawHomepage: unknown) => {
  const raw = asRecord(rawHomepage);
  return homepageSettingsSchema.parse({
    ...defaultHomepageSettings,
    ...raw,
    brand: { ...defaultHomepageSettings.brand, ...asRecord(raw.brand) },
    navigation: { ...defaultHomepageSettings.navigation, ...asRecord(raw.navigation) },
    typography: { ...defaultHomepageSettings.typography, ...asRecord(raw.typography) },
  });
};

const normalizeFontSettings = (rawFonts: unknown) =>
  platformFontSettingsSchema.parse({
    ...defaultPlatformFontSettings,
    ...asRecord(rawFonts),
  });

const normalizeIntegrationSettings = (rawIntegrations: unknown) => {
  const raw = asRecord(rawIntegrations);
  return platformIntegrationSettingsSchema.parse({
    ...defaultPlatformIntegrationSettings,
    ...raw,
    auth: { ...defaultPlatformIntegrationSettings.auth, ...asRecord(raw.auth) },
    providers: mergeProviderSettings(raw.providers),
    seo: { ...defaultPlatformIntegrationSettings.seo, ...asRecord(raw.seo) },
    contactWidget: {
      ...defaultPlatformIntegrationSettings.contactWidget,
      ...asRecord(raw.contactWidget),
    },
    externalPlatforms: Array.isArray(raw.externalPlatforms)
      ? raw.externalPlatforms
      : defaultPlatformIntegrationSettings.externalPlatforms,
    registrationFields: Array.isArray(raw.registrationFields)
      ? raw.registrationFields
      : defaultPlatformIntegrationSettings.registrationFields,
  });
};

const publicProvider = (provider: PublicProviderInput | undefined) => ({
  enabled: provider?.enabled ?? false,
  mode: provider?.mode ?? "",
});

export const buildPublicProductConfig = ({
  homepage,
  fonts,
  integrations,
}: {
  homepage?: unknown;
  fonts?: unknown;
  integrations?: unknown;
}) => {
  const homepageSettings = normalizeHomepageSettings(homepage);
  const fontSettings = normalizeFontSettings(fonts);
  const integrationSettings = normalizeIntegrationSettings(integrations);
  const providers = integrationSettings.providers;
  const brand = homepageSettings.brand ?? defaultHomepageSettings.brand;
  const navigation = homepageSettings.navigation ?? defaultHomepageSettings.navigation;

  return publicProductConfigSchema.parse({
    version: 1,
    key: "default",
    productName:
      integrationSettings.seo.siteName ||
      [brand.logoText, brand.logoAccentText].filter(Boolean).join(" ").trim() ||
      "منصة المئة",
    domain: integrationSettings.seo.canonicalBaseUrl,
    branding: {
      logoUrl: brand.logoUrl || "",
      logoAlt: brand.logoAlt || "",
      logoText: brand.logoText || "",
      logoAccentText: brand.logoAccentText || "",
    },
    navigation: {
      showAutoPaths: navigation.showAutoPaths ?? true,
      moreLabel: navigation.moreLabel || "أخرى",
      items: (navigation.items || []).map((item) => ({
        id: item.id,
        label: item.label || "",
        visible: item.visible ?? true,
        order: item.order ?? 0,
      })),
    },
    typography: {
      bodyFont: fontSettings.bodyFont,
      headingFont: fontSettings.headingFont,
      navigationFont: fontSettings.navigationFont,
      buttonFont: fontSettings.buttonFont,
      bodySize: fontSettings.bodySize || "",
      headingSize: fontSettings.headingSize || "",
      navigationSize: fontSettings.navigationSize || "",
      buttonSize: fontSettings.buttonSize || "",
      bodyWeight: fontSettings.bodyWeight || "",
      headingWeight: fontSettings.headingWeight || "",
      navigationWeight: fontSettings.navigationWeight || "",
      buttonWeight: fontSettings.buttonWeight || "",
      bodyColor: fontSettings.bodyColor || "",
      headingColor: fontSettings.headingColor || "",
      navigationColor: fontSettings.navigationColor || "",
      buttonColor: fontSettings.buttonColor || "",
    },
    features: {
      selfRegistration: integrationSettings.auth.allowSelfRegistration,
      emailPasswordLogin: integrationSettings.auth.allowEmailPassword,
      emailVerificationRequired: integrationSettings.auth.requireEmailVerification,
      adminApprovalRequired: integrationSettings.auth.requireAdminApproval,
      contactWidget: integrationSettings.contactWidget.enabled,
      socialLogin: {
        google: providers.google.enabled,
        facebook: providers.facebook.enabled,
        telegram: providers.telegram.enabled,
      },
      liveClasses: {
        zoom: providers.zoom.enabled,
        googleMeet: providers.googleMeet.enabled,
        teams: providers.teams.enabled,
        youtubeLive: providers.youtubeLive.enabled,
      },
    },
    providers: {
      google: publicProvider(providers.google),
      facebook: publicProvider(providers.facebook),
      whatsapp: publicProvider(providers.whatsapp),
      telegram: publicProvider(providers.telegram),
      email: publicProvider(providers.email),
      sentry: publicProvider(providers.sentry),
      redis: publicProvider(providers.redis),
      zoom: publicProvider(providers.zoom),
      googleMeet: publicProvider(providers.googleMeet),
      teams: publicProvider(providers.teams),
      youtubeLive: publicProvider(providers.youtubeLive),
    },
    registration: {
      title: integrationSettings.auth.registrationTitle,
      subtitle: integrationSettings.auth.registrationSubtitle,
      termsLink: integrationSettings.auth.termsLink,
      privacyLink: integrationSettings.auth.privacyLink,
    },
    seo: {
      enabled: integrationSettings.seo.enabled,
      siteName: integrationSettings.seo.siteName,
      defaultTitle: integrationSettings.seo.defaultTitle,
      defaultDescription: integrationSettings.seo.defaultDescription,
      defaultKeywords: integrationSettings.seo.defaultKeywords,
      canonicalBaseUrl: integrationSettings.seo.canonicalBaseUrl,
      defaultOgImage: integrationSettings.seo.defaultOgImage,
      robotsIndexingEnabled: integrationSettings.seo.robotsIndexingEnabled,
      organizationName: integrationSettings.seo.organizationName,
      organizationLogoUrl: integrationSettings.seo.organizationLogoUrl,
      organizationUrl: integrationSettings.seo.organizationUrl,
    },
    contactWidget: integrationSettings.contactWidget,
  });
};

export const productConfigRouter = Router();

productConfigRouter.get("/", async (_req, res, next) => {
  try {
    const [homepage, fonts, integrations] = await Promise.all([
      HomepageSettingsModel.findOne({ key: "default" }).lean(),
      PlatformFontSettingsModel.findOne({ key: "default" }).lean(),
      PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean(),
    ]);

    const productConfig = buildPublicProductConfig({ homepage, fonts, integrations });
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ productConfig });
  } catch (error) {
    next(error);
  }
});
