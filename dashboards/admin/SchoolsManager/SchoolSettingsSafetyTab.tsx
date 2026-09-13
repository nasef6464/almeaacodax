import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Archive,
    Building2,
    PauseCircle,
    PlayCircle,
    Save,
    Shield,
    Trash2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';

interface SchoolSettingsSafetyTabProps {
    school: Group;
    onUpdateSchoolName: (newName: string) => Promise<void>;
    onDeleteSchool: () => void;
    isBusy: boolean;
}

type SchoolLifecycleStatus = 'active' | 'suspended' | 'archived';

export const SchoolSettingsSafetyTab: React.FC<SchoolSettingsSafetyTabProps> = ({
    school,
    onUpdateSchoolName,
    onDeleteSchool,
    isBusy,
}) => {
    const schoolId = school.id || (school as any)._id;
    const metadata = (school.metadata || {}) as any;
    const settings = (metadata.settings || {}) as any;

    const [schoolName, setSchoolName] = useState(school.name);
    const city = metadata.location || 'غير محدد';
    const stage = settings.stage || 'غير محدد';
    const description = metadata.description || 'لا توجد ملاحظات محفوظة';

    const [schoolStatus, setSchoolStatus] = useState<SchoolLifecycleStatus>('active');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setIsLoadingContract(true);

        api.getSchoolContract(schoolId)
            .then((response) => {
                if (!mounted) return;
                const contract = response?.contract as any;
                if (!contract) {
                    setSchoolStatus(settings.status === 'archived' ? 'archived' : 'active');
                    return;
                }
                setSchoolStatus(contract.status === 'active' ? 'active' : 'suspended');
            })
            .catch(() => {
                if (mounted) {
                    setNotice('تعذر قراءة حالة العقد الحالية من الخادم. لن يتم تغيير حالة المدرسة حتى تتوفر بيانات العقد.');
                }
            })
            .finally(() => {
                if (mounted) setIsLoadingContract(false);
            });

        return () => {
            mounted = false;
        };
    }, [schoolId, settings.status]);

    const handleSaveBasicInfo = async () => {
        const nextName = schoolName.trim();
        if (!nextName || nextName === school.name) return;

        setIsSaving(true);
        setNotice(null);
        try {
            await onUpdateSchoolName(nextName);
            setNotice('تم تحديث اسم المدرسة والتحقق من الخادم.');
            setTimeout(() => setNotice(null), 4000);
        } catch (err: any) {
            setNotice(err.message || 'تعذر تحديث اسم المدرسة');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleSuspend = async (newStatus: 'active' | 'suspended') => {
        setIsSaving(true);
        setNotice(null);
        try {
            const response = await api.getSchoolContract(schoolId);
            const contract = response?.contract as any;
            if (!contract) {
                throw new Error('لا يوجد عقد محفوظ لهذه المدرسة. أنشئ العقد أولاً من تبويب العقد والباقات.');
            }

            const currentModules = Array.isArray(contract.modules) && contract.modules.length > 0
                ? contract.modules
                : ['SCHOOL_CORE'];

            await api.updateSchoolContract(schoolId, {
                status: newStatus === 'active' ? 'active' : 'inactive',
                modules: currentModules,
                validFrom: contract.validFrom || null,
                validUntil: contract.validUntil || null,
            });

            const verified = await api.getSchoolContract(schoolId);
            const verifiedContract = verified?.contract as any;
            const expectedStatus = newStatus === 'active' ? 'active' : 'inactive';
            if (!verifiedContract || verifiedContract.status !== expectedStatus) {
                throw new Error('تم إرسال التغيير لكن تعذر تأكيد حالة العقد من الخادم.');
            }

            const verifiedModules = Array.isArray(verifiedContract.modules) ? verifiedContract.modules : [];
            const missingModule = currentModules.find((moduleId: string) => !verifiedModules.includes(moduleId));
            if (missingModule) {
                throw new Error('تم تغيير الحالة لكن التحقق كشف اختلافًا في خدمات العقد؛ لم يتم اعتبار العملية مكتملة.');
            }

            setSchoolStatus(newStatus);
            setNotice(
                newStatus === 'suspended'
                    ? 'تم تعليق العقد مؤقتًا مع الحفاظ على جميع خدماته ووحداته الحالية.'
                    : 'تم إعادة تنشيط العقد مع الحفاظ على جميع خدماته ووحداته الحالية.',
            );
            setTimeout(() => setNotice(null), 5000);
        } catch (err: any) {
            setNotice(err.message || 'تعذر تغيير حالة المدرسة');
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveRequest = () => {
        setNotice('الأرشفة الدائمة ليست موصولة بعملية خادمية معتمدة حتى الآن؛ لم يتم تغيير أي بيانات. استخدم التعليق المؤقت أو الحذف المحمي فقط.');
    };

    return (
        <div className="space-y-6 max-w-4xl" data-testid="school-settings-safety-tab">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-sm">
                    <Building2 size={18} />
                    <span>بيانات وهوية المدرسة</span>
                </div>

                {notice && (
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-900">
                        {notice}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">اسم المدرسة</label>
                        <input
                            type="text"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                        />
                        <p className="mt-1 text-[10px] font-bold text-slate-400">هذا الحقل فقط قابل للحفظ من هذه الشاشة حاليًا.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">المرحلة التعليمية</label>
                        <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-gray-700">
                            {stage}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">المدينة / المنطقة</label>
                        <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-gray-700">
                            {city}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">معرّف المدرسة البرمجي</label>
                        <input
                            type="text"
                            value={schoolId}
                            readOnly
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-gray-500 outline-none cursor-not-allowed"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">الوصف والملاحظات</label>
                    <div className="min-h-[72px] w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold leading-6 text-gray-700">
                        {description}
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                        عرض فقط حتى يتم توصيل تحرير بيانات المدرسة بعملية حفظ خادمية موحدة؛ لن تعرض الواجهة نجاحًا وهميًا.
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveBasicInfo}
                        disabled={isSaving || isBusy || !schoolName.trim() || schoolName.trim() === school.name}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={15} />
                        {isSaving ? 'جارٍ الحفظ...' : 'حفظ اسم المدرسة'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-black text-sm">
                    <Shield size={18} className="text-amber-500" />
                    <span>حالة تشغيل المدرسة ودورة الحياة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-amber-900">تعليق العقد مؤقتاً</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                schoolStatus === 'suspended' ? 'bg-amber-200 text-amber-900' : 'bg-white text-gray-600'
                            }`}>
                                {isLoadingContract ? 'جارٍ التحقق...' : schoolStatus === 'suspended' ? 'معلق حالياً' : 'نشط'}
                            </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-4">
                            يغيّر حالة العقد فقط مع إبقاء الوحدات والخدمات وتواريخ العقد كما هي. لا يحذف الفصول أو العضويات أو السجلات.
                        </p>
                        <div className="pt-2">
                            {schoolStatus === 'suspended' ? (
                                <button
                                    type="button"
                                    onClick={() => handleToggleSuspend('active')}
                                    disabled={isSaving || isLoadingContract}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <PlayCircle size={15} /> إعادة تنشيط العقد
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleToggleSuspend('suspended')}
                                    disabled={isSaving || isLoadingContract}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <PauseCircle size={15} /> تعليق العقد مؤقتاً
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <span className="text-xs font-black text-slate-800">أرشفة المدرسة</span>
                        <p className="text-[11px] text-slate-600 leading-4">
                            الأرشفة تحتاج عملية خادمية مستقلة تحفظ التاريخ والعلاقات والتقارير. لن تُحاكى محليًا أو برسالة نجاح فقط.
                        </p>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleArchiveRequest}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black transition-colors cursor-pointer"
                            >
                                <Archive size={15} /> طلب الأرشفة (غير منفذ بعد)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-rose-50/50 rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                    <AlertTriangle size={18} />
                    <span>منطقة الخطر — الحذف النهائي</span>
                </div>
                <p className="text-xs text-rose-700 leading-5">
                    حذف المدرسة مخصص فقط للمسودات أو التجارب المغلقة. استخدم شاشة مراجعة الأثر قبل التأكيد النهائي.
                </p>
                <div>
                    <button
                        type="button"
                        data-testid="school-delete-button"
                        onClick={onDeleteSchool}
                        className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                    >
                        <Trash2 size={15} />
                        فتح مراجعة الحذف النهائي
                    </button>
                </div>
            </div>
        </div>
    );
};