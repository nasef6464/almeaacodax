type ContentBootstrapScope = "full" | "learning" | "operations";
type ContentBootstrapPhase = "full" | "core";

type ContentBootstrapRequestInput = {
  requestedScope: ContentBootstrapScope;
  requestedPhase: ContentBootstrapPhase;
  canUseFullScope: boolean;
  isAuthenticated: boolean;
};

export const resolveContentBootstrapRequest = ({
  requestedScope,
  requestedPhase,
  canUseFullScope,
  isAuthenticated,
}: ContentBootstrapRequestInput) => {
  const scope = requestedScope !== "learning" && !canUseFullScope ? "learning" : requestedScope;
  const phase = scope === "learning" ? requestedPhase : "full";
  const isLearningCore = scope === "learning" && phase === "core";
  const isOperationsOnly = scope === "operations";
  const includeOperationalData = scope !== "learning";
  const includeStudyPlans = !isOperationsOnly && scope !== "learning" && phase === "full";
  const isNonStaffAuthedLearning = isAuthenticated && !canUseFullScope && scope === "learning";
  const canUseSharedCache = !isAuthenticated || isNonStaffAuthedLearning;

  return {
    scope,
    phase,
    isLearningCore,
    isOperationsOnly,
    includeOperationalData,
    includeStudyPlans,
    canUseSharedCache,
    cacheKey: canUseSharedCache ? `scope:${scope}:phase:${phase}:shared-learning` : "",
  };
};
