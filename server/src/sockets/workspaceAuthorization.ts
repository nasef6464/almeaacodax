export type WorkspaceAuthUser = {
  id: string;
  schoolId?: string | null;
  schoolIds?: string[];
  groupIds?: string[];
};

export type WorkspaceAuthorizationRepository = {
  findDirectlySupervisedGroupIds(userId: string): Promise<string[]>;
  findClassroomSessionScope?(sessionId: string): Promise<{ schoolId: string; classId: string; teacherId: string } | null>;
};

const workspaceIdPattern = /^(user|school|class|classroom):([a-zA-Z0-9_-]{1,128})$/;

/**
 * G0 permits only identity and existing school/class scope rooms. Future
 * classroom-session rooms must add their own authorization policy first.
 */
export const canJoinAuthorizedWorkspace = async (
  authUser: WorkspaceAuthUser,
  workspaceId: unknown,
  repository: WorkspaceAuthorizationRepository,
) => {
  const match = typeof workspaceId === "string" ? workspaceId.trim().match(workspaceIdPattern) : null;
  if (!match) return false;

  const [, kind, resourceId] = match;
  if (kind === "user") return resourceId === String(authUser.id);
  if (kind === "school") return new Set([String(authUser.schoolId || ""), ...(authUser.schoolIds || []).map(String)]).has(resourceId);
  if (kind === "classroom") {
    const session = await repository.findClassroomSessionScope?.(resourceId);
    if (!session) return false;
    if (String(session.teacherId) === String(authUser.id)) return true;
    const schoolIds = new Set([String(authUser.schoolId || ""), ...(authUser.schoolIds || []).map(String)]);
    return schoolIds.has(String(session.schoolId)) && (authUser.groupIds || []).map(String).includes(String(session.classId));
  }

  const directGroupIds = new Set((authUser.groupIds || []).map(String));
  if (directGroupIds.has(resourceId)) return true;
  const supervisedGroupIds = await repository.findDirectlySupervisedGroupIds(String(authUser.id));
  return supervisedGroupIds.map(String).includes(resourceId);
};
