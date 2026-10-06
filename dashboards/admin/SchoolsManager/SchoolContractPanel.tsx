import React, { useEffect, useMemo, useState } from 'react';
import {
    ShieldCheck, Check, School, BookOpen, FileText,
    Layers, Video, Zap, BrainCircuit, Activity,
    Users, Palette, Sparkles, Loader2, CalendarDays,
} from 'lucide-react';
import { api } from '../../../services/api';

interface ModuleConfig {
    id: string;
    title: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    required?: boolean;
}

type ContractSnapshot = {
    status: string;
    modules: string[];
    validFrom: string;
    validUntil: string;
};

const MODULES_MAP: Record<string, ModuleConfig> = {
    SCHOOL_CORE: { id: 'SCHOOL_CORE', title: 'التشغيل الأساسي', desc: 'إدارة الفصول والطلاب والمنسوبين', icon: School, required: true },
    QUESTION_BANK: { id: 'QUESTION_BANK', title: 'بنك الأسئلة والتدريب', desc: 'استعراض واستخدام أسئلة المنصة', icon: BookOpen },
    SCHOOL_ASSESSMENTS: { id: 'SCHOOL_ASSESSMENTS', title: 'اختبارات المدرسة', desc: 'إنشاء الاختبارات الموجهة للمدرسة', icon: FileText },
    PATHS_AND_COURSES: { id: 'PATHS_AND_COURSES', title: 'المسارات والدورات', desc: 'ربط المناهج التعليمية المعتمدة', icon: Layers },
    INTERACTIVE_VIDEO: { id: 'INTERACTIVE_VIDEO', title: 'الفيديو التفاعلي', desc: 'الشروحات المرئية ونقاط التدريب', icon: Video },
    SMART_CLASSROOM: { id: 'SMART_CLASSROOM', title: 'الفصول الذكية', desc: 'حصص تفاعلية مع بروجيكتور العرض', icon: Zap },
    SCHOOL_INTELLIGENCE: { id: 'SCHOOL_INTELLIGENCE', title: 'الذكاء المدرسي', desc: 'تحليلات الأداء وخريطة المهارات', icon: BrainCircuit },
    INTERVENTION_CENTER: { id: 'INTERVENTION_CENTER', title: 'مركز التدخلات', desc: 'الخطط العلاجية والمهارات الحرجة', icon: Activity },
    LIVE_TUTORING: { id: 'LIVE_TUTORING', title: 'التدريس المباشر', desc: 'حصص الدعم والتقوية الحية', icon: Users },
    WHITE_LABEL: { id: 'WHITE_LABEL', title: 'الهوية المخصصة', desc: 'تخصيص الشعار والواجهة للمدرسة', icon: Palette },
    EXECUTIVE_ANALYTICS: { id: 'EXECUTIVE_ANALYTICS', title: 'التحليلات القيادية', desc: 'تقارير الإدارة العليا ولوحات القياس', icon: Sparkles },
};

const MODULE_ORDER = [
    'SCHOOL_CORE', 'QUESTION_BANK', 'SCHOOL_ASSESSMENTS', 'PATHS_AND_COURSES',
    'INTERACTIVE_VIDEO', 'SMART_CLASSROOM', 'SCHOOL_INTELLIGENCE', 'INTERVENTION_CENTER',
    'LIVE_TUTORING', 'WHITE_LABEL', 'EXECUTIVE_ANALYTICS',
];

