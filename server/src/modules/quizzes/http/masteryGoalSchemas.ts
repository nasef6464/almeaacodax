import { z } from "zod";

export const createMasteryGoalSchema = z.object({
  userId: z.string().min(1).optional(),
  pathId: z.string().min(1),
  subjectId: z.string().optional().default(""),
  targetType: z.enum(["topic", "section", "path"]),
  targetId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  targetMastery: z.number().min(50).max(100).default(90),
  horizon: z.enum(["short", "long"]).default("short"),
  dueDate: z.string().optional().default(""),
});

export const updateMasteryGoalSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  targetMastery: z.number().min(50).max(100).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["active", "achieved", "archived"]).optional(),
});
