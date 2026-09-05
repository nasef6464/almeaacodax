import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const write = (file, source) => fs.writeFileSync(path.join(root, file), source, 'utf8');
const replaceOnce = (source, from, to, label) => {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`Missing anchor: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Ambiguous anchor: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
};

// 1) Backend: one authoritative normalization + reconciliation path for Admin user scope writes.
{
  const file = 'server/src/routes/auth.routes.ts';
  let source = read(file);
  source = replaceOnce(
    source,
    'import { recordAdminAuditLog } from "../services/adminAuditLog.js";\n',
    'import { recordAdminAuditLog } from "../services/adminAuditLog.js";\nimport { normalizeAdminUserRelationshipPayload, reconcileAdminUserGroupMembership } from "../services/adminUserRelationshipService.js";\n',
    'auth relationship service import',
  );
  source = replaceOnce(
    source,
    '    const targetUser = await UserModel.findOne(buildDocumentQuery(targetId)).select("role");\n',
    '    const targetUser = await UserModel.findOne(buildDocumentQuery(targetId)).select("role schoolId groupIds");\n',
    'auth target relationship fields',
  );
  source = replaceOnce(
    source,
    '    const updated = await UserModel.findOneAndUpdate(buildDocumentQuery(targetId), nextPayload, { new: true });\n',
    '    const relationship = await normalizeAdminUserRelationshipPayload(targetUser.toObject(), nextPayload);\n    Object.assign(nextPayload, relationship.payload);\n\n    const updated = await UserModel.findOneAndUpdate(buildDocumentQuery(targetId), nextPayload, { new: true });\n',
    'auth normalize before update',
  );
  source = replaceOnce(
    source,
    '    await recordAdminAuditLog(req, {\n      action: "auth.admin_user.update",\n',
    '    if (relationship.relationshipTouched) {\n      await reconcileAdminUserGroupMembership({\n        userId: String(updated.id || updated._id),\n        previousRole: relationship.previousRole,\n        effectiveRole: relationship.effectiveRole,\n        schoolId: updated.schoolId,\n        groupIds: updated.groupIds,\n      });\n    }\n\n    await recordAdminAuditLog(req, {\n      action: "auth.admin_user.update",\n',
    'auth reconcile after update',
  );
  write(file, source);
}

// 2) Store: add awaited Admin update that reconciles local denormalized group membership from server response.
{
  const file = 'store/useStore.ts';
  let source = read(file);
  source = replaceOnce(
    source,
    '    updateUser: (userId: string, data: Partial<User>) => void;\n    toggleUserStatus: (userId: string) => void;\n',
    '    updateUser: (userId: string, data: Partial<User>) => void;\n    updateUserAsync: (userId: string, data: Partial<User>) => Promise<User>;\n    toggleUserStatus: (userId: string) => void;\n',
    'store updateUserAsync interface',
  );
  const oldImplementation = `            updateUser: (userId, data) => set((state) => {\n                const previousUsers = state.users;\n                const previousCurrentUser = state.user;\n                api.updateAdminUser(userId, data).catch((error) => {\n                    console.error(error);\n                    set({\n                        users: previousUsers,\n                        user: previousCurrentUser,\n                    });\n                });\n                return {\n                    users: state.users.map(u => u.id === userId ? { ...u, ...data } : u),\n                    // Also update current user if it's the same\n                    user: state.user.id === userId ? { ...state.user, ...data } : state.user\n                };\n            }),\n\n            toggleUserStatus:`;
  const newImplementation = `            updateUser: (userId, data) => set((state) => {\n                const previousUsers = state.users;\n                const previousCurrentUser = state.user;\n                api.updateAdminUser(userId, data).catch((error) => {\n                    console.error(error);\n                    set({\n                        users: previousUsers,\n                        user: previousCurrentUser,\n                    });\n                });\n                return {\n                    users: state.users.map(u => u.id === userId ? { ...u, ...data } : u),\n                    // Also update current user if it's the same\n                    user: state.user.id === userId ? { ...state.user, ...data } : state.user\n                };\n            }),\n\n            updateUserAsync: async (userId, data) => {\n                const before = get();\n                const previousUser = before.users.find((item) => item.id === userId);\n                const response = await api.updateAdminUser(userId, data) as {\n                    user?: Partial<User> & { id?: string; _id?: string };\n                };\n                const serverUser = response?.user || {};\n                const persistedUser = {\n                    ...(previousUser || {} as User),\n                    ...data,\n                    ...serverUser,\n                    id: String(serverUser.id || serverUser._id || previousUser?.id || userId),\n                } as User;\n\n                set((state) => {\n                    const prior = state.users.find((item) => item.id === userId);\n                    const previousRole = prior?.role;\n                    const nextRole = persistedUser.role;\n                    const studentMembershipIds = new Set(\n                        nextRole === Role.STUDENT\n                            ? [\n                                ...(persistedUser.groupIds || []),\n                                ...(persistedUser.schoolId ? [persistedUser.schoolId] : []),\n                            ]\n                            : [],\n                    );\n                    const supervisorMembershipIds = new Set(\n                        nextRole === Role.SUPERVISOR ? (persistedUser.groupIds || []) : [],\n                    );\n\n                    const groups = state.groups.map((group) => {\n                        let nextGroup = group;\n                        if (previousRole === Role.STUDENT || nextRole === Role.STUDENT) {\n                            const currentStudentIds = group.studentIds || [];\n                            const shouldContainStudent = studentMembershipIds.has(group.id);\n                            const nextStudentIds = shouldContainStudent\n                                ? Array.from(new Set([...currentStudentIds, userId]))\n                                : currentStudentIds.filter((id) => id !== userId);\n                            nextGroup = { ...nextGroup, studentIds: nextStudentIds, totalStudents: nextStudentIds.length };\n                        }\n                        if (previousRole === Role.SUPERVISOR || nextRole === Role.SUPERVISOR) {\n                            const currentSupervisorIds = nextGroup.supervisorIds || [];\n                            const shouldContainSupervisor = supervisorMembershipIds.has(group.id);\n                            const nextSupervisorIds = shouldContainSupervisor\n                                ? Array.from(new Set([...currentSupervisorIds, userId]))\n                                : currentSupervisorIds.filter((id) => id !== userId);\n                            nextGroup = { ...nextGroup, supervisorIds: nextSupervisorIds, totalSupervisors: nextSupervisorIds.length };\n                        }\n                        return nextGroup;\n                    });\n                    const users = state.users.map((item) => item.id === userId ? persistedUser : item);\n                    return {\n                        groups,\n                        users,\n                        user: state.user.id === userId ? persistedUser : state.user,\n                    };\n                });\n\n                return persistedUser;\n            },\n\n            toggleUserStatus:`;
  source = replaceOnce(source, oldImplementation, newImplementation, 'store updateUserAsync implementation');
  write(file, source);
}

// 3) Users Manager: persist desired relationship state in one awaited request.
{
  const file = 'dashboards/admin/UsersManager.tsx';
  let source = read(file);
  source = replaceOnce(
    source,
    `    onChange: (next: string[]) => void;\n    size?: 'sm' | 'md';\n}> = ({ value, options, placeholder, onChange, size = 'md' }) => (\n    <select\n        multiple\n`,
    `    onChange: (next: string[]) => void;\n    size?: 'sm' | 'md';\n    disabled?: boolean;\n}> = ({ value, options, placeholder, onChange, size = 'md', disabled = false }) => (\n    <select\n        multiple\n        disabled={disabled}\n`,
    'users multiselect disabled support',
  );
  source = replaceOnce(
    source,
    `        addUser,\n        updateUser,\n        toggleUserStatus,\n        assignStudentToGroup,\n        removeStudentFromGroup,\n        assignSupervisorToGroup,\n        removeSupervisorFromGroup,\n`,
    `        addUser,\n        updateUser,\n        updateUserAsync,\n        toggleUserStatus,\n`,
    'users relationship action destructure',
  );
  source = replaceOnce(
    source,
    `    const [activeActionsUserId, setActiveActionsUserId] = useState<string | null>(null);\n`,
    `    const [activeActionsUserId, setActiveActionsUserId] = useState<string | null>(null);\n    const [relationshipSavingUserId, setRelationshipSavingUserId] = useState<string | null>(null);\n`,
    'users relationship saving state',
  );
  const oldHandlers = `    const handleStudentSchoolChange = (user: User, nextSchoolId: string) => {\n        if (user.schoolId && user.schoolId !== nextSchoolId) {\n            removeStudentFromGroup(user.id, user.schoolId);\n        }\n\n        if (nextSchoolId) {\n            assignStudentToGroup(user.id, nextSchoolId);\n        } else {\n            updateUser(user.id, { schoolId: undefined });\n        }\n    };\n\n    const handleStudentClassChange = (user: User, nextClassId: string) => {\n        const currentClassId = classes.find((group) => user.groupIds?.includes(group.id))?.id;\n        if (currentClassId && currentClassId !== nextClassId) {\n            removeStudentFromGroup(user.id, currentClassId);\n        }\n\n        if (nextClassId) {\n            assignStudentToGroup(user.id, nextClassId);\n        }\n    };\n\n    const handleSupervisorGroupsChange = (user: User, nextGroupIds: string[]) => {\n        const currentGroupIds = user.groupIds || [];\n        currentGroupIds\n            .filter((groupId) => !nextGroupIds.includes(groupId))\n            .forEach((groupId) => removeSupervisorFromGroup(user.id, groupId));\n\n        nextGroupIds\n            .filter((groupId) => !currentGroupIds.includes(groupId))\n            .forEach((groupId) => assignSupervisorToGroup(user.id, groupId));\n    };\n`;
  const newHandlers = `    const persistRelationshipScope = async (user: User, data: Partial<User>) => {\n        if (relationshipSavingUserId === user.id) return;\n        setRelationshipSavingUserId(user.id);\n        try {\n            await updateUserAsync(user.id, data);\n        } catch (error) {\n            window.alert(error instanceof Error ? error.message : 'تعذر حفظ ربط المستخدم بالمدرسة أو الفصل.');\n        } finally {\n            setRelationshipSavingUserId((current) => current === user.id ? null : current);\n        }\n    };\n\n    const handleStudentSchoolChange = async (user: User, nextSchoolId: string) => {\n        const nextGroupIds = (user.groupIds || []).filter((groupId) => {\n            const group = groups.find((item) => item.id === groupId);\n            if (!group || group.type === 'SCHOOL') return false;\n            if (!nextSchoolId) return group.type !== 'CLASS';\n            if (group.type === 'CLASS') return group.parentId === nextSchoolId;\n            return !group.parentId || group.parentId === nextSchoolId;\n        });\n\n        await persistRelationshipScope(user, {\n            schoolId: nextSchoolId || undefined,\n            groupIds: nextGroupIds,\n        });\n    };\n\n    const handleStudentClassChange = async (user: User, nextClassId: string) => {\n        const nextClass = classes.find((group) => group.id === nextClassId);\n        const nonClassGroupIds = (user.groupIds || []).filter((groupId) =>\n            !classes.some((group) => group.id === groupId),\n        );\n        await persistRelationshipScope(user, {\n            schoolId: nextClass?.parentId || user.schoolId || undefined,\n            groupIds: [\n                ...nonClassGroupIds,\n                ...(nextClass ? [nextClass.id] : []),\n            ],\n        });\n    };\n\n    const handleSupervisorGroupsChange = async (user: User, nextGroupIds: string[]) => {\n        const selectedSchoolIds = nextGroupIds.filter((groupId) =>\n            schools.some((school) => school.id === groupId),\n        );\n        const nextSchoolId = user.schoolId && selectedSchoolIds.includes(user.schoolId)\n            ? user.schoolId\n            : selectedSchoolIds[0];\n\n        await persistRelationshipScope(user, {\n            schoolId: nextSchoolId || undefined,\n            groupIds: nextGroupIds,\n        });\n    };\n`;
  source = replaceOnce(source, oldHandlers, newHandlers, 'users single desired relationship handlers');
  source = source.replace(
    `                                                        value={currentSchoolId}\n                                                        onChange={(event) => handleStudentSchoolChange(currentUser, event.target.value)}\n`,
    `                                                        value={currentSchoolId}\n                                                        disabled={relationshipSavingUserId === currentUser.id}\n                                                        onChange={(event) => { void handleStudentSchoolChange(currentUser, event.target.value); }}\n`,
  );
  source = source.replace(
    `                                                        value={currentClassId}\n                                                        onChange={(event) => handleStudentClassChange(currentUser, event.target.value)}\n`,
    `                                                        value={currentClassId}\n                                                        disabled={relationshipSavingUserId === currentUser.id}\n                                                        onChange={(event) => { void handleStudentClassChange(currentUser, event.target.value); }}\n`,
  );
  source = source.replace(
    `                                                        onChange={(nextGroupIds) => handleSupervisorGroupsChange(currentUser, nextGroupIds)}\n                                                        size="sm"\n`,
    `                                                        onChange={(nextGroupIds) => { void handleSupervisorGroupsChange(currentUser, nextGroupIds); }}\n                                                        size="sm"\n                                                        disabled={relationshipSavingUserId === currentUser.id}\n`,
  );
  source = source.replace(
    `                                                    <p className="text-[11px] text-gray-400">\n                                                        يمكن جعل المشرف مدير مدرسة باختيار المدرسة، أو مسؤولًا عن فصل/عدة فصول من نفس الحساب.\n                                                    </p>\n`,
    `                                                    <p className="text-[11px] text-gray-400">\n                                                        يمكن جعل المشرف مدير مدرسة باختيار المدرسة، أو مسؤولًا عن فصل/عدة فصول من نفس الحساب.\n                                                    </p>\n                                                    {relationshipSavingUserId === currentUser.id ? (\n                                                        <p className="text-[11px] font-bold text-indigo-600">جارٍ حفظ الربط...</p>\n                                                    ) : null}\n`,
  );
  write(file, source);
}

// 4) Supervisor builder: a directed supervisor assessment should be available after save by default.
{
  const file = 'dashboards/admin/UnifiedQuizBuilder.tsx';
  let source = read(file);
  source = replaceOnce(
    source,
    '  const [isPublished, setIsPublished] = useState(editingQuiz?.isPublished ?? isAdmin);\n  const [showOnPlatform, setShowOnPlatform] = useState(editingQuiz?.showOnPlatform ?? isAdmin);\n',
    '  const [isPublished, setIsPublished] = useState(editingQuiz?.isPublished ?? (isAdmin || isSupervisor));\n  const [showOnPlatform, setShowOnPlatform] = useState(editingQuiz?.showOnPlatform ?? (isAdmin || isSupervisor));\n',
    'supervisor publish defaults',
  );
  write(file, source);
}

// 5) Notifications: cookie-first auth must work without exposing bearer tokens to SessionUser/sessionStorage.
{
  const file = 'components/NotificationBell.tsx';
  let source = read(file);
  source = replaceOnce(
    source,
    `  const { unreadCount, latestNotification, isConnected } = useNotificationStream({\n    token,\n    apiBase,\n    enabled: !!token,\n  });\n`,
    `  const { unreadCount, latestNotification, isConnected } = useNotificationStream({\n    token,\n    apiBase,\n    enabled: true,\n  });\n`,
    'notification bell cookie-first enablement',
  );
  source = source.replace(/\n    if \(!token\) return;/g, '');
  write(file, source);
}

{
  const file = 'contexts/useNotificationStream.ts';
  let source = read(file);
  source = replaceOnce(
    source,
    '    if (!enabled || !token || !isMounted.current) return;\n',
    '    if (!enabled || !isMounted.current) return;\n',
    'notification stream cookie-first guard',
  );
  source = replaceOnce(
    source,
    `    const url = \`${'${apiBase}'}/api/notifications/stream?token=${'${encodeURIComponent(token)}'}\`;\n    const es = new EventSource(url, { withCredentials: false });\n`,
    `    const streamUrl = \`${'${apiBase}'}/api/notifications/stream\`;\n    const url = token\n      ? \`${'${streamUrl}'}?token=${'${encodeURIComponent(token)}'}\`\n      : streamUrl;\n    const es = new EventSource(url, { withCredentials: !token });\n`,
    'notification stream token-or-cookie URL',
  );
  write(file, source);
}

console.log('Applied supervisor/student/school flow fixes.');
