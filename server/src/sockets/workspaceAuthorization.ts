export type WorkspaceAuthUser = {
  id: string;
  role?: string;
  schoolId?: string | null;
  schoolIds?: string[];
  groupIds?: string[];
};

export type WorkspaceAuthorizationRepository = {
  findDirectlySupervisedGroupIds(userId: string): Promise<string[]>;
  findClassroomSessionScope?(sessionId: string): Promise<{ schoolId: string; classId: string; teacherId: string } | null>;
  canSchoolDirectorViewClassroom?(userId: string, schoolId: string): Promise<boolean>;
  canSupervisorViewClassroom?(userId: string, schoolId: string, classId: string): Promise<boolean>;
};

const workspaceIdPattern = /^(user|school|class|classroom):([a-zA-Z0-9_-]{1,128})$/;

export const canJoinAuthorizedWorkspace = async (
  authUser: WorkspaceAuthUser,
  workspaceId: unknown,
  repository: WorkspaceAuthorizationRepository,
) => {
  const match = typeof workspaceId === "string" ? workspaceId.trim().match(workspaceIdPattern) : null;
  if (!match) return false;

  const [, kind, resourceId] = match;
  const schoolIds = new Set([String(authUser.schoolId || ""), ...(authUser.schoolIds || []).map(String)].filter(Boolean));
  const groupIds = new Set((authUser.groupIds || []).map(String));
  const role = String(authUser.role || "");

  if (kind === "user") return resourceId === String(authUser.id);
  if (kind === "school") return schoolIds.has(resourceId);

  if (kind === "classroom") {
    const session = await repository.findClassroomSessionScope?.(resourceId);
    if (!session) return false;
    if (role === "admin") return true;

    const sameSchool = schoolIds.has(String(session.schoolId));
    const sameClass = groupIds.has(String(session.classId));

    // Ownership alone is not durable authorization. If a teacher's school
    // membership is revoked after the session was created, reconnecting must not
    // resurrect access merely because teacherId still points to that account.
    if (role === "teacher" && String(session.teacherId) === String(authUser.id)) return sameSchool;

    if (role === "student") return sameSchool && sameClass;
    if (role === "school_admin") {
      return Boolean(await repository.canSchoolDirectorViewClassroom?.(String(authUser.id), String(session.schoolId)));
    }
    if (role === "supervisor") {
      return Boolean(await repository.canSupervisorViewClassroom?.(
        String(authUser.id),
        String(session.schoolId),
        String(session.classId),
      ));
    }
    // Non-owner teachers and unrelated platform roles must not subscribe to another
    // teacher's live classroom stream merely because they share a school.
    return false;
  }

  if (groupIds.has(resourceId)) return true;
  const supervisedGroupIds = await repository.findDirectlySupervisedGroupIds(String(authUser.id));
  return supervisedGroupIds.map(String).includes(resourceId);
};
