import { Router } from "express";
import { contentBootstrapRouter, clearContentBootstrapCache } from "../modules/content/http/contentBootstrapRoutes.js";
import { contentGroupRouter } from "../modules/content/http/contentGroupRoutes.js";
import { contentLearningRouter } from "../modules/content/http/contentLearningRoutes.js";
import { contentPlatformIntegrationRouter } from "../modules/content/http/contentPlatformIntegrationRoutes.js";
import { contentPlatformIntegrationRuntimeRouter } from "../modules/content/http/contentPlatformIntegrationRuntimeRoutes.js";
import { contentPresentationRouter } from "../modules/content/http/contentPresentationRoutes.js";
import { contentReviewRouter } from "../modules/content/http/contentReviewRoutes.js";
import { contentSchoolCommercialRouter } from "../modules/content/http/contentSchoolCommercialRoutes.js";
import { contentSchoolRelationsRouter } from "../modules/content/http/contentSchoolRelationsRoutes.js";
import { contentSchoolReportImportRouter } from "../modules/content/http/contentSchoolReportImportRoutes.js";
import { contentStudyPlanRouter } from "../modules/content/http/contentStudyPlanRoutes.js";

export const contentRouter = Router();

contentRouter.use((req, _res, next) => {
  if (req.method !== "GET") {
    clearContentBootstrapCache();
  }
  next();
});

contentRouter.use(contentPresentationRouter);
contentRouter.use(contentPlatformIntegrationRouter);
contentRouter.use(contentPlatformIntegrationRuntimeRouter);
contentRouter.use(contentStudyPlanRouter);
contentRouter.use(contentLearningRouter);
contentRouter.use(contentGroupRouter);
contentRouter.use(contentSchoolCommercialRouter);
contentRouter.use(contentSchoolReportImportRouter);
contentRouter.use(contentSchoolRelationsRouter);
contentRouter.use(contentReviewRouter);
contentRouter.use(contentBootstrapRouter);
