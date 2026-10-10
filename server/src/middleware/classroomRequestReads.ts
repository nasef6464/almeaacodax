import type { Request } from "express";
import { UserModel } from "../models/User.js";
import { resolveSchoolContexts, type LegacySchoolUser } from "../modules/schools/application/schoolContextResolver.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";

const defaultLoaders = {
  student: async (id: string) => UserModel.findById(id).select("schoolId groupIds role name").lean(),
  contexts: resolveSchoolContexts,
  enabled: async (schoolId: string) => (await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM")).allowed,
};

/** Reuse reads within one HTTP request only. A new request always rechecks access. */
export function createClassroomRequestReads(loaders: {
  student: (id: string) => Promise<unknown>;
  contexts: typeof resolveSchoolContexts;
  enabled: (schoolId: string) => Promise<boolean>;
} = defaultLoaders) {
  const requests = new WeakMap<Request, Map<string, Promise<unknown>>>();
  const once = <T>(req: Request, key: string, read: () => Promise<T>): Promise<T> => {
    let reads = requests.get(req);
    if (!reads) { reads = new Map(); requests.set(req, reads); }
    let value = reads.get(key);
    if (!value) { value = Promise.resolve().then(read); reads.set(key, value); }
    return value as Promise<T>;
  };
  return {
    // Only the active-auth middleware's database-refreshed principal is reusable.
    // Feature-router callers without that middleware retain their database read.
    student: (req: Request, activeAuthRefreshed: boolean) => activeAuthRefreshed && req.authUser
      ? Promise.resolve(req.authUser)
      : once(req, JSON.stringify(["student", req.authUser?.id]), () => loaders.student(req.authUser!.id)),
    contexts: (req: Request, user: LegacySchoolUser) => once(
      req, JSON.stringify(["contexts", user.id, user.role, user.schoolId || null]), () => loaders.contexts(user),
    ),
    enabled: (req: Request, schoolId: string) => once(req, JSON.stringify(["enabled", schoolId]), () => loaders.enabled(schoolId)),
  };
}

export const classroomRequestReads = createClassroomRequestReads();
