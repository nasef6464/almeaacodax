import { useState } from 'react';
import { api } from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { Role, type Group, type User } from '../../../types';
import type { AdminUserPayload, ImportResponse } from './contracts';
import { buildStoreUser, generateTemporaryPassword, loadSchoolAdminUsers } from './dataAdapters';
import { getErrorMessage } from './errorMessageService';
import type { ClassPersonDraft } from './SchoolClassPeopleManager';

type SchoolClassPeopleAction = {
    isBusy: boolean;
    notice: string | null;
    error: string | null;
    clearFeedback: () => void;
    assignStudents: (classroom: Group, studentIds: string[]) => Promise<void>;
    createStudent: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    removeStudent: (classroom: Group, student: User) => Promise<void>;
    assignTeacher: (classroom: Group, teacherId: string) => Promise<void>;
    createTeacher: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    removeTeacher: (classroom: Group, teacher: User) => Promise<void>;
    assignSupervisor: (classroom: Group, supervisorId: string) => Promise<void>;
    createSupervisor: (classroom: Group, draft: ClassPersonDraft) => Promise<void>;
    removeSupervisor: (classroom: Group, supervisor: User) => Promise<void>;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const useSchoolClassPeopleActions = (): SchoolClassPeopleAction => {
    const {
        users,
        hydrateUsers,
        hydrateContentBootstrap,
        assignStudentToGroupAsync,
        removeStudentFromGroupAsync,
        assignTeacherToGroupAsync,
        removeTeacherFromGroupAsync,
        assignSupervisorToGroupAsync,
        removeSupervisorFromGroupAsync,
    } = useStore();

    const [isBusy, setIsBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const clearFeedback = () => {
        setNotice(null);
        setError(null);
    };

    const getSchoolId = (classroom: Group) => {
        const schoolId = String(classroom.parentId || '').trim();
        if (!schoolId) throw new Error('الفصل غير مرتبط بمدرسة صالحة.');
        return schoolId;
    };

    const refreshAuthoritativeState = async () => {
        api.clearContentBootstrapCache();
        const [bootstrap, latestUsers] = await Promise.all([
            api.getOperationalBootstrapFresh(),
            loadSchoolAdminUsers(),
        ]);
        hydrateContentBootstrap(bootstrap as any);
        hydrateUsers(latestUsers);
    };

    const runAction = async (work: () => Promise<string>) => {
        if (isBusy) return;
        setIsBusy(true);
        clearFeedback();
        try {
            const message = await work();
            setNotice(message);
        } catch (actionError) {
            setError(getErrorMessage(actionError, 'تعذر حفظ التغيير الآن.'));
        } finally {
            setIsBusy(false);
        }
    };

    const assignStudentInternal = async (classroom: Group, studentId: string) => {
        const schoolId = getSchoolId(classroom);
        await api.updateSchoolMembership({
            userId: studentId,
            schoolId,
            role: 'student',
            status: 'active',
        });
        await assignStudentToGroupAsync(studentId, classroom.id);
    };

    const assignStudents = async (classroom: Group, studentIds: string[]) => runAction(async () => {
        const uniqueIds = Array.from(new Set(studentIds)).filter(Boolean);
        if (uniqueIds.length === 0) return 'لم يتم تحديد طلاب.';
        for (const studentId of uniqueIds) {
            await assignStudentInternal(classroom, studentId);
        }
        await refreshAuthoritativeState();
        return `تمت إضافة ${uniqueIds.length} طالب إلى ${classroom.name} والتأكد من الحفظ.`;
    });

    const createStudent = async (classroom: Group, draft: ClassPersonDraft) => runAction(async () => {
        const schoolId = getSchoolId(classroom);
        const email = normalizeEmail(draft.email);
        const existing = users.find((user) => normalizeEmail(user.email || '') === email);

        if (existing) {
            if (existing.role !== Role.STUDENT) throw new Error('هذا البريد مرتبط بحساب ليس طالبًا.');
            if (existing.schoolId && existing.schoolId !== schoolId) {
                throw new Error('هذا الطالب مرتبط بمدرسة أخرى. استخدم مسار نقل الطالب بين المدارس.');
            }
            await assignStudentInternal(classroom, existing.id);
            await refreshAuthoritativeState();
            return `تم ربط ${existing.name} بفصل ${classroom.name}.`;
        }

        const response = await api.importSchoolStudents(schoolId, {
            rows: [{
                name: draft.name.trim(),
                email,
                className: classroom.name,
                password: draft.password.trim() || undefined,
            }],
        }) as ImportResponse;

        await refreshAuthoritativeState();
        const password = response.credentials?.[0]?.password;
        return password
            ? `تم إنشاء الطالب وربطه بفصل ${classroom.name}. كلمة المرور المؤقتة: ${password}`
            : `تم إنشاء الطالب وربطه بفصل ${classroom.name}.`;
    });

    const removeStudent = async (classroom: Group, student: User) => runAction(async () => {
        await removeStudentFromGroupAsync(student.id, classroom.id);
        await refreshAuthoritativeState();
        return `تم إخراج ${student.name} من فصل ${classroom.name} مع بقائه في المدرسة.`;
    });

    const assignTeacherInternal = async (classroom: Group, teacherId: string) => {
        const schoolId = getSchoolId(classroom);
        await api.updateSchoolMembership({
            userId: teacherId,
            schoolId,
            role: 'teacher',
            status: 'active',
        });
        await api.updateTeachingAssignment({
            schoolId,
            teacherId,
            classId: classroom.id,
            subjectId: '',
            status: 'active',
        });
        await assignTeacherToGroupAsync(teacherId, classroom.id);
    };

    const assignTeacher = async (classroom: Group, teacherId: string) => runAction(async () => {
        const teacher = users.find((user) => user.id === teacherId);
        const schoolId = getSchoolId(classroom);
        if (!teacher || teacher.role !== Role.TEACHER) throw new Error('تعذر العثور على حساب المعلم.');
        if (teacher.schoolId && teacher.schoolId !== schoolId) throw new Error('هذا المعلم مرتبط بمدرسة أخرى.');
        await assignTeacherInternal(classroom, teacherId);
        await refreshAuthoritativeState();
        return `تم إسناد ${teacher.name} إلى فصل ${classroom.name} والتحقق من الإسناد.`;
    });

    const createStaff = async (
        classroom: Group,
        draft: ClassPersonDraft,
        role: Role.TEACHER | Role.SUPERVISOR,
    ) => {
        const schoolId = getSchoolId(classroom);
        const email = normalizeEmail(draft.email);
        const existing = users.find((user) => normalizeEmail(user.email || '') === email);
        if (existing) {
            if (existing.role !== role) throw new Error('هذا البريد مرتبط بنوع حساب مختلف.');
            if (existing.schoolId && existing.schoolId !== schoolId) throw new Error('هذا الحساب مرتبط بمدرسة أخرى.');
            return { user: existing, password: null as string | null };
        }

        const password = draft.password.trim() || generateTemporaryPassword();
        const response = await api.createAdminUser({
            name: draft.name.trim(),
            email,
            password,
            role,
            schoolId,
            groupIds: [],
        }) as { user?: AdminUserPayload };
        if (!response.user) throw new Error('الخادم لم يرجع الحساب الجديد.');
        return { user: buildStoreUser(response.user), password };
    };

    const createTeacher = async (classroom: Group, draft: ClassPersonDraft) => runAction(async () => {
        const { user: teacher, password } = await createStaff(classroom, draft, Role.TEACHER);
        await refreshAuthoritativeState();
        await assignTeacherInternal(classroom, teacher.id);
        await refreshAuthoritativeState();
        return password
            ? `تم إنشاء المعلم وإسناده إلى ${classroom.name}. كلمة المرور المؤقتة: ${password}`
            : `تم ربط المعلم ${teacher.name} بفصل ${classroom.name}.`;
    });

    const removeTeacher = async (classroom: Group, teacher: User) => runAction(async () => {
        const schoolId = getSchoolId(classroom);
        await api.updateTeachingAssignment({
            schoolId,
            teacherId: teacher.id,
            classId: classroom.id,
            subjectId: '',
            status: 'inactive',
        });
        await removeTeacherFromGroupAsync(teacher.id, classroom.id);
        await refreshAuthoritativeState();
        return `تم إيقاف إسناد ${teacher.name} إلى فصل ${classroom.name}.`;
    });

    const assignSupervisorInternal = async (classroom: Group, supervisorId: string) => {
        const schoolId = getSchoolId(classroom);
        await api.updateSchoolMembership({
            userId: supervisorId,
            schoolId,
            role: 'supervisor',
            status: 'active',
        });
        await assignSupervisorToGroupAsync(supervisorId, classroom.id);
    };

    const assignSupervisor = async (classroom: Group, supervisorId: string) => runAction(async () => {
        const supervisor = users.find((user) => user.id === supervisorId);
        const schoolId = getSchoolId(classroom);
        if (!supervisor || supervisor.role !== Role.SUPERVISOR) throw new Error('تعذر العثور على حساب المشرف.');
        if (supervisor.schoolId && supervisor.schoolId !== schoolId) throw new Error('هذا المشرف مرتبط بمدرسة أخرى.');
        await assignSupervisorInternal(classroom, supervisorId);
        await refreshAuthoritativeState();
        return `تم ربط ${supervisor.name} بإشراف فصل ${classroom.name}.`;
    });

    const createSupervisor = async (classroom: Group, draft: ClassPersonDraft) => runAction(async () => {
        const { user: supervisor, password } = await createStaff(classroom, draft, Role.SUPERVISOR);
        await refreshAuthoritativeState();
        await assignSupervisorInternal(classroom, supervisor.id);
        await refreshAuthoritativeState();
        return password
            ? `تم إنشاء المشرف وربطه بفصل ${classroom.name}. كلمة المرور المؤقتة: ${password}`
            : `تم ربط المشرف ${supervisor.name} بفصل ${classroom.name}.`;
    });

    const removeSupervisor = async (classroom: Group, supervisor: User) => runAction(async () => {
        await removeSupervisorFromGroupAsync(supervisor.id, classroom.id);
        await refreshAuthoritativeState();
        return `تمت إزالة ${supervisor.name} من إشراف فصل ${classroom.name}.`;
    });

    return {
        isBusy,
        notice,
        error,
        clearFeedback,
        assignStudents,
        createStudent,
        removeStudent,
        assignTeacher,
        createTeacher,
        removeTeacher,
        assignSupervisor,
        createSupervisor,
        removeSupervisor,
    };
};
