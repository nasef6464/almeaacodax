import { useState } from 'react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';

interface SchoolWizardProvisioningInput {
    name: string;
    stage: string;
    city: string;
    description: string;
    targetStudents: number;
    modules: string[];
    classesList: string[];
    directorName: string;
    directorEmail: string;
    directorPassword: string;
    userId: string;
    createGroupAsync: (payload: any) => Promise<Group>;
    onSchoolCreated: (school: Group) => void;
    onClose: () => void;
}

const groupId = (group: Group) => group.id || (group as any)._id;
const userIdFrom = (user: any) => String(user?.id || user?._id || '').trim();
const emailFrom = (user: any) => String(user?.email || '').trim().toLowerCase();

export const useSchoolWizardProvisioning = (input: SchoolWizardProvisioningInput) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);
    const [provisionedSchool, setProvisionedSchool] = useState<Group | null>(null);
    const [contractProvisioned, setContractProvisioned] = useState(false);
    const [createdClassNames, setCreatedClassNames] = useState<string[]>([]);
    const [directorUserId, setDirectorUserId] = useState<string | null>(null);
    const [directorLinked, setDirectorLinked] = useState(false);

    const directorRequested = Boolean(
        input.directorName.trim() || input.directorEmail.trim() || input.directorPassword,
    );

    const resetCheckpoint = () => {
        setProvisionedSchool(null);
        setContractProvisioned(false);
        setCreatedClassNames([]);
        setDirectorUserId(null);
        setDirectorLinked(false);
        setProgressMessage(null);
        setError(null);
    };

    const ensureSchool = async () => {
        if (provisionedSchool) return provisionedSchool;
        setProgressMessage('1/4 إنشاء سجل المدرسة على الخادم...');
        const created = await input.createGroupAsync({
            name: input.name.trim(),
            type: 'SCHOOL',
            ownerId: input.userId || 'admin',
            supervisorIds: [], studentIds: [], courseIds: [],
            metadata: {
                description: input.description.trim(),
                location: input.city.trim(),
                settings: { stage: input.stage, targetStudents: input.targetStudents, status: 'active' },
            },
        });
        setProvisionedSchool(created);
        return created;
    };

    const ensureContract = async (schoolId: string) => {
        if (contractProvisioned) return;
        setProgressMessage('2/4 حفظ العقد والخدمات والتحقق منها...');
        const expectedModules = Array.from(new Set(['SCHOOL_CORE', ...input.modules]));
        await api.updateSchoolContract(schoolId, {
            status: 'active',
            modules: expectedModules,
            validFrom: new Date().toISOString(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });
        const verification = await api.getSchoolContract(schoolId);
        const contract = verification?.contract as any;
        if (!contract || contract.status !== 'active') {
            throw new Error('تم إنشاء المدرسة لكن تعذر تأكيد العقد النشط من الخادم. أعد المحاولة لإكمال نفس المدرسة.');
        }
        const verifiedModules = Array.isArray(contract.modules) ? contract.modules : [];
        const missingModule = expectedModules.find((moduleId) => !verifiedModules.includes(moduleId));
        if (missingModule) {
            throw new Error(`تم حفظ العقد لكن خدمة ${missingModule} لم تظهر عند إعادة القراءة. أعد المحاولة قبل التسليم.`);
        }
        setContractProvisioned(true);
    };

    const ensureClasses = async (schoolId: string) => {
        setProgressMessage('3/4 إنشاء الفصول المبدئية...');
        const completed = new Set(createdClassNames);
        const failures: string[] = [];
        for (const rawName of input.classesList) {
            const className = rawName.trim();
            if (!className || completed.has(className)) continue;
            try {
                await input.createGroupAsync({
                    name: className,
                    type: 'CLASS',
                    parentId: schoolId,
                    ownerId: input.userId || 'admin',
                    supervisorIds: [], studentIds: [], courseIds: [],
                    metadata: { description: `فصل في ${input.name.trim()}` },
                });
                completed.add(className);
                setCreatedClassNames(Array.from(completed));
            } catch {
                failures.push(className);
            }
        }
        if (failures.length > 0) {
            throw new Error(`تم إنشاء المدرسة والعقد، لكن تعذر إنشاء ${failures.length} فصل: ${failures.join('، ')}. أعد المحاولة وسيتم تخطي الفصول التي نجحت مسبقًا.`);
        }
    };

    const resolveDirectorAccount = async (schoolId: string) => {
        const normalizedEmail = input.directorEmail.trim().toLowerCase();
        const directory = await api.getAdminUsers({
            page: 1,
            limit: 25,
            search: normalizedEmail,
            role: 'school_admin',
            isActive: true,
        });
        const existing = (directory?.users || []).find((user: any) => emailFrom(user) === normalizedEmail);
        if (existing) {
            const existingId = userIdFrom(existing);
            if (!existingId) throw new Error('تم العثور على حساب المدير الحالي لكن معرّفه غير صالح.');
            return existingId;
        }

        const response = await api.createAdminUser({
            name: input.directorName.trim(),
            email: normalizedEmail,
            password: input.directorPassword,
            role: 'school_admin',
            schoolId,
            groupIds: [],
        });
        const createdId = userIdFrom((response as any)?.user);
        if (!createdId) {
            throw new Error('تم إنشاء المدرسة لكن الخادم لم يرجع معرّف حساب المدير. لم يتم اعتبار التأسيس مكتملًا.');
        }
        return createdId;
    };

    const ensureDirector = async (schoolId: string) => {
        if (!directorRequested || directorLinked) return;
        setProgressMessage('4/4 ربط حساب مدير المدرسة والصلاحيات...');
        let resolvedDirectorId = directorUserId;
        if (!resolvedDirectorId) {
            resolvedDirectorId = await resolveDirectorAccount(schoolId);
            setDirectorUserId(resolvedDirectorId);
        }

        const access = await api.getSchoolDirectors(schoolId);
        const permissions = Array.isArray(access?.defaults) ? access.defaults : [];
        if (permissions.length === 0) {
            throw new Error('تعذر قراءة صلاحيات مدير المدرسة الافتراضية من الخادم. الحساب لم يُربط بصلاحيات ناقصة.');
        }
        await api.updateSchoolDirectorAccess(schoolId, resolvedDirectorId, { status: 'active', permissions });
        const verified = await api.getSchoolDirectors(schoolId);
        const membership = (verified?.directors || []).find((item) => String(item.userId) === resolvedDirectorId);
        if (!membership || membership.status !== 'active') {
            throw new Error('تعذر تأكيد عضوية مدير المدرسة النشطة. أعد المحاولة لإكمال الربط فقط.');
        }
        setDirectorLinked(true);
    };

    const finish = async () => {
        setIsSubmitting(true);
        setError(null);
        setProgressMessage(null);
        try {
            const school = await ensureSchool();
            const schoolId = groupId(school);
            if (!schoolId) throw new Error('تعذر قراءة معرّف المدرسة بعد الإنشاء.');
            await ensureContract(schoolId);
            await ensureClasses(schoolId);
            await ensureDirector(schoolId);
            setProgressMessage('اكتمل التأسيس وتم التحقق من العناصر الأساسية على الخادم.');
            input.onSchoolCreated(school);
            resetCheckpoint();
            input.onClose();
            return true;
        } catch (err: any) {
            setError(err?.message || 'تعذر إكمال التأسيس. أعد المحاولة وسيتم استكمال نفس المدرسة.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const close = () => {
        if (isSubmitting) return;
        if (provisionedSchool) input.onSchoolCreated(provisionedSchool);
        resetCheckpoint();
        input.onClose();
    };

    return {
        isSubmitting,
        error,
        setError,
        progressMessage,
        provisionedSchool,
        createdClassNames,
        finish,
        close,
    };
};
