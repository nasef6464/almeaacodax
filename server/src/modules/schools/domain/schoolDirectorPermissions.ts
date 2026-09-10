export const schoolDirectorPermissions = [
  "SCHOOL_OVERVIEW_VIEW",
  "SCHOOL_REPORTS_AGGREGATE_VIEW",
  "SCHOOL_STUDENTS_VIEW",
  "SCHOOL_STUDENTS_ADD",
  "SCHOOL_STUDENTS_MOVE_CLASS",
] as const;

export type SchoolDirectorPermission = (typeof schoolDirectorPermissions)[number];

export const defaultSchoolDirectorPermissions: SchoolDirectorPermission[] = [
  "SCHOOL_OVERVIEW_VIEW",
  "SCHOOL_REPORTS_AGGREGATE_VIEW",
  "SCHOOL_STUDENTS_VIEW",
];

export const hasSchoolDirectorPermission = (
  permissions: readonly string[] | null | undefined,
  permission: SchoolDirectorPermission,
) => Array.isArray(permissions) && permissions.includes(permission);
