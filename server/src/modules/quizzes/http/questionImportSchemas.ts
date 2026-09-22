import { z } from "zod";
import { questionBaseSchema } from "./questionQuerySchemas.js";

const sourceMetaSchema = questionBaseSchema.shape.sourceMeta.unwrap();

const batchIdSchema = z.string()
  .trim()
  .min(8)
  .max(160)
  .regex(/^[A-Z0-9][A-Z0-9._-]+$/, "Batch ID must use uppercase letters, digits, dot, underscore or dash");

const importItemSchema = questionBaseSchema.extend({
  questionCode: z.string().trim().min(3).max(120),
  sourceMeta: sourceMetaSchema.extend({
    sourceItemId: z.string().trim().min(3).max(200),
    importBatchId: z.string().trim().max(160).optional(),
  }),
});

export const questionImportBatchSchema = z.object({
  batchId: batchIdSchema,
  dryRun: z.boolean().optional().default(true),
  items: z.array(importItemSchema).min(1).max(100),
});

export const questionImportBatchParamsSchema = z.object({
  batchId: batchIdSchema,
});
