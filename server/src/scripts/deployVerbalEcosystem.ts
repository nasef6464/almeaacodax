import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "node:crypto";
import { QuestionPassageModel } from "../models/QuestionPassage.js";
import { env } from "../config/env.js";
import {
  VERBAL_SUBSKILL_TO_MAIN,
  VERBAL_TAXONOMY,
  validateVerbalTaxonomyV2,
} from "./deployVerbalTaxonomy22.js";
import { migrateVerbalTaxonomy22 } from "./migrateVerbalTaxonomy22.js";

const VERBAL_PATH_ID = "p_1777779639431";
const VERBAL_SUBJECT_ID = "sub_1777779759038";
const APPROVED_SOURCES = new Set(["abdelbaset", "anas"]);

const asString = (value: unknown) => String(value ?? "").trim();

type ApprovedQuestion = {
  id: string;
  canonicalId: string;
  text: string;
  options: unknown[];
  correctOptionIndex: number;
  mainSkillId: string;
  subSkillId: string;
  sourceBook: "abdelbaset" | "anas";
  sourcePage: number;
  sourceQuestionNumber: string | number;
  explanation?: string;
  difficulty?: string;
  passageId?: string;
  passageTitle?: string;
  passageText?: string;
};

function loadAndValidateApprovedBank(bankPath: string): ApprovedQuestion[] {
  if (!fs.existsSync(bankPath)) {
    throw new Error(
      `VERBAL26 approved bank not found at ${bankPath}. Refusing to use raw/recovery text as a production source.`,
    );
  }

  const parsed = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("VERBAL26 approved bank must be a non-empty array");
  }

  validateVerbalTaxonomyV2();
  const validMainIds = new Set<string>(VERBAL_TAXONOMY.map((main) => main.id));
  const ids = new Set<string>();
  const canonicalIds = new Set<string>();
  const failures: string[] = [];

  parsed.forEach((raw, index) => {
    const q = raw as ApprovedQuestion;
    const at = `row ${index + 1} (${asString(q?.id) || "missing-id"})`;
    const id = asString(q?.id);
    const canonicalId = asString(q?.canonicalId);
    const mainSkillId = asString(q?.mainSkillId);
    const subSkillId = asString(q?.subSkillId);

    if (!id) failures.push(`${at}: missing id`);
    if (!canonicalId) failures.push(`${at}: missing canonicalId`);
    if (id && ids.has(id)) failures.push(`${at}: duplicate id`);
    if (canonicalId && canonicalIds.has(canonicalId)) failures.push(`${at}: duplicate canonicalId`);
    if (id) ids.add(id);
    if (canonicalId) canonicalIds.add(canonicalId);

    if (!APPROVED_SOURCES.has(asString(q?.sourceBook))) {
      failures.push(`${at}: unapproved sourceBook=${asString(q?.sourceBook)}`);
    }
    if (!Number.isInteger(q?.sourcePage) || Number(q.sourcePage) < 1) {
      failures.push(`${at}: invalid sourcePage`);
    }
    if (!asString(q?.sourceQuestionNumber)) {
      failures.push(`${at}: missing sourceQuestionNumber`);
    }
    if (!validMainIds.has(mainSkillId)) {
      failures.push(`${at}: invalid mainSkillId=${mainSkillId}`);
    }
    if (!VERBAL_SUBSKILL_TO_MAIN[subSkillId]) {
      failures.push(`${at}: invalid subSkillId=${subSkillId}`);
    } else if (VERBAL_SUBSKILL_TO_MAIN[subSkillId] !== mainSkillId) {
      failures.push(`${at}: subskill does not belong to main skill`);
    }
    if (!Array.isArray(q?.options) || q.options.length !== 4) {
      failures.push(`${at}: expected exactly four options`);
    }
    if (!Number.isInteger(q?.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
      failures.push(`${at}: invalid correctOptionIndex`);
    }
    if (!asString(q?.text)) failures.push(`${at}: missing question text`);
    const passageId = asString(q?.passageId);
    const passageText = asString(q?.passageText);
    const passageTitle = asString(q?.passageTitle);
    if (passageId || passageText || passageTitle) {
      if (!passageId) failures.push(`${at}: passageText/title requires passageId`);
      if (!passageText) failures.push(`${at}: passageId requires passageText`);
    }
  });

  if (failures.length) {
    throw new Error(`VERBAL26 approved bank validation failed:\n${failures.slice(0, 50).join("\n")}`);
  }

  return parsed as ApprovedQuestion[];
}

function requireApplyGuard() {
  if (process.env.ALLOW_VERBAL26_APPLY !== "true") {
    throw new Error(
      "VERBAL26 apply is disabled. Set ALLOW_VERBAL26_APPLY=true only after source QA and rollback evidence are complete.",
    );
  }
  const backupReference = asString(process.env.VERBAL26_BACKUP_REFERENCE);
  if (!backupReference) {
    throw new Error(
      "VERBAL26_BACKUP_REFERENCE is required before database writes. Refusing unprotected production mutation.",
    );
  }
  return backupReference;
}