const normalizeModules = (items: string[]) => Array.from(new Set(['SCHOOL_CORE', ...items])).sort();
const toDateInput = (value: unknown) => {
    if (!value) return '';
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
const toIsoOrNull = (value: string) => value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;

export const SchoolContractPanel: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [modules, setModules] = useState<string[]>(['SCHOOL_CORE']);
    const [status, setStatus] = useState('active');
    const [validFrom, setValidFrom] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notice, setNotice] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [serverSnapshot, setServerSnapshot] = useState<ContractSnapshot | null>(null);

    const loadContract = async () => {
        setIsLoading(true);
        try {
            const { contract } = await api.getSchoolContract(schoolId);
            if (contract) {
                const raw = contract as any;
                const nextModules = normalizeModules(contract.modules || []);
                const nextStatus = contract.status || 'active';
                const nextValidFrom = toDateInput(raw.validFrom);
                const nextValidUntil = toDateInput(raw.validUntil);
                setModules(nextModules);
                setStatus(nextStatus);
                setValidFrom(nextValidFrom);
                setValidUntil(nextValidUntil);
                setServerSnapshot({ status: nextStatus, modules: nextModules, validFrom: nextValidFrom, validUntil: nextValidUntil });
                setNotice('');
            } else {
                setModules(['SCHOOL_CORE']);
                setStatus('active');
                setValidFrom('');
                setValidUntil('');
                setServerSnapshot(null);
                setNotice('لا يوجد عقد محفوظ بعد. سيُنشأ عند الحفظ الأول.');
            }
        } catch {
            setNotice('تعذر قراءة العقد من الخادم. لم يتم تغيير أي بيانات محليًا.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadContract();
    }, [schoolId]);

    const toggle = (moduleId: string) => {
        if (moduleId === 'SCHOOL_CORE' || isSaving || isLoading) return;
        setModules((current) => current.includes(moduleId)
            ? current.filter((item) => item !== moduleId)
            : [...current, moduleId]);
    };

    const normalizedDraftModules = useMemo(() => normalizeModules(modules), [modules]);
    const hasChanges = useMemo(() => {
        if (!serverSnapshot) return true;
        return serverSnapshot.status !== status
            || serverSnapshot.modules.join('|') !== normalizedDraftModules.join('|')
            || serverSnapshot.validFrom !== validFrom
            || serverSnapshot.validUntil !== validUntil;
    }, [serverSnapshot, status, normalizedDraftModules, validFrom, validUntil]);

    const save = async () => {
        if (validFrom && validUntil && validUntil < validFrom) {
            setNotice('تاريخ نهاية العقد يجب ألا يسبق تاريخ البداية.');
            return;
        }
        setIsSaving(true);
        setNotice('جارٍ حفظ العقد والتحقق من الخادم...');
        try {
            await api.updateSchoolContract(schoolId, {
                status,
                modules: normalizedDraftModules,
                validFrom: toIsoOrNull(validFrom),
                validUntil: toIsoOrNull(validUntil),
            });

            const verification = await api.getSchoolContract(schoolId);
            const verified = verification?.contract as any;
            if (!verified) throw new Error('لم يرجع الخادم عقدًا بعد الحفظ.');

            const verifiedModules = normalizeModules(verified.modules || []);
            const verifiedValidFrom = toDateInput(verified.validFrom);
            const verifiedValidUntil = toDateInput(verified.validUntil);
            const missingModule = normalizedDraftModules.find((moduleId) => !verifiedModules.includes(moduleId));
            const unexpectedModule = verifiedModules.find((moduleId) => !normalizedDraftModules.includes(moduleId));
            if (
                verified.status !== status || missingModule || unexpectedModule
                || verifiedValidFrom !== validFrom || verifiedValidUntil !== validUntil
            ) {
                throw new Error('تعذر مطابقة العقد المحفوظ مع التعديلات المطلوبة. أعد تحميل الصفحة قبل إجراء تعديل آخر.');
            }

            setModules(verifiedModules);
            setStatus(verified.status);
            setValidFrom(verifiedValidFrom);
            setValidUntil(verifiedValidUntil);
            setServerSnapshot({
                status: verified.status,
                modules: verifiedModules,
                validFrom: verifiedValidFrom,
                validUntil: verifiedValidUntil,
            });
            setNotice('تم حفظ العقد وإعادة قراءته من الخادم بنجاح.');
        } catch (error: any) {
            setNotice(error?.message || 'تعذر حفظ العقد. لم يتم اعتبار العملية مكتملة.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 p-5 md:p-6 shadow-xs" data-testid="school-contract-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100/60 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs"><ShieldCheck size={22} /></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base">العقد المرجعي والوحدات المفعلة</h3>
                            <span className="text-[11px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">{normalizedDraftModules.length} من {MODULE_ORDER.length} مفعلة</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">مصدر التعديل الوحيد لحالة العقد ومدته ووحداته، مع تحقق بعد الحفظ.</p>
                    </div>
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isLoading || isSaving}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 disabled:opacity-50">
                    <option value="active">نشط وسارٍ</option>
                    <option value="inactive">موقوف مؤقتاً</option>
                    <option value="expired">منتهٍ</option>
                </select>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-700">
                    <span className="mb-1.5 flex items-center gap-1.5"><CalendarDays size={14} /> تاريخ البداية</span>
                    <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} disabled={isLoading || isSaving}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 disabled:opacity-50" />
                </label>
                <label className="text-xs font-black text-slate-700">
                    <span className="mb-1.5 flex items-center gap-1.5"><CalendarDays size={14} /> تاريخ الانتهاء</span>
                    <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={isLoading || isSaving}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 disabled:opacity-50" />
                </label>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {MODULE_ORDER.map((moduleId) => {
                    const info = MODULES_MAP[moduleId];
                    if (!info) return null;
                    const Icon = info.icon;
                    const isChecked = normalizedDraftModules.includes(moduleId);
                    const isLocked = Boolean(info.required);
                    return (
                        <label key={moduleId} className={`group relative flex items-start gap-3 rounded-2xl border p-3 transition-all select-none ${isChecked ? 'border-indigo-300/80 bg-white text-slate-900 shadow-xs ring-1 ring-indigo-200/50' : 'border-slate-200/80 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-white'} ${isLocked || isSaving || isLoading ? 'cursor-default' : 'cursor-pointer'}`}>
                            <input className="sr-only" type="checkbox" checked={isChecked} disabled={isLocked || isSaving || isLoading} onChange={() => toggle(moduleId)} />
                            <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-200/70 text-slate-400'}`}><Icon size={16} /></div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-xs text-slate-900 truncate">{info.title}</span>
                                    {isLocked && <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">إلزامي</span>}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-1">{info.desc}</p>
                            </div>
                            <div className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>{isChecked && <Check size={11} strokeWidth={3} />}</div>
                        </label>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-indigo-100/60">
                <span className="text-xs font-bold text-slate-600">{isLoading ? 'جارٍ قراءة العقد من الخادم...' : notice}</span>
                <button type="button" onClick={() => void save()} disabled={isSaving || isLoading || !hasChanges}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-black text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-50">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                    <span>{hasChanges ? 'حفظ وتطبيق العقد' : 'العقد مطابق للخادم'}</span>
                </button>
            </div>
        </section>
    );
};
