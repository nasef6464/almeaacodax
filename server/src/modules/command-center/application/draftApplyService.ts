import { applyCourseDraft, applyQuizDraft } from "./draftApplyCourseQuiz.js";
import { applyQuestionBatchDraft } from "./draftApplyQuestion.js";
import { applySchoolDraft } from "./draftApplySchool.js";
import type { ApplyResult, CommandDraftLike } from "./draftApplyTypes.js";

export async function applyApprovedCommandDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  if (draft.kind === "question_batch") return applyQuestionBatchDraft(draft, actorId);
  if (draft.kind === "course") return applyCourseDraft(draft, actorId);
  if (draft.kind === "quiz") return applyQuizDraft(draft, actorId);
  if (draft.kind === "school_setup") return applySchoolDraft(draft, actorId);

  throw Object.assign(
    new Error(`Apply adapter is not available yet for draft kind: ${String(draft.kind)}`),
    { statusCode: 422 },
  );
}
