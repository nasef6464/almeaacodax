import type { Group } from '../../../types';
import type { ImportRow, QuickSupervisorDraft, SingleStudentDraft } from './contracts';

type SingleStudentPayloadResult =
    | { ok: true; row: ImportRow }
    | { ok: false; error: string };

type QuickSupervisorPayloadResult =
    | { ok: true; name: string; email: string; targetGroupId: string; targetGroup: Group; passwordDraft: string }
    | { ok: false; error: string };

export const buildSingleStudentImportRow = (
    singleStudent: SingleStudentDraft,
): SingleStudentPayloadResult => {
    const name = singleStudent.name.trim();
    const email = singleStudent.email.trim().toLowerCase();
    if (!name || !email) {
        return { ok: false, error: 'اكتب اسم الطالب والبريد الإلكتروني قبل الإضافة.' };
    }
    if (!singleStudent.className.trim()) {
        return { ok: false, error: 'اختر فصل الطالب قبل الإضافة حتى تبقى المدرسة مرتبة والتقارير واضحة.' };
    }

    return {
        ok: true,
        row: {
            name,
            email,
            className: singleStudent.className.trim() || undefined,
            password: singleStudent.password.trim() || undefined,
        },
    };
};

export const buildQuickSupervisorPayload = (
    quickSupervisor: QuickSupervisorDraft,
    selectedSchool: Group,
    schoolClasses: Group[],
    fallbackGroupId?: string,
): QuickSupervisorPayloadResult => {
    const name = quickSupervisor.name.trim();
    const email = quickSupervisor.email.trim().toLowerCase();
    const targetGroupId = quickSupervisor.targetGroupId || fallbackGroupId || selectedSchool.id;
    const targetGroup = [selectedSchool, ...schoolClasses].find((group) => group.id === targetGroupId);

    if (!name || !email) {
        return { ok: false, error: 'اكتب اسم المشرف وبريده قبل الإنشاء أو الربط.' };
    }

    if (!targetGroup) {
        return { ok: false, error: 'اختر نطاق المشرف: المدرسة كاملة أو فصل محدد.' };
    }

    return {
        ok: true,
        name,
        email,
        targetGroupId,
        targetGroup,
        passwordDraft: quickSupervisor.password.trim(),
    };
};
