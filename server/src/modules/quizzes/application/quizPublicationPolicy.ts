export const isQuizPowerRole = (role?: string) => role === "admin" || role === "supervisor";

export const resolveQuizPublicationState = ({
  role,
  requestedPublished,
  hasQuestions,
}: {
  role?: string;
  requestedPublished?: unknown;
  hasQuestions: boolean;
}) => {
  if (!isQuizPowerRole(role)) return false;
  return typeof requestedPublished === "boolean" ? requestedPublished : hasQuestions;
};
