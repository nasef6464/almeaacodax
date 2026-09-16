import { AssessmentAttemptModel } from "../infrastructure/assessmentAttemptModel.js";

export class AssessmentAttemptLimitError extends Error {
  maxAttempts: number;
  attemptsUsed: number;

  constructor(maxAttempts: number, attemptsUsed: number) {
    super("Assessment attempt limit reached");
    this.name = "AssessmentAttemptLimitError";
    this.maxAttempts = maxAttempts;
    this.attemptsUsed = attemptsUsed;
  }
}

const isDuplicateKeyError = (error: unknown) => Number((error as any)?.code) === 11000;

interface GetOrCreateAssessmentAttemptInput {
  assignmentId: string;
  assessmentVersionId: string;
  studentId: string;
  maxAttempts: number;
  expiresAt?: Date;
}

/**
 * Idempotent start boundary for an assessment attempt.
 *
 * Mongo's production migration owns the invariant that at most one
 * `in_progress` row may exist for an assignment/student pair. This helper is
 * deliberately duplicate-key aware so concurrent start requests converge on
 * the same winning attempt instead of returning 500 or consuming two attempts.
 */
export async function getOrCreateAssessmentAttempt(input: GetOrCreateAssessmentAttemptInput) {
  const assignmentId = String(input.assignmentId);
  const assessmentVersionId = String(input.assessmentVersionId);
  const studentId = String(input.studentId);
  const maxAttempts = Math.max(1, Number(input.maxAttempts || 1));
  const ownerFilter = { assignmentId, studentId };

  for (let retry = 0; retry < 5; retry += 1) {
    const activeAttempt = await AssessmentAttemptModel.findOne({
      ...ownerFilter,
      status: "in_progress",
    }).sort({ attemptNumber: -1 });
    if (activeAttempt) return activeAttempt;

    const [attemptsStarted, latestAttempt] = await Promise.all([
      AssessmentAttemptModel.countDocuments(ownerFilter),
      AssessmentAttemptModel.findOne(ownerFilter).sort({ attemptNumber: -1 }).select("attemptNumber").lean(),
    ]);

    if (attemptsStarted >= maxAttempts) {
      // A competing request may have inserted the active attempt between the
      // first read and the count. Prefer that canonical winner over a false
      // attempt-limit response.
      const concurrentWinner = await AssessmentAttemptModel.findOne({
        ...ownerFilter,
        status: "in_progress",
      }).sort({ attemptNumber: -1 });
      if (concurrentWinner) return concurrentWinner;
      throw new AssessmentAttemptLimitError(maxAttempts, attemptsStarted);
    }

    const nextAttemptNumber = Math.max(0, Number((latestAttempt as any)?.attemptNumber || 0)) + 1;
    try {
      return await AssessmentAttemptModel.create({
        assignmentId,
        assessmentVersionId,
        studentId,
        attemptNumber: nextAttemptNumber,
        status: "in_progress",
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // Either the per-attempt-number index or the production partial unique
      // active-attempt index selected another request as the winner. Retry and
      // read that row rather than leaking a concurrency race as HTTP 500.
    }
  }

  const finalWinner = await AssessmentAttemptModel.findOne({
    ...ownerFilter,
    status: "in_progress",
  }).sort({ attemptNumber: -1 });
  if (finalWinner) return finalWinner;

  throw new Error("Unable to establish a canonical assessment attempt after concurrent retries");
}
