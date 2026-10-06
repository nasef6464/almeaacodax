export const classroomQuestionVisibilityFilter = (schoolId: string, actorId: string) => ({
  $or: [
    { ownerType: "platform" },
    { ownerType: { $exists: false } },
    { ownerType: "school", ownerId: schoolId },
    { ownerType: "teacher", ownerId: actorId },
  ],
});

export const normalizeQuestionIds = (ids: string[]) => Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));
