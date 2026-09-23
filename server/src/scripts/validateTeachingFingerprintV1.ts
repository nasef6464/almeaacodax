import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";

const PATH_ID = "p_1777779639431";
const SUBJECT_ID = "sub_1777779748206";
const EXPECTED_MAIN_COUNT = 25;
const EXPECTED_SUBSKILL_COUNT = 95;

const textOrListSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

const nullableMethodSchema = z.union([
  z.string().trim().min(1),
  z.null(),
]);

const fingerprintItemSchema = z.object({
  mainSkillId: z.string().trim().min(1),
  subSkillId: z.string().trim().min(1),
  subSkillName: z.string().trim().min(1),
  conceptSummary: z.string().trim().min(1),
  coreLawOrIdea: z.string().trim().min(1),
  standardMethod: z.string().trim().min(1),
  quduratFastMethod: z.string().trim().min(1),
  mentalMathMethod: nullableMethodSchema,
  eliminationMethod: nullableMethodSchema,
  optionTestingMethod: nullableMethodSchema,
  commonMistakes: textOrListSchema,
  hintStyle1: z.string().trim().min(1),
  hintStyle2: z.string().trim().min(1),
  explanationStyle: z.string().trim().min(1),
  speechStyle: z.string().trim().min(1),
  representativePatterns: textOrListSchema,
}).passthrough();

type FingerprintItem = z.infer<typeof fingerprintItemSchema>;

const normalize = (value: unknown) => String(value ?? "").trim();

const readFingerprint = async (filePath: string) => {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.fingerprints)
        ? raw.fingerprints
        : null;

  if (!items) {
    throw new Error("Teaching Fingerprint must be a JSON array or an object with items/fingerprints array");
  }

  return items.map((item, index) => {
    const parsed = fingerprintItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(
        `Invalid fingerprint row ${index + 1}: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    return parsed.data;
  });
};

const main = async () => {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Usage: npm run validate:teaching-fingerprint -- /absolute/or/relative/teaching_fingerprint_v1_95.json");
  }

  const filePath = path.resolve(process.cwd(), input);
  const items = await readFingerprint(filePath);

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");

  try {
    const skillDocs = await db.collection("skills").find({
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
    }).project({ _id: 0, id: 1, name: 1, subSkills: 1 }).toArray();

    const canonicalMainIds = new Set<string>();
    const canonicalSubskills = new Map<string, { mainSkillId: string; name: string }>();

    for (const skill of skillDocs as any[]) {
      const mainSkillId = normalize(skill.id);
      if (!mainSkillId) continue;
      canonicalMainIds.add(mainSkillId);

      for (const subSkill of skill.subSkills || []) {
        const subSkillId = normalize(subSkill?.id);
        if (!subSkillId) continue;
        canonicalSubskills.set(subSkillId, {
          mainSkillId,
          name: normalize(subSkill?.name),
        });
      }
    }

    const issues: Array<{
      row: number;
      subSkillId: string;
      severity: "ERROR" | "WARN";
      message: string;
    }> = [];
    const seen = new Map<string, number>();
    const coveredMainIds = new Set<string>();

    const push = (
      row: number,
      item: FingerprintItem,
      severity: "ERROR" | "WARN",
      message: string,
    ) => {
      issues.push({
        row,
        subSkillId: normalize(item.subSkillId),
        severity,
        message,
      });
    };

    items.forEach((item, index) => {
      const row = index + 1;
      const mainSkillId = normalize(item.mainSkillId);
      const subSkillId = normalize(item.subSkillId);
      const subSkillName = normalize(item.subSkillName);

      if (seen.has(subSkillId)) {
        push(row, item, "ERROR", `Duplicate subSkillId; first seen at row ${seen.get(subSkillId)}`);
      } else {
        seen.set(subSkillId, row);
      }

      if (!canonicalMainIds.has(mainSkillId)) {
        push(row, item, "ERROR", `Unknown mainSkillId: ${mainSkillId}`);
      } else {
        coveredMainIds.add(mainSkillId);
      }

      const canonical = canonicalSubskills.get(subSkillId);
      if (!canonical) {
        push(row, item, "ERROR", `Unknown subSkillId: ${subSkillId}`);
        return;
      }

      if (canonical.mainSkillId !== mainSkillId) {
        push(
          row,
          item,
          "ERROR",
          `subSkillId ${subSkillId} belongs to ${canonical.mainSkillId}, not ${mainSkillId}`,
        );
      }

      if (canonical.name !== subSkillName) {
        push(
          row,
          item,
          "ERROR",
          `subSkillName mismatch. Canonical name: ${canonical.name}`,
        );
      }

      if (item.hintStyle1 === item.hintStyle2) {
        push(row, item, "WARN", "hintStyle1 and hintStyle2 are identical; stronger hint should be meaningfully different");
      }

      if (item.mentalMathMethod === "" as any) {
        push(row, item, "ERROR", "mentalMathMethod must be null when unsupported, not blank");
      }
      if (item.eliminationMethod === "" as any) {
        push(row, item, "ERROR", "eliminationMethod must be null when unsupported, not blank");
      }
      if (item.optionTestingMethod === "" as any) {
        push(row, item, "ERROR", "optionTestingMethod must be null when unsupported, not blank");
      }
    });

    for (const [subSkillId, canonical] of canonicalSubskills) {
      if (!seen.has(subSkillId)) {
        issues.push({
          row: 0,
          subSkillId,
          severity: "ERROR",
          message: `Missing canonical subskill ${subSkillId}: ${canonical.name}`,
        });
      }
    }

    if (items.length !== EXPECTED_SUBSKILL_COUNT) {
      issues.push({
        row: 0,
        subSkillId: "",
        severity: "ERROR",
        message: `Expected exactly ${EXPECTED_SUBSKILL_COUNT} fingerprint rows, received ${items.length}`,
      });
    }

    if (canonicalMainIds.size !== EXPECTED_MAIN_COUNT) {
      issues.push({
        row: 0,
        subSkillId: "",
        severity: "ERROR",
        message: `Live taxonomy main-skill count is ${canonicalMainIds.size}, expected ${EXPECTED_MAIN_COUNT}`,
      });
    }

    if (canonicalSubskills.size !== EXPECTED_SUBSKILL_COUNT) {
      issues.push({
        row: 0,
        subSkillId: "",
        severity: "ERROR",
        message: `Live taxonomy subskill count is ${canonicalSubskills.size}, expected ${EXPECTED_SUBSKILL_COUNT}`,
      });
    }

    if (coveredMainIds.size !== EXPECTED_MAIN_COUNT) {
      issues.push({
        row: 0,
        subSkillId: "",
        severity: "ERROR",
        message: `Fingerprint covers ${coveredMainIds.size} main skills, expected ${EXPECTED_MAIN_COUNT}`,
      });
    }

    const errors = issues.filter((issue) => issue.severity === "ERROR");
    const warnings = issues.filter((issue) => issue.severity === "WARN");

    console.log(JSON.stringify({
      file: filePath,
      status: errors.length === 0 ? "PASS" : "FAIL",
      contract: "TEACHING_FINGERPRINT_V1",
      schemaFieldCount: 16,
      totalItems: items.length,
      coveredMainSkills: coveredMainIds.size,
      coveredSubskills: seen.size,
      taxonomy: {
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        mainSkills: canonicalMainIds.size,
        subSkills: canonicalSubskills.size,
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
