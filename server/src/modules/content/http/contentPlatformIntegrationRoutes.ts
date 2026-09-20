import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { optionalAuth, requireAuth, requireRole } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { PlatformIntegrationSettingsModel } from "../../../models/PlatformIntegrationSettings.js";
import { PlatformIntegrationHistoryModel } from "../../../models/PlatformIntegrationHistory.js";
import { decryptIntegrationSecretsForRuntime, encryptIntegrationSecretsAtRest } from "../../../utils/integrationSecretsCrypto.js";
import { platformIntegrationSettingsPatchSchema, platformIntegrationSettingsSchema } from "./platformIntegrationSchemas.js";
import { defaultPlatformIntegrationSettings } from "../integrations/platformIntegrationDefaults.js";
import {
  maskIntegrationSnapshot,
  maskSensitiveProviderValues,
  mergeSensitiveProviderValues,
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
