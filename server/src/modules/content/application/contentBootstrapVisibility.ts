const scopeFilterToActivePaths = <T extends Record<string, unknown>>(
  baseFilter: T,
  activePathIds: string[],
  pathField = "pathId",
) => ({
  $and: [
    baseFilter,
    {
      $or: [
        { [pathField]: { $in: activePathIds } },
        { [pathField]: { $exists: false } },
        { [pathField]: "" },
        { [pathField]: null },
      ],
    },
  ],
});

export const buildContentBootstrapVisibilityFilters = ({
  canSeeAllContent,
  activePathIds,
}: {
  canSeeAllContent: boolean;
  activePathIds: string[];
}) => {
  const lessonFilter = canSeeAllContent
    ? {}
    : {
        showOnPlatform: { $ne: false },
        $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
      };
  const topicFilter = canSeeAllContent ? {} : { showOnPlatform: { $ne: false } };
  const libraryFilter = canSeeAllContent
    ? {}
    : {
        showOnPlatform: { $ne: false },
        $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
      };

  return {
    finalTopicFilter: canSeeAllContent ? topicFilter : scopeFilterToActivePaths(topicFilter, activePathIds),
    finalLessonFilter: canSeeAllContent ? lessonFilter : scopeFilterToActivePaths(lessonFilter, activePathIds),
    finalLibraryFilter: canSeeAllContent ? libraryFilter : scopeFilterToActivePaths(libraryFilter, activePathIds),
  };
};
