import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";

const PATH_ID = "p_1777779639431";
const SUBJECT_ID = "sub_1777779748206";

const manifestItemSchema = z.object({
  documentCode: z.enum(["FND26", "COL2627"]),
  pdfPageIndex: z.coerce.number().int().positive(),
  printedPageNumber: z.coerce.number().int().nonnegative().nullable().optional(),
  printedQuestionNumber: z.coerce.number().int().nonnegative().nullable().optional(),
  sourceItemId: z.string().trim().min(1),
  itemType: z.string().trim().min(1),
  hasChoices: z.boolean(),
  importAction: z.enum(["IMPORT", "SKIP"]),
  needsReview: z.boolean().optional().default(false),
  reviewReason: z.string().optional().default(""),

  questionCode: z.string().trim().optional(),
  mainSkillId: z.string().trim().optional(),
  subSkillId: z.string().trim().optional(),
  questionText: z.string().optional(),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctLetter: z.enum(["أ", "ب", "ج", "د"]).optional(),
  correctOptionIndex: z.coerce.number().int().min(0).max(3).optional(),
  aiReadableText: z.string().optional(),
  speechText: z.string().optional(),
  visualDescription: z.string().optional(),
  mathExpressionsJson: z.unknown().optional(),
  hint1: z.string().optional(),
  hint2: z.string().optional(),
  solvingStrategy: z.string().optional(),
  mentalStrategy: z.string().optional(),
  fullExplanation: z.string().optional(),
  answerValidation: z.string().optional(),
  confidence: z.union([z.number(), z.string()]).optional(),
  cropInstruction: z.string().optional(),
  anchorStartText: z.string().optional(),
  anchorEndText: z.string().optional(),
}).passthrough();

type ManifestItem = z.infer<typeof manifestItemSchema>;

const normalize = (value: unknown) => String(value ?? "").trim();
const letterToIndex: Record<string, number> = { "أ": 0, "ب": 1, "ج": 2, "د": 3 };

const expectedQuestionCode = (item: ManifestItem) => {
  if (item.printedPageNumber == null || item.printedQuestionNumber == null) return null;
  const page = String(item.printedPageNumber).padStart(3, "0");
  const question = String(item.printedQuestionNumber).padStart(2, "0");
  return `QDR-QNT-${item.documentCode}-P${page}-Q${question}`;
};

const validateSourceItemId = (item: ManifestItem) => {
  const printedPage = item.printedPageNumber == null ? "NA" : String(item.printedPageNumber).padStart(3, "0");
  const question = item.printedQuestionNumber == null ? "NA" : String(item.printedQuestionNumber).padStart(2, "0");
  const expected = `${item.documentCode}-PDF${String(item.pdfPageIndex).padStart(3, "0")}-P${printedPage}-N${question}`;
  return { expected, matches: item.sourceItemId === expected };
};

const readManifest = async (filePath: string) => {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
  if (!items) throw new Error("Manifest must be a JSON array or an object with an items array");
  return items.map((item, index) => {
    const parsed = manifestItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Invalid manifest row ${index + 1}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    }
    return parsed.data;
  });
};

