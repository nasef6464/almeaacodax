export const roles = [
  "student",
  "teacher",
  "admin",
  "supervisor",
  "school_admin",
  "parent",
] as const;

export type AppRole = (typeof roles)[number];
