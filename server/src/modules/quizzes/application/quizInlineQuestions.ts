type InlineQuestionCreator = (document: Record<string, unknown>) => Promise<any>;

export const processInlineQuestions = async (
  questions: any[],
  pathId: string,
  subjectId: string,
  authUser: any,
  createQuestion: InlineQuestionCreator,
) => {
  if (!Array.isArray(questions) || questions.length === 0) return [];
  const createdIds: string[] = [];

  for (const q of questions) {
    if (typeof q === "string") {
      createdIds.push(q);
      continue;
    }
    if (q && typeof q === "object") {
      if (q.id && !q.text && !q.options) {
        createdIds.push(String(q.id));
        continue;
      }
      const qId = String(q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
      const formattedOptions = Array.isArray(q.options)
        ? q.options.map((opt: any, idx: number) => {
            if (typeof opt === "string") return { id: `opt_${idx}`, text: opt, isCorrect: idx === 0 };
            return {
              id: String(opt.id || `opt_${idx}`),
              text: String(opt.text || opt.title || ""),
              isCorrect: Boolean(opt.isCorrect),
            };
          })
        : [];

      const createdQuestion = await createQuestion({
        id: qId,
        _id: qId,
        text: String(q.text || q.title || "سؤال جديد"),
        type: q.type || "multiple_choice",
        pathId: String(q.pathId || pathId || "").trim(),
        subjectId: String(q.subjectId || subjectId || "").trim(),
        options: formattedOptions,
        explanation: String(q.explanation || ""),
        ownerId: String(authUser?.id || ""),
        createdBy: String(authUser?.id || ""),
      });
      createdIds.push(String(createdQuestion.id || createdQuestion._id || ""));
    }
  }
  return createdIds;
};
