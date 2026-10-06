import { Router } from "express";
import { requireActiveAuth, requireAuth } from "../middleware/auth.js";
import { requireActiveClassroomSchoolContext } from "../middleware/classroomAuth.js";
import { classroomRouter as classroomFeatureRouter } from "./classroom.routes.js";

/**
 * Smart Classroom route-group boundary. Keep the public API mount stable while
 * refreshing the authenticated principal and active school context before any
 * classroom handler runs.
 */
export const classroomRouter = Router();
classroomRouter.use(requireAuth, requireActiveAuth, requireActiveClassroomSchoolContext, classroomFeatureRouter);
