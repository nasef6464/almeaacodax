import React from 'react';
import { Check, GraduationCap, Trash2 } from 'lucide-react';

export const WIZARD_PLANS = [
    {
        id: 'smart_school',
        name: 'مدرسة ذكية متكاملة (Smart School Pro)',
        description: 'الفصول الذكية، بنك الأسئلة، الاختبارات المدرسية، ومركز التدخلات والتحليلات.',
        badge: 'الأكثر شعبية ⭐',
        defaultModules: [
            'SCHOOL_CORE',
            'QUESTION_BANK',
            'SCHOOL_ASSESSMENTS',
            'SMART_CLASSROOM',
            'SCHOOL_INTELLIGENCE',
            'INTERVENTION_CENTER',
            'PATHS_AND_COURSES',
        ],
    },
    {
        id: 'assessment_core',
        name: 'التقييم والاختبارات (Assessment Core)',
        description: 'بنك الأسئلة، الاختبارات المدرسية، والمسارات بدون فصول ذكية حية.',
        badge: 'أساسي',
        defaultModules: [
            'SCHOOL_CORE',
            'QUESTION_BANK',
            'SCHOOL_ASSESSMENTS',
            'PATHS_AND_COURSES',
        ],
    },
    {
        id: 'enterprise',
        name: 'شامل ومتقدم (Enterprise All-In)',
        description: 'جميع وحدات المنصة الـ 11 بما فيها التحليلات المتقدمة والعلامة البيضاء.',
        badge: 'شامل',
        defaultModules: [
            'SCHOOL_CORE',
            'QUESTION_BANK',
            'SCHOOL_ASSESSMENTS',
            'PATHS_AND_COURSES',
            'INTERACTIVE_VIDEO',
            'SMART_CLASSROOM',
            'SCHOOL_INTELLIGENCE',
            'INTERVENTION_CENTER',
            'LIVE_TUTORING',
            'WHITE_LABEL',
            'EXECUTIVE_ANALYTICS',
        ],
    },
];

export const WIZARD_ALL_MODULES = [
    { id: 'SMART_CLASSROOM', label: 'الفصول الذكية', desc: 'حصص تفاعلية، كونسول المعلم، وبروجيكتور' },
    { id: 'QUESTION_BANK', label: 'بنك الأسئلة الموحد', desc: 'مستودع الأسئلة الشامل للتدريب والاختبارات' },
    { id: 'SCHOOL_ASSESSMENTS', label: 'الاختبارات المدرسية', desc: 'اختبارات تشخيصية ودورية مخصصة' },
    { id: 'SCHOOL_INTELLIGENCE', label: 'ذكاء المدرسة والتحليلات', desc: 'خريطة المهارات وفصل نتائج المدرسة' },
    { id: 'INTERVENTION_CENTER', label: 'مركز التدخلات العلاجية', desc: 'خطط علاجية وتتبع التحسن قبل وبعد' },
    { id: 'PATHS_AND_COURSES', label: 'المسارات والمناهج', desc: 'ربط المواد ومسارات القدرات والتحصيلي' },
    { id: 'INTERACTIVE_VIDEO', label: 'الفيديو التفاعلي', desc: 'شروحات مع أسئلة مدمجة' },
    { id: 'EXECUTIVE_ANALYTICS', label: 'التقارير التنفيذية', desc: 'تقارير الإدارة وتحليل مؤشرات الإنجاز' },
];

interface WizardStepBasicInfoProps {
    name: string;
    setName: (val: string) => void;
    stage: string;
    setStage: (val: string) => void;
    city: string;
    setCity: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
}

export const WizardStepBasicInfo: React.FC<WizardStepBasicInfoProps> = ({
    name,
    setName,
    stage,
    setStage,
    city,
    setCity,
    description,
    setDescription,
}) => (
    <div className="space-y-4 animate-in fade-in duration-150">
        <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5">
                اسم المدرسة <span className="text-rose-500">*</span>
            </label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مدارس التربية النموذجية"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                autoFocus
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                    المرحلة التعليمية
                </label>
                <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500 bg-white"
                >
                    <option value="ثانوي">ثانوي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="مجمع كامل">مجمع تعليمي كامل</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                    المدينة / المنطقة
                </label>
                <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: الرياض"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                />
            </div>
        </div>

        <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5">
                ملاحظات أو وصف تعريفي
            </label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="نبذة عن المدرسة، رقم السجل، أو ملاحظات التعاقد..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 resize-none"
            />
        </div>
    </div>
);

interface WizardStepPlanAndModulesProps {
    selectedPlanId: string;
    onSelectPlan: (planId: string) => void;
    modules: string[];
    toggleModule: (modId: string) => void;
    targetStudents: number;
    setTargetStudents: (val: number) => void;
}

