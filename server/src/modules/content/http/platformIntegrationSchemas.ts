import { z } from "zod";

const providerSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.string().default("oauth"),
  appId: z.string().optional().default(""),
  appSecret: z.string().optional().default(""),
  clientId: z.string().optional().default(""),
  clientSecret: z.string().optional().default(""),
  apiKey: z.string().optional().default(""),
  accessToken: z.string().optional().default(""),
  callbackUrl: z.string().optional().default(""),
  fromEmail: z.string().optional().default(""),
  senderName: z.string().optional().default(""),
  botUsername: z.string().optional().default(""),
  botToken: z.string().optional().default(""),
  chatId: z.string().optional().default(""),
  phoneNumber: z.string().optional().default(""),
  phoneNumberId: z.string().optional().default(""),
  businessAccountId: z.string().optional().default(""),
  verifyToken: z.string().optional().default(""),
  webhookUrl: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

const externalPlatformSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  platformType: z.enum(["lms", "marketplace", "crm", "custom"]).default("custom"),
  baseUrl: z.string().optional().default(""),
  apiKey: z.string().optional().default(""),
  apiKeys: z.array(z.string()).optional().default([]),
  apiSecret: z.string().optional().default(""),
  webhookUrl: z.string().optional().default(""),
  webhookSecret: z.string().optional().default(""),
  syncStudents: z.boolean().default(false),
  syncCourses: z.boolean().default(false),
  syncOrders: z.boolean().default(false),
  syncScheduleCron: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

const seoSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  siteName: z.string().optional().default("منصة المئة"),
  defaultTitle: z.string().optional().default("منصة المئة | قدرات وتحصيلي"),
  defaultDescription: z.string().optional().default("منصة تعليمية ذكية للتدريب على القدرات والتحصيلي."),
  defaultKeywords: z.array(z.string()).default([]),
  canonicalBaseUrl: z.string().optional().default(""),
  defaultOgImage: z.string().optional().default(""),
  twitterHandle: z.string().optional().default(""),
  googleSiteVerification: z.string().optional().default(""),
  googleAnalyticsId: z.string().optional().default(""),
  googleTagManagerId: z.string().optional().default(""),
  robotsIndexingEnabled: z.boolean().default(true),
  noIndexPaths: z.array(z.string()).default(["/#/admin-dashboard", "/#/dashboard", "/#/login"]),
  organizationName: z.string().optional().default("منصة المئة"),
  organizationLogoUrl: z.string().optional().default(""),
  organizationUrl: z.string().optional().default(""),
});

const contactWidgetSchema = z.object({
  enabled: z.boolean().default(true),
  channel: z.enum(["whatsapp", "telegram", "phone"]).default("whatsapp"),
  whatsappNumber: z.string().optional().default(""),
  whatsappMessage: z.string().optional().default("مرحبًا، أريد الاستفسار عن منصة المئة."),
  openInNewTab: z.boolean().default(true),
  showOnPublicPages: z.boolean().default(true),
  showOnDashboardPages: z.boolean().default(false),
});

export const platformIntegrationSettingsSchema = z.object({
  auth: z.object({
    allowSelfRegistration: z.boolean().default(true),
    allowEmailPassword: z.boolean().default(true),
    requireEmailVerification: z.boolean().default(false),
    requireAdminApproval: z.boolean().default(false),
    defaultRole: z.enum(["student", "parent"]).default("student"),
    registrationTitle: z.string().optional().default(""),
    registrationSubtitle: z.string().optional().default(""),
    termsLink: z.string().optional().default(""),
    privacyLink: z.string().optional().default(""),
    maxAccountsPerDevice: z.number().int().min(1).max(20).default(3),
    allowedEmailDomains: z.array(z.string()).default([]),
  }),
  providers: z.object({
    google: providerSettingsSchema.default({ enabled: false, mode: "oauth" }),
    facebook: providerSettingsSchema.default({ enabled: false, mode: "oauth" }),
    whatsapp: providerSettingsSchema.default({ enabled: false, mode: "otp" }),
    telegram: providerSettingsSchema.default({ enabled: false, mode: "bot" }),
    email: providerSettingsSchema.default({ enabled: false, mode: "smtp" }),
    sentry: providerSettingsSchema.default({ enabled: false, mode: "dsn" }),
    redis: providerSettingsSchema.default({ enabled: false, mode: "managed" }),
    zoom: providerSettingsSchema.default({ enabled: false, mode: "oauth" }),
    googleMeet: providerSettingsSchema.default({ enabled: false, mode: "oauth" }),
    teams: providerSettingsSchema.default({ enabled: false, mode: "oauth" }),
    youtubeLive: providerSettingsSchema.default({ enabled: false, mode: "api" }),
  }),
  seo: seoSettingsSchema.default({}),
  contactWidget: contactWidgetSchema.default({}),
  externalPlatforms: z.array(externalPlatformSchema).default([]),
  registrationFields: z
    .array(
      z.object({
        id: z.string().min(1),
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "email", "phone", "select", "textarea"]).default("text"),
        required: z.boolean().default(false),
        enabled: z.boolean().default(true),
        options: z.array(z.string()).default([]),
        placeholder: z.string().optional().default(""),
        helpText: z.string().optional().default(""),
        order: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
});

const providerSettingsPatchSchema = providerSettingsSchema.partial();

export const platformIntegrationSettingsPatchSchema = z.object({
  auth: platformIntegrationSettingsSchema.shape.auth.partial().optional(),
  providers: z.object({
    google: providerSettingsPatchSchema.optional(),
    facebook: providerSettingsPatchSchema.optional(),
    whatsapp: providerSettingsPatchSchema.optional(),
    telegram: providerSettingsPatchSchema.optional(),
    email: providerSettingsPatchSchema.optional(),
    sentry: providerSettingsPatchSchema.optional(),
    redis: providerSettingsPatchSchema.optional(),
    zoom: providerSettingsPatchSchema.optional(),
    googleMeet: providerSettingsPatchSchema.optional(),
    teams: providerSettingsPatchSchema.optional(),
    youtubeLive: providerSettingsPatchSchema.optional(),
  }).partial().optional(),
  seo: seoSettingsSchema.partial().optional(),
  contactWidget: contactWidgetSchema.partial().optional(),
  externalPlatforms: z.array(externalPlatformSchema).optional(),
  registrationFields: platformIntegrationSettingsSchema.shape.registrationFields.optional(),
});
