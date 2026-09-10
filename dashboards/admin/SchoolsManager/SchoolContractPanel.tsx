import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, Check, School, BookOpen, FileText,
    Layers, Video, Zap, BrainCircuit, Activity,
    Users, Palette, Sparkles, Loader2
} from 'lucide-react';
import { api } from '../../../services/api';

interface ModuleConfig {
    id: string;
    title: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    required?: boolean;
}

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
    'LIVE_TUTORING', 'WHITE_LABEL', 'EXECUTIVE_ANALYTICS'
];

export const SchoolContractPanel: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [modules, setModules] = useState<string[]>(['SCHOOL_CORE']);
    const [status, setStatus] = useState('active');
    const [notice, setNotice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        void api.getSchoolContract(schoolId).then(({ contract }) => {
            if (contract) {
                setModules(contract.modules || ['SCHOOL_CORE']);
                setStatus(contract.status || 'active');
            }
        }).catch(() => setNotice('تعذر قراءة العقد الآن.'));
    }, [schoolId]);

    const toggle = (moduleId: string) => {
        if (moduleId === 'SCHOOL_CORE') return;
        setModules((current) =>
            current.includes(moduleId)
                ? current.filter((item) => item !== moduleId)
                : [...current, moduleId]
        );
    };

    const save = async () => {
        setIsSaving(true);
        setNotice('جارٍ حفظ العقد...');
        try {
            await api.updateSchoolContract(schoolId, { status, modules });
            setNotice('تم حفظ وتحديث وحدات العقد بنجاح.');
        } catch {
            setNotice('تعذر حفظ العقد. يرجى المحاولة لاحقاً.');
        } finally {
            setIsSaving(false);
        }
    };

    const activeCount = modules.length;
    const totalCount = MODULE_ORDER.length;

    return (
        <section
            className="rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 p-5 md:p-6 shadow-xs"
            data-testid="school-contract-panel"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100/60 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base">عقد المدرسة والوحدات المفعلة</h3>
                            <span className="text-[11px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                {activeCount} من {totalCount} مفعلة
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            تُحدد هذه الوحدات الميزات المتاحة لمدير ومعلمي المدرسة على مستوى المنصة.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold text-slate-600">حالة العقد:</span>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 shadow-2xs"
                    >
                        <option value="active">🟢 نشط وسارٍ</option>
                        <option value="inactive">🟡 موقوف مؤقتاً</option>
                        <option value="expired">🔴 منتهٍ</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {MODULE_ORDER.map((moduleId) => {
                    const info = MODULES_MAP[moduleId];
                    if (!info) return null;
                    const Icon = info.icon;
                    const isChecked = modules.includes(moduleId);
                    const isLocked = Boolean(info.required);

                    return (
                        <div
                            key={moduleId}
                            onClick={() => toggle(moduleId)}
                            className={`group relative flex items-start gap-3 rounded-2xl border p-3 transition-all cursor-pointer select-none ${
                                isChecked
                                    ? 'border-indigo-300/80 bg-white text-slate-900 shadow-xs ring-1 ring-indigo-200/50'
                                    : 'border-slate-200/80 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-white'
                            } ${isLocked ? 'cursor-default' : ''}`}
                        >
                            <input
                                className="sr-only"
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLocked}
                                onChange={() => toggle(moduleId)}
                            />
                            <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-200/70 text-slate-400 group-hover:bg-slate-200'
                            }`}>
                                <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-xs text-slate-900 truncate">{info.title}</span>
                                    {isLocked && (
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                                            إلزامي
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-1">{info.desc}</p>
                            </div>
                            <div className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isChecked
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                            }`}>
                                {isChecked && <Check size={11} strokeWidth={3} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-indigo-100/60">
                <span className="text-xs font-bold text-slate-600">{notice}</span>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-black text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                    <span>حفظ وتطبيق العقد</span>
                </button>
            </div>
        </section>
    );
};

