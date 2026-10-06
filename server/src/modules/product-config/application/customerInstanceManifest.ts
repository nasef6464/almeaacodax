import { z } from "zod";
import { defaultPlatformFontSettings } from "../../content/presentation/platformPresentationDefaults.js";

const fontFamilySchema = z.enum([
  "tajawal",
  "cairo",
  "almarai",
  "readex-pro",
  "ibm-plex-sans-arabic",
  "noto-naskh-arabic",
  "noto-kufi-arabic",
  "system",
]);
const fontSizeSchema = z.string().regex(/^\d{1,2}(\.\d)?(px|rem)$/).or(z.literal(""));
const fontWeightSchema = z.enum(["300", "400", "500", "600", "700", "800", "900", "normal", "bold"]).or(z.literal(""));
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal(""));
const providerSchema = z.object({
  enabled: z.boolean(),
  mode: z.string().min(1).max(40),
});
const navigationItemSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(100),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
});

export const customerInstanceManifestSchema = z.object({
  version: z.literal(1),
  customerKey: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
  productName: z.string().min(2).max(120),
  domain: z.string().url(),
  branding: z.object({
    logoUrl: z.string().max(500).default(""),
    logoAlt: z.string().max(160).default(""),
    logoText: z.string().max(80).default(""),
    logoAccentText: z.string().max(80).default(""),
  }),
  navigation: z.object({
    showAutoPaths: z.boolean().default(true),
    moreLabel: z.string().min(1).max(80).default("أخرى"),
    items: z.array(navigationItemSchema).max(30).default([]),
  }),
  typography: z.object({
    bodyFont: fontFamilySchema.default("tajawal"),
    headingFont: fontFamilySchema.default("tajawal"),
    navigationFont: fontFamilySchema.default("tajawal"),
    buttonFont: fontFamilySchema.default("tajawal"),
    bodySize: fontSizeSchema.default(""),
    headingSize: fontSizeSchema.default(""),
    navigationSize: fontSizeSchema.default(""),
    buttonSize: fontSizeSchema.default(""),
    bodyWeight: fontWeightSchema.default(""),
    headingWeight: fontWeightSchema.default(""),
    navigationWeight: fontWeightSchema.default(""),
    buttonWeight: fontWeightSchema.default(""),
    bodyColor: colorSchema.default(""),
    headingColor: colorSchema.default(""),
    navigationColor: colorSchema.default(""),
    buttonColor: colorSchema.default(""),
  }).default({}),
  features: z.object({
    selfRegistration: z.boolean().default(true),
    emailPasswordLogin: z.boolean().default(true),
    emailVerificationRequired: z.boolean().default(false),
    adminApprovalRequired: z.boolean().default(false),
    contactWidget: z.boolean().default(true),
  }).default({}),
  providers: z.object({
    google: providerSchema.default({ enabled: false, mode: "oauth" }),
    facebook: providerSchema.default({ enabled: false, mode: "oauth" }),
    whatsapp: providerSchema.default({ enabled: false, mode: "otp" }),
    telegram: providerSchema.default({ enabled: false, mode: "bot" }),
    email: providerSchema.default({ enabled: false, mode: "smtp" }),
    zoom: providerSchema.default({ enabled: false, mode: "oauth" }),
    googleMeet: providerSchema.default({ enabled: false, mode: "oauth" }),
    teams: providerSchema.default({ enabled: false, mode: "oauth" }),
    youtubeLive: providerSchema.default({ enabled: false, mode: "api" }),
  }).default({}),
  registration: z.object({
    title: z.string().max(160).default(""),
    subtitle: z.string().max(500).default(""),
    termsLink: z.string().max(500).default(""),
    privacyLink: z.string().max(500).default(""),
  }).default({}),
  seo: z.object({
    enabled: z.boolean().default(true),
    defaultTitle: z.string().max(180).default(""),
    defaultDescription: z.string().max(500).default(""),
    defaultKeywords: z.array(z.string().max(80)).max(30).default([]),
    defaultOgImage: z.string().max(500).default(""),
    robotsIndexingEnabled: z.boolean().default(true),
  }).default({}),
  contactWidget: z.object({
    channel: z.enum(["whatsapp", "telegram", "phone"]).default("whatsapp"),
    whatsappNumber: z.string().max(40).default(""),
    whatsappMessage: z.string().max(500).default(""),
    openInNewTab: z.boolean().default(true),
    showOnPublicPages: z.boolean().default(true),
    showOnDashboardPages: z.boolean().default(false),
  }).default({}),
}).superRefine((manifest, ctx) => {
  const navigationIds = new Set<string>();
  for (const [index, item] of manifest.navigation.items.entries()) {
    if (navigationIds.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["navigation", "items", index, "id"],
        message: `Duplicate navigation id: ${item.id}`,
      });
    }
    navigationIds.add(item.id);
  }

  if (!manifest.features.contactWidget && manifest.contactWidget.showOnPublicPages) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactWidget", "showOnPublicPages"],
      message: "Contact widget cannot be visible when the feature is disabled.",
    });
  }
});

export type CustomerInstanceManifest = z.infer<typeof customerInstanceManifestSchema>;

type ProviderCapability = {
  enabled: boolean;
  mode: string;
};

type CustomerProviderCapabilities = {
  google: ProviderCapability;
  facebook: ProviderCapability;
  whatsapp: ProviderCapability;
  telegram: ProviderCapability;
  email: ProviderCapability;
  zoom: ProviderCapability;
  googleMeet: ProviderCapability;
  teams: ProviderCapability;
  youtubeLive: ProviderCapability;
};

