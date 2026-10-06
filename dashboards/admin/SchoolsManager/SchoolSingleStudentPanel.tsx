import React from 'react';
import { Plus } from 'lucide-react';
import type { Group } from '../../../types';

interface SingleStudentDraft {
    name: string;
    email: string;
    className: string;
    password: string;
}

interface SchoolSingleStudentPanelProps {
    isOpen: boolean;
    schoolClasses: Group[];
    student: SingleStudentDraft;
    isSchoolWorkspaceBusy: boolean;
    isImporting: boolean;
    onToggle: () => void;
    onChangeField: (field: keyof SingleStudentDraft, value: string) => void;
    onCreateFirstClass: () => Promise<void>;
    onSubmit: () => Promise<void> | void;
}

export const SchoolSingleStudentPanel: React.FC<SchoolSingleStudentPanelProps> = ({
    isOpen,
    schoolClasses,
    student,
    isSchoolWorkspaceBusy,
    isImporting,
    onToggle,
    onChangeField,
    onCreateFirstClass,
    onSubmit,
}) => (
    <div data-testid="school-students-panel" className="min-w-0 max-w-full rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h3 className="text-lg font-black text-gray-900">إضافة طالب منفرد</h3>
                <p className="text-sm text-indigo-800">للطالب الواحد أو التصحيح السريع داخل فصل واضح.</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-indigo-700 transition-colors hover:bg-indigo-100"
            >
                {isOpen ? 'إغلاق البطاقة' : 'إضافة طالب منفرد'}
            </button>
        </div>
        {isOpen && schoolClasses.length === 0 && (
            <div data-testid="school-student-needs-class-note" className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-sm font-black text-amber-800">ابدأ بفصل واحد قبل إضافة الطلاب</div>
                    <p className="mt-1 text-xs font-bold leading-5 text-amber-700">الإضافة اليدوية تحتاج فصلًا واضحًا حتى لا تتراكم طلاب بلا تصنيف.</p>
                </div>
                <button
                    type="button"
                    data-testid="school-student-create-first-class"
                    disabled={isSchoolWorkspaceBusy}
                    onClick={() => void onCreateFirstClass()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600"
                >
                    <Plus size={14} />
                    إنشاء فصل الآن
                </button>
            </div>
        )}
        {isOpen && (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <input
                        data-testid="school-single-student-name"
                        value={student.name}
                        onChange={(event) => onChangeField('name', event.target.value)}
                        placeholder="اسم الطالب"
                        className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                        data-testid="school-single-student-email"
                        value={student.email}
                        onChange={(event) => onChangeField('email', event.target.value)}
                        placeholder="بريد الطالب"
                        className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <select
                        data-testid="school-single-student-class"
                        value={student.className}
                        onChange={(event) => onChangeField('className', event.target.value)}
                        className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        <option value="">اختر فصل الطالب</option>
                        {schoolClasses.map((classroom) => (
                            <option key={classroom.id} value={classroom.name}>{classroom.name}</option>
                        ))}
                    </select>
                    <input
                        data-testid="school-single-student-password"
                        value={student.password}
                        onChange={(event) => onChangeField('password', event.target.value)}
                        placeholder="كلمة مرور اختيارية"
                        className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        data-testid="school-single-student-submit"
                        onClick={() => void onSubmit()}
                        disabled={isImporting}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        إضافة الطالب
                    </button>
                </div>
            </div>
        )}
    </div>
);
