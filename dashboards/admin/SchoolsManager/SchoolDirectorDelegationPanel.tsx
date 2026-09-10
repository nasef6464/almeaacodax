import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '../../../services/api';
import { Role, type User } from '../../../types';
import { getErrorMessage } from './errorMessageService';

type DirectorPermission =
    | 'SCHOOL_OVERVIEW_VIEW'
    | 'SCHOOL_REPORTS_AGGREGATE_VIEW'
    | 'SCHOOL_STUDENTS_VIEW'
    | 'SCHOOL_STUDENTS_ADD'
    | 'SCHOOL_STUDENTS_MOVE_CLASS'
    | 'SCHOOL_STUDENTS_UPDATE_BASIC'
    | 'SCHOOL_STUDENTS_DEACTIVATE'
    | 'SCHOOL_CLASSES_MANAGE'
    | 'SCHOOL_TEACHERS_ASSIGN'
    | 'SCHOOL_REPORTS_DETAILED_VIEW'
    | 'SCHOOL_REPORTS_EXPORT';

type DirectorMembership = {
    userId: string;
    schoolId: string;
    status: 'active' | 'inactive';
    permissions: string[];
    user: { id?: string; _id?: string; name: string; email: string; role: string; isActive?: boolean } | null;
};

const permissionOptions: Array<{ id: DirectorPermission; label: string; detail: string }> = [
    { id: 'SCHOOL_OVERVIEW_VIEW', label: 'عرض النظرة العامة', detail: 'مؤشرات المدرسة الرئيسية فقط.' },
    { id: 'SCHOOL_REPORTS_AGGREGATE_VIEW', label: 'عرض التقارير الإجمالية', detail: 'نتائج مجمعة بلا توسيع لصلاحيات حساسة.' },
    { id: 'SCHOOL_STUDENTS_VIEW', label: 'عرض الطلاب', detail: 'قائمة طلاب المدارس المفوض بها.' },
    { id: 'SCHOOL_STUDENTS_ADD', label: 'إضافة طلاب', detail: 'إنشاء أو ضم طالب داخل المدرسة.' },
    { id: 'SCHOOL_STUDENTS_MOVE_CLASS', label: 'نقل طالب بين الفصول', detail: 'داخل المدرسة نفسها فقط.' },
    { id: 'SCHOOL_STUDENTS_UPDATE_BASIC', label: 'تعديل بيانات الطالب', detail: 'الاسم والجوال فقط — تتطلب SCHOOL_CORE.' },
    { id: 'SCHOOL_STUDENTS_DEACTIVATE', label: 'تعطيل وإعادة تفعيل الطالب', detail: 'بدون حذف — تتطلب SCHOOL_CORE.' },
    { id: 'SCHOOL_CLASSES_MANAGE', label: 'إدارة الفصول', detail: 'إنشاء وتسمية الفصول — تتطلب SCHOOL_CORE.' },
    { id: 'SCHOOL_TEACHERS_ASSIGN', label: 'تكليف المعلمين', detail: 'داخل المدرسة فقط — تتطلب SCHOOL_CORE.' },
    { id: 'SCHOOL_REPORTS_DETAILED_VIEW', label: 'التقارير التفصيلية', detail: 'تتطلب وحدة SCHOOL_INTELLIGENCE.' },
    { id: 'SCHOOL_REPORTS_EXPORT', label: 'تصدير بيانات المدرسة', detail: 'تتطلب وحدة EXECUTIVE_ANALYTICS.' },
];

