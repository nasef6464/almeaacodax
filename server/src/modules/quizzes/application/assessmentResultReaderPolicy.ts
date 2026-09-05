export type AssessmentResultReaderMode = "legacy" | "compatibility";

export const shouldReadAssessmentCompatibilityProjection = (mode?: string | null) =>
  mode === "compatibility";
