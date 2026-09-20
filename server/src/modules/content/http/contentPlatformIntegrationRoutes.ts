import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { optionalAuth, requireAuth, requireRole } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { PlatformIntegrationSettingsModel } from "../../../models/PlatformIntegrationSettings.js";
import { PlatformIntegrationHistoryModel } from "../../../models/PlatformIntegrationHistory.js";
import { getRedisHealth, isRedisConfigured } from "../../../config/redis.js";
import { decryptIntegrationSecretsForRuntime, encryptIntegrationSecretsAtRest } from "../../../utils/integrationSecretsCrypto.js";
import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "./platformIntegrationSchemas.js";
import { defaultPlatformIntegrationSettings } from "../integrations/platformIntegrationDefaults.js";
import {
  buildPublicBaseUrl,
  maskIntegrationSnapshot,
  maskSensitiveProviderValues,
  mergeSensitiveProviderValues,
  normalizeBaseUrl,
  sanitizeAndValidateExternalPlatforms,
} from "../integrations/platformIntegrationRuntime.js";

export const contentPlatformIntegrationRouter = Router();

contentPlatformIntegrationRouter.get(
  "/platform-integrations",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    let settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" });
    if (!settings) {
      settings = await PlatformIntegrationSettingsModel.create(defaultPlatformIntegrationSettings);
    }

    const runtimeSettings = decryptIntegrationSecretsForRuntime((settings.toJSON ? settings.toJSON() : settings) as Record<string, unknown>);
    const safeSettings = maskSensitiveProviderValues(runtimeSettings);
    return res.json(safeSettings);
  }),
);

contentPlatformIntegrationRouter.get(
  "/public-contact-widget",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
    const fallback = {
      enabled: false,
      channel: "whatsapp",
      whatsappNumber: "",
      whatsappMessage: "",
      openInNewTab: true,
      showOnPublicPages: true,
      showOnDashboardPages: false,
    };
    const widget = (settings?.contactWidget as Record<string, unknown> | undefined) || fallback;
    const safeWidget = {
      enabled: Boolean(widget.enabled),
      channel: (String(widget.channel || "whatsapp") as "whatsapp" | "telegram" | "phone"),
      whatsappNumber: String(widget.whatsappNumber || "").replace(/[^\d+]/g, ""),
      whatsappMessage: String(widget.whatsappMessage || ""),
      openInNewTab: widget.openInNewTab !== false,
      showOnPublicPages: widget.showOnPublicPages !== false,
      showOnDashboardPages: widget.showOnDashboardPages === true,
    };
    return res.json(safeWidget);
  }),
);

contentPlatformIntegrationRouter.patch(
  "/platform-integrations",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const partialPayload = platformIntegrationSettingsPatchSchema.parse(req.body);
    const previous = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
    const decryptedPrevious = previous
      ? decryptIntegrationSecretsForRuntime(previous as unknown as Record<string, unknown>)
      : null;
    const baseSettings = (decryptedPrevious || defaultPlatformIntegrationSettings) as Record<string, any>;

    const nextPayload = {
      ...baseSettings,
      ...partialPayload,
      auth: {
        ...(baseSettings.auth || {}),
        ...(partialPayload.auth || {}),
      },
      providers: (() => {
        const baseProviders = (baseSettings.providers || {}) as Record<string, Record<string, unknown>>;
        const incomingProviders = (partialPayload.providers || {}) as Record<string, Record<string, unknown>>;
        const mergedProviders: Record<string, Record<string, unknown>> = { ...baseProviders };
        Object.entries(incomingProviders).forEach(([providerKey, providerPatch]) => {
          mergedProviders[providerKey] = {
            ...(baseProviders[providerKey] || {}),
            ...(providerPatch || {}),
          };
        });
        return mergedProviders;
      })(),
      seo: {
        ...(baseSettings.seo || {}),
        ...(partialPayload.seo || {}),
      },
      contactWidget: {
        ...(baseSettings.contactWidget || {}),
        ...(partialPayload.contactWidget || {}),
      },
      externalPlatforms: partialPayload.externalPlatforms ?? baseSettings.externalPlatforms ?? [],
      registrationFields: partialPayload.registrationFields ?? baseSettings.registrationFields ?? [],
    };

    const payload = platformIntegrationSettingsSchema.parse(nextPayload);
    const validatedExternalPlatforms = sanitizeAndValidateExternalPlatforms(
      payload.externalPlatforms as unknown as Array<Record<string, unknown>>,
    );
    (payload as unknown as { externalPlatforms: Array<Record<string, unknown>> }).externalPlatforms = validatedExternalPlatforms;

    if (previous) {
      await PlatformIntegrationHistoryModel.create({
        settingsKey: "default",
        snapshot: previous,
        updatedBy: req.authUser?.id || "",
        note: "auto-backup before update",
      });
    }
    const mergedPayload = mergeSensitiveProviderValues(
      payload as unknown as Record<string, unknown>,
      decryptedPrevious as Record<string, unknown> | null,
    );
    const encryptedPayload = encryptIntegrationSecretsAtRest(mergedPayload);
    const settings = await PlatformIntegrationSettingsModel.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          ...encryptedPayload,
          updatedBy: req.authUser?.id || "",
        },
        $setOnInsert: { key: "default" },
      },
      { new: true, upsert: true },
    );

    const runtimeSettings = decryptIntegrationSecretsForRuntime((settings?.toJSON ? settings.toJSON() : settings) as Record<string, unknown>);
    const safeSettings = maskSensitiveProviderValues(runtimeSettings);
    return res.json(safeSettings);
  }),
);