export const SchoolDirectorDelegationPanel: React.FC<{ schoolId: string; directorAccounts: User[]; onActiveDirectorIdsChange?: (ids: string[]) => void }> = ({
    schoolId,
    directorAccounts,
    onActiveDirectorIdsChange,
}) => {
    const [memberships, setMemberships] = useState<DirectorMembership[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [permissions, setPermissions] = useState<DirectorPermission[]>([
        'SCHOOL_OVERVIEW_VIEW',
        'SCHOOL_REPORTS_AGGREGATE_VIEW',
        'SCHOOL_STUDENTS_VIEW',
    ]);
    const [accounts, setAccounts] = useState<User[]>(directorAccounts);
    const [draft, setDraft] = useState({ name: '', email: '', password: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [pending, setPending] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const load = async () => {
        const response = await api.getSchoolDirectors(schoolId);
        setMemberships(response.directors);
        onActiveDirectorIdsChange?.(response.directors.filter((item) => item.status === 'active').map((item) => item.userId));
    };

    useEffect(() => {
        setAccounts(directorAccounts);
    }, [directorAccounts]);

    useEffect(() => {
        setNotice('');
        setError('');
        void load().catch((loadError) => setError(getErrorMessage(loadError, 'تعذر تحميل مديري المدرسة.')));
    }, [schoolId]);

    const availableAccounts = useMemo(() => {
        const linkedIds = new Set(memberships.map((item) => item.userId));
        return accounts.filter((account) => !linkedIds.has(account.id));
    }, [accounts, memberships]);

    const saveAccess = async (userId: string, status: 'active' | 'inactive', nextPermissions = permissions) => {
        setPending(userId);
        setError('');
        setNotice('');
        try {
            await api.updateSchoolDirectorAccess(schoolId, userId, { status, permissions: nextPermissions });
            await load();
            setSelectedUserId('');
            setNotice(status === 'active' ? 'تم حفظ صلاحيات مدير المدرسة وتفعيلها فورًا.' : 'تم إيقاف وصول المدير لهذه المدرسة فورًا.');
        } catch (saveError) {
            setError(getErrorMessage(saveError, 'تعذر حفظ صلاحيات مدير المدرسة.'));
        } finally {
            setPending(null);
        }
    };

    const createDirector = async () => {
        if (!draft.name.trim() || !draft.email.trim() || draft.password.length < 8 || !/[A-Za-z]/.test(draft.password) || !/\d/.test(draft.password)) {
            setError('أدخل الاسم والبريد وكلمة مرور من 8 أحرف على الأقل وتحتوي حرفًا ورقمًا.');
            return;
        }
        setIsCreating(true);
        setError('');
        try {
            const response = await api.createAdminUser({ ...draft, role: Role.SCHOOL_ADMIN });
            const raw = response.user as any;
            const account: User = {
                id: String(raw.id || raw._id),
                name: raw.name,
                email: raw.email,
                role: Role.SCHOOL_ADMIN,
                avatar: raw.avatar || '',
                points: raw.points || 0,
                badges: raw.badges || [],
                isActive: raw.isActive !== false,
                subscription: {
                    plan: raw.subscription?.plan || 'free',
                    purchasedCourses: raw.subscription?.purchasedCourses || [],
                    purchasedPackages: raw.subscription?.purchasedPackages || [],
                },
            };
            setAccounts((current) => [...current.filter((item) => item.id !== account.id), account]);
            setDraft({ name: '', email: '', password: '' });
            await saveAccess(account.id, 'active');
        } catch (createError) {
            setError(getErrorMessage(createError, 'تعذر إنشاء حساب مدير المدرسة.'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <section data-testid="school-director-delegation-panel" className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><ShieldCheck size={20} className="text-indigo-600" /> مديرو المدرسة والصلاحيات</h3>
                    <p className="mt-1 text-xs font-medium leading-6 text-slate-600">حساب مستقل يرى المدارس المفوض بها فقط. كل صلاحية تحفظ لكل مدرسة ويطبقها الخادم فورًا.</p>
                </div>
                <span className="w-fit rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-black text-indigo-700">{memberships.filter((item) => item.status === 'active').length} مدير نشط</span>
            </div>

            {(notice || error) && <div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

            <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-900"><UserPlus size={17} className="text-indigo-600" /> إنشاء حساب مدير مدرسة</h4>
                    <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="اسم المدير" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    <input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} type="email" placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    <input value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} type="password" placeholder="كلمة مرور مؤقتة (8 أحرف على الأقل)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    <button type="button" onClick={() => void createDirector()} disabled={isCreating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">{isCreating ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} إنشاء وربط بالمدرسة</button>
                    {availableAccounts.length > 0 && <div className="border-t border-slate-100 pt-3"><label className="mb-2 block text-[11px] font-black text-slate-600">أو اربط حساب مدير موجود</label><div className="flex gap-2"><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"><option value="">اختر حسابًا</option>{availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.email}</option>)}</select><button type="button" disabled={!selectedUserId || Boolean(pending)} onClick={() => void saveAccess(selectedUserId, 'active')} className="rounded-xl border border-indigo-200 px-3 text-xs font-black text-indigo-700 disabled:opacity-40">ربط</button></div></div>}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-900"><KeyRound size={17} className="text-indigo-600" /> صلاحيات الربط الجديد</h4>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {permissionOptions.map((option) => <label key={option.id} className="flex cursor-pointer gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"><input type="checkbox" checked={permissions.includes(option.id)} onChange={() => setPermissions((current) => current.includes(option.id) ? current.filter((item) => item !== option.id) : [...current, option.id])} className="mt-0.5" /><span><b className="block text-xs text-slate-800">{option.label}</b><small className="mt-1 block text-[10px] leading-5 text-slate-500">{option.detail}</small></span></label>)}
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                {memberships.map((membership) => <article key={membership.userId} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-slate-900">{membership.user?.name || 'حساب مدير'}</div><div className="mt-1 text-[11px] text-slate-500">{membership.user?.email || membership.userId}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${membership.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{membership.status === 'active' ? 'نشط' : 'موقوف'}</span></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{permissionOptions.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-bold text-slate-700"><input type="checkbox" checked={membership.permissions.includes(option.id)} onChange={() => setMemberships((current) => current.map((item) => item.userId !== membership.userId ? item : { ...item, permissions: item.permissions.includes(option.id) ? item.permissions.filter((permission) => permission !== option.id) : [...item.permissions, option.id] }))} />{option.label}</label>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" disabled={pending === membership.userId} onClick={() => void saveAccess(membership.userId, membership.status, membership.permissions as DirectorPermission[])} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">حفظ الصلاحيات</button><button type="button" disabled={pending === membership.userId} onClick={() => void saveAccess(membership.userId, membership.status === 'active' ? 'inactive' : 'active', membership.permissions as DirectorPermission[])} className={`rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50 ${membership.status === 'active' ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{pending === membership.userId ? 'جار الحفظ…' : membership.status === 'active' ? 'إيقاف الوصول' : 'إعادة تفعيل الوصول'}</button></div></article>)}
                {memberships.length === 0 && <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-7 text-center text-xs font-bold text-slate-500">لم يتم تعيين مدير مستقل لهذه المدرسة بعد.</div>}
            </div>
        </section>
    );
};
