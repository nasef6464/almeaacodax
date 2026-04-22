import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PathModel } from "../models/Path.js";
import { LevelModel } from "../models/Level.js";
import { SubjectModel } from "../models/Subject.js";

const pathSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
  iconUrl: z.string().optional(),
  iconStyle: z.enum(["default", "modern", "minimal", "playful"]).optional(),
  showInNavbar: z.boolean().optional(),
  showInHome: z.boolean().optional(),
  isActive: z.boolean().optional(),
  parentPathId: z.string().nullable().optional(),
  description: z.string().optional(),
});

const levelSchema = z.object({
  id: z.string().optional(),
  pathId: z.string().min(1),
  name: z.string().min(1),
});

const subjectSchema = z.object({
  id: z.string().optional(),
  pathId: z.string().min(1),
  levelId: z.string().nullable().optional(),
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
  iconUrl: z.string().optional(),
  iconStyle: z.enum(["default", "modern", "minimal", "playful"]).optional(),
  settings: z.record(z.any()).optional(),
});

export const taxonomyRouter = Router();

taxonomyRouter.get(
  "/bootstrap",
  asyncHandler(async (_req, res) => {
    const [paths, levels, subjects] = await Promise.all([
      PathModel.find().sort({ createdAt: 1 }),
      LevelModel.find().sort({ createdAt: 1 }),
      SubjectModel.find().sort({ createdAt: 1 }),
    ]);

    res.json({ paths, levels, subjects });
  }),
);

taxonomyRouter.post(
  "/paths",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = pathSchema.parse(req.body);
    const created = await PathModel.create({
      ...payload,
      ...(payload.id ? { _id: payload.id } : {}),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

taxonomyRouter.patch(
  "/paths/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = pathSchema.partial().parse(req.body);
    const updated = await PathModel.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Path not found" });
    }
    return res.json(updated);
  }),
);

taxonomyRouter.delete(
  "/paths/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await PathModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Path not found" });
    }
    await Promise.all([
      LevelModel.deleteMany({ pathId: req.params.id }),
      SubjectModel.deleteMany({ pathId: req.params.id }),
    ]);
    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);

taxonomyRouter.post(
  "/levels",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = levelSchema.parse(req.body);
    const created = await LevelModel.create({
      ...payload,
      ...(payload.id ? { _id: payload.id } : {}),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

taxonomyRouter.patch(
  "/levels/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = levelSchema.partial().parse(req.body);
    const updated = await LevelModel.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Level not found" });
    }
    return res.json(updated);
  }),
);

taxonomyRouter.delete(
  "/levels/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await LevelModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Level not found" });
    }
    await SubjectModel.deleteMany({ levelId: req.params.id });
    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);

taxonomyRouter.post(
  "/subjects",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = subjectSchema.parse(req.body);
    const created = await SubjectModel.create({
      ...payload,
      ...(payload.id ? { _id: payload.id } : {}),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

taxonomyRouter.patch(
  "/subjects/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = subjectSchema.partial().parse(req.body);
    const updated = await SubjectModel.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Subject not found" });
    }
    return res.json(updated);
  }),
);

taxonomyRouter.delete(
  "/subjects/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await SubjectModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Subject not found" });
    }
    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);
