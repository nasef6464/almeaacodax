import React, { useEffect, useState } from 'react';
import {
    Activity,
    BookOpen,
    BrainCircuit,
    FileText,
    Layers,
    PlayCircle,
    Shield,
    ShieldCheck,
    Sparkles,
    Video,
    Zap,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';

interface SchoolServicesCenterTabProps {
    school: Group;
}

const MODULE_DEFINITIONS = [
    { id: 'SCHOOL_CORE', label: 'النواة المدرسية', technical: 'School Core', desc: 'إدارة الفصول والطلاب والمعلمين والمشرفين.', icon: ShieldCheck, category: 'أساسي' },
    { id: 'SMART_CLASSROOM', label: 'الفصول الذكية التفاعلية', technical: 'Smart Classroom', desc: 'حصص تفاعلية مباشرة، كونسول المعلم وبروجيكتور العرض.', icon: Zap, category: 'تعليمي تفاعلي' },
    { id: 'QUESTION_BANK', label: 'بنك الأسئلة الموحد', technical: 'Question Bank', desc: 'استخدام أسئلة المنصة في التدريب والاختبارات والحصص.', icon: BookOpen, category: 'محتوى وتقييم' },
    { id: 'SCHOOL_ASSESSMENTS', label: 'الاختبارات الموجهة', technical: 'School Assessments', desc: 'اختبارات مدرسية موجهة لفصول وطلاب المدرسة.', icon: FileText, category: 'محتوى وتقييم' },
    { id: 'PATHS_AND_COURSES', label: 'المسارات التعليمية', technical: 'Paths & Courses', desc: 'المسارات والمناهج والدورات المعتمدة للمدرسة.', icon: Layers, category: 'محتوى وتقييم' },
    { id: 'INTERACTIVE_VIDEO', label: 'الدروس المرئية التفاعلية', technical: 'Interactive Video', desc: 'فيديوهات تعليمية مع أسئلة وتوقفات تفاعلية.', icon: PlayCircle, category: 'تعليمي تفاعلي' },
    { id: 'SCHOOL_INTELLIGENCE', label: 'التحليلات وخريطة المهارات', technical: 'School Intelligence', desc: 'تحليلات الإتقان ونتائج المدرسة منفصلة عن التعلم الذاتي.', icon: BrainCircuit, category: 'ذكاء وتقارير' },
    { id: 'INTERVENTION_CENTER', label: 'التدخلات العلاجية', technical: 'Intervention Center', desc: 'خطط علاجية ومتابعة التحسن في المهارات الضعيفة.', icon: Activity, category: 'ذكاء وتقارير' },
    { id: 'EXECUTIVE_ANALYTICS', label: 'تقارير الإدارة العليا', technical: 'Executive Analytics', desc: 'مؤشرات تنفيذية وتصدير ومقارنة للفصول والمدرسة.', icon: Sparkles, category: 'ذكاء وتقارير' },
    { id: 'LIVE_TUTORING', label: 'حصص التقوية الخارجية', technical: 'Live Tutoring', desc: 'حصص دعم وتقوية مجدولة مباشرة.', icon: Video, category: 'إضافي' },
    { id: 'WHITE_LABEL', label: 'الهوية المخصصة', technical: 'White Label', desc: 'تخصيص شعار وهوية المدرسة في الواجهات والتقارير.', icon: Shield, category: 'إضافي' },
];

export const SchoolServicesCenterTab: React.FC<SchoolServicesCenterTabProps> = ({ school }) => {
    const schoolId = school.id || (school as any)._id;
    const [modules, setModules] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('unknown');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        setError('');

        api.getSchoolContract(schoolId)
            .then(({ contract }) => {
                if (!mounted) return;
                if (!contract) {
                    setModules([]);
                    setStatus('missing');
                    return;
                }
                setModules(Array.from(new Set(contract.modules || [])));
                setStatus(contract.status || 'unknown');
            })
            .catch(() => {
                if (mounted) setError('تعذر قراءة خدمات المدرسة من العقد الحالي.');
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [schoolId]);

    const statusLabel = status === 'active'
        ? 'العقد نشط'
        : status === 'inactive'
            ? 'العقد موقوف'
            : status === 'expired'
                ? 'العقد منتهٍ'
                : status === 'missing'
                    ? 'لا يوجد عقد محفوظ'
                    : 'حالة العقد غير معروفة';

    return (
        <div className="space-y-6" data-testid="school-services-center-tab">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white p-6 shadow-xs">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                            <Sparkles size={14} /> مركز الخدمات والاستحقاقات
                        </div>
                        <h3 className="mt-2 text-xl font-black text-gray-900">الخدمات المتاحة لمدرسة: {school.name}</h3>
                        <p className="mt-1 max-w-3xl text-xs leading-6 text-gray-600">
                            هذه شاشة عرض فقط لما يسمح به العقد الحالي. تعديل حالة العقد أو الوحدات يتم من محرر العقد المرجعي حتى لا توجد نقطتان تكتبان على نفس بيانات التعاقد.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
                            <span className="block text-[10px] font-bold text-slate-500">الحالة</span>
                            <span className="text-xs font-black text-slate-900">{isLoading ? 'جارٍ القراءة...' : statusLabel}</span>
                        </div>
                        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-center">
                            <span className="block text-[10px] font-bold text-slate-500">الخدمات المفعلة</span>
                            <span className="text-lg font-black text-indigo-700">{isLoading ? '—' : modules.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                    {error}
                </div>
            )}

            {!isLoading && status === 'missing' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900">
                    لم يتم العثور على عقد لهذه المدرسة. أنشئ أو احفظ العقد من قسم «العقد والباقات» قبل الاعتماد على أي خدمة تشغيلية.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MODULE_DEFINITIONS.map((module) => {
                    const enabled = modules.includes(module.id);
                    const Icon = module.icon;
                    return (
                        <article
                            key={module.id}
                            data-testid={`school-service-card-${module.id}`}
                            className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                                enabled ? 'border-indigo-200 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/60 opacity-70'
                            }`}
                        >
                            <div>
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900">{module.label}</h4>
                                            <span className="text-[10px] font-bold text-gray-500">{module.technical}</span>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {enabled ? 'مفعل' : 'غير مشمول'}
                                    </span>
                                </div>
                                <p className="min-h-[40px] text-xs leading-5 text-gray-600">{module.desc}</p>
                            </div>
                            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-gray-400">{module.category}</div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};
