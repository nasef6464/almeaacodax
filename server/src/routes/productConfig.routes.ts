import { Router } from "express";
import { HomepageSettingsModel } from "../models/HomepageSettings.js";
import { PlatformFontSettingsModel } from "../models/PlatformFontSettings.js";
import { PlatformIntegrationSettingsModel } from "../models/PlatformIntegrationSettings.js";
import { buildPublicProductConfig } from "../modules/product-config/application/publicProductConfig.js";

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
