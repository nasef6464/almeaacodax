import mongoose from "mongoose";
import { QuestionModel } from "../../../models/Question.js";
import { isQuestionContentUsable } from "../presentation/questionPresentation.js";

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(
    values.flatMap((value) => {
      const id = String(value || "").trim();
      if (!id) return [];
      const withoutCopySuffix = id.replace(/_copy(?:_\d+)?$/i, "");
      return withoutCopySuffix && withoutCopySuffix !== id ? [id, withoutCopySuffix] : [id];
    }),
  );
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const getQuizQuestionIds = (quizLike: any) => {
  const mockSections = Array.isArray(quizLike?.mockExam?.sections) ? quizLike.mockExam.sections : [];
  const mockQuestionIds = quizLike?.mockExam?.enabled === true
    ? mockSections.flatMap((section: any) => Array.isArray(section?.questionIds) ? section.questionIds.map(String) : [])
    : [];
  const regularQuestionIds = Array.isArray(quizLike?.questionIds) ? quizLike.questionIds.map(String) : [];
  return uniqueStrings((mockQuestionIds.length > 0 ? mockQuestionIds : regularQuestionIds).filter(Boolean));
};

export async function validateQuizQuestionIntegrity(quizLike: any) {
  const normalizedIds = uniqueStrings(getQuizQuestionIds(quizLike));
  if (normalizedIds.length === 0) {
    return {
      ok: false,
      totalReferenced: 0,
      resolved: 0,
      missingIds: [] as string[],
      invalidContentIds: [] as string[],
      message: "Cannot publish a quiz without valid questions",
    };
  }

  const questions = await QuestionModel.find(buildDocumentsByIdsQuery(normalizedIds))
    .select("id text imageUrl options type")
    .lean();
  const byCanonicalId = new Map<string, any>();
  questions.forEach((question: any) => {
    const canonicalId = String(question.id || question._id);
    byCanonicalId.set(canonicalId, question);
    const withoutCopySuffix = canonicalId.replace(/_copy(?:_\d+)?$/i, "");
    if (withoutCopySuffix && withoutCopySuffix !== canonicalId) byCanonicalId.set(withoutCopySuffix, question);
  });

  const missingIds: string[] = [];
  const invalidContentIds: string[] = [];
  normalizedIds.forEach((id) => {
    const resolved = byCanonicalId.get(id) || byCanonicalId.get(id.replace(/_copy(?:_\d+)?$/i, ""));
    if (!resolved) {
      missingIds.push(id);
      return;
    }
    if (!isQuestionContentUsable(resolved)) invalidContentIds.push(id);
  });

  const ok = missingIds.length === 0 && invalidContentIds.length === 0;
  return {
    ok,
    totalReferenced: normalizedIds.length,
    resolved: normalizedIds.length - missingIds.length,
    missingIds,
    invalidContentIds,
    message: ok
      ? "ok"
      : "Cannot publish quiz: some referenced questions are missing or have incomplete content",
  };
}