contentPlatformIntegrationRouter.get(
  "/platform-integrations/history",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const history = await PlatformIntegrationHistoryModel.find({ settingsKey: "default" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const safeHistory = history.map((item) => {
      const maskedSnapshot = maskIntegrationSnapshot((item as { snapshot?: unknown }).snapshot).providerSecretState;
      return {
        _id: String(item._id),
        updatedBy: String(item.updatedBy || ""),
        note: String(item.note || ""),
        createdAt: item.createdAt || null,
        providerSecretState: maskedSnapshot,
      };
    });
    return res.json({ history: safeHistory });
  }),
);

contentPlatformIntegrationRouter.get(
  "/platform-integrations/setup-checklist",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
    const runtimeSettings = settings
      ? decryptIntegrationSecretsForRuntime(settings as unknown as Record<string, unknown>)
      : null;
    const publicBaseUrl = buildPublicBaseUrl(
      runtimeSettings as { seo?: { canonicalBaseUrl?: string } } | null,
      `${req.protocol}://${req.get("host") || ""}`,
    );
    const apiBaseUrl = `${normalizeBaseUrl(publicBaseUrl)}/api`;

    const providers = (runtimeSettings?.providers as Record<string, Record<string, unknown>> | undefined) || {};

    const checks = [
      {
        id: "google",
        title: "Google OAuth",
        envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
        callbackUrl: `${apiBaseUrl}/auth/google/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.google?.enabled),
        isConfigured: Boolean(providers.google?.clientId && providers.google?.clientSecret),
        notes: "تأكد من إضافة نفس Callback في Google Cloud.",
      },
      {
        id: "facebook",
        title: "Facebook OAuth",
        envKeys: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
        callbackUrl: `${apiBaseUrl}/auth/facebook/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.facebook?.enabled),
        isConfigured: Boolean(providers.facebook?.clientId && providers.facebook?.clientSecret),
        notes: "أضف domain المنصة داخل App Domains في Meta.",
      },
      {
        id: "whatsapp",
        title: "WhatsApp Cloud",
        envKeys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"],
        callbackUrl: "",
        webhookUrl: `${apiBaseUrl}/webhooks/whatsapp`,
        enabled: Boolean(providers.whatsapp?.enabled),
        isConfigured: Boolean(providers.whatsapp?.accessToken && providers.whatsapp?.phoneNumberId && providers.whatsapp?.verifyToken),
        notes: "Webhook verification token لازم يطابق الإعداد داخل Meta.",
      },
      {
        id: "email",
        title: "Email Provider",
        envKeys: ["EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM"],
        callbackUrl: "",
        webhookUrl: "",
        enabled: Boolean(providers.email?.enabled),
        isConfigured: Boolean(providers.email?.apiKey && providers.email?.fromEmail),
        notes: "يفضل Resend أو SendGrid مع domain موثق.",
      },
      {
        id: "sentry",
        title: "Sentry",
        envKeys: ["SENTRY_DSN"],
        callbackUrl: "",
        webhookUrl: "",
        enabled: Boolean(providers.sentry?.enabled),
        isConfigured: Boolean(providers.sentry?.accessToken),
        notes: "أضف DSN في السيرفر والواجهة إذا مطلوب.",
      },
      {
        id: "redis",
        title: "Redis Managed",
        envKeys: ["REDIS_URL"],
        callbackUrl: "",
        webhookUrl: "",
        enabled: Boolean(providers.redis?.enabled),
        isConfigured: Boolean(providers.redis?.accessToken),
        notes: "مطلوب للتوسع: Rate Limit + Queue + Socket adapter.",
      },
      {
        id: "zoom",
        title: "Zoom",
        envKeys: ["ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
        callbackUrl: `${apiBaseUrl}/auth/zoom/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.zoom?.enabled),
        isConfigured: Boolean(providers.zoom?.clientId && providers.zoom?.clientSecret),
        notes: "OAuth app من Zoom Marketplace.",
      },
      {
        id: "googleMeet",
        title: "Google Meet",
        envKeys: ["GOOGLE_MEET_CLIENT_ID", "GOOGLE_MEET_CLIENT_SECRET"],
        callbackUrl: `${apiBaseUrl}/auth/google-meet/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.googleMeet?.enabled),
        isConfigured: Boolean(providers.googleMeet?.clientId && providers.googleMeet?.clientSecret),
        notes: "فعّل Google Calendar API للإنشاء.",
      },
      {
        id: "teams",
        title: "Microsoft Teams",
        envKeys: ["TEAMS_CLIENT_ID", "TEAMS_CLIENT_SECRET", "TEAMS_TENANT_ID"],
        callbackUrl: `${apiBaseUrl}/auth/teams/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.teams?.enabled),
        isConfigured: Boolean(providers.teams?.clientId && providers.teams?.clientSecret),
        notes: "تأكد من صلاحيات Microsoft Graph اللازمة.",
      },
      {
        id: "youtubeLive",
        title: "YouTube Live",
        envKeys: ["YOUTUBE_API_KEY"],
        callbackUrl: `${apiBaseUrl}/auth/youtube/callback`,
        webhookUrl: "",
        enabled: Boolean(providers.youtubeLive?.enabled),
        isConfigured: Boolean(providers.youtubeLive?.apiKey),
        notes: "فعّل YouTube Data API v3.",
      },
    ];

    const enabledCount = checks.filter((item) => item.enabled).length;
    const configuredEnabledCount = checks.filter((item) => item.enabled && item.isConfigured).length;

    return res.json({
      publicBaseUrl,
      apiBaseUrl,
      summary: {
        total: checks.length,
        enabled: enabledCount,
        configuredEnabled: configuredEnabledCount,
        blockers: checks.filter((item) => item.enabled && !item.isConfigured).map((item) => item.id),
      },
      checks,
    });
  }),
);

contentPlatformIntegrationRouter.get(
  "/platform-integrations/runtime-audit",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
    const runtimeSettings = settings
      ? decryptIntegrationSecretsForRuntime(settings as unknown as Record<string, unknown>)
      : null;
    const providers = (runtimeSettings?.providers as Record<string, Record<string, unknown>> | undefined) || {};

    const isDbConfigured = {
      google: Boolean(providers.google?.clientId && providers.google?.clientSecret),
      facebook: Boolean(providers.facebook?.clientId && providers.facebook?.clientSecret),
      whatsapp: Boolean(providers.whatsapp?.accessToken && providers.whatsapp?.phoneNumberId && providers.whatsapp?.verifyToken),
      email: Boolean(providers.email?.apiKey && providers.email?.fromEmail),
      sentry: Boolean(providers.sentry?.accessToken),
      redis: Boolean(providers.redis?.accessToken),
    };

    const emailProvider = String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
    const emailEnvConfigured =
      emailProvider === "console" ||
      (emailProvider === "resend" && Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) ||
      (emailProvider === "http" && Boolean(process.env.EMAIL_WEBHOOK_URL && process.env.EMAIL_WEBHOOK_URL.trim()));

    const whatsappProvider = String(process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
    const whatsappEnvConfigured =
      whatsappProvider === "console" ||
      (whatsappProvider === "whatsapp_cloud" &&
        Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_VERIFY_TOKEN)) ||
      (whatsappProvider === "http" && Boolean(process.env.WHATSAPP_WEBHOOK_URL && process.env.WHATSAPP_WEBHOOK_URL.trim()));

    const redisHealth = await getRedisHealth("queue", { required: false, timeoutMs: 1500 });
    const sentryEnvConfigured = Boolean(String(process.env.SENTRY_DSN || "").trim());

    const items = [
      {
        id: "google",
        title: "Google OAuth",
        enabled: Boolean(providers.google?.enabled),
        dbConfigured: isDbConfigured.google,
        envConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
      {
        id: "facebook",
        title: "Facebook OAuth",
        enabled: Boolean(providers.facebook?.enabled),
        dbConfigured: isDbConfigured.facebook,
        envConfigured: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      },
      {
        id: "email",
        title: "Email Provider",
        enabled: Boolean(providers.email?.enabled),
        dbConfigured: isDbConfigured.email,
        envConfigured: emailEnvConfigured,
      },
      {
        id: "whatsapp",
        title: "WhatsApp Provider",
        enabled: Boolean(providers.whatsapp?.enabled),
        dbConfigured: isDbConfigured.whatsapp,
        envConfigured: whatsappEnvConfigured,
      },
      {
        id: "sentry",
        title: "Sentry",
        enabled: Boolean(providers.sentry?.enabled),
        dbConfigured: isDbConfigured.sentry,
        envConfigured: sentryEnvConfigured,
      },
      {
        id: "redis",
        title: "Redis Managed",
        enabled: Boolean(providers.redis?.enabled),
        dbConfigured: isDbConfigured.redis,
        envConfigured: isRedisConfigured(),
        health: {
          ok: redisHealth.ok,
          status: redisHealth.status,
          latencyMs: redisHealth.latencyMs ?? null,
          error: redisHealth.error || "",
        },
      },
    ].map((item) => {
      const runtimeReady = item.enabled ? item.dbConfigured && item.envConfigured : true;
      return { ...item, runtimeReady };
    });

    return res.json({
      summary: {
        total: items.length,
        enabled: items.filter((item) => item.enabled).length,
        runtimeReady: items.filter((item) => item.enabled && item.runtimeReady).length,
        blocked: items.filter((item) => item.enabled && !item.runtimeReady).map((item) => item.id),
      },
      items,
    });
  }),
);

contentPlatformIntegrationRouter.post(
  "/platform-integrations/history/:id/restore",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const item = await PlatformIntegrationHistoryModel.findById(req.params.id).lean();
    if (!item?.snapshot || typeof item.snapshot !== "object") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "History snapshot not found." });
    }

    const runtimeSnapshot = decryptIntegrationSecretsForRuntime(item.snapshot as Record<string, unknown>);
    const parsedSnapshot = platformIntegrationSettingsSchema.parse(runtimeSnapshot as Record<string, unknown>);
    const encryptedPayload = encryptIntegrationSecretsAtRest(parsedSnapshot as unknown as Record<string, unknown>);
    const settings = await PlatformIntegrationSettingsModel.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          ...encryptedPayload,
          updatedBy: req.authUser?.id || "",
        },
        $setOnInsert: { key: "default" },
      },
      { new: true, upsert: true },
    );

    await PlatformIntegrationHistoryModel.create({
      settingsKey: "default",
      snapshot: settings?.toJSON?.() || settings,
      updatedBy: req.authUser?.id || "",
      note: `restore from ${String(req.params.id)}`,
    });

    const runtimeSettings = decryptIntegrationSecretsForRuntime((settings?.toJSON ? settings.toJSON() : settings) as Record<string, unknown>);
    const safeSettings = maskSensitiveProviderValues(runtimeSettings);
    return res.json({ settings: safeSettings, restoredFrom: req.params.id });
  }),
);
