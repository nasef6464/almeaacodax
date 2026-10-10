export type QuizWindow = { opensAt?: string | null; closesAt?: string | null; dueDate?: string | null };
export const getQuizAvailability = (quiz: QuizWindow, now = Date.now()) => {
  const opens = Date.parse(quiz.opensAt || '');
  const closes = Date.parse(quiz.closesAt || quiz.dueDate || '');
  if (Number.isFinite(opens) && now < opens) return 'upcoming' as const;
  if (Number.isFinite(closes) && now > closes) return 'closed' as const;
  return 'available' as const;
};
export const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalDateTimeInput = (value: string) => value ? new Date(value).toISOString() : null;