const main = async () => {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Usage: npm run validate:question-manifest -- /absolute/or/relative/manifest.json");
  }

  const filePath = path.resolve(process.cwd(), input);
  const items = await readManifest(filePath);

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");

  try {
    const skillDocs = await db.collection("skills").find({
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
    }).project({ _id: 0, id: 1, sectionId: 1, subSkills: 1 }).toArray();

    const mainToSubs = new Map<string, Set<string>>();
    const subToMain = new Map<string, string>();
    for (const skill of skillDocs as any[]) {
      const mainId = normalize(skill.id);
      if (!mainId) continue;
      const subSet = new Set<string>();
      for (const sub of skill.subSkills || []) {
        const subId = normalize(sub?.id);
        if (!subId) continue;
        subSet.add(subId);
        subToMain.set(subId, mainId);
      }
      mainToSubs.set(mainId, subSet);
    }

    const issues: Array<{ row: number; sourceItemId: string; severity: "ERROR" | "WARN"; message: string }> = [];
    const seenCodes = new Map<string, number>();
    const seenSourceIds = new Map<string, number>();

    const push = (row: number, item: ManifestItem, severity: "ERROR" | "WARN", message: string) => {
      issues.push({ row, sourceItemId: item.sourceItemId, severity, message });
    };

    items.forEach((item, idx) => {
      const row = idx + 1;

      if (seenSourceIds.has(item.sourceItemId)) {
        push(row, item, "ERROR", `Duplicate sourceItemId; first seen at row ${seenSourceIds.get(item.sourceItemId)}`);
      } else {
        seenSourceIds.set(item.sourceItemId, row);
      }

      const sourceCheck = validateSourceItemId(item);
      if (!sourceCheck.matches) {
        push(row, item, "WARN", `sourceItemId differs from canonical form: ${sourceCheck.expected}`);
      }

      if (item.importAction === "SKIP") {
        if (item.questionCode) push(row, item, "WARN", "SKIP row should not need a questionCode");
        return;
      }

      const requiredTextFields: Array<[keyof ManifestItem, string]> = [
        ["questionCode", "questionCode"],
        ["mainSkillId", "mainSkillId"],
        ["subSkillId", "subSkillId"],
        ["questionText", "questionText"],
        ["aiReadableText", "aiReadableText"],
        ["speechText", "speechText"],
        ["fullExplanation", "fullExplanation"],
        ["cropInstruction", "cropInstruction"],
        ["anchorStartText", "anchorStartText"],
        ["anchorEndText", "anchorEndText"],
      ];
      for (const [key, label] of requiredTextFields) {
        if (!normalize(item[key])) push(row, item, "ERROR", `IMPORT row is missing ${label}`);
      }

      if (!item.hasChoices) push(row, item, "ERROR", "IMPORT row must have hasChoices=true");
      const options = [item.optionA, item.optionB, item.optionC, item.optionD].map(normalize);
      if (options.some((value) => !value)) push(row, item, "ERROR", "IMPORT row must include optionA..optionD");

      if (item.correctLetter == null || item.correctOptionIndex == null) {
        push(row, item, "ERROR", "IMPORT row must include correctLetter and correctOptionIndex");
      } else if (letterToIndex[item.correctLetter] !== item.correctOptionIndex) {
        push(row, item, "ERROR", "correctLetter does not match correctOptionIndex");
      }

      const questionCode = normalize(item.questionCode).toUpperCase();
      if (questionCode) {
        if (!/^QDR-QNT-(FND26|COL2627)-P\d{3}-Q\d{2,}$/.test(questionCode)) {
          push(row, item, "ERROR", "questionCode does not match the deterministic V2 format");
        }
        if (seenCodes.has(questionCode)) {
          push(row, item, "ERROR", `Duplicate questionCode; first seen at row ${seenCodes.get(questionCode)}`);
        } else {
          seenCodes.set(questionCode, row);
        }
        const expectedCode = expectedQuestionCode(item);
        if (expectedCode && questionCode !== expectedCode) {
          push(row, item, "ERROR", `questionCode should be ${expectedCode}`);
        }
      }

      const mainId = normalize(item.mainSkillId);
      const subId = normalize(item.subSkillId);
      if (!mainToSubs.has(mainId)) {
        push(row, item, "ERROR", `Unknown mainSkillId: ${mainId}`);
      } else if (!mainToSubs.get(mainId)?.has(subId)) {
        const actualParent = subToMain.get(subId);
        push(
          row,
          item,
          "ERROR",
          actualParent
            ? `subSkillId ${subId} belongs to ${actualParent}, not ${mainId}`
            : `Unknown subSkillId: ${subId}`,
        );
      }

      if (normalize(item.answerValidation).toUpperCase() === "CONFLICT" && !item.needsReview) {
        push(row, item, "ERROR", "answerValidation=CONFLICT requires needsReview=true");
      }
    });

    const importCount = items.filter((item) => item.importAction === "IMPORT").length;
    const skipCount = items.length - importCount;
    const errors = issues.filter((issue) => issue.severity === "ERROR");
    const warnings = issues.filter((issue) => issue.severity === "WARN");

    console.log(JSON.stringify({
      file: filePath,
      status: errors.length === 0 ? "PASS" : "FAIL",
      totalItems: items.length,
      importCount,
      skipCount,
      taxonomy: {
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        mainSkills: mainToSubs.size,
        subSkills: [...mainToSubs.values()].reduce((sum, set) => sum + set.size, 0),
      },
      errors: errors.length,
      warnings: warnings.length,
      issues,
    }, null, 2));

    if (errors.length > 0) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
