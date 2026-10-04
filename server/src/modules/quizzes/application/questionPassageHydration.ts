import { QuestionPassageModel } from "../../../models/QuestionPassage.js";

const uniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

export async function hydrateQuestionPassages<T extends Record<string, any>>(items: T[]): Promise<T[]> {
  const passageIds = uniqueStrings(
    items
      .filter((item) => !String(item?.passage || "").trim())
      .map((item) => item?.passageId),
  );

  if (passageIds.length === 0) return items;

  const passages = await QuestionPassageModel.find({ id: { $in: passageIds } })
    .select("id text title")
    .lean();

  const byId = new Map(
    passages.map((passage: any) => [String(passage.id || "").trim(), passage]),
  );

  return items.map((item) => {
    if (String(item?.passage || "").trim()) return item;
    const passageId = String(item?.passageId || "").trim();
    const passage = byId.get(passageId);
    if (!passage) return item;
    return {
      ...item,
      passage: String((passage as any).text || ""),
      passageTitle: String((passage as any).title || ""),
    };
  });
}
