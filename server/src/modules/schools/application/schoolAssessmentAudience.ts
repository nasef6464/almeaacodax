/** School-wide, class, and individual assignments are alternative explicit audiences. */
export const schoolAssessmentAudience = (schoolId: string, classIds: string[], studentIds: string[]) => ({
  $or: [
    { targetGroupIds: { $in: [schoolId, ...classIds] } },
    { targetUserIds: { $in: studentIds } },
  ],
});
