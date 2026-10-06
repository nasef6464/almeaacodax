import { z } from "zod";

export const schoolSkillAggregateQuerySchema = z.object({
  groupBy: z.enum(["skill", "class", "student"]).default("skill"),
  pathId: z.string().trim().max(160).optional().default(""),
  subjectId: z.string().trim().max(160).optional().default(""),
  classId: z.string().trim().max(160).optional().default(""),
  studentId: z.string().trim().max(160).optional().default(""),
  skillId: z.string().trim().max(160).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).superRefine((value, ctx) => {
  if ((value.groupBy === "class" || value.groupBy === "student") && (!value.pathId || !value.subjectId || !value.skillId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "class/student drill-down requires pathId, subjectId and skillId",
      path: ["groupBy"],
    });
  }
});
