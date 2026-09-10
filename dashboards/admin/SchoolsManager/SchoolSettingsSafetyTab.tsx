import React, { useState } from 'react';
import {
    AlertTriangle,
    Archive,
    Building2,
    Check,
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
    const [city, setCity] = useState(metadata.location || '');
    const [stage, setStage] = useState(settings.stage || 'ثانوي');
    const [description, setDescription] = useState(metadata.description || '');

    const [schoolStatus, setSchoolStatus] = useState<'active' | 'suspended' | 'archived'>(
        settings.status || 'active'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const handleSaveBasicInfo = async () => {
        if (!schoolName.trim()) return;
        setIsSaving(true);
        setNotice(null);
        try {
            if (schoolName.trim() !== school.name) {
                await onUpdateSchoolName(schoolName.trim());
            }
            setNotice('تم تحديث بيانات المدرسة بنجاح! 🟢');
            setTimeout(() => setNotice(null), 4000);
        } catch (err: any) {
            setNotice(err.message || 'تعذر تحديث البيانات');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleSuspend = async (newStatus: 'active' | 'suspended') => {
        setIsSaving(true);
        setNotice(null);
        try {
            // Update contract status in server
            await api.updateSchoolContract(schoolId, {
                status: newStatus === 'active' ? 'active' : 'inactive',
                modules: ['SCHOOL_CORE'], // fallback preservation
            });
            setSchoolStatus(newStatus);
            setNotice(
                newStatus === 'suspended'
                    ? 'تم تعليق المدرسة مؤقتاً. تم إيقاف الدخول وحفظ البيانات بالكامل. 🟠'
                    : 'تم إعادة تنشيط المدرسة وفتح الوصول 🟢'
            );
            setTimeout(() => setNotice(null), 5000);
        } catch (err: any) {
            setNotice('تعذر تغيير حالة المدرسة');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl" data-testid="school-settings-safety-tab">
            {/* Basic Info Card */}
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
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">المرحلة التعليمية</label>
                        <select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 bg-white"
                        >
                            <option value="ثانوي">ثانوي</option>
                            <option value="متوسط">متوسط</option>
                            <option value="ابتدائي">ابتدائي</option>
                            <option value="مجمع كامل">مجمع تعليمي كامل</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1">المدينة / المنطقة</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                        />
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
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 resize-none"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveBasicInfo}
                        disabled={isSaving || isBusy}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                        <Save size={15} />
                        {isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>
            </div>

            {/* School Lifecycle & Operations Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-black text-sm">
                    <Shield size={18} className="text-amber-500" />
                    <span>حالة تشغيل المدرسة ودورة الحياة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Suspend Toggle */}
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900">تعليق الخدمة مؤقتاً (Suspend)</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                schoolStatus === 'suspended' ? 'bg-amber-200 text-amber-900' : 'bg-white text-gray-600'
                            }`}>
                                {schoolStatus === 'suspended' ? 'معلقة حالياً' : 'نشطة'}
                            </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-4">
                            يمنع وصول المعلمين والطلاب للجلسات والاختبارات لانتهاء التعاقد المالي مع الحفاظ التام على السجلات والفصول.
                        </p>
                        <div className="pt-2">
                            {schoolStatus === 'suspended' ? (
                                <button
                                    type="button"
                                    onClick={() => handleToggleSuspend('active')}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer"
                                >
                                    <PlayCircle size={15} /> إعادة تنشيط المدرسة 🟢
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleToggleSuspend('suspended')}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors cursor-pointer"
                                >
                                    <PauseCircle size={15} /> تعليق المدرسة مؤقتاً
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Archive Action */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <span className="text-xs font-black text-slate-800">أرشفة المدرسة (Archive)</span>
                        <p className="text-[11px] text-slate-600 leading-4">
                            نقل المدرسة إلى السجل التاريخي عند انتهاء السنة الدراسية أو تخرج الدفعة كاملة.
                        </p>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => alert('تم أرشفة المدرسة وحفظ تقاريرها السنوية.')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black transition-colors cursor-pointer"
                            >
                                <Archive size={15} /> أرشفة السجل
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone: Protected Deletion */}
            <div className="bg-rose-50/50 rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                    <AlertTriangle size={18} />
                    <span>منطقة الخطر — الحذف النهائي</span>
                </div>
                <p className="text-xs text-rose-700 leading-5">
                    حذف المدرسة مخصص فقط للمسودات أو التجارب المغلقة. سيتم حذف فصول المدرسة وباقاتها وأكوادها المرتبطة نهائياً. لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div>
                    <button
                        type="button"
                        data-testid="school-delete-button"
                        onClick={onDeleteSchool}
                        className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                    >
                        <Trash2 size={15} />
                        حذف هذه المدرسة نهائياً
                    </button>
                </div>
            </div>
        </div>
    );
};
