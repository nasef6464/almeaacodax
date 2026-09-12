import React from 'react';

interface NewSchoolWizardLeadershipStepProps {
    directorName: string;
    setDirectorName: (value: string) => void;
    directorEmail: string;
    setDirectorEmail: (value: string) => void;
    directorPassword: string;
    setDirectorPassword: (value: string) => void;
}

export const NewSchoolWizardLeadershipStep: React.FC<NewSchoolWizardLeadershipStepProps> = ({
    directorName,
    setDirectorName,
    directorEmail,
    setDirectorEmail,
    directorPassword,
    setDirectorPassword,
}) => {
    const hasAnyDirectorField = Boolean(directorName.trim() || directorEmail.trim() || directorPassword);

    return (
        <div className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs font-bold leading-6 text-indigo-950">
                إذا كان البريد مرتبطًا بحساب <strong>مدير مدرسة</strong> نشط فسيتم ربط الحساب الموجود بهذه المدرسة؛ وإلا سيُنشأ حساب جديد ثم تُثبت عضويته وصلاحياته من الخادم.
                اترك الحقول الثلاثة فارغة إذا أردت تعيين المدير لاحقًا من المجتمع المدرسي.
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-black text-gray-700">اسم مدير المدرسة</label>
                <input
                    type="text"
                    value={directorName}
                    onChange={(event) => setDirectorName(event.target.value)}
                    placeholder="مثال: عبدالله الغامدي"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-black text-gray-700">البريد الإلكتروني للحساب</label>
                <input
                    type="email"
                    value={directorEmail}
                    onChange={(event) => setDirectorEmail(event.target.value)}
                    placeholder="director@school.edu.sa"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-black text-gray-700">كلمة المرور المؤقتة</label>
                <input
                    type="password"
                    value={directorPassword}
                    onChange={(event) => setDirectorPassword(event.target.value)}
                    placeholder="8 أحرف على الأقل وتحتوي حرفًا ورقمًا"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                />
                {hasAnyDirectorField && (
                    <p className="mt-1.5 text-[11px] font-bold text-slate-500">
                        عند استخدام هذه الخطوة تصبح الحقول الثلاثة مطلوبة. كلمة المرور تُستخدم فقط عند الحاجة لإنشاء حساب جديد ولا تُحفظ داخل بيانات المدرسة الوصفية.
                    </p>
                )}
            </div>
        </div>
    );
};