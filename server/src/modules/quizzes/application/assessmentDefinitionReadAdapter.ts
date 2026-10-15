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

  // Published content is immutable; the school's current audience and calendar
  // remain operational settings. Retake windows are applied per viewer later.
  const directed = legacyDefinition.mode === 'central' ||
    ['targetGroupIds','targetUserIds'].some(key => Array.isArray(legacyDefinition[key]) && (legacyDefinition[key] as unknown[]).length > 0);
  const operational = directed ? Object.fromEntries(
    ['targetGroupIds','targetUserIds','opensAt','closesAt','dueDate']
      .filter(key => Object.prototype.hasOwnProperty.call(legacyDefinition,key))
      .map(key => [key,legacyDefinition[key]]),
  ) : {};

  const { schoolQuestionEvidence: _privateEvidence, ...publicDefinition } = version.definition;
  return {
    ...legacyDefinition,
    ...publicDefinition,
    ...operational,
    _id: legacyDefinition._id,
    id: legacyDefinition.id ?? legacyDefinition._id,
  };
};
