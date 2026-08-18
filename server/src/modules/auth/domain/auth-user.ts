import type { AppRole } from "../../../constants/roles.js";

/**
 * Stable authenticated-user contract shared by JWT, Express request typing,
 * and authorization middleware. Keep transport/framework declarations out of
 * this domain type so auth code can move without importing a .d.ts file.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  name: string;
  schoolId?: string | null;
  groupIds?: string[];
  linkedStudentIds?: string[];
  managedPathIds?: string[];
  managedSubjectIds?: string[];
}
