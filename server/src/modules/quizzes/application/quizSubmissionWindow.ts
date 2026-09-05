import { StatusCodes } from "http-status-codes";

type QuizSubmissionWindowInput = {
  quiz: any;
  timeSpentSeconds: number;
  now?: number;
};

export const assertQuizSubmissionWindow = ({
  quiz,
  timeSpentSeconds,
  now = Date.now(),
}: QuizSubmissionWindowInput): { ok: true } | { ok: false; status: number; message: string } => {
  const dueDateRaw = String(quiz?.dueDate || "").trim();
  if (dueDateRaw) {
    const dueDateMs = Date.parse(dueDateRaw);
    if (Number.isFinite(dueDateMs) && now > dueDateMs) {
      return {
        ok: false,
        status: StatusCodes.FORBIDDEN,
        message: "Quiz submission deadline has passed",
      };
    }
  }

  const timeLimitMinutes = Number(quiz?.settings?.timeLimit ?? 0);
  if (Number.isFinite(timeLimitMinutes) && timeLimitMinutes > 0) {
    const allowedSeconds = Math.ceil(timeLimitMinutes * 60) + 60;
    if (timeSpentSeconds > allowedSeconds) {
      return {
        ok: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: "Quiz time limit exceeded",
      };
    }
  }

  return { ok: true };
};
