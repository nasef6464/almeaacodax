import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuestionModel } from "../models/Question.js";
import { createQuestionImageUploadIntent } from "../modules/media/application/questionImageUpload.js";

const APPLY = ["true", "1", "yes", "on"].includes(
  String(process.env.APPLY_R2_INLINE_IMAGE_MIGRATION || "").trim().toLowerCase(),
);

const DATA_IMAGE_RE = /src=(["'])(data:image\/(png|jpeg|webp);base64,([^"']+))\1/gi;

const contentTypeFor = (format: string) => {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
};

const replaceAsync = async (
  input: string,
  regex: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>,
) => {
  const matches = Array.from(input.matchAll(regex));
  if (!matches.length) return input;

  const replacements = await Promise.all(matches.map((match) => replacer(match)));
  let output = "";
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    output += input.slice(cursor, start);
    output += replacements[index];
    cursor = start + match[0].length;
  });
  return output + input.slice(cursor);
};

const main = async () => {
  await mongoose.connect(env.MONGODB_URI);

  const questions = await QuestionModel.find({
    text: { $regex: "data:image", $options: "i" },
  })
    .select("_id id text")
    .lean();

  console.log(`Inline-image question candidates: ${questions.length}`);
  if (!APPLY) {
    const totalBytes = questions.reduce((sum, question) => sum + Buffer.byteLength(String(question.text || ""), "utf8"), 0);
    console.log(`Dry run only. Candidate text bytes: ${totalBytes}`);
    console.log("Set APPLY_R2_INLINE_IMAGE_MIGRATION=true only after verified R2 runtime configuration and backup evidence.");
    return;
  }

  let migratedQuestions = 0;
  let migratedImages = 0;

  for (const question of questions) {
    const originalText = String(question.text || "");
    let imageCountForQuestion = 0;

    const nextText = await replaceAsync(originalText, DATA_IMAGE_RE, async (match) => {
      const quote = match[1];
      const format = match[3].toLowerCase();
      const base64 = match[4].replace(/\s+/g, "");
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length) {
        throw new Error(`Question ${String(question.id || question._id)} contains an empty inline image`);
      }

      const contentType = contentTypeFor(format);
      const intent = createQuestionImageUploadIntent({
        contentType,
        sizeBytes: buffer.length,
      });
      const response = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: intent.headers,
        body: buffer,
      });
      if (!response.ok) {
        throw new Error(
          `R2 upload failed for question ${String(question.id || question._id)} with HTTP ${response.status}`,
        );
      }

      imageCountForQuestion += 1;
      migratedImages += 1;
      return `src=${quote}${intent.publicUrl}${quote}`;
    });

    if (nextText === originalText) continue;

    await QuestionModel.updateOne(
      { _id: question._id, text: originalText },
      { $set: { text: nextText } },
    );
    migratedQuestions += 1;
    console.log(
      `Migrated question ${String(question.id || question._id)}: ${imageCountForQuestion} inline image(s)`,
    );
  }

  console.log(`Migration complete: questions=${migratedQuestions} images=${migratedImages}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
