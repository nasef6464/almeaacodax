type ContentBootstrapOperationalData = {
  groups: unknown[];
  b2bPackages: unknown[];
  accessCodes: unknown[];
  announcementAds: unknown[];
};

type ContentBootstrapPayloadInput = {
  topics: unknown[];
  lessons: unknown[];
  libraryItems: unknown[];
  operationalData: ContentBootstrapOperationalData;
  studyPlans: unknown[];
};

export const buildContentBootstrapPayload = ({
  topics,
  lessons,
  libraryItems,
  operationalData,
  studyPlans,
}: ContentBootstrapPayloadInput) => ({
  topics,
  lessons,
  libraryItems,
  groups: operationalData.groups,
  b2bPackages: operationalData.b2bPackages,
  accessCodes: operationalData.accessCodes,
  announcementAds: operationalData.announcementAds,
  studyPlans,
});
