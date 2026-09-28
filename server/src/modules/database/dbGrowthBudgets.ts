export const DB_GROWTH_BUDGETS = {
  legacyCompletedLessons: 5_000,
  interactiveVideoProgressRows: 100,
  answeredQuestionIdsPerLesson: 100,
  classroomSessionQuestions: 100,
  classroomSessionBatches: 100,
  classroomSessionDocumentBytes: 4_000_000,
  courseDocumentBytes: 1_000_000,
  announcementDocumentBytes: 512_000,
  inlineAdminMediaChars: 450_000,
} as const;

export const approximateDocumentBytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value ?? null), "utf8");

export const assertDocumentGrowthBudget = (label: string, value: unknown, maxBytes: number) => {
  const bytes = approximateDocumentBytes(value);
  if (bytes > maxBytes) {
    const error = new Error(`${label} exceeds the database document growth budget (${bytes} > ${maxBytes} bytes)`) as Error & { statusCode?: number };
    error.statusCode = 413;
    throw error;
  }
  return bytes;
};
