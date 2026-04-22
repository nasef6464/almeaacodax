import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const courseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  thumbnail: z.string().optional(),
  instructor: z.string().min(1),
  price: z.number().default(0),
  currency: z.string().default("SAR"),
  duration: z.number().default(0),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
  rating: z.number().default(0),
  progress: z.number().default(0),
  category: z.string().default(""),
  subject: z.string().default(""),
  features: z.array(z.string()).default([]),
  description: z.string().optional(),
  instructorBio: z.string().optional(),
  modules: z.array(z.any()).default([]),
  isPublished: z.boolean().default(false),
  isPackage: z.boolean().default(false),
  packageType: z.enum(["courses", "videos", "tests"]).optional(),
  originalPrice: z.number().nullable().optional(),
  includedCourses: z.array(z.string()).optional(),
  prerequisiteCourseIds: z.array(z.string()).optional(),
  dripContentEnabled: z.boolean().optional(),
  certificateEnabled: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
});

export const courseRouter = Router();

courseRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await CourseModel.find().sort({ createdAt: -1 });
    res.json(items);
  }),
);

courseRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await CourseModel.findById(req.params.id);
    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }
    return res.json(item);
  }),
);

courseRouter.post(
  "/",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = courseSchema.parse(req.body);
    const created = await CourseModel.create({
      ...payload,
      ...(payload.id ? { _id: payload.id } : {}),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

courseRouter.patch(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = courseSchema.partial().parse(req.body);
    const updated = await CourseModel.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }
    return res.json(updated);
  }),
);

courseRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await CourseModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }
    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);
