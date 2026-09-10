export const schoolDirectorPermissions = [
  "SCHOOL_OVERVIEW_VIEW",
  "SCHOOL_REPORTS_AGGREGATE_VIEW",
  "SCHOOL_STUDENTS_VIEW",
  "SCHOOL_STUDENTS_ADD",
  "SCHOOL_STUDENTS_MOVE_CLASS",
  "SCHOOL_STUDENTS_UPDATE_BASIC",
  "SCHOOL_STUDENTS_DEACTIVATE",
  "SCHOOL_CLASSES_MANAGE",
  "SCHOOL_TEACHERS_ASSIGN",
  "SCHOOL_REPORTS_DETAILED_VIEW",
  "SCHOOL_REPORTS_EXPORT",
  "SCHOOL_ASSESSMENTS_MANAGE",
  "SCHOOL_SMART_CLASSROOM_VIEW",
  "SCHOOL_INTERVENTIONS_VIEW",
  "SCHOOL_INTERVENTIONS_MANAGE",
  "SCHOOL_STUDENTS_TRANSFER_SCHOOL",
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
