export function normalizeQuizPlacementPayload<T extends Record<string, any>>(payload: T, fallbackType = "quiz") {
  if (payload.access && typeof payload.access === "object") {
    const rawType = String(payload.access.type || "").toLowerCase();
    if (rawType === "public" || rawType === "all") payload.access.type = "free";
  }

  const nextPayload = { ...payload };
  const quizKind = nextPayload.quizKind;
  const mockExamEnabled = nextPayload.mockExam?.enabled === true;
  const placements = Array.isArray(nextPayload.learningPlacements) ? nextPayload.learningPlacements : [];

  let showInTraining = false;
  let showInMock = false;
  let type = fallbackType;
  let placement = "mock";

  if (quizKind || placements.length > 0 || mockExamEnabled) {
    if (placements.length > 0) {
      showInTraining = placements.some((p: any) => p.slot === "training");
      showInMock = placements.some((p: any) => p.slot === "tests" || p.slot === "mock");
    }

    if (quizKind === "mock" || mockExamEnabled) {
      showInMock = true;
      showInTraining = false;
      placement = "mock";
      type = "quiz";
      (nextPayload as any).quizKind = "mock";
      if (!(nextPayload as any).mockExam) (nextPayload as any).mockExam = { enabled: true, sections: [] };
      (nextPayload as any).mockExam.enabled = true;
    } else if (quizKind === "drill") {
      showInTraining = true;
      placement = showInMock ? "both" : "training";
      type = "bank";
    } else if (quizKind === "test") {
      showInTraining = true;
      showInMock = true;
      placement = "both";
      type = "quiz";
    } else {
      placement = showInTraining && showInMock ? "both" : showInTraining ? "training" : "mock";
      type = showInTraining && !showInMock ? "bank" : "quiz";
    }
  } else {
    const hasPlacementFields =
      nextPayload.type !== undefined ||
      nextPayload.placement !== undefined ||
      nextPayload.showInTraining !== undefined ||
      nextPayload.showInMock !== undefined;

    if (!hasPlacementFields) return nextPayload;

    const inferredType = nextPayload.type || fallbackType;
    showInTraining =
      typeof nextPayload.showInTraining === "boolean"
        ? nextPayload.showInTraining
        : nextPayload.placement
          ? nextPayload.placement === "training" || nextPayload.placement === "both"
          : inferredType === "bank";
    showInMock =
      typeof nextPayload.showInMock === "boolean"
        ? nextPayload.showInMock
        : nextPayload.placement
          ? nextPayload.placement === "mock" || nextPayload.placement === "both"
          : inferredType !== "bank";

    placement = showInTraining && showInMock ? "both" : showInTraining ? "training" : "mock";
    type = showInTraining && !showInMock ? "bank" : "quiz";

    if (placement === "mock") (nextPayload as any).quizKind = "mock";
    else if (placement === "training" || type === "bank") (nextPayload as any).quizKind = "drill";
    else (nextPayload as any).quizKind = "test";
  }

  return { ...nextPayload, type, placement, showInTraining, showInMock };
}
