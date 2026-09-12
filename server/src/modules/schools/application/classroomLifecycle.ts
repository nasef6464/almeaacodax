export type ClassroomSessionStatus = "draft" | "scheduled" | "live" | "ended" | "archived";

export const canStudentJoinClassroom = (status: ClassroomSessionStatus) => status === "live";
export const canMutateClassroomQuestions = (status: ClassroomSessionStatus) => status === "draft" || status === "scheduled" || status === "live";
export const canPublishClassroom = (status: ClassroomSessionStatus) => status === "draft" || status === "scheduled" || status === "live";

export const isDuplicateLiveSessionError = (error: unknown) => {
  const candidate = error as { code?: number; message?: string } | null;
  return Boolean(candidate && (candidate.code === 11000 || /duplicate key/i.test(candidate.message || "")));
};
