import React, { useEffect, useState } from 'react';
import {
    Activity,
    BookOpen,
    BrainCircuit,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Layers,
    PlayCircle,
    Save,
    Shield,
    ShieldCheck,
    Sparkles,
    Tv,
    Video,
    Zap,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';

interface SchoolServicesCenterTabProps {
    school: Group;
}

const MODULE_DEFINITIONS = [
    {
        id: 'SMART_CLASSROOM',
        label: 'الفصول الذكية (Smart Classroom)',
        arabicName: 'الفصول الذكية التفاعلية',
        desc: 'حصص تفاعلية مباشرة، كونسول المعلم للتحكم، بروجيكتور العرض، وتصحيح خادمي لحظي.',
        icon: Zap,
        category: 'تعليمي تفاعلي',
        tone: 'amber',
    },
    {
        id: 'QUESTION_BANK',
        label: 'بنك الأسئلة (Question Bank)',
        arabicName: 'بنك الأسئلة الموحد',
        desc: 'مستودع الأسئلة الشامل للمنصة، إتاحة استعراض الأسئلة واستخدامها في الحصص.',
        icon: BookOpen,
        category: 'محتوى وتقييم',
        tone: 'indigo',
    },
    {
        id: 'SCHOOL_ASSESSMENTS',
        label: 'الاختبارات المدرسية (School Assessments)',
        arabicName: 'الاختبارات الموجهة',
        desc: 'إنشاء اختبارات تشخيصية ودورية مقيدة بطلاب وفصول المدرسة فقط.',
        icon: FileText,
        category: 'محتوى وتقييم',
        tone: 'blue',
    },
    {
        id: 'SCHOOL_INTELLIGENCE',
        label: 'ذكاء المدرسة (School Intelligence)',
        arabicName: 'التحليلات وخريطة المهارات',
        desc: 'فصل نتائج المدرسة عن التعلم الذاتي، واستعراض خريطة المهارات ومستويات الإتقان.',
        icon: BrainCircuit,
        category: 'ذكاء وتقارير',
        tone: 'purple',
    },
    {
        id: 'INTERVENTION_CENTER',
        label: 'مركز التدخلات (Intervention Center)',
        arabicName: 'التدخلات العلاجية والخطط',
        desc: 'تحويل المهارات الضعيفة إلى خطط علاجية ومتابعة تحسن الطلاب قبل وبعد.',
        icon: Activity,
        category: 'ذكاء وتقارير',
        tone: 'rose',
    },
    {
        id: 'PATHS_AND_COURSES',
        label: 'المسارات والمناهج (Paths & Courses)',
        arabicName: 'المسارات التعليمية',
        desc: 'إتاحة مسارات القدرات والتحصيلي والمناهج التأسيسية للمدرسة.',
        icon: Layers,
        category: 'محتوى وتقييم',
        tone: 'emerald',
    },
    {
        id: 'INTERACTIVE_VIDEO',
        label: 'الفيديو التفاعلي (Interactive Video)',
        arabicName: 'الدروس المرئية التفاعلية',
        desc: 'شروحات الفيديو المدمجة بأسئلة توقف وتدريب أثناء المشاهدة.',
        icon: PlayCircle,
        category: 'تعليمي تفاعلي',
        tone: 'teal',
    },
    {
        id: 'EXECUTIVE_ANALYTICS',
        label: 'التحليلات التنفيذية (Executive Analytics)',
        arabicName: 'تقارير الإدارة العليا',
        desc: 'لوحات قيادة تنفيذية للمدير والمشرف ومقارنة الفصول وتصدير التقارير.',
        icon: Sparkles,
        category: 'ذكاء وتقارير',
        tone: 'slate',
    },
    {
        id: 'LIVE_TUTORING',
        label: 'حصص التقوية الخارجية (Live Tutoring)',
        arabicName: 'بث تقوية مباشر',
        desc: 'حصص تقوية افتراضية مجدولة فردية أو جماعية عبر غرف افتراضية.',
        icon: Video,
        category: 'إضافي',
        tone: 'slate',
    },
    {
        id: 'WHITE_LABEL',
        label: 'الهوية المخصصة (White Label)',
        arabicName: 'تخصيص الهوية والشعار',
        desc: 'ظهور شعار وهوية المدرسة على شاشات الطلاب والتقارير الرسمية.',
        icon: Shield,
        category: 'إضافي',
        tone: 'slate',
    },
    {
        id: 'SCHOOL_CORE',
        label: 'النواة المدرسية (School Core)',
        arabicName: 'أساس المدرسة والعضويات',
        desc: 'إدارة الفصول، الطلاب، المعلمين، والمشرفين (مفعلة أساسية دائماً).',
        icon: ShieldCheck,
        category: 'أساسي',
        tone: 'emerald',
    },
];

export const SchoolServicesCenterTab: React.FC<SchoolServicesCenterTabProps> = ({ school }) => {
    const schoolId = school.id || (school as any)._id;
    const [modules, setModules] = useState<string[]>(['SCHOOL_CORE']);
    const [status, setStatus] = useState<string>('active');
    const [validFrom, setValidFrom] = useState<string>('');
    const [validUntil, setValidUntil] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setFeedback(null);

        api.getSchoolContract(schoolId)
            .then((res) => {
                if (!isMounted) return;
                const contract = res?.contract;
                if (contract) {
                    setModules(contract.modules || ['SCHOOL_CORE']);
                    setStatus(contract.status || 'active');
                    if (contract.validFrom) setValidFrom(new Date(contract.validFrom).toISOString().split('T')[0]);
                    if (contract.validUntil) setValidUntil(new Date(contract.validUntil).toISOString().split('T')[0]);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setFeedback({ type: 'error', message: 'تعذر تحميل بيانات العقد من الخادم.' });
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [schoolId]);

    const toggleModule = (moduleId: string) => {
        if (moduleId === 'SCHOOL_CORE') return; // Cannot toggle core
        setModules((prev) =>
            prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
        );
    };

    const handleSaveContract = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            await api.updateSchoolContract(schoolId, {
                status,
                modules: Array.from(new Set(['SCHOOL_CORE', ...modules])),
                validFrom: validFrom ? new Date(validFrom).toISOString() : null,
                validUntil: validUntil ? new Date(validUntil).toISOString() : null,
            });
            setFeedback({ type: 'success', message: 'تم حفظ العقد والخدمات المفتوحة بنجاح في السيرفر! 🟢' });
            setTimeout(() => setFeedback(null), 5000);
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || 'تعذر حفظ العقد. يرجى المحاولة ثانية.' });
        } finally {
            setIsSaving(false);
        }
    };

    const activeCount = modules.length;

    return (
        <div className="space-y-6" data-testid="school-services-center-tab">
            {/* Header Banner */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white p-6 shadow-xs">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                            <Sparkles size={14} /> مركز خدمات ووحدات التعاقد
                        </div>
                        <h3 className="mt-2 text-xl font-black text-gray-900">
                            الخدمات المفتوحة لمدرسة: {school.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-600 leading-5">
                            تُطبق هذه الصلاحيات مباشرة من الخادم (Server-Authoritative). تفعيل الوحدة هنا يفتح مساحاتها تلقائياً للمعلمين والطلاب.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center shadow-2xs">
                            <span className="block text-[11px] font-bold text-gray-500">الوحدات المفعلة</span>
                            <span className="text-lg font-black text-indigo-600">{activeCount} من 11</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveContract}
                            disabled={isSaving || isLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            <Save size={16} />
                            {isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات في الخادم'}
                        </button>
                    </div>
                </div>

                {/* Contract Status & Dates Toolbar */}
                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-indigo-100/60 pt-4 sm:grid-cols-3">
                    <div>
                        <label className="block text-[11px] font-black text-gray-600 mb-1">حالة العقد</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                        >
                            <option value="active">نشط 🟢</option>
                            <option value="inactive">موقوف مؤقتاً 🟠</option>
                            <option value="expired">منتهي الصلاحية 🔴</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-gray-600 mb-1">تاريخ البداية</label>
                        <input
                            type="date"
                            value={validFrom}
                            onChange={(e) => setValidFrom(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-gray-600 mb-1">تاريخ الانتهاء</label>
                        <input
                            type="date"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {feedback && (
                <div
                    className={`rounded-2xl border p-4 text-xs font-bold animate-in fade-in duration-150 ${
                        feedback.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                >
                    {feedback.message}
                </div>
            )}

            {/* Grid of All 11 Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULE_DEFINITIONS.map((mod) => {
                    const isCore = mod.id === 'SCHOOL_CORE';
                    const isEnabled = modules.includes(mod.id);
                    const IconComponent = mod.icon;

                    return (
                        <div
                            key={mod.id}
                            data-testid={`school-service-card-${mod.id}`}
                            className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                                isEnabled
                                    ? 'border-indigo-200 bg-white shadow-xs hover:border-indigo-300'
                                    : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                isEnabled
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <IconComponent size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900">{mod.arabicName}</h4>
                                            <span className="text-[10px] font-bold text-gray-500">{mod.label}</span>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            disabled={isCore}
                                            onChange={() => toggleModule(mod.id)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <p className="text-xs text-gray-600 leading-5 min-h-[40px]">{mod.desc}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <span className="text-gray-400 font-bold">{mod.category}</span>
                                <span
                                    className={`font-black px-2 py-0.5 rounded-md ${
                                        isEnabled
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {isCore ? 'أساسي دائم' : isEnabled ? 'مفعل في العقد ✓' : 'معطل ✕'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
