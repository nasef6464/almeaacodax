import { z } from "zod";

export const quizWindowFields = {
  opensAt: z.string().datetime({ offset: true }).nullable().optional(),
  closesAt: z.string().datetime({ offset: true }).nullable().optional(),
};

// Legacy dates retain the server's existing Date.parse semantics. New windows
// always carry an explicit offset; the browser sends ISO timestamps.
export const getQuizAvailability = (quiz: any, now = Date.now()) => {
  const opens = Date.parse(quiz?.opensAt || "");
  const closes = Date.parse(quiz?.closesAt || quiz?.dueDate || "");
  if (Number.isFinite(opens) && now < opens) return "upcoming" as const;
  if (Number.isFinite(closes) && now > closes) return "closed" as const;
  return "available" as const;
};

export const validateQuizWindow = (quiz: any) => {
  const opens = Date.parse(quiz?.opensAt || "");
  const closes = Date.parse(quiz?.closesAt || quiz?.dueDate || "");
  if (Number.isFinite(opens) && Number.isFinite(closes) && opens >= closes) {
    throw new z.ZodError([{ code: "custom", path: ["closesAt"], message: "End time must be after start time" }]);
  }
};
