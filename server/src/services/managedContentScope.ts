import { StatusCodes } from "http-status-codes";
import { UserModel } from "../models/User.js";

export type ManagedContentActor = {
  id?: string;
  role?: string;
  managedPathIds?: unknown[];
  managedSubjectIds?: unknown[];
};

export type ManagedContentRecord = {
  pathId?: unknown;
  subjectId?: unknown;
  subject?: unknown;
};

export type ManagedContentScope = {
  enforced: boolean;
  pathIds: string[];
  subjectIds: string[];
};

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const forbidden = () => {
  const error = new Error("Content is outside the platform trainer managed scope") as Error & {
    statusCode?: number;
  };
  error.statusCode = StatusCodes.FORBIDDEN;
  return error;
};

/**
 * Resolves the content scope from the database for teachers so list endpoints
 * using optionalAuth cannot rely on stale or scope-free JWT claims.
 */
export const resolveManagedContentScope = async (
  actor?: ManagedContentActor | null,
): Promise<ManagedContentScope> => {
  if (actor?.role !== "teacher") {
    return { enforced: false, pathIds: [], subjectIds: [] };
  }

  const actorId = String(actor.id || "").trim();
  const storedUser = actorId
    ? await UserModel.findById(actorId).select("managedPathIds managedSubjectIds isActive").lean()
    : null;

  if (!storedUser || storedUser.isActive === false) {
    return { enforced: true, pathIds: [], subjectIds: [] };
  }

  return {
    enforced: true,
    pathIds: uniqueStrings(storedUser.managedPathIds || []),
    subjectIds: uniqueStrings(storedUser.managedSubjectIds || []),
  };
};

export const matchesManagedContentScope = (
  scope: ManagedContentScope,
  record: ManagedContentRecord,
) => {
  if (!scope.enforced) return true;
  if (scope.pathIds.length === 0 && scope.subjectIds.length === 0) return false;

  const pathId = String(record.pathId || "").trim();
  const subjectId = String(record.subjectId || record.subject || "").trim();
  return (
    (Boolean(pathId) && scope.pathIds.includes(pathId)) ||
    (Boolean(subjectId) && scope.subjectIds.includes(subjectId))
  );
};

export const assertManagedContentScope = async (
  actor: ManagedContentActor,
  record: ManagedContentRecord,
) => {
  const scope = await resolveManagedContentScope(actor);
  if (!matchesManagedContentScope(scope, record)) {
    throw forbidden();
  }
  return scope;
};

/** Mongo filter for a teacher's assigned path/subject. Empty assignment is deny-all. */
export const buildManagedContentScopeFilter = (scope: ManagedContentScope): Record<string, unknown> => {
  if (!scope.enforced) return {};

  const conditions: Record<string, unknown>[] = [];
  if (scope.pathIds.length > 0) conditions.push({ pathId: { $in: scope.pathIds } });
  if (scope.subjectIds.length > 0) {
    conditions.push(
      { subjectId: { $in: scope.subjectIds } },
      { subject: { $in: scope.subjectIds } },
    );
  }

  return conditions.length > 0 ? { $or: conditions } : { _id: { $exists: false } };
};

export const combineMongoFilters = (...filters: Record<string, unknown>[]) => {
  const populated = filters.filter((filter) => Object.keys(filter).length > 0);
  if (populated.length === 0) return {};
  return populated.length === 1 ? populated[0] : { $and: populated };
};
