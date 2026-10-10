import { StatusCodes } from "http-status-codes";
import { getQuizAvailability } from "./quizAvailability.js";

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
  const availability = getQuizAvailability(quiz, now);
  if (availability !== "available") {
    return { ok: false, status: StatusCodes.FORBIDDEN, message: availability === "upcoming"
      ? "Quiz has not opened yet" : "Quiz submission deadline has passed" };
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
