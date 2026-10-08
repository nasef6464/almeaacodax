type InlineQuestionCreator = (document: Record<string, unknown>) => Promise<any>;

const nonEmptyString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeInlineType = (type: unknown): "mcq" | "true_false" | "essay" => {
  const value = nonEmptyString(type) || "mcq";
  if (["mcq", "multiple_choice", "multiple-choice", "multipleChoice"].includes(value)) return "mcq";
  if (["true_false", "true-false", "truefalse"].includes(value)) return "true_false";
  if (value === "essay") return "essay";
  throw new Error(`Unsupported inline question type: ${value}`);
};

const resolveCorrectOptionIndex = (question: any, options: any[]): number => {
  const marked = options.flatMap((option, index) =>
    option && typeof option === "object" && option.isCorrect === true ? [index] : [],
  );
  const explicit = question.correctOptionIndex;
  if (marked.length > 1) throw new Error("Inline question has multiple correct options");
  if (explicit !== undefined && explicit !== null) {
    if (!Number.isInteger(explicit) || explicit < 0 || explicit >= options.length) {
      throw new Error("Inline question correctOptionIndex is outside its options");
    }
    if (marked.length === 1 && marked[0] !== explicit) {
      throw new Error("Inline question answer key conflicts with isCorrect markers");
    }
    return explicit;
  }
  if (marked.length === 1) return marked[0];
  // Never silently mark the first option correct when an answer key is missing.
  throw new Error("Inline question requires an explicit correct option");
};

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
      if (q.trim()) createdIds.push(q.trim());
      continue;
    }
    if (!q || typeof q !== "object") continue;
    if (q.id && !q.text && !q.title && !q.options) {
      createdIds.push(String(q.id));
      continue;
    }

    const text = nonEmptyString(q.text) || nonEmptyString(q.title);
    if (!text) throw new Error("Inline question text is required");
    const type = normalizeInlineType(q.type);
    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = rawOptions.map((opt: any) =>
      typeof opt === "string" ? opt.trim() : nonEmptyString(opt?.text) || nonEmptyString(opt?.title),
    );

    if (type !== "essay" && (options.length < 2 || options.some((text: string) => !text))) {
      throw new Error("Inline choice question requires at least two non-empty options");
    }
    const correctOptionIndex = type === "essay" ? 0 : resolveCorrectOptionIndex(q, rawOptions);
    const effectiveSubjectId = nonEmptyString(q.subjectId) || nonEmptyString(subjectId);
    const subject = nonEmptyString(q.subject) || nonEmptyString(q.subjectName) || effectiveSubjectId;
    if (!subject) throw new Error("Inline question subject is required");

    const qId = nonEmptyString(q.id) || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdQuestion = await createQuestion({
      id: qId,
      // Do not set _id to a string: QuestionModel uses Mongo ObjectId as its _id.
      text,
      type,
      subject,
      pathId: nonEmptyString(q.pathId) || nonEmptyString(pathId),
      subjectId: effectiveSubjectId,
      options,
      correctOptionIndex,
      explanation: nonEmptyString(q.explanation),
      ownerType: authUser?.role === "teacher" ? "teacher" : "platform",
      ownerId: String(authUser?.id || ""),
      createdBy: String(authUser?.id || ""),
    });
    createdIds.push(String(createdQuestion.id || createdQuestion._id || ""));
  }
  return createdIds;
};
