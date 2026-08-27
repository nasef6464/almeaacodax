import React from 'react';

interface SchoolAccessFlowHintProps {
    hasActivePackages: boolean;
}

export const SchoolAccessFlowHint: React.FC<SchoolAccessFlowHintProps> = ({ hasActivePackages }) => (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-black text-blue-800 mb-2">كيف يصل الطالب للمحتوى؟</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700 font-bold">
            <span className="rounded-lg bg-white border border-blue-200 px-3 py-1.5">📦 إنشاء باقة للمدرسة</span>
            <span className="text-blue-400">←</span>
            <span className="rounded-lg bg-white border border-blue-200 px-3 py-1.5">🔑 توليد كود وصول</span>
            <span className="text-blue-400">←</span>
            <span className="rounded-lg bg-white border border-blue-200 px-3 py-1.5">👨‍🎓 الطالب يُدخل الكود</span>
            <span className="text-blue-400">←</span>
            <span className="rounded-lg bg-white border border-blue-200 px-3 py-1.5">✅ وصول للمحتوى</span>
        </div>
        {!hasActivePackages && (
            <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ لا توجد باقة نشطة حالياً — الطلاب لا يستطيعون الوصول لأي محتوى. أنشئ باقة أدناه.
            </p>
        )}
    </div>
);
