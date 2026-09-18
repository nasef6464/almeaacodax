import React, { useEffect, useMemo, useState } from 'react';
import { Download, Edit2, Filter, MoreVertical, Plus, Search, UserCheck, UserX, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CategoryPath, CategorySubject, Role, User } from '../../types';
import { api } from '../../services/api';
import { loadXlsx } from '../../utils/xlsxLoader';

type AdminUserPayload = {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
    role: Role;
    points?: number;
    badges?: string[];
    isActive?: boolean;
    schoolId?: string | null;
    groupIds?: string[];
    linkedStudentIds?: string[];
    managedPathIds?: string[];
    managedSubjectIds?: string[];
    schoolContexts?: Array<{ schoolId: string; role: string; permissions: string[] }>;
    subscription?: {
        plan?: 'free' | 'premium';
        purchasedCourses?: string[];
        purchasedPackages?: string[];
    };
};

const buildStoreUser = (user: AdminUserPayload): User => ({
    id: String(user.id || user._id || user.email),
    name: user.name,
    email: user.email,
    avatar: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
    role: user.role,
    points: user.points ?? 0,
    badges: user.badges ?? [],
    isActive: user.isActive ?? true,
    schoolId: user.schoolId ?? undefined,
    groupIds: user.groupIds ?? [],
    linkedStudentIds: user.linkedStudentIds ?? [],
    managedPathIds: user.managedPathIds ?? [],
    managedSubjectIds: user.managedSubjectIds ?? [],
    schoolContexts: user.schoolContexts ?? [],
    subscription: {
        plan: user.subscription?.plan ?? 'free',
        purchasedCourses: user.subscription?.purchasedCourses ?? [],
        purchasedPackages: user.subscription?.purchasedPackages ?? [],
    },
});

const roleLabels: Record<Role, string> = {
    [Role.ADMIN]: 'مدير المنصة',
    [Role.SUPERVISOR]: 'مشرف',
    [Role.SCHOOL_ADMIN]: 'مدير مدرسة',
    [Role.TEACHER]: 'معلم / مدرب',
    [Role.PARENT]: 'ولي أمر',
    [Role.STUDENT]: 'طالب',
};

const resolveUserRoleLabel = (currentUser: User) => {
    if (currentUser.role !== Role.TEACHER) return roleLabels[currentUser.role];
    const hasPlatformScope = Boolean(currentUser.managedPathIds?.length || currentUser.managedSubjectIds?.length);
    const hasSchoolScope = Boolean(currentUser.schoolId || currentUser.groupIds?.length);
    if (hasPlatformScope && hasSchoolScope) return 'مدرب منصة + معلم مدرسة';
    if (hasPlatformScope) return 'مدرب منصة';
    if (hasSchoolScope) return 'معلم مدرسة';
    return 'معلم مدرسة (غير مسند)';
};

const createWorkbookDownload = async (
    fileName: string,
    sheets: Array<{ name: string; rows: Array<Array<string | number>> }>,
) => {
    const XLSX = await loadXlsx();
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, fileName);
};

const MultiSelectField: React.FC<{
    value: string[];
    options: { value: string; label: string }[];
    placeholder: string;
    onChange: (next: string[]) => void;
    size?: 'sm' | 'md';
    disabled?: boolean;
}> = ({ value, options, placeholder, onChange, size = 'md', disabled = false }) => (
    <select
        multiple
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map((option) => option.value))}
        className={`w-full border border-gray-300 rounded-lg px-3 ${
            size === 'sm' ? 'py-2 h-28 text-sm' : 'py-2.5 h-32 text-sm'
        } focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:cursor-wait disabled:opacity-60`}
    >
        {options.length === 0 ? (
            <option disabled value="">
                {placeholder}
            </option>
        ) : (
            options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))
        )}
    </select>
);

const resolveTeacherSubjects = (
    managedPathIds: string[],
    subjects: CategorySubject[],
): CategorySubject[] => {
    if (!managedPathIds.length) return subjects;
    return subjects.filter((subject) => managedPathIds.includes(subject.pathId));
};

