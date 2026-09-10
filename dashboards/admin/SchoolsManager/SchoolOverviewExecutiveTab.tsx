import React, { useEffect, useState } from 'react';
import {
    Activity,
    BookOpen,
    BrainCircuit,
    Building2,
    Calendar,
    ChevronLeft,
    GraduationCap,
    Key,
    Layers,
    Package,
    Plus,
    Shield,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { B2BPackage, Group, User } from '../../../types';

interface SchoolOverviewExecutiveTabProps {
    school: Group;
    schoolClasses: Group[];
    schoolStudents: User[];
    supervisors: User[];
    teachers: User[];
    activePackages: B2BPackage[];
    onGoToClasses: () => void;
    onGoToPeople: () => void;
    onGoToServices: () => void;
    onGoToContract: () => void;
    onAddClass: () => void;
    onOpenPortal: () => void;
}

const SERVICE_BADGES = [
    { id: 'SMART_CLASSROOM', label: 'الفصول الذكية', icon: Zap, color: 'text-amber-500' },
    { id: 'QUESTION_BANK', label: 'بنك الأسئلة', icon: BookOpen, color: 'text-indigo-500' },
    { id: 'SCHOOL_ASSESSMENTS', label: 'الاختبارات المدرسية', icon: ShieldCheck, color: 'text-blue-500' },
    { id: 'SCHOOL_INTELLIGENCE', label: 'ذكاء المدرسة', icon: BrainCircuit, color: 'text-purple-500' },
    { id: 'INTERVENTION_CENTER', label: 'مركز التدخلات', icon: Activity, color: 'text-rose-500' },
    { id: 'PATHS_AND_COURSES', label: 'المسارات والمناهج', icon: Layers, color: 'text-emerald-500' },
];

export const SchoolOverviewExecutiveTab: React.FC<SchoolOverviewExecutiveTabProps> = ({
    school,
    schoolClasses,
    schoolStudents,
    supervisors,
    teachers,
    activePackages,
    onGoToClasses,
    onGoToPeople,
    onGoToServices,
    onGoToContract,
    onAddClass,
    onOpenPortal,
}) => {
    const schoolId = school.id || (school as any)._id;
    const [contractModules, setContractModules] = useState<string[]>(['SCHOOL_CORE']);
    const [contractStatus, setContractStatus] = useState<string>('active');
    const [validUntil, setValidUntil] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        api.getSchoolContract(schoolId)
            .then((res) => {
                if (!isMounted) return;
                const contract = res?.contract as any;
                if (contract) {
                    setContractModules(contract.modules || ['SCHOOL_CORE']);
                    setContractStatus(contract.status || 'active');
                    if (contract.validUntil) {
                        setValidUntil(new Date(contract.validUntil).toLocaleDateString('ar-SA'));
                    }
                }
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [schoolId]);

    const metadata = (school.metadata || {}) as any;
    const settings = (metadata.settings || {}) as any;
    const stage = settings.stage || 'ثانوي';
    const city = metadata.location || 'الرياض';

    // Total package seats
    const totalPackageSeats = activePackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);

    return (
        <div className="space-y-6" data-testid="school-overview-executive-tab">
            {/* Top Command Hero */}
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-3xl font-black text-indigo-300 shadow-inner">
                            🏫
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-xl md:text-2xl font-black">{school.name}</h2>
                                <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${
                                    contractStatus === 'active'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                    {contractStatus === 'active' ? 'العقد نشط 🟢' : 'قيد التجديد 🟠'}
                                </span>
                                <span className="bg-white/10 text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                    {stage} • {city}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-2 leading-5 max-w-2xl">
                                {metadata.description || 'منشأة تعليمية معتمدة على منصة المئة للتعلم والتقييم والفصول الذكية.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onOpenPortal}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>فتح بوابة المتابعة</span>
                            <ChevronLeft size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    type="button"
                    onClick={onGoToPeople}
                    className="p-5 rounded-2xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 text-right transition-all flex items-center justify-between group cursor-pointer"
                >
                    <div>
                        <div className="text-xs font-bold text-blue-700">إجمالي الطلاب</div>
                        <div className="text-3xl font-black text-blue-900 mt-1">{schoolStudents.length}</div>
                        <div className="text-[11px] text-blue-600 font-bold mt-1">عرض كشف الطلاب ←</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={24} />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={onGoToClasses}
                    className="p-5 rounded-2xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 text-right transition-all flex items-center justify-between group cursor-pointer"
                >
                    <div>
                        <div className="text-xs font-bold text-purple-700">الفصول الدراسية</div>
                        <div className="text-3xl font-black text-purple-900 mt-1">{schoolClasses.length}</div>
                        <div className="text-[11px] text-purple-600 font-bold mt-1">إدارة الشعب والمواد ←</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 size={24} />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={onGoToPeople}
                    className="p-5 rounded-2xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 text-right transition-all flex items-center justify-between group cursor-pointer"
                >
                    <div>
                        <div className="text-xs font-bold text-amber-800">المعلمون والمشرفون</div>
                        <div className="text-3xl font-black text-amber-900 mt-1">{teachers.length + supervisors.length}</div>
                        <div className="text-[11px] text-amber-700 font-bold mt-1">
                            {teachers.length} معلم • {supervisors.length} مشرف
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <GraduationCap size={24} />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={onGoToContract}
                    className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-right transition-all flex items-center justify-between group cursor-pointer"
                >
                    <div>
                        <div className="text-xs font-bold text-emerald-800">مقاعد الباقة</div>
                        <div className="text-3xl font-black text-emerald-900 mt-1">
                            {totalPackageSeats > 0 ? totalPackageSeats : 'غير محدد'}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                            {activePackages.length} باقات نشطة • إدارة ←
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package size={24} />
                    </div>
                </button>
            </div>

            {/* Active Services Ribbon */}
            <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full mb-1">
                            <Zap size={12} /> ميزات المنصة المفتوحة للمدرسة
                        </div>
                        <h3 className="text-base font-black text-gray-900">
                            الخدمات المفعلة في العقد والمطابقة في الخادم
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onGoToServices}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                        تعديل الخدمات في العقد <ChevronLeft size={14} />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {SERVICE_BADGES.map((service) => {
                        const isEnabled = contractModules.includes(service.id);
                        const Icon = service.icon;

                        return (
                            <div
                                key={service.id}
                                className={`p-3.5 rounded-2xl border text-right transition-all ${
                                    isEnabled
                                        ? 'border-indigo-100 bg-indigo-50/30'
                                        : 'border-slate-100 bg-slate-50/50 opacity-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Icon size={18} className={isEnabled ? service.color : 'text-slate-400'} />
                                    <span
                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                                            isEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {isEnabled ? '✓' : '✕'}
                                    </span>
                                </div>
                                <div className="text-xs font-black text-gray-900">{service.label}</div>
                                <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                                    {isEnabled ? 'مفعل بالعقد' : 'غير مشمول'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Action Clusters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">الفصول السريعة</span>
                        <Building2 size={16} className="text-slate-400" />
                    </div>
                    <h4 className="text-base font-black text-gray-900">{schoolClasses.length} فصول مجهزة</h4>
                    <p className="text-xs text-gray-500 leading-5">
                        أضف فصولاً جديدة أو عيّن معلمين للمواد لإطلاق الحصص التفاعلية في الفصول الذكية.
                    </p>
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onAddClass}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <Plus size={14} /> إضافة فصل
                        </button>
                        <button
                            type="button"
                            onClick={onGoToClasses}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            إدارة الفصول
                        </button>
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">كود الانضمام المباشر</span>
                        <Key size={16} className="text-slate-400" />
                    </div>
                    <h4 className="text-base font-black text-gray-900">أكواد تفعيل الطلاب</h4>
                    <p className="text-xs text-gray-500 leading-5">
                        وزّع كود الانضمام على الطلاب لتفعيل حساباتهم الذاتية وربطهم فوراً بالمدرسة.
                    </p>
                    <button
                        type="button"
                        onClick={onGoToContract}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                        توليد وإدارة الأكواد والباقات ←
                    </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">حالة العقد والتجديد</span>
                        <Calendar size={16} className="text-slate-400" />
                    </div>
                    <h4 className="text-base font-black text-gray-900">
                        {validUntil ? `سارٍ حتى ${validUntil}` : 'عقد سنوي مفتوح'}
                    </h4>
                    <p className="text-xs text-gray-500 leading-5">
                        يمكنك ترقية الباقة وتمديد تاريخ الانتهاء وإضافة مقاعد إضافية للمدرسة.
                    </p>
                    <button
                        type="button"
                        onClick={onGoToContract}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                        مركز التعاقد والخطط ←
                    </button>
                </div>
            </div>
        </div>
    );
};