export const WizardStepPlanAndModules: React.FC<WizardStepPlanAndModulesProps> = ({
    selectedPlanId,
    onSelectPlan,
    modules,
    toggleModule,
    targetStudents,
    setTargetStudents,
}) => (
    <div className="space-y-5 animate-in fade-in duration-150">
        <div>
            <h4 className="text-sm font-black text-gray-900 mb-1">اختر باقة العقد الأساسية</h4>
            <p className="text-xs text-gray-500 mb-3">تحدد الباقة الميزات المفعلة تلقائياً للمدرسة في السيرفر</p>
            <div className="grid gap-3">
                {WIZARD_PLANS.map((plan) => (
                    <button
                        key={plan.id}
                        type="button"
                        onClick={() => onSelectPlan(plan.id)}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 ${
                            selectedPlanId === plan.id
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-900">{plan.name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    {plan.badge}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-5">{plan.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                            selectedPlanId === plan.id
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300'
                        }`}>
                            {selectedPlanId === plan.id && <Check size={12} />}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-gray-900 mb-2">تخصيص الخدمات المفتوحة في العقد:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WIZARD_ALL_MODULES.map((mod) => (
                    <label
                        key={mod.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            modules.includes(mod.id)
                                ? 'border-indigo-200 bg-indigo-50/30'
                                : 'border-slate-100 bg-slate-50/30 opacity-60'
                        }`}
                    >
                        <div className="space-y-0.5">
                            <div className="text-xs font-black text-gray-800">{mod.label}</div>
                            <div className="text-[10px] text-gray-500">{mod.desc}</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={modules.includes(mod.id)}
                            onChange={() => toggleModule(mod.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-2"
                        />
                    </label>
                ))}
            </div>
        </div>

        <div className="pt-2">
            <label className="block text-xs font-black text-gray-700 mb-1.5">
                العدد التقديري للطلاب المستهدفين
            </label>
            <input
                type="number"
                value={targetStudents}
                onChange={(e) => setTargetStudents(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
            />
        </div>
    </div>
);

interface WizardStepLeadershipProps {
    directorName: string;
    setDirectorName: (val: string) => void;
    directorEmail: string;
    setDirectorEmail: (val: string) => void;
}

export const WizardStepLeadership: React.FC<WizardStepLeadershipProps> = ({
    directorName,
    setDirectorName,
    directorEmail,
    setDirectorEmail,
}) => (
    <div className="space-y-4 animate-in fade-in duration-150">
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 leading-relaxed font-bold">
            💡 <strong>معلومة:</strong> إضافة مدير المدرسة هنا خطوة تنظيمية، ويمكنك في أي وقت إضافة المزيد من المشرفين والمعلمين من مركز مجتمع المدرسة بعد التأسيس.
        </div>
        <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5">
                اسم مدير / مسؤل المدرسة (اختياري)
            </label>
            <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="مثال: أ. عبدالله الغامدي"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
            />
        </div>
        <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5">
                البريد الإلكتروني للتواصل
            </label>
            <input
                type="email"
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                placeholder="director@school.edu.sa"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
            />
        </div>
    </div>
);

interface WizardStepQuickClassesProps {
    stage: string;
    classesList: string[];
    newClassNameInput: string;
    setNewClassNameInput: (val: string) => void;
    onAddCustomClass: () => void;
    onRemoveClass: (idx: number) => void;
    onGeneratePresetClasses: (stage: string) => void;
}

export const WizardStepQuickClasses: React.FC<WizardStepQuickClassesProps> = ({
    stage,
    classesList,
    newClassNameInput,
    setNewClassNameInput,
    onAddCustomClass,
    onRemoveClass,
    onGeneratePresetClasses,
}) => (
    <div className="space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
            <div>
                <h4 className="text-sm font-black text-gray-900">الفصول الدراسية المبدئية</h4>
                <p className="text-xs text-gray-500">سيتم إنشاء هذه الفصول تلقائياً وربطها بالمدرسة</p>
            </div>
            <button
                type="button"
                onClick={() => onGeneratePresetClasses(stage)}
                className="text-xs font-black text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors border border-indigo-200"
            >
                توليد فصول نموذجية ({stage}) ⚡
            </button>
        </div>

        <div className="flex gap-2">
            <input
                type="text"
                value={newClassNameInput}
                onChange={(e) => setNewClassNameInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onAddCustomClass();
                    }
                }}
                placeholder="اسم الفصل (مثال: ثاني ثانوي - ج)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
            />
            <button
                type="button"
                onClick={onAddCustomClass}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors"
            >
                إضافة فصل
            </button>
        </div>

        <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 space-y-2 max-h-56 overflow-y-auto">
            {classesList.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                    لم يتم إضافة فصول بعد. يمكنك تخطي هذه الخطوة وإضافتها لاحقاً.
                </div>
            ) : (
                classesList.map((className, idx) => (
                    <div
                        key={idx}
                        className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-gray-800 shadow-xs"
                    >
                        <div className="flex items-center gap-2">
                            <GraduationCap size={16} className="text-indigo-600" />
                            <span>{className}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemoveClass(idx)}
                            className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
    </div>
);
