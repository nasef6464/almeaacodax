import React, { useEffect, useState } from 'react';
import type { CategoryPath, HomepageSettings, PathDisplaySettings } from '../../../types';

type SiteExperience = NonNullable<HomepageSettings['studentExperience']>;
export const defaultStudentSiteExperience: SiteExperience = { visibilityMode: 'all', promptEnrollment: true };
export const defaultPathStudentExperience = { stageSelection: 'auto' as const, stageLabel: 'اختر مرحلتك', studentTemplate: 'standard' as const };
const fieldClass = 'w-full rounded-xl border border-gray-200 px-3 py-2 mt-2 bg-white';

export function StudentSiteExperienceFields({ value, onChange, disabled = false }: {
    value?: HomepageSettings['studentExperience']; onChange: (value: SiteExperience) => void; disabled?: boolean;
}) {
    const settings = { ...defaultStudentSiteExperience, ...value };
    return <fieldset disabled={disabled} className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <legend className="px-2 font-bold">تجربة الطالب في الموقع</legend>
        <label className="block font-bold">ما يظهر للطالب في الموقع
            <select className={fieldClass} value={settings.visibilityMode} onChange={e => onChange({ ...settings, visibilityMode: e.target.value as SiteExperience['visibilityMode'] })}>
                <option value="all">جميع المسارات المتاحة</option><option value="enrolled">مسارات الطالب المسجل فيها فقط</option>
            </select>
        </label>
        <p className="text-sm text-gray-500">يحدد عرض المسارات للطالب بعد الدخول. يمكن للطالب إدارة مساراته من حسابه.</p>
        <label className="flex items-center gap-3"><input type="checkbox" checked={settings.promptEnrollment} onChange={e => onChange({ ...settings, promptEnrollment: e.target.checked })} />تذكير الطالب باختيار مساره</label>
    </fieldset>;
}

export function PathStudentExperienceFields({ value, onChange, levelCount, disabled = false }: {
    value?: PathDisplaySettings; onChange: (value: PathDisplaySettings) => void; levelCount: number; disabled?: boolean;
}) {
    const settings = { ...defaultPathStudentExperience, ...value };
    return <fieldset data-testid="path-student-experience-fields" disabled={disabled} className="space-y-4 rounded-2xl border border-gray-100 p-4">
        <legend className="px-2 font-bold">تجربة الطالب في المسار</legend>
        <label className="block font-bold">اختيار المرحلة
            <select className={fieldClass} value={settings.stageSelection} onChange={e => onChange({ ...settings, stageSelection: e.target.value as PathDisplaySettings['stageSelection'] })}>
                <option value="auto">تلقائي حسب المراحل المضافة</option><option value="required">اختيار مرحلة مطلوب</option><option value="none">بدون اختيار مرحلة</option>
            </select>
        </label>
        <p className="text-sm text-gray-500">التلقائي يطلب الاختيار عند وجود مراحل. بدون اختيار مرحلة يسمح بالتسجيل مباشرة ويحافظ على المراحل والمحتوى الموجود.</p>
        {settings.stageSelection === 'required' && levelCount === 0 && <p role="status" className="text-sm text-amber-700">أضف مرحلة قبل إتاحة تسجيل الطلاب. يمكنك حفظ الإعداد ثم إضافة المراحل من تبويب المراحل.</p>}
        <label className="block font-bold">سؤال اختيار المرحلة
            <input className={fieldClass} maxLength={120} disabled={settings.stageSelection === 'none'} value={settings.stageLabel} placeholder="مثال: اختر صفك" onChange={e => onChange({ ...settings, stageLabel: e.target.value })} />
        </label>
        <label className="block font-bold">عرض صفحة المسار
            <select className={fieldClass} value={settings.studentTemplate} onChange={e => onChange({ ...settings, studentTemplate: e.target.value as PathDisplaySettings['studentTemplate'] })}>
                <option value="standard">العرض المعتاد</option><option value="simple">عرض مبسط</option>
            </select>
        </label>
    </fieldset>;
}

export function PathStudentExperiencePanel({ path, levelCount, onSave }: {
    path: CategoryPath; levelCount: number; onSave: (id: string, settings: PathDisplaySettings) => Promise<void>;
}) {
    const [draft, setDraft] = useState<PathDisplaySettings>(() => ({ ...defaultPathStudentExperience, ...path.settings }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    useEffect(() => { setDraft({ ...defaultPathStudentExperience, ...path.settings }); }, [path.id, path.settings]);
    useEffect(() => { setError(''); setSuccess(false); }, [path.id]);
    const save = async () => {
        if (saving) return;
        setError(''); setSuccess(false); setSaving(true);
        try {
            await onSave(path.id, { ...path.settings, ...draft, stageLabel: draft.stageLabel?.trim() || defaultPathStudentExperience.stageLabel });
            setSuccess(true);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ تجربة الطالب. أعد المحاولة.'); }
        finally { setSaving(false); }
    };
    return <section data-testid="path-student-experience-panel" className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <PathStudentExperienceFields value={draft} levelCount={levelCount} disabled={saving} onChange={value => { setDraft(value); setSuccess(false); }} />
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {success && <p role="status" className="text-emerald-700">تم حفظ تجربة الطالب.</p>}
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-60">{saving ? 'جاري الحفظ...' : 'حفظ تجربة الطالب'}</button>
    </section>;
}
