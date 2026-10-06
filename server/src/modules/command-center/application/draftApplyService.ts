import { applyCourseDraft, applyQuizDraft, applyQuizUpdateDraft } from "./draftApplyCourseQuiz.js";
import { applySchoolDraft, applySchoolRosterImportDraft } from "./draftApplySchool.js";
import type { ApplyResult, CommandDraftLike } from "./draftApplyTypes.js";

export async function applyApprovedCommandDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  if (draft.kind === "course") return applyCourseDraft(draft, actorId);
  if (draft.kind === "quiz") return applyQuizDraft(draft, actorId);
  if (draft.kind === "quiz_update") return applyQuizUpdateDraft(draft, actorId);
  if (draft.kind === "school_setup") return applySchoolDraft(draft, actorId);
  if (draft.kind === "school_roster_import") return applySchoolRosterImportDraft(draft, actorId);

  throw Object.assign(
    new Error(`Apply adapter is not available yet for draft kind: ${String(draft.kind)}`),
    { statusCode: 422 },
  );
}
