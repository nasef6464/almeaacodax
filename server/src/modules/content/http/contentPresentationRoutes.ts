import { Router } from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { optionalAuth, requireAuth, requireRole } from "../../../middleware/auth.js";
import { AnnouncementAdModel } from "../../../models/AnnouncementAd.js";
import { HomepageSettingsModel } from "../../../models/HomepageSettings.js";
import { PlatformFontSettingsModel } from "../../../models/PlatformFontSettings.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  announcementAdSchema,
  announcementAdUpdateSchema,
  homepageSettingsSchema,
  platformFontSettingsSchema,
} from "./platformPresentationSchemas.js";
import {
  defaultHomepageSettings,
  defaultPlatformFontSettings,
} from "../presentation/platformPresentationDefaults.js";

const buildPresentationDocumentQuery = (value: string) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return { $or: [{ id: value }, { _id: value }] };
  }

  return { id: value };
};

export const contentPresentationRouter = Router();

contentPresentationRouter.get(
  "/homepage-settings",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    // Single atomic upsert avoids duplicate-key 500s when public visitors
    // request a freshly initialized homepage at the same time. $setOnInsert
    // never overwrites administrator customizations already stored.
    const settings = await HomepageSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: defaultHomepageSettings },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.json(settings);
  }),
);

contentPresentationRouter.patch(
  "/homepage-settings",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = homepageSettingsSchema.parse(req.body);
    const settings = await HomepageSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $set: payload, $setOnInsert: { key: "default" } },
      { new: true, upsert: true },
    );

    return res.json(settings);
  }),
);

contentPresentationRouter.get(
  "/platform-font-settings",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    // Fonts have the same first-read concurrency risk as homepage settings.
    const settings = await PlatformFontSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: defaultPlatformFontSettings },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.json(settings);
  }),
);

contentPresentationRouter.patch(
  "/platform-font-settings",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = platformFontSettingsSchema.parse(req.body);
    const settings = await PlatformFontSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $set: payload, $setOnInsert: { key: "default" } },
      { new: true, upsert: true },
    );

    return res.json(settings);
  }),
);

contentPresentationRouter.get(
  "/announcement-ads",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    const announcementAds = await AnnouncementAdModel.find({
      isActive: { $ne: false },
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .select("title body imageUrl ctaLabel ctaUrl audience displayMode frequency imageFit delaySeconds isActive startsAt endsAt priority createdAt updatedAt")
      .sort({ priority: 1, createdAt: -1 })
      .limit(8);

    return res.json({ announcementAds });
  }),
);

contentPresentationRouter.post(
  "/announcement-ads",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = announcementAdSchema.parse(req.body);
    const created = await AnnouncementAdModel.create({
      ...payload,
      createdAt: payload.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentPresentationRouter.patch(
  "/announcement-ads/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = announcementAdUpdateSchema.parse(req.body);
    const updated = await AnnouncementAdModel.findOneAndUpdate(
      buildPresentationDocumentQuery(req.params.id),
      { ...payload, updatedAt: Date.now() },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Announcement ad not found" });
    }

    return res.json(updated);
  }),
);

contentPresentationRouter.delete(
  "/announcement-ads/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const deleted = await AnnouncementAdModel.findOneAndDelete(buildPresentationDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Announcement ad not found" });
    }

    return res.json({ success: true });
  }),
);
