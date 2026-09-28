type QuestionApprovalCandidate = {
  questionCode?: unknown;
  source?: unknown;
  approvalStatus?: unknown;
  imageUrl?: unknown;
  optionsEmbeddedInImage?: unknown;
  options?: unknown;
  correctOptionIndex?: unknown;
  reviewerNotes?: unknown;
  sourceMeta?: {
    sourceItemId?: unknown;
    page?: unknown;
    printedPageNumber?: unknown;
    imageHash?: unknown;
  } | null;
};

const canonicalV2Code = /^(?:QDR-QNT|TAH-MATH)-[A-Z0-9._-]+-P\d{3}-Q\d{2}$/;

export const isCanonicalImportedImageQuestion = (value: QuestionApprovalCandidate) =>
  String(value?.source || "") === "imported" &&
  value?.optionsEmbeddedInImage === true &&
  canonicalV2Code.test(String(value?.questionCode || "").trim().toUpperCase());

export const validateQuestionApprovalIntegrity = (value: QuestionApprovalCandidate) => {
  if (String(value?.approvalStatus || "") !== "approved" || !isCanonicalImportedImageQuestion(value)) {
    return { ok: true as const };
  }

  const code = String(value.questionCode || "").trim().toUpperCase();
  const imageUrl = String(value.imageUrl || "").trim();
  const meta = value.sourceMeta || {};
  const sourceItemId = String(meta.sourceItemId || "").trim();
  const imageHash = String(meta.imageHash || "").trim().toLowerCase();
  const page = Number(meta.page ?? meta.printedPageNumber);
  const options = Array.isArray(value.options) ? value.options : [];
  const answer = Number(value.correctOptionIndex);
  const reviewerNotes = String(value.reviewerNotes || "").trim();
  const visualVerificationRecorded =
    /verified\s+visually/i.test(reviewerNotes) ||
    /تم\s+التحقق.*بصري/i.test(reviewerNotes);

  if (!visualVerificationRecorded) {
    return { ok: false as const, message: "Approved imported image questions require an explicit visual source verification note" };
  }
  if (!sourceItemId) {
    return { ok: false as const, message: "Approved imported image questions require sourceMeta.sourceItemId" };
  }
  if (!Number.isInteger(page) || page < 1) {
    return { ok: false as const, message: "Approved imported image questions require a trusted source page" };
  }
  if (!/^[a-f0-9]{64}$/.test(imageHash)) {
    return { ok: false as const, message: "Approved imported image questions require a SHA-256 imageHash" };
  }
  if (!/^https:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) {
    return { ok: false as const, message: "Approved imported image questions require an external HTTPS image URL" };
  }
  if (!imageUrl.includes(code) || !imageUrl.toLowerCase().includes(imageHash)) {
    return { ok: false as const, message: "Approved imported image URL must be content-addressed by questionCode and imageHash" };
  }
  if (options.length !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) {
    return { ok: false as const, message: "Approved imported image MCQs require exactly four options and a valid A/B/C/D answer index" };
  }

  return { ok: true as const };
};

export const touchesQuestionVisualIdentity = (payload: Record<string, unknown>) =>
  ["questionCode", "imageUrl", "options", "correctOptionIndex", "optionsEmbeddedInImage", "sourceMeta"].some(
    (key) => Object.prototype.hasOwnProperty.call(payload, key),
  );