export async function deployVerbalEcosystem() {
  const bankPath =
    process.env.VERBAL26_APPROVED_BANK ||
    path.join(process.cwd(), "server", "data", "verbal_approved_bank_v2.json");
  const questionsData = loadAndValidateApprovedBank(bankPath);

  if (process.env.VERBAL26_DRY_RUN !== "false") {
    const bySource = questionsData.reduce<Record<string, number>>((acc, q) => {
      acc[q.sourceBook] = (acc[q.sourceBook] || 0) + 1;
      return acc;
    }, {});
    const byMain = questionsData.reduce<Record<string, number>>((acc, q) => {
      acc[q.mainSkillId] = (acc[q.mainSkillId] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify({
      status: "DRY_RUN_PASS",
      questions: questionsData.length,
      sources: bySource,
      mainSkillsCovered: Object.keys(byMain).length,
      taxonomy: { main: 22, sub: 76 },
      note: "No database writes were performed.",
    }, null, 2));
    return;
  }

  const backupReference = requireApplyGuard();
  console.log(`VERBAL26 apply authorized with backup reference: ${backupReference}`);

  const uri = env.MONGODB_URI || "mongodb://localhost:27017/almeaa";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  try {
    const questionsCol = db.collection("questions");
    const now = new Date();

    // Shared reading passages are persisted once and referenced by passageId.
    // This keeps the canonical question bank deduplicated while preserving learner hydration.
    const passageRows = Array.from(
      new Map(
        questionsData
          .filter((q) => asString(q.passageId) && asString(q.passageText))
          .map((q) => [asString(q.passageId), q]),
      ).values(),
    );
    for (const q of passageRows) {
      const passageId = asString(q.passageId);
      const passageText = asString(q.passageText);
      const fingerprint = createHash("sha256")
        .update(passageText.normalize("NFKC").replace(/\s+/g, " ").trim())
        .digest("hex");
      await QuestionPassageModel.updateOne(
        { id: passageId },
        {
          $set: {
            id: passageId,
            title: asString(q.passageTitle),
            text: passageText,
            canonicalFingerprint: fingerprint,
            pathId: VERBAL_PATH_ID,
            subjectId: VERBAL_SUBJECT_ID,
            sourceMeta: {
              documentCode: q.sourceBook === "anas" ? "VERBAL26-ANAS" : "VERBAL26-AMER",
              documentTitle: q.sourceBook === "anas" ? "تأسيس لفظي انس.pdf" : "دورة تأسيس اللفظي مع قدرات العامر- د. محمد عبد الباسط.pdf",
              sourceItemId: passageId,
              pdfPageIndex: q.sourcePage,
              printedPageNumber: null,
              importBatchId: "VERBAL26",
            },
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }

    // Upsert only source-verified canonical records. Never delete the verbal bank here.
    const ops = questionsData.map((q) => ({
      updateOne: {
        filter: { $or: [{ id: q.id }, { canonicalId: q.canonicalId }] },
        update: {
          $set: {
            id: q.id,
            canonicalId: q.canonicalId,
            text: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation || "",
            pathId: VERBAL_PATH_ID,
            subject: VERBAL_SUBJECT_ID,
            subjectId: VERBAL_SUBJECT_ID,
            skillId: q.mainSkillId,
            subSkillId: q.subSkillId,
            skillIds: [q.mainSkillId, q.subSkillId],
            examType: "qudurat",
            source: "VERBAL26",
            sourceBook: q.sourceBook,
            sourcePage: q.sourcePage,
            sourceQuestionNumber: q.sourceQuestionNumber,
            passageId: asString(q.passageId) || null,
            passage: "",
            year: 2026,
            difficulty: q.difficulty || "Medium",
            type: "mcq",
            ownerType: "platform",
            approvalStatus: "approved",
            updatedAt: now,
          },
          $setOnInsert: {
            _id: q.id as any,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length) {
      await questionsCol.bulkWrite(ops, { ordered: true });
    }
  } finally {
    await mongoose.disconnect();
  }

  // Canonical migration owns 22/76 taxonomy + 76 foundation drills + 22 same-skill
  // training banks + 5 mocks. It does not rewrite historical SkillProgress/QuizResult.
  await migrateVerbalTaxonomy22();
}

if (
  process.argv[1]?.endsWith("deployVerbalEcosystem.ts") ||
  process.argv[1]?.endsWith("deployVerbalEcosystem.js")
) {
  deployVerbalEcosystem().catch(async (err) => {
    console.error("VERBAL26 ecosystem deployment failed:", err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  });
}
