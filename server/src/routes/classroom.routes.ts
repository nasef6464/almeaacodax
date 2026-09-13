import { Router } from "express";
import { registerClassroomAggregateRoutes } from "./classroom/registerClassroomAggregateRoutes.js";
import { registerClassroomCompetitionRoutes } from "./classroom/registerClassroomCompetitionRoutes.js";
import { registerClassroomInsightsRoutes } from "./classroom/registerClassroomInsightsRoutes.js";
import { registerClassroomStudentRoutes } from "./classroom/registerClassroomStudentRoutes.js";
import { registerClassroomSupervisorRoutes } from "./classroom/registerClassroomSupervisorRoutes.js";
import { registerClassroomTeacherRoutes } from "./classroom/registerClassroomTeacherRoutes.js";
import { registerClassroomTemplateRoutes } from "./classroom/registerClassroomTemplateRoutes.js";

export const classroomRouter = Router();

registerClassroomTeacherRoutes(classroomRouter);
registerClassroomTemplateRoutes(classroomRouter);
registerClassroomStudentRoutes(classroomRouter);
registerClassroomSupervisorRoutes(classroomRouter);
registerClassroomAggregateRoutes(classroomRouter);
registerClassroomCompetitionRoutes(classroomRouter);
registerClassroomInsightsRoutes(classroomRouter);
