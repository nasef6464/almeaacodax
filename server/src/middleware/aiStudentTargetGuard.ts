import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { canTargetStudentForAi } from "../modules/ai/application/aiStudentTargetAuthorization.js";

/** Guard AI endpoints that accept an optional studentId before learning data is read. */
export const aiStudentTargetGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = req.authUser!;
    const targetStudentId = String(req.body?.studentId || actor.id);
    if (!(await canTargetStudentForAi(actor, targetStudentId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this student." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