export const UsersManager: React.FC = () => {
    const {
        groups,
        paths,
        subjects,
        assignStudentToGroupAsync,
        removeStudentFromGroupAsync,
        assignSupervisorToGroupAsync,
        removeSupervisorFromGroupAsync,
    } = useStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usersPage, setUsersPage] = useState(1);
    const [pageUsers, setPageUsers] = useState<User[]>([]);
    const [usersLimit] = useState(50);
    const [usersTotalPages, setUsersTotalPages] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [usersLoadError, setUsersLoadError] = useState('');
    const [activeActionsUserId, setActiveActionsUserId] = useState<string | null>(null);
    const [allStudentsForLinking, setAllStudentsForLinking] = useState<User[]>([]);
    const [createError, setCreateError] = useState('');
    const [relationshipActionUserId, setRelationshipActionUserId] = useState<string | null>(null);
    const [relationshipActionError, setRelationshipActionError] = useState('');
    const [bulkStatusMessage, setBulkStatusMessage] = useState('');
    const [usersSummary, setUsersSummary] = useState<{ byRole: Record<string, number>; inactive: number; platformTrainers: number } | null>(null);
    const [newUserType, setNewUserType] = useState<'student' | 'school_teacher' | 'platform_trainer' | 'supervisor' | 'school_admin' | 'parent' | 'admin'>('student');
    const [newUserSchoolId, setNewUserSchoolId] = useState('');
    const [newUserClassId, setNewUserClassId] = useState('');
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: Role.STUDENT as Role,
        linkedStudentIds: [] as string[],
        managedPathIds: [] as string[],
        managedSubjectIds: [] as string[],
    });

    const replacePageUser = (nextUser: User) => {
        setPageUsers((current) => current.map((item) => item.id === nextUser.id ? nextUser : item));
    };
    const persistPageUserPatch = async (currentUser: User, patch: Partial<User>) => {
        setRelationshipActionUserId(currentUser.id);
        setRelationshipActionError('');
        try {
            const response = await api.updateAdminUser(currentUser.id, patch);
            const payload = (response as { user?: AdminUserPayload }).user;
            if (!payload) throw new Error('لم يُرجع الخادم بيانات المستخدم بعد الحفظ.');
            replacePageUser(buildStoreUser(payload));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'تعذر حفظ المستخدم الآن.';
            setRelationshipActionError(message);
            window.alert(message);
        } finally {
            setRelationshipActionUserId((value) => value === currentUser.id ? null : value);
        }
    };

    const schools = useMemo(() => groups.filter((group) => group.type === 'SCHOOL'), [groups]);
    const classes = useMemo(() => groups.filter((group) => group.type === 'CLASS'), [groups]);
    const students = useMemo(() => pageUsers.filter((user) => user.role === Role.STUDENT), [pageUsers]);
    const linkableStudents = useMemo(() => {
        const byId = new Map<string, User>();
        [...allStudentsForLinking, ...students].forEach((student) => {
            byId.set(student.id, student);
        });
        return Array.from(byId.values());
    }, [allStudentsForLinking, students]);
    const pathOptions = useMemo(() => paths.map((path) => ({ value: path.id, label: path.name })), [paths]);
    const teacherSubjectOptions = useMemo(() => {
        return resolveTeacherSubjects(newUser.managedPathIds, subjects).map((subject) => ({
            value: subject.id,
            label: subject.name,
        }));
    }, [newUser.managedPathIds, subjects]);

    const filteredUsers = useMemo(() => {
        if (roleFilter === 'school_teacher') {
            return pageUsers.filter((u) => u.role === Role.TEACHER && (Boolean(u.schoolId) || Boolean(u.groupIds?.length)));
        }
        if (roleFilter === 'platform_trainer') {
            return pageUsers.filter((u) => u.role === Role.TEACHER && ((u.managedPathIds?.length || 0) > 0 || (u.managedSubjectIds?.length || 0) > 0) && !u.schoolId && !u.groupIds?.length);
        }
        return pageUsers;
    }, [pageUsers, roleFilter]);
    const usersByRole = useMemo(() => {
        return Object.values(Role).reduce((acc, role) => {
            acc[role] = pageUsers.filter((user) => user.role === role).length;
            return acc;
        }, {} as Record<Role, number>);
    }, [pageUsers]);
    const inactiveUsersCount = useMemo(() => pageUsers.filter((user) => user.isActive === false).length, [pageUsers]);
    const scopedTeachersCount = useMemo(
        () => pageUsers.filter((user) => user.role === Role.TEACHER && ((user.managedPathIds?.length || 0) > 0 || (user.managedSubjectIds?.length || 0) > 0)).length,
        [pageUsers],
    );
    const manageableFilteredUsers = useMemo(() => filteredUsers.filter((user) => user.role !== Role.ADMIN), [filteredUsers]);
    const visibleActiveCount = useMemo(
        () => manageableFilteredUsers.filter((user) => user.isActive !== false).length,
        [manageableFilteredUsers],
    );
    const visibleInactiveCount = useMemo(
        () => manageableFilteredUsers.filter((user) => user.isActive === false).length,
        [manageableFilteredUsers],
    );

    useEffect(() => {
        let isMounted = true;
        const timer = window.setTimeout(() => {
            setIsUsersLoading(true);
            setUsersLoadError('');

            const effectiveRole = roleFilter === 'all'
                ? undefined
                : (roleFilter === 'platform_trainer' || roleFilter === 'school_teacher')
                ? Role.TEACHER
                : roleFilter as Role;

            const effectivePlatformTrainer = roleFilter === 'platform_trainer' ? true : undefined;

            api.getAdminUsers({
                page: usersPage,
                limit: usersLimit,
                search: searchTerm.trim() || undefined,
                role: effectiveRole,
                platformTrainer: effectivePlatformTrainer,
            } as any)
                .then((response) => {
                    if (!isMounted) return;
                    setPageUsers((response.users || []).map(buildStoreUser));
                    const pagination = response.pagination || {
                        page: usersPage,
                        limit: usersLimit,
                        total: 0,
                        totalPages: 1,
                    };
                    setUsersTotalPages(Math.max(pagination.totalPages, 1));
                    setUsersTotal(pagination.total || 0);
                    if (response.pagination && pagination.page !== usersPage) {
                        setUsersPage(pagination.page);
                    }
                })
                .catch((error) => {
                    if (!isMounted) return;
                    console.error('Failed to load admin users:', error);
                    setUsersLoadError('تعذر تحميل المستخدمين الآن. حاول تحديث التبويب بعد لحظات.');
                })
                .finally(() => {
                    if (isMounted) setIsUsersLoading(false);
                });
        }, 250);

        return () => {
            isMounted = false;
            window.clearTimeout(timer);
        };
    }, [searchTerm, roleFilter, usersPage, usersLimit]);

    useEffect(() => {
        void api.getAdminUsersSummary().then(setUsersSummary).catch(() => setUsersSummary(null));
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadAllStudentsForLinking = async () => {
            try {
                const firstPage = await api.getAdminUsers({ role: Role.STUDENT, page: 1, limit: 100 });
                const firstPageUsers = (firstPage.users || []).map(buildStoreUser).filter((user) => user.role === Role.STUDENT);
                const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages || 1));
                const nextPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
                const remaining = await Promise.all(nextPages.map((page) => api.getAdminUsers({ role: Role.STUDENT, page, limit: 100 })));
                const combined = [
                    ...firstPageUsers,
                    ...remaining.flatMap((response) => (response.users || []).map(buildStoreUser).filter((user) => user.role === Role.STUDENT)),
                ];
                if (isMounted) setAllStudentsForLinking(combined);
            } catch (error) {
                if (isMounted) {
                    console.error('Failed to load students list for parent linking:', error);
                    setAllStudentsForLinking([]);
                }
            }
        };
        void loadAllStudentsForLinking();
        return () => { isMounted = false; };
    }, []);

    const handleSearchTermChange = (value: string) => {
        setUsersPage(1);
        setSearchTerm(value);
    };
    const handleRoleFilterChange = (value: string) => {
        setUsersPage(1);
        setRoleFilter(value);
    };
    const handleRoleChange = (currentUser: User, newRole: Role) => {
        if (currentUser.role === newRole) return;
        setRelationshipActionUserId(currentUser.id);
        setRelationshipActionError('');
        void api.updateAdminUser(currentUser.id, { role: newRole })
            .then((response) => {
                const persistedPayload = (response as { user?: AdminUserPayload })?.user;
                if (!persistedPayload) throw new Error('لم يُرجع الخادم بيانات المستخدم بعد تغيير الدور.');
                const persistedUser = buildStoreUser(persistedPayload);
                replacePageUser(persistedUser);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'تعذر تغيير دور المستخدم الآن.';
                console.error('Failed to persist user role change:', error);
                setRelationshipActionError(message);
                window.alert(message);
            })
            .finally(() => {
                setRelationshipActionUserId((current) => current === currentUser.id ? null : current);
            });
    };

    const handleCustomRoleChange = (currentUser: User, newRoleValue: string) => {
        const isSchoolTeacher = newRoleValue === 'school_teacher';
        const isPlatformTrainer = newRoleValue === 'platform_trainer';
        const targetRole: Role = isSchoolTeacher || isPlatformTrainer ? Role.TEACHER : (newRoleValue as Role);

        setRelationshipActionUserId(currentUser.id);
        setRelationshipActionError('');

        const updatePayload: Record<string, any> = { role: targetRole };
        if (isSchoolTeacher) {
            updatePayload.managedPathIds = [];
            updatePayload.managedSubjectIds = [];
        } else if (isPlatformTrainer) {
            updatePayload.schoolId = null;
            updatePayload.groupIds = [];
        }

        void api.updateAdminUser(currentUser.id, updatePayload)
            .then((response) => {
                const persistedPayload = (response as { user?: AdminUserPayload })?.user;
                if (!persistedPayload) throw new Error('لم يُرجع الخادم بيانات المستخدم بعد تغيير الدور.');
                const persistedUser = buildStoreUser(persistedPayload);
                replacePageUser(persistedUser);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'تعذر تغيير دور المستخدم الآن.';
                console.error('Failed to persist user role change:', error);
                setRelationshipActionError(message);
                window.alert(message);
            })
            .finally(() => {
                setRelationshipActionUserId((current) => current === currentUser.id ? null : current);
            });
    };

    const startEditingUser = (user: User) => {
        setEditingUserId(user.id);
        setNameDrafts((current) => ({ ...current, [user.id]: user.name }));
    };
    const saveUserName = (user: User) => {
        const nextName = (nameDrafts[user.id] ?? user.name).trim();
        if (nextName.length < 2 || nextName === user.name) return;
        void persistPageUserPatch(user, { name: nextName });
    };
    const stopEditingUser = (user: User) => {
        saveUserName(user);
        setEditingUserId(null);
        setNameDrafts((current) => {
            const next = { ...current };
            delete next[user.id];
            return next;
        });
    };
    const toggleActionsMenu = (userId: string) => setActiveActionsUserId((current) => (current === userId ? null : userId));
    const closeActionsMenu = () => setActiveActionsUserId(null);

    const handleCreateUser = async () => {
        if (!newUser.name.trim() || !newUser.email.trim() || newUser.password.trim().length < 6) {
            setCreateError('أدخل الاسم والبريد الإلكتروني وكلمة مرور لا تقل عن 6 أحرف.');
            return;
        }
        try {
            setIsSubmitting(true);
            setCreateError('');
            const isSchoolTeacher = newUserType === 'school_teacher';
            const isPlatformTrainer = newUserType === 'platform_trainer';
            const response = await api.createAdminUser({
                name: newUser.name.trim(),
                email: newUser.email.trim(),
                password: newUser.password,
                role: newUser.role,
                schoolId: isSchoolTeacher ? newUserSchoolId || null : null,
                groupIds: isSchoolTeacher && newUserClassId ? [newUserClassId] : [],
                linkedStudentIds: newUser.role === Role.PARENT ? newUser.linkedStudentIds : [],
                managedPathIds: isPlatformTrainer ? newUser.managedPathIds : [],
                managedSubjectIds: isPlatformTrainer ? newUser.managedSubjectIds : [],
            }) as { user?: AdminUserPayload };
            if (response.user) {
                const createdUser = buildStoreUser(response.user);
                setPageUsers((current) => [createdUser, ...current]);
                if (isSchoolTeacher && newUserSchoolId && newUserClassId) {
                    await api.updateTeachingAssignment({
                        schoolId: newUserSchoolId,
                        teacherId: createdUser.id,
                        classId: newUserClassId,
                    }).catch(() => {});
                }
            }
            setNewUser({ name: '', email: '', password: '', role: Role.STUDENT, linkedStudentIds: [], managedPathIds: [], managedSubjectIds: [] });
            setNewUserSchoolId('');
            setNewUserClassId('');
            setNewUserType('student');
            setIsCreateOpen(false);
        } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'تعذر إنشاء المستخدم الآن.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resolveSchoolName = (currentUser: User) => currentUser.schoolId ? schools.find((group) => group.id === currentUser.schoolId)?.name || null : null;
    const resolveClassName = (currentUser: User) => classes.find((group) => currentUser.groupIds?.includes(group.id))?.name || null;
    const resolveTeacherScope = (currentUser: User) => ({
        pathNames: paths.filter((path) => currentUser.managedPathIds?.includes(path.id)).map((path) => path.name),
        subjectNames: subjects.filter((subject) => currentUser.managedSubjectIds?.includes(subject.id)).map((subject) => subject.name),
    });

    const exportUsersWorkbook = () => {
        const userRows: Array<Array<string | number>> = [
            ['الاسم', 'البريد الإلكتروني', 'الشخصية/مساحة العمل', 'الحالة', 'المدرسة القديمة', 'السياقات المدرسية الفعلية', 'الفصل/المجموعة', 'نطاق المدرب', 'الأبناء المرتبطون'],
            ...filteredUsers.map((currentUser) => {
                const schoolName = resolveSchoolName(currentUser) || '';
                const userGroups = groups.filter((group) => currentUser.groupIds?.includes(group.id)).map((group) => group.name).join('، ');
                const { pathNames, subjectNames } = resolveTeacherScope(currentUser);
                const linkedStudents = linkableStudents.filter((student) => currentUser.linkedStudentIds?.includes(student.id)).map((student) => student.name).join('، ');
                const schoolContexts = (currentUser.schoolContexts || []).map((context) => `${context.role}@${schools.find((group) => group.id === context.schoolId)?.name || context.schoolId}`).join('، ');
                return [currentUser.name, currentUser.email || '', resolveUserRoleLabel(currentUser), currentUser.isActive === false ? 'متوقف' : 'نشط', schoolName, schoolContexts, userGroups, [...pathNames, ...subjectNames].join('، '), linkedStudents];
            }),
        ];
        const roleRows: Array<Array<string | number>> = [
            ['الدور', 'العدد'],
            ...Object.values(Role).map((role) => [roleLabels[role], usersByRole[role] || 0]),
            ['مستخدمون متوقفون', inactiveUsersCount],
            ['مدربو منصة بنطاق محتوى محدد', scopedTeachersCount],
        ];
        void createWorkbookDownload('platform-users-operational-report.xlsx', [
            { name: 'users', rows: userRows },
            { name: 'roles', rows: roleRows },
        ]);
    };

    const getRoleBadge = (currentUser: User) => {
        switch (currentUser.role) {
            case Role.ADMIN: return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">مدير المنصة</span>;
            case Role.SUPERVISOR: return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">مشرف</span>;
            case Role.SCHOOL_ADMIN: return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">مدير مدرسة</span>;
            case Role.TEACHER: {
                const hasPlatformScope = Boolean(currentUser.managedPathIds?.length || currentUser.managedSubjectIds?.length);
                const hasSchoolScope = Boolean(currentUser.schoolId || currentUser.groupIds?.length);
                if (hasPlatformScope && hasSchoolScope) {
                    return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">مدرب منصة + معلم مدرسة</span>;
                }
                if (hasPlatformScope) {
                    return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">مدرب منصة</span>;
                }
                return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">معلم مدرسة</span>;
            }
            case Role.PARENT: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ولي أمر</span>;
            case Role.STUDENT: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">طالب</span>;
            default: return null;
        }
    };

    const withRelationshipSave = async (userId: string, operation: () => Promise<void>) => {
        setRelationshipActionUserId(userId);
        setRelationshipActionError('');
        try {
            await operation();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'تعذر حفظ علاقة المستخدم الآن.';
            console.error('Failed to persist user relationship:', error);
            setRelationshipActionError(message);
            window.alert(message);
        } finally {
            setRelationshipActionUserId((current) => current === userId ? null : current);
        }
    };

    const handleStudentSchoolChange = (currentUser: User, nextSchoolId: string) => {
        void withRelationshipSave(currentUser.id, async () => {
            const currentClassIds = classes.filter((group) => currentUser.groupIds?.includes(group.id)).map((group) => group.id);
            for (const classId of currentClassIds) {
                const classGroup = classes.find((group) => group.id === classId);
                if (!nextSchoolId || classGroup?.parentId !== nextSchoolId) await removeStudentFromGroupAsync(currentUser.id, classId);
            }
            if (currentUser.schoolId && currentUser.schoolId !== nextSchoolId) await removeStudentFromGroupAsync(currentUser.id, currentUser.schoolId);
            if (nextSchoolId && currentUser.schoolId !== nextSchoolId) await assignStudentToGroupAsync(currentUser.id, nextSchoolId);
        });
    };

    const handleStudentClassChange = (currentUser: User, nextClassId: string) => {
        void withRelationshipSave(currentUser.id, async () => {
            const nextClass = nextClassId ? classes.find((group) => group.id === nextClassId) : undefined;
            if (nextClassId && !nextClass) throw new Error('الفصل المحدد غير موجود.');
            if (nextClass?.parentId && currentUser.schoolId !== nextClass.parentId) await assignStudentToGroupAsync(currentUser.id, nextClass.parentId);
            const currentClassIds = classes.filter((group) => currentUser.groupIds?.includes(group.id)).map((group) => group.id);
            for (const classId of currentClassIds) if (classId !== nextClassId) await removeStudentFromGroupAsync(currentUser.id, classId);
            if (nextClassId && !currentClassIds.includes(nextClassId)) await assignStudentToGroupAsync(currentUser.id, nextClassId);
        });
    };

    const handleSupervisorGroupsChange = (currentUser: User, nextGroupIds: string[]) => {
        void withRelationshipSave(currentUser.id, async () => {
            const validGroupIds = Array.from(new Set(nextGroupIds)).filter((groupId) => groups.some((group) => group.id === groupId && (group.type === 'SCHOOL' || group.type === 'CLASS')));
            const currentGroupIds = (currentUser.groupIds || []).filter((groupId) => groups.some((group) => group.id === groupId && (group.type === 'SCHOOL' || group.type === 'CLASS')));
            const selectedGroups = groups.filter((group) => validGroupIds.includes(group.id));
            const selectedSchool = selectedGroups.find((group) => group.type === 'SCHOOL');
            const selectedClass = selectedGroups.find((group) => group.type === 'CLASS');
            const nextSchoolId = selectedSchool?.id || selectedClass?.parentId || null;

            // Persist the complete selection first. The UsersManager page is
            // intentionally backed by its own paginated server result rather
            // than store.users, so the store relationship helpers may not find
            // this row and can otherwise return without writing anything.
            const response = await api.updateAdminUser(currentUser.id, {
                schoolId: nextSchoolId,
                groupIds: validGroupIds,
            });
            const persistedPayload = (response as { user?: AdminUserPayload }).user;
            if (!persistedPayload) throw new Error('لم يُرجع الخادم نطاق المشرف بعد الحفظ.');

            // Keep the inverse Group.supervisorIds relationship in sync as well.
            // The paginated admin row is not guaranteed to exist in store.users,
            // so calling the store helpers alone can no-op before reaching the API.
            for (const groupId of currentGroupIds.filter((groupId) => !validGroupIds.includes(groupId))) {
                const group = groups.find((item) => item.id === groupId);
                if (group) {
                    const supervisorIds = (group.supervisorIds || []).filter((id) => id !== currentUser.id);
                    await api.updateGroup(groupId, {
                        supervisorIds,
                        totalSupervisors: supervisorIds.length,
                    });
                }
                await removeSupervisorFromGroupAsync(currentUser.id, groupId);
            }
            for (const groupId of validGroupIds.filter((groupId) => !currentGroupIds.includes(groupId))) {
                const group = groups.find((item) => item.id === groupId);
                if (group) {
                    const supervisorIds = Array.from(new Set([...(group.supervisorIds || []), currentUser.id]));
                    await api.updateGroup(groupId, {
                        supervisorIds,
                        totalSupervisors: supervisorIds.length,
                    });
                }
                await assignSupervisorToGroupAsync(currentUser.id, groupId);
            }

            replacePageUser(buildStoreUser(persistedPayload));
        });
    };

    const handleParentSchoolChange = (currentUser: User, nextSchoolId: string) => {
        const nextLinkedStudents = (currentUser.linkedStudentIds || []).filter((studentId) => {
            const linkedStudent = linkableStudents.find((student) => student.id === studentId);
            return !nextSchoolId || linkedStudent?.schoolId === nextSchoolId;
        });
        void persistPageUserPatch(currentUser, { schoolId: nextSchoolId || undefined, linkedStudentIds: nextLinkedStudents });
    };
    const handleParentLinkedStudentsChange = (userId: string, linkedStudentIds: string[]) => { const currentUser = pageUsers.find((item) => item.id === userId); if (currentUser) void persistPageUserPatch(currentUser, { linkedStudentIds }); };
    const handleTeacherPathsChange = (currentUser: User, nextPathIds: string[]) => {
        const nextSubjects = (currentUser.managedSubjectIds || []).filter((subjectId) => {
            const subject = subjects.find((item) => item.id === subjectId);
            return subject && nextPathIds.includes(subject.pathId);
        });
        void persistPageUserPatch(currentUser, { managedPathIds: nextPathIds, managedSubjectIds: nextSubjects });
    };
    const handleTeacherSubjectsChange = (userId: string, managedSubjectIds: string[]) => { const currentUser = pageUsers.find((item) => item.id === userId); if (currentUser) void persistPageUserPatch(currentUser, { managedSubjectIds }); };

    const handleDeleteUser = async (currentUser: User) => {
        if (!window.confirm(`حذف المستخدم "${currentUser.name}"؟ لا يمكن التراجع عن هذه العملية.`)) return;
        try {
            await api.deleteAdminUser(currentUser.id);
            setPageUsers((current) => current.filter((item) => item.id !== currentUser.id));
            if (editingUserId === currentUser.id) setEditingUserId(null);
            setNameDrafts((current) => {
                const next = { ...current };
                delete next[currentUser.id];
                return next;
            });
            closeActionsMenu();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'تعذر حذف المستخدم الآن.');
        }
    };

    const handleUserStatusToggle = (currentUser: User) => void persistPageUserPatch(currentUser, { isActive: !(currentUser.isActive ?? true) });
    const setFilteredUsersStatus = async (active: boolean) => {
        const targets = manageableFilteredUsers.filter((currentUser) => (currentUser.isActive ?? true) !== active);
        if (!targets.length) return;
        setBulkStatusMessage('جارٍ تنفيذ العملية الجماعية…');
        try {
            const response = await api.bulkSetAdminUsersStatus(targets.map((user) => user.id), active);
            const updatedIds = new Set(response.results.filter((result) => result.status === 'updated').map((result) => result.userId));
            const skipped = response.results.filter((result) => result.status !== 'updated');
            setPageUsers((current) => current.map((user) => updatedIds.has(user.id) ? { ...user, isActive: active } : user));
            setBulkStatusMessage(`تم تحديث ${updatedIds.size} مستخدم${skipped.length ? `، وتعذر/تُخطي ${skipped.length}` : ''}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'تعذر تنفيذ العملية الجماعية.';
            setBulkStatusMessage(message);
        }
    };

    const handleTeacherSchoolChange = (currentUser: User, nextSchoolId: string) => {
        void withRelationshipSave(currentUser.id, async () => {
            const nextClassIds = nextSchoolId
                ? (currentUser.groupIds || []).filter((id) => classes.some((c) => c.id === id && c.parentId === nextSchoolId))
                : [];
            await api.updateAdminUser(currentUser.id, {
                schoolId: nextSchoolId || null,
                groupIds: nextClassIds,
            });
            replacePageUser({ ...currentUser, schoolId: nextSchoolId || undefined, groupIds: nextClassIds });
        });
    };

    const handleTeacherClassChange = (currentUser: User, nextClassId: string) => {
        void withRelationshipSave(currentUser.id, async () => {
            const nextClass = classes.find((c) => c.id === nextClassId);
            const targetSchoolId = nextClass?.parentId || currentUser.schoolId;
            const nextGroupIds = nextClassId ? [nextClassId] : [];
            await api.updateAdminUser(currentUser.id, {
                schoolId: targetSchoolId || null,
                groupIds: nextGroupIds,
            });
            if (targetSchoolId && nextClassId) {
                await api.updateTeachingAssignment({
                    schoolId: targetSchoolId,
                    teacherId: currentUser.id,
                    classId: nextClassId,
                }).catch(() => {});
            }
            replacePageUser({ ...currentUser, schoolId: targetSchoolId || undefined, groupIds: nextGroupIds });
        });
    };

    const renderTeacherScopeEditor = (currentUser: User) => {
        const isSavingRelationship = relationshipActionUserId === currentUser.id;
        const selectedPathIds = currentUser.managedPathIds || [];
        const subjectOptions = resolveTeacherSubjects(selectedPathIds, subjects).map((subject) => ({ value: subject.id, label: subject.name }));
        const currentSchoolId = currentUser.schoolId || '';
        const currentClassId = classes.find((group) => currentUser.groupIds?.includes(group.id))?.id || '';
        const availableClasses = classes.filter((group) => !currentSchoolId || group.parentId === currentSchoolId);

        return (
            <div className="space-y-3 min-w-[280px]">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-emerald-900">نطاق معلم المدرسة (B2B):</p>
                        {currentUser.schoolId && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">مسند لمدرسة</span>}
                    </div>
                    <select
                        disabled={isSavingRelationship}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                        value={currentSchoolId}
                        onChange={(event) => handleTeacherSchoolChange(currentUser, event.target.value)}
                    >
                        <option value="">بدون مدرسة (غير مسند)</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                    <select
                        disabled={isSavingRelationship || !currentSchoolId}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white disabled:opacity-50 focus:ring-1 focus:ring-emerald-500"
                        value={currentClassId}
                        onChange={(event) => handleTeacherClassChange(currentUser, event.target.value)}
                    >
                        <option value="">بدون فصل مسند</option>
                        {availableClasses.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-indigo-900">نطاق مدرب المنصة (B2C):</p>
                        {Boolean(selectedPathIds.length) && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded">مسند لمسارات</span>}
                    </div>
                    <MultiSelectField
                        value={selectedPathIds}
                        options={pathOptions}
                        placeholder="أضف مسارًا للتدريب"
                        onChange={(nextPathIds) => handleTeacherPathsChange(currentUser, nextPathIds)}
                        size="sm"
                    />
                    <MultiSelectField
                        value={currentUser.managedSubjectIds || []}
                        options={subjectOptions}
                        placeholder="اختر مواد المدرب"
                        onChange={(nextSubjectIds) => handleTeacherSubjectsChange(currentUser.id, nextSubjectIds)}
                        size="sm"
                    />
                </div>
                {isSavingRelationship && <p className="text-[11px] font-bold text-amber-600">جاري حفظ نطاق المعلم/المدرب…</p>}
            </div>
        );
    };

    const renderAssignmentSummary = (currentUser: User) => {
        if (currentUser.role === Role.TEACHER) {
            const { pathNames, subjectNames } = resolveTeacherScope(currentUser);
            const schoolName = resolveSchoolName(currentUser);
            const className = resolveClassName(currentUser);
            const hasSchool = Boolean(schoolName || className);
            const hasPlatform = Boolean(pathNames.length || subjectNames.length);

            if (!hasSchool && !hasPlatform) return <span className="text-xs text-gray-400">بدون نطاق إسناد</span>;

            return (
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    {hasSchool && (
                        <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">مدرسة:</span>
                            {schoolName && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs">{schoolName}</span>}
                            {className && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs">{className}</span>}
                        </div>
                    )}
                    {hasPlatform && (
                        <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">منصة:</span>
                            {pathNames.map((name) => <span key={`path-${name}`} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs">{name}</span>)}
                            {subjectNames.map((name) => <span key={`subject-${name}`} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{name}</span>)}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="flex flex-wrap gap-1">
                {resolveSchoolName(currentUser) && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{resolveSchoolName(currentUser)}</span>}
                {resolveClassName(currentUser) && <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{resolveClassName(currentUser)}</span>}
                {currentUser.role === Role.PARENT && !!currentUser.linkedStudentIds?.length && <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">الأبناء المرتبطون: {currentUser.linkedStudentIds.length}</span>}
                {!resolveSchoolName(currentUser) && !resolveClassName(currentUser) && !(currentUser.role === Role.PARENT && !!currentUser.linkedStudentIds?.length) && <span className="text-sm text-gray-400">-</span>}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {activeActionsUserId && <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={closeActionsMenu} aria-label="Close actions menu" />}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة الأدوار، نطاق مدربي المنصة، المدارس والفصول، وربط ولي الأمر والطلاب.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={exportUsersWorkbook} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><Download size={18} /><span>تصدير المستخدمين</span></button>
                    <button onClick={() => { setIsCreateOpen(true); setCreateError(''); }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><Plus size={18} /><span>إضافة مستخدم</span></button>
                </div>
            </div>

            {(isUsersLoading || usersLoadError || relationshipActionError) && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${usersLoadError || relationshipActionError ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{relationshipActionError || usersLoadError || 'جاري تحميل المستخدمين داخل هذا التبويب فقط...'}</div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    ['الطلاب', usersSummary?.byRole[Role.STUDENT] ?? usersByRole[Role.STUDENT] ?? 0],
                    ['المدربون والمعلمون', usersSummary?.byRole[Role.TEACHER] ?? usersByRole[Role.TEACHER] ?? 0],
                    ['المشرفون', usersSummary?.byRole[Role.SUPERVISOR] ?? usersByRole[Role.SUPERVISOR] ?? 0],
                    ['أولياء الأمور', usersSummary?.byRole[Role.PARENT] ?? usersByRole[Role.PARENT] ?? 0],
                    ['حسابات متوقفة', usersSummary?.inactive ?? inactiveUsersCount],
                ].map(([label, value]) => <div key={String(label)} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"><p className="text-xs text-gray-500 mb-2">{label}</p><p className="text-2xl font-black text-gray-900">{value}</p></div>)}
            </div>

            {isCreateOpen && (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="text-lg font-bold text-gray-900">إضافة مستخدم جديد</h2><p className="text-sm text-gray-500 mt-1">إنشاء حساب حقيقي مع ضبط الدور والنطاق من البداية.</p></div>
                        <button onClick={() => { setIsCreateOpen(false); setCreateError(''); }} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">الاسم</label><input type="text" value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="اسم المستخدم" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني</label><input type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="name@example.com" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label><input type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="******" /></div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الدور المطلوب</label>
                            <select
                                value={newUserType}
                                onChange={(event) => {
                                    const nextType = event.target.value as typeof newUserType;
                                    setNewUserType(nextType);
                                    const mappedRole: Role =
                                        nextType === 'platform_trainer' || nextType === 'school_teacher'
                                            ? Role.TEACHER
                                            : nextType === 'student'
                                            ? Role.STUDENT
                                            : nextType === 'supervisor'
                                            ? Role.SUPERVISOR
                                            : nextType === 'school_admin'
                                            ? Role.SCHOOL_ADMIN
                                            : nextType === 'parent'
                                            ? Role.PARENT
                                            : Role.ADMIN;
                                    setNewUser((current) => ({
                                        ...current,
                                        role: mappedRole,
                                        linkedStudentIds: nextType === 'parent' ? current.linkedStudentIds : [],
                                        managedPathIds: nextType === 'platform_trainer' ? current.managedPathIds : [],
                                        managedSubjectIds: nextType === 'platform_trainer' ? current.managedSubjectIds : [],
                                    }));
                                }}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            >
                                <option value="student">طالب</option>
                                <option value="school_teacher">معلم مدرسة (B2B)</option>
                                <option value="platform_trainer">مدرب منصة (B2C)</option>
                                <option value="supervisor">مشرف</option>
                                <option value="school_admin">مدير مدرسة</option>
                                <option value="parent">ولي أمر</option>
                                <option value="admin">مدير المنصة</option>
                            </select>
                        </div>
                    </div>
                    {newUserType === 'school_teacher' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                            <div>
                                <label className="block text-sm font-bold text-emerald-950 mb-2">المدرسة التابع لها المعلم</label>
                                <select
                                    value={newUserSchoolId}
                                    onChange={(e) => {
                                        setNewUserSchoolId(e.target.value);
                                        setNewUserClassId('');
                                    }}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">اختر المدرسة</option>
                                    {schools.map((school) => (
                                        <option key={school.id} value={school.id}>{school.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-emerald-950 mb-2">الفصل الدراسي المسند</label>
                                <select
                                    value={newUserClassId}
                                    onChange={(e) => setNewUserClassId(e.target.value)}
                                    disabled={!newUserSchoolId}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm disabled:opacity-50 focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">اختر الفصل</option>
                                    {classes.filter((c) => !newUserSchoolId || c.parentId === newUserSchoolId).map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    {newUserType === 'platform_trainer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2">المسارات المسندة للمدرب</label>
                                <MultiSelectField
                                    value={newUser.managedPathIds}
                                    options={pathOptions}
                                    placeholder="أضف المسارات المتاحة للمدرب"
                                    onChange={(nextPathIds) => setNewUser((current) => ({
                                        ...current,
                                        managedPathIds: nextPathIds,
                                        managedSubjectIds: current.managedSubjectIds.filter((subjectId) => {
                                            const subject = subjects.find((item) => item.id === subjectId);
                                            return subject && nextPathIds.includes(subject.pathId);
                                        }),
                                    }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2">المواد المسندة للمدرب</label>
                                <MultiSelectField
                                    value={newUser.managedSubjectIds}
                                    options={teacherSubjectOptions}
                                    placeholder="اختر مواد المدرب التابعة للمسارات"
                                    onChange={(nextSubjectIds) => setNewUser((current) => ({ ...current, managedSubjectIds: nextSubjectIds }))}
                                />
                            </div>
                        </div>
                    )}
                    {newUser.role === Role.PARENT && <div><label className="block text-sm font-bold text-gray-700 mb-2">الأبناء المرتبطون</label><MultiSelectField value={newUser.linkedStudentIds} options={linkableStudents.map((student) => ({ value: student.id, label: student.name }))} placeholder="اختر الطلاب المرتبطين بولي الأمر" onChange={(linkedStudentIds) => setNewUser((current) => ({ ...current, linkedStudentIds }))} /></div>}
                    {createError && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{createError}</div>}
                    <div className="flex justify-end"><button onClick={handleCreateUser} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-5 py-2 rounded-lg transition-colors shadow-sm">{isSubmitting ? 'جارٍ الإنشاء...' : 'حفظ المستخدم'}</button></div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="ابحث بالاسم أو البريد الإلكتروني..." className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" value={searchTerm} onChange={(event) => handleSearchTermChange(event.target.value)} /></div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        value={roleFilter}
                        onChange={(event) => handleRoleFilterChange(event.target.value)}
                    >
                        <option value="all">جميع الأدوار</option>
                        <option value={Role.ADMIN}>مدير المنصة</option>
                        <option value={Role.SCHOOL_ADMIN}>مدير مدرسة</option>
                        <option value={Role.SUPERVISOR}>مشرف</option>
                        <option value="school_teacher">معلم مدرسة (B2B)</option>
                        <option value="platform_trainer">مدرب منصة (B2C)</option>
                        <option value={Role.PARENT}>ولي أمر</option>
                        <option value={Role.STUDENT}>طالب</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 text-sm">
                <div className="text-gray-500">الصفحة {usersPage} / {Math.max(usersTotalPages, 1)} - عرض {filteredUsers.length} من أصل {usersTotal}</div>
                <div className="flex gap-2"><button onClick={() => setUsersPage((current) => Math.max(1, current - 1))} disabled={usersPage <= 1 || isUsersLoading} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50">السابقة</button><button onClick={() => setUsersPage((current) => Math.min(usersTotalPages, current + 1))} disabled={usersPage >= Math.max(usersTotalPages, 1) || isUsersLoading} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50">التالية</button></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible"><div className="overflow-x-auto"><table className="w-full text-right"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="px-6 py-4 text-sm font-bold text-gray-700">المستخدم</th><th className="px-6 py-4 text-sm font-bold text-gray-700">الدور</th><th className="px-6 py-4 text-sm font-bold text-gray-700">النطاق / الارتباط</th><th className="px-6 py-4 text-sm font-bold text-gray-700">الحالة</th><th className="px-6 py-4 text-sm font-bold text-gray-700">الإجراءات</th></tr></thead>
                <tbody className="divide-y divide-gray-50">{filteredUsers.map((currentUser) => {
                    const isEditing = editingUserId === currentUser.id;
                    const currentSchoolId = currentUser.schoolId || '';
                    const availableClasses = classes.filter((group) => !currentSchoolId || group.parentId === currentSchoolId);
                    const currentClassId = classes.find((group) => currentUser.groupIds?.includes(group.id))?.id || '';
                    const currentSupervisorGroupIds = currentUser.groupIds || [];
                    const parentCandidates = linkableStudents.filter((student) => !currentSchoolId || student.schoolId === currentSchoolId);
                    const isSavingRelationship = relationshipActionUserId === currentUser.id;
                    return <tr key={currentUser.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" /><div>{isEditing ? <input type="text" value={nameDrafts[currentUser.id] ?? currentUser.name} onChange={(event) => setNameDrafts((current) => ({ ...current, [currentUser.id]: event.target.value }))} onBlur={() => saveUserName(currentUser)} onKeyDown={(event) => { if (event.key === 'Enter') stopEditingUser(currentUser); }} className="w-full min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500" /> : <p className="font-bold text-gray-900">{currentUser.name}</p>}<p className="text-xs text-gray-500">{currentUser.email || 'لا يوجد بريد'}</p></div></div></td>
                        <td className="px-6 py-4">
                            {isEditing ? (
                                <select
                                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                                    disabled={isSavingRelationship}
                                    value={
                                        currentUser.role === Role.TEACHER
                                            ? (Boolean(currentUser.schoolId || currentUser.groupIds?.length) ? 'school_teacher' : 'platform_trainer')
                                            : currentUser.role
                                    }
                                    onChange={(event) => handleCustomRoleChange(currentUser, event.target.value)}
                                >
                                    <option value={Role.STUDENT}>طالب</option>
                                    <option value="school_teacher">معلم مدرسة (B2B)</option>
                                    <option value="platform_trainer">مدرب منصة (B2C)</option>
                                    <option value={Role.SUPERVISOR}>مشرف</option>
                                    <option value={Role.SCHOOL_ADMIN}>مدير مدرسة</option>
                                    <option value={Role.PARENT}>ولي أمر</option>
                                    <option value={Role.ADMIN}>مدير المنصة</option>
                                </select>
                            ) : (
                                getRoleBadge(currentUser)
                            )}
                        </td>
                        <td className="px-6 py-4">
                            {isEditing && currentUser.role === Role.STUDENT ? <div className="space-y-2 min-w-[220px]"><select disabled={isSavingRelationship} className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-60" value={currentSchoolId} onChange={(event) => handleStudentSchoolChange(currentUser, event.target.value)}><option value="">بدون مدرسة</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select><select disabled={isSavingRelationship} className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-60" value={currentClassId} onChange={(event) => handleStudentClassChange(currentUser, event.target.value)}><option value="">بدون فصل</option>{availableClasses.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>{isSavingRelationship && <p className="text-[11px] font-bold text-amber-600">جاري حفظ المدرسة والفصل…</p>}</div>
                            : isEditing && currentUser.role === Role.SUPERVISOR ? <div className="space-y-2 min-w-[260px]"><MultiSelectField disabled={isSavingRelationship} value={currentSupervisorGroupIds} options={[...schools, ...classes].map((group) => ({ value: group.id, label: `${group.type === 'SCHOOL' ? 'مدرسة' : 'فصل'} - ${group.name}` }))} placeholder="اختر مدرسة أو فصلًا أو أكثر" onChange={(nextGroupIds) => handleSupervisorGroupsChange(currentUser, nextGroupIds)} size="sm" /><p className="text-[11px] text-gray-400">يمكن إسناد المشرف لمدرسة كاملة أو فصل/عدة فصول، ويحفظ الربط فعليًا قبل تحديث الواجهة.</p>{isSavingRelationship && <p className="text-[11px] font-bold text-amber-600">جاري حفظ نطاق المشرف…</p>}</div>
                            : isEditing && currentUser.role === Role.PARENT ? <div className="space-y-2 min-w-[240px]"><select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={currentSchoolId} onChange={(event) => handleParentSchoolChange(currentUser, event.target.value)}><option value="">بدون مدرسة</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select><MultiSelectField value={currentUser.linkedStudentIds || []} options={parentCandidates.map((student) => ({ value: student.id, label: student.name }))} placeholder="اختر الأبناء المرتبطين" onChange={(linkedStudentIds) => handleParentLinkedStudentsChange(currentUser.id, linkedStudentIds)} size="sm" /></div>
                            : isEditing && currentUser.role === Role.TEACHER ? renderTeacherScopeEditor(currentUser) : renderAssignmentSummary(currentUser)}
                        </td>
                        <td className="px-6 py-4"><button disabled={relationshipActionUserId === currentUser.id} onClick={() => handleUserStatusToggle(currentUser)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 ${currentUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{currentUser.isActive ? <UserCheck size={14} /> : <UserX size={14} />}{currentUser.isActive ? 'نشط' : 'موقوف'}</button></td>
                        <td className="px-6 py-4"><div className="relative flex items-center gap-2"><button onClick={() => (isEditing ? stopEditingUser(currentUser) : startEditingUser(currentUser))} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Edit2 size={18} /></button><button type="button" onClick={() => toggleActionsMenu(currentUser.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><MoreVertical size={18} /></button>{activeActionsUserId === currentUser.id && <div className="absolute right-0 top-10 z-20 min-w-[170px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg"><button type="button" onClick={() => { closeActionsMenu(); if (!isEditing) startEditingUser(currentUser); }} className="w-full rounded-lg px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-50">تعديل المستخدم</button><button type="button" onClick={() => { closeActionsMenu(); handleUserStatusToggle(currentUser); }} className="w-full rounded-lg px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-50">{currentUser.isActive ? 'إيقاف المستخدم' : 'تفعيل المستخدم'}</button><button type="button" onClick={() => void handleDeleteUser(currentUser)} className="w-full rounded-lg px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50">حذف المستخدم</button></div>}</div></td>
                    </tr>;
                })}</tbody></table>{filteredUsers.length === 0 && <div className="text-center py-12 text-gray-500">لا يوجد مستخدمون يطابقون بحثك.</div>}</div></div>
        </div>
    );
};

export default UsersManager;
