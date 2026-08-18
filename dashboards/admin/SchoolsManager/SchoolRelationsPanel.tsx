import React from 'react';
import { ShieldCheck, UserPlus, Download } from 'lucide-react';
import { User, Group } from '../../../types';
import { RelationImportRow, RelationImportSummary, RelationCredential } from './contracts';
import { SchoolRelationsImportPanel } from './SchoolRelationsImportPanel';

interface SchoolRelationsPanelProps {
    schoolLevelSupervisors: User[];
    classScopedSupervisors: User[];
    schoolParentUsers: User[];
    schoolSupervisors: User[];
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];
    
    quickSupervisor: { name: string; email: string; password?: string; targetGroupId: string };
    setQuickSupervisor: React.Dispatch<React.SetStateAction<{ name: string; email: string; password?: string; targetGroupId: string }>>;
    schoolClasses: Group[];
    
    handleCreateQuickSupervisor: () => Promise<void>;
    rosterActionPending: string | null;
    
    downloadRelationsTemplate: () => void;
    
    relationRows: RelationImportRow[];
    handleRelationFile: (file: File) => Promise<void>;
    relationError: string | null;
    
    createMissingRelationUsers: boolean;
    setCreateMissingRelationUsers: React.Dispatch<React.SetStateAction<boolean>>;
    
    isApplyingRelations: boolean;
    handleApplyRelationImport: () => Promise<void>;
    
    relationSummary: RelationImportSummary | null;
    relationCredentials: RelationCredential[];
    downloadRelationCredentials: () => void;
    downloadRelationsReport: () => void;
}

export const SchoolRelationsPanel: React.FC<SchoolRelationsPanelProps> = ({
    schoolLevelSupervisors,
    classScopedSupervisors,
    schoolParentUsers,
    schoolSupervisors,
    studentsWithoutParent,
    studentsWithoutClass,
    quickSupervisor,
    setQuickSupervisor,
    schoolClasses,
    handleCreateQuickSupervisor,
    rosterActionPending,
    downloadRelationsTemplate,
    relationRows,
    handleRelationFile,
    relationError,
    createMissingRelationUsers,
    setCreateMissingRelationUsers,
    isApplyingRelations,
    handleApplyRelationImport,
    relationSummary,
    relationCredentials,
    downloadRelationCredentials,
    downloadRelationsReport
}) => {
    return (
        <div data-testid="school-supervisors-panel" className="space-y-8">
            <div data-testid="school-supervisor-handover-guard" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                            schoolLevelSupervisors.length > 0 && studentsWithoutClass.length === 0 && studentsWithoutParent.length === 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
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

            <div data-testid="school-relations-quick-supervisor-card" className="rounded-2xl border border-purple-100 bg-purple-50/70 p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700">
                            <UserPlus size={14} />
                            إضافة مشرف من نفس التبويب
                        </div>
                        <h3 className="mt-3 text-lg font-black text-gray-900">مدير مدرسة أو مشرف فصل</h3>
                        <p className="mt-1 text-sm font-bold leading-7 text-purple-900">
                            استخدم هذا النموذج للحساب الواحد: اختر المدرسة كاملة لمدير المدرسة، أو اختر فصلًا لمشرف الفصل.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 text-xs font-bold leading-6 text-gray-600">
                        لا تحتاج للرجوع إلى النظرة العامة لإضافة مشرف.
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                    <input
                        data-testid="school-relations-supervisor-name"
                        value={quickSupervisor.name}
                        onChange={(event) => setQuickSupervisor((current) => ({ ...current, name: event.target.value }))}
                        placeholder="اسم المشرف"
                        className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <input
                        data-testid="school-relations-supervisor-email"
                        value={quickSupervisor.email}
                        onChange={(event) => setQuickSupervisor((current) => ({ ...current, email: event.target.value }))}
                        placeholder="بريد المشرف"
                        className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <input
                        data-testid="school-relations-supervisor-password"
                        value={quickSupervisor.password}
                        onChange={(event) => setQuickSupervisor((current) => ({ ...current, password: event.target.value }))}
                        placeholder="كلمة مرور اختيارية"
                        className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <select
                        data-testid="school-relations-supervisor-scope"
                        value={quickSupervisor.targetGroupId}
                        onChange={(event) => setQuickSupervisor((current) => ({ ...current, targetGroupId: event.target.value }))}
                        className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">المدرسة كاملة</option>
                        {schoolClasses.map((classroom) => (
                            <option key={classroom.id} value={classroom.id}>فصل: {classroom.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    data-testid="school-relations-supervisor-submit"
                    onClick={() => void handleCreateQuickSupervisor()}
                    disabled={Boolean(rosterActionPending)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-purple-800"
                >
                    <UserPlus size={16} />
                    إنشاء/ربط المشرف
                </button>
            </div>

            <SchoolRelationsImportPanel
                downloadRelationsTemplate={downloadRelationsTemplate}
                relationRows={relationRows}
                handleRelationFile={handleRelationFile}
                relationError={relationError}
                createMissingRelationUsers={createMissingRelationUsers}
                setCreateMissingRelationUsers={setCreateMissingRelationUsers}
                isApplyingRelations={isApplyingRelations}
                handleApplyRelationImport={handleApplyRelationImport}
                relationSummary={relationSummary}
                relationCredentials={relationCredentials}
                downloadRelationCredentials={downloadRelationCredentials}
            />

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">تقرير المتابعة المدرسية</h3>
                        <p className="mt-1 text-sm leading-7 text-gray-500">
                            ملف واضح للإدارة يضم الطلاب، أولياء الأمور، المشرفين، والنواقص التي تحتاج استكمال.
                        </p>
                    </div>
                    <button
                        onClick={downloadRelationsReport}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                        <Download size={16} /> تصدير التقرير
                    </button>
                </div>

                <div className="space-y-3">
                    {studentsWithoutParent.slice(0, 5).map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                            <div>
                                <p className="font-bold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email || 'بدون بريد'}</p>
                            </div>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">بلا ولي أمر</span>
                        </div>
                    ))}
                    {studentsWithoutParent.length === 0 && studentsWithoutClass.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-800">
                            وضع الربط الأساسي جيد: لا يوجد طلاب بلا ولي أمر أو بلا فصل.
                        </div>
                    ) : null}
                    {studentsWithoutClass.slice(0, 5).map((student) => (
                        <div key={`class-${student.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                            <div>
                                <p className="font-bold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email || 'بدون بريد'}</p>
                            </div>
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">بلا فصل</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
