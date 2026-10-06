import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { User } from '../../../types';

interface SchoolRelationsStatusPanelProps {
    schoolLevelSupervisors: User[];
    classScopedSupervisors: User[];
    schoolParentUsers: User[];
    schoolSupervisors: User[];
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];
}

export const SchoolRelationsStatusPanel: React.FC<SchoolRelationsStatusPanelProps> = ({
    schoolLevelSupervisors,
    classScopedSupervisors,
    schoolParentUsers,
    schoolSupervisors,
    studentsWithoutParent,
    studentsWithoutClass,
}) => {
    const handoverReady =
        schoolLevelSupervisors.length > 0 &&
        studentsWithoutClass.length === 0 &&
        studentsWithoutParent.length === 0;

    return (
        <>
            <div data-testid="school-supervisor-handover-guard" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                            handoverReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                            <ShieldCheck size={14} />
                            {schoolLevelSupervisors.length > 0 ? 'يوجد مسؤول يرى المدرسة كاملة' : 'ينقص مسؤول يرى المدرسة كاملة'}
                        </div>
                        <h3 className="mt-3 text-xl font-black text-gray-900">قرار المشرفين قبل التسليم</h3>
                        <p className="mt-2 text-sm font-bold leading-7 text-gray-600">
                            اربط مدير مدرسة واحدًا على الأقل للمتابعة العامة، ثم اربط مشرفي الفصول عند الحاجة. لا تسلم الحسابات قبل مراجعة الطلاب بلا فصل أو بلا ولي أمر.
                        </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                        {[
                            ['مدير/مشرف عام', schoolLevelSupervisors.length, schoolLevelSupervisors.length > 0 ? 'emerald' : 'amber'],
                            ['مشرفو الفصول', classScopedSupervisors.length, classScopedSupervisors.length > 0 ? 'blue' : 'slate'],
                            ['نواقص التسليم', studentsWithoutClass.length + studentsWithoutParent.length, studentsWithoutClass.length + studentsWithoutParent.length === 0 ? 'emerald' : 'rose'],
                        ].map(([label, value, tone]) => (
                            <div key={String(label)} className={`rounded-2xl border px-4 py-3 text-center ${
                                tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                                    : tone === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-800'
                                        : tone === 'rose' ? 'border-rose-100 bg-rose-50 text-rose-800'
                                            : tone === 'amber' ? 'border-amber-100 bg-amber-50 text-amber-800'
                                                : 'border-slate-100 bg-slate-50 text-slate-700'
                            }`}>
                                <div className="text-xs font-black">{label}</div>
                                <div className="mt-1 text-2xl font-black">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-1 text-xs font-black text-blue-700">أولياء أمور مرتبطون</p>
                    <p className="text-2xl font-black text-blue-800">{schoolParentUsers.length}</p>
                    <p className="mt-1 text-xs text-blue-700">لديهم طالب واحد على الأقل في المدرسة</p>
                </div>
                <div className={`rounded-2xl border p-4 ${studentsWithoutParent.length ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
                    <p className={`mb-1 text-xs font-black ${studentsWithoutParent.length ? 'text-amber-700' : 'text-emerald-700'}`}>طلاب بلا ولي أمر</p>
                    <p className={`text-2xl font-black ${studentsWithoutParent.length ? 'text-amber-800' : 'text-emerald-800'}`}>{studentsWithoutParent.length}</p>
                    <p className={`mt-1 text-xs ${studentsWithoutParent.length ? 'text-amber-700' : 'text-emerald-700'}`}>يفضل ربطهم قبل تسليم الحسابات</p>
                </div>
                <div className={`rounded-2xl border p-4 ${studentsWithoutClass.length ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                    <p className={`mb-1 text-xs font-black ${studentsWithoutClass.length ? 'text-rose-700' : 'text-emerald-700'}`}>طلاب بلا فصل</p>
                    <p className={`text-2xl font-black ${studentsWithoutClass.length ? 'text-rose-800' : 'text-emerald-800'}`}>{studentsWithoutClass.length}</p>
                    <p className={`mt-1 text-xs ${studentsWithoutClass.length ? 'text-rose-700' : 'text-emerald-700'}`}>الفصل يحسن التقارير والمتابعة</p>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                    <p className="mb-1 text-xs font-black text-purple-700">مشرفون ومعلمون</p>
                    <p className="text-2xl font-black text-purple-800">{schoolSupervisors.length}</p>
                    <p className="mt-1 text-xs text-purple-700">على مستوى المدرسة أو الفصول</p>
                </div>
            </div>
        </>
    );
};
