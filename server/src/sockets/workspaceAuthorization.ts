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
    if (String(session.teacherId) === String(authUser.id)) return true;

    const sameSchool = schoolIds.has(String(session.schoolId));
    const sameClass = groupIds.has(String(session.classId));

    if (role === "student") return sameSchool && sameClass;
    if (role === "school_admin") return sameSchool;
    if (role === "supervisor") {
      if (sameSchool) return true;
      const supervisedGroupIds = await repository.findDirectlySupervisedGroupIds(String(authUser.id));
      return supervisedGroupIds.map(String).includes(String(session.classId));
    }
    // Non-owner teachers and unrelated platform roles must not subscribe to another
    // teacher's live classroom stream merely because they share a school.
    return false;
  }

  if (groupIds.has(resourceId)) return true;
  const supervisedGroupIds = await repository.findDirectlySupervisedGroupIds(String(authUser.id));
  return supervisedGroupIds.map(String).includes(resourceId);
};