export type CustomerInstancePlan = {
  version: 1;
  customerKey: string;
  productName: string;
  domain: string;
  homepagePatch: {
    brand: CustomerInstanceManifest["branding"];
    navigation: CustomerInstanceManifest["navigation"];
  };
  fontSettings: typeof defaultPlatformFontSettings;
  integrationPatch: {
    auth: {
      allowSelfRegistration: boolean;
      allowEmailPassword: boolean;
      requireEmailVerification: boolean;
      requireAdminApproval: boolean;
      registrationTitle: string;
      registrationSubtitle: string;
      termsLink: string;
      privacyLink: string;
    };
    providers: CustomerProviderCapabilities;
    seo: {
      enabled: boolean;
      siteName: string;
      defaultTitle: string;
      defaultDescription: string;
      defaultKeywords: string[];
      canonicalBaseUrl: string;
      defaultOgImage: string;
      robotsIndexingEnabled: boolean;
      organizationName: string;
      organizationLogoUrl: string;
      organizationUrl: string;
    };
    contactWidget: {
      enabled: boolean;
      channel: "whatsapp" | "telegram" | "phone";
      whatsappNumber: string;
      whatsappMessage: string;
      openInNewTab: boolean;
      showOnPublicPages: boolean;
      showOnDashboardPages: boolean;
    };
  };
};

const resolveProviderCapability = (
  provider: { enabled?: boolean; mode?: string } | undefined,
  defaults: ProviderCapability,
): ProviderCapability => ({
  enabled: provider?.enabled ?? defaults.enabled,
  mode: provider?.mode || defaults.mode,
});

export const compileCustomerInstanceManifest = (input: unknown): CustomerInstancePlan => {
  const manifest = customerInstanceManifestSchema.parse(input);

  return {
    version: 1,
    customerKey: manifest.customerKey,
    productName: manifest.productName,
    domain: manifest.domain,
    homepagePatch: {
      brand: manifest.branding,
      navigation: manifest.navigation,
    },
    fontSettings: {
      ...defaultPlatformFontSettings,
      ...manifest.typography,
      key: "default",
      bodyCustomFont: {},
      headingCustomFont: {},
    },
    integrationPatch: {
      auth: {
        allowSelfRegistration: manifest.features.selfRegistration,
        allowEmailPassword: manifest.features.emailPasswordLogin,
        requireEmailVerification: manifest.features.emailVerificationRequired,
        requireAdminApproval: manifest.features.adminApprovalRequired,
        registrationTitle: manifest.registration.title,
        registrationSubtitle: manifest.registration.subtitle,
        termsLink: manifest.registration.termsLink,
        privacyLink: manifest.registration.privacyLink,
      },
      providers: {
        google: resolveProviderCapability(manifest.providers.google, { enabled: false, mode: "oauth" }),
        facebook: resolveProviderCapability(manifest.providers.facebook, { enabled: false, mode: "oauth" }),
        whatsapp: resolveProviderCapability(manifest.providers.whatsapp, { enabled: false, mode: "otp" }),
        telegram: resolveProviderCapability(manifest.providers.telegram, { enabled: false, mode: "bot" }),
        email: resolveProviderCapability(manifest.providers.email, { enabled: false, mode: "smtp" }),
        zoom: resolveProviderCapability(manifest.providers.zoom, { enabled: false, mode: "oauth" }),
        googleMeet: resolveProviderCapability(manifest.providers.googleMeet, { enabled: false, mode: "oauth" }),
        teams: resolveProviderCapability(manifest.providers.teams, { enabled: false, mode: "oauth" }),
        youtubeLive: resolveProviderCapability(manifest.providers.youtubeLive, { enabled: false, mode: "api" }),
      },
      seo: {
        enabled: manifest.seo.enabled,
        siteName: manifest.productName,
        defaultTitle: manifest.seo.defaultTitle || manifest.productName,
        defaultDescription: manifest.seo.defaultDescription,
        defaultKeywords: manifest.seo.defaultKeywords,
        canonicalBaseUrl: manifest.domain,
        defaultOgImage: manifest.seo.defaultOgImage,
        robotsIndexingEnabled: manifest.seo.robotsIndexingEnabled,
        organizationName: manifest.productName,
        organizationLogoUrl: manifest.branding.logoUrl,
        organizationUrl: manifest.domain,
      },
      contactWidget: {
        enabled: manifest.features.contactWidget,
        channel: manifest.contactWidget.channel ?? "whatsapp",
        whatsappNumber: manifest.contactWidget.whatsappNumber ?? "",
        whatsappMessage: manifest.contactWidget.whatsappMessage ?? "",
        openInNewTab: manifest.contactWidget.openInNewTab ?? true,
        showOnPublicPages: manifest.contactWidget.showOnPublicPages ?? true,
        showOnDashboardPages: manifest.contactWidget.showOnDashboardPages ?? false,
      },
    },
  };
};

export const CUSTOMER_INSTANCE_SECRET_FIELDS = [
  "appSecret",
  "clientId",
  "clientSecret",
  "apiKey",
  "apiKeys",
  "apiSecret",
  "accessToken",
  "botToken",
  "verifyToken",
  "webhookSecret",
] as const;

export const assertCustomerInstanceManifestHasNoSecrets = (input: unknown) => {
  const serialized = JSON.stringify(input);
  for (const field of CUSTOMER_INSTANCE_SECRET_FIELDS) {
    if (serialized.includes(`\"${field}\"`)) {
      throw new Error(`Customer instance manifest must not contain provider secret field: ${field}`);
    }
  }
  return true;
};
