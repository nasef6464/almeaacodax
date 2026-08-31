type AssessmentDefinition = Record<string, unknown>;

type AssessmentVersionRecord = {
  definition?: unknown;
} | null | undefined;

const isDefinition = (value: unknown): value is AssessmentDefinition =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Keeps the legacy quiz document authoritative until a published immutable
 * version exists. Identity remains anchored to the legacy route parameter.
 */
export const resolveAssessmentDefinitionRead = (
  legacyDefinition: AssessmentDefinition,
  version: AssessmentVersionRecord,
): AssessmentDefinition => {
  if (!isDefinition(version?.definition)) return legacyDefinition;

  return {
    ...legacyDefinition,
    ...version.definition,
    _id: legacyDefinition._id,
    id: legacyDefinition.id ?? legacyDefinition._id,
  };
};
