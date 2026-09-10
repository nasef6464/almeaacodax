import React, { useState } from 'react';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';

interface NewSchoolWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchoolCreated: (school: Group) => void;
    createGroupAsync: (payload: any) => Promise<Group>;
    userId: string;
}

const PLANS = [
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

const ALL_MODULES = [
    { id: 'SMART_CLASSROOM', label: 'الفصول الذكية', desc: 'حصص تفاعلية، كونسول المعلم، وبروجيكتور' },
    { id: 'QUESTION_BANK', label: 'بنك الأسئلة الموحد', desc: 'مستودع الأسئلة الشامل للتدريب والاختبارات' },
    { id: 'SCHOOL_ASSESSMENTS', label: 'الاختبارات المدرسية', desc: 'اختبارات تشخيصية ودورية مخصصة' },
    { id: 'SCHOOL_INTELLIGENCE', label: 'ذكاء المدرسة والتحليلات', desc: 'خريطة المهارات وفصل نتائج المدرسة' },
    { id: 'INTERVENTION_CENTER', label: 'مركز التدخلات العلاجية', desc: 'خطط علاجية وتتبع التحسن قبل وبعد' },
    { id: 'PATHS_AND_COURSES', label: 'المسارات والمناهج', desc: 'ربط المواد ومسارات القدرات والتحصيلي' },
    { id: 'INTERACTIVE_VIDEO', label: 'الفيديو التفاعلي', desc: 'شروحات مع أسئلة مدمجة' },
    { id: 'EXECUTIVE_ANALYTICS', label: 'التقارير التنفيذية', desc: 'تقارير الإدارة وتحليل مؤشرات الإنجاز' },
];

export const NewSchoolWizardModal: React.FC<NewSchoolWizardModalProps> = ({
    isOpen,
    onClose,
    onSchoolCreated,
    createGroupAsync,
    userId,
}) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Basic Info
    const [name, setName] = useState('');
    const [stage, setStage] = useState('ثانوي');
    const [city, setCity] = useState('الرياض');
    const [description, setDescription] = useState('');

    // Step 2: Contract & Plan
    const [selectedPlanId, setSelectedPlanId] = useState('smart_school');
    const [modules, setModules] = useState<string[]>([
        'SCHOOL_CORE',
        'QUESTION_BANK',
        'SCHOOL_ASSESSMENTS',
        'SMART_CLASSROOM',
        'SCHOOL_INTELLIGENCE',
        'INTERVENTION_CENTER',
        'PATHS_AND_COURSES',
    ]);
    const [targetStudents, setTargetStudents] = useState<number>(250);

    // Step 3: School Leadership (Optional)
    const [directorName, setDirectorName] = useState('');
    const [directorEmail, setDirectorEmail] = useState('');

    // Step 4: Quick Classes
    const [classesList, setClassesList] = useState<string[]>([
        'أول ثانوي - أ',
        'أول ثانوي - ب',
        'ثاني ثانوي - علمي أ',
        'ثاني ثانوي - علمي ب',
        'ثالث ثانوي - عام أ',
    ]);
    const [newClassNameInput, setNewClassNameInput] = useState('');

    if (!isOpen) return null;

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        const plan = PLANS.find((p) => p.id === planId);
        if (plan) {
            setModules(plan.defaultModules);
        }
    };

    const toggleModule = (modId: string) => {
        if (modId === 'SCHOOL_CORE') return;
        setModules((current) =>
            current.includes(modId)
                ? current.filter((m) => m !== modId)
                : [...current, modId]
        );
    };

    const handleAddCustomClass = () => {
        const trimmed = newClassNameInput.trim();
        if (trimmed && !classesList.includes(trimmed)) {
            setClassesList([...classesList, trimmed]);
            setNewClassNameInput('');
        }
    };

    const handleRemoveClass = (indexToRemove: number) => {
        setClassesList(classesList.filter((_, idx) => idx !== indexToRemove));
    };

    const handleGeneratePresetClasses = (presetStage: string) => {
        if (presetStage === 'ثانوي') {
            setClassesList([
                'أول ثانوي - 1',
                'أول ثانوي - 2',
                'ثاني ثانوي - 1',
                'ثاني ثانوي - 2',
                'ثالث ثانوي - 1',
                'ثالث ثانوي - 2',
            ]);
        } else if (presetStage === 'متوسط') {
            setClassesList([
                'أول متوسط - 1',
                'أول متوسط - 2',
                'ثاني متوسط - 1',
                'ثاني متوسط - 2',
                'ثالث متوسط - 1',
                'ثالث متوسط - 2',
            ]);
        } else {
            setClassesList(['فصل 1', 'فصل 2', 'فصل 3', 'فصل 4']);
        }
    };

    const handleFinishWizard = async () => {
        if (!name.trim()) {
            setError('اسم المدرسة مطلوب للمتابعة');
            setStep(1);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Create the School Group
            const newSchool = await createGroupAsync({
                name: name.trim(),
                type: 'SCHOOL',
                ownerId: userId || 'admin',
                supervisorIds: [],
                studentIds: [],
                courseIds: [],
                metadata: {
                    description: description.trim(),
                    location: city.trim(),
                    settings: {
                        stage,
                        targetStudents,
                        directorName: directorName.trim(),
                        directorEmail: directorEmail.trim(),
                        status: 'active',
                    },
                },
            });

            const schoolId = newSchool.id || (newSchool as any)._id;

            // 2. Setup the Server Contract with the chosen modules
            try {
                await api.updateSchoolContract(schoolId, {
                    status: 'active',
                    modules: Array.from(new Set(['SCHOOL_CORE', ...modules])),
                    validFrom: new Date().toISOString(),
                    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                });
            } catch (contractErr) {
                console.warn('Contract setup non-critical error:', contractErr);
            }

            // 3. Create the initial classes
            if (classesList.length > 0) {
                for (const className of classesList) {
                    try {
                        await createGroupAsync({
                            name: className.trim(),
                            type: 'CLASS',
                            parentId: schoolId,
                            ownerId: userId || 'admin',
                            supervisorIds: [],
                            studentIds: [],
                            courseIds: [],
                            metadata: {
                                description: `فصل في ${name}`,
                            },
                        });
                    } catch (classErr) {
                        console.warn('Class creation error:', classErr);
                    }
                }
            }

            // Success: notify parent
            onSchoolCreated(newSchool);
            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء إنشاء المدرسة، يرجى المحاولة مرة أخرى.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black">معالج إنشاء وتجهيز المدرسة</h3>
                                <p className="text-xs text-slate-300">إعداد متكامل للهوية، الخدمات المفعلة، والعقد في خطوات بسيطة</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Steps Indicator */}
                    <div className="grid grid-cols-4 gap-2 mt-6">
                        {[
                            { s: 1, label: 'الهوية' },
                            { s: 2, label: 'الخدمات والعقد' },
                            { s: 3, label: 'القيادة' },
                            { s: 4, label: 'الفصول' },
                        ].map((item) => (
                            <div
                                key={item.s}
                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-all ${
                                    step === item.s
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : step > item.s
                                            ? 'bg-white/10 text-emerald-300'
                                            : 'bg-white/5 text-slate-400'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    step > item.s ? 'bg-emerald-500 text-white' : 'bg-white/20'
                                }`}>
                                    {step > item.s ? '✓' : item.s}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
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
                    )}

                    {/* Step 2: Contract & Plan */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in duration-150">
                            <div>
                                <h4 className="text-sm font-black text-gray-900 mb-1">اختر باقة العقد الأساسية</h4>
                                <p className="text-xs text-gray-500 mb-3">تحدد الباقة الميزات المفعلة تلقائياً للمدرسة في السيرفر</p>
                                
                                <div className="grid gap-3">
                                    {PLANS.map((plan) => (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => handleSelectPlan(plan.id)}
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
                                    {ALL_MODULES.map((mod) => (
                                        <label
                                            key={mod.id}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                                modules.includes(mod.id)
                                                    ? 'border-indigo-200 bg-indigo-50/40 text-indigo-900'
                                                    : 'border-slate-100 bg-slate-50/60 text-gray-600'
                                            }`}
                                        >
                                            <div>
                                                <div className="text-xs font-black">{mod.label}</div>
                                                <div className="text-[10px] text-gray-500">{mod.desc}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={modules.includes(mod.id)}
                                                onChange={() => toggleModule(mod.id)}
                                                className="w-4 h-4 accent-indigo-600 rounded"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-black text-gray-700 mb-1">
                                    سعة الطلاب التقديرية (مقاعد الباقة)
                                </label>
                                <input
                                    type="number"
                                    value={targetStudents}
                                    onChange={(e) => setTargetStudents(Number(e.target.value) || 0)}
                                    className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-gray-800"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: School Leadership */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-900 leading-5">
                                <p className="font-bold">اختياري:</p>
                                يمكنك تحديد بيانات مدير المدرسة أو المشرف الرئيسي الآن لإرسال الدعوة، أو تخطي هذه الخطوة وإسناد المشرفين لاحقاً من تبويب المجتمع المدرسي.
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1.5">
                                    اسم مدير المدرسة / المشرف الرئيسي
                                </label>
                                <input
                                    type="text"
                                    value={directorName}
                                    onChange={(e) => setDirectorName(e.target.value)}
                                    placeholder="مثال: أ. عبدالله المنصور"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1.5">
                                    البريد الإلكتروني للتواصل والدعوة
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
                    )}

                    {/* Step 4: Quick Classes */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">الفصول الدراسية المبدئية</h4>
                                    <p className="text-xs text-gray-500">سيتم إنشاء هذه الفصول تلقائياً وربطها بالمدرسة</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleGeneratePresetClasses(stage)}
                                    className="text-xs font-black text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors border border-indigo-200"
                                >
                                    توليد فصول نموذجية ({stage}) ⚡
                                </button>
                            </div>

                            {/* Class Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newClassNameInput}
                                    onChange={(e) => setNewClassNameInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomClass();
                                        }
                                    }}
                                    placeholder="اسم الفصل (مثال: ثاني ثانوي - ج)"
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomClass}
                                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors"
                                >
                                    إضافة فصل
                                </button>
                            </div>

                            {/* Classes List */}
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
                                                onClick={() => handleRemoveClass(idx)}
                                                className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => (s - 1) as any)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-gray-700 hover:bg-slate-100 transition-colors"
                        >
                            <ChevronRight size={16} /> السابق
                        </button>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex items-center gap-2">
                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 1 && !name.trim()) {
                                        setError('يرجى إدخال اسم المدرسة');
                                        return;
                                    }
                                    setError(null);
                                    setStep((s) => (s + 1) as any);
                                }}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all"
                            >
                                التالي <ChevronLeft size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleFinishWizard}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all"
                            >
                                {isSubmitting ? (
                                    <>جارٍ التجهيز والتفعيل...</>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        إتمام التجهيز وتفعيل المدرسة 🟢
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
