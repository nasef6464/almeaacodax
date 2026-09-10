import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Sparkles,
    X,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Group } from '../../../types';
import {
    WIZARD_PLANS,
    WizardStepBasicInfo,
    WizardStepPlanAndModules,
    WizardStepLeadership,
    WizardStepQuickClasses,
} from './NewSchoolWizardSteps';

interface NewSchoolWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchoolCreated: (school: Group) => void;
    createGroupAsync: (payload: any) => Promise<Group>;
    userId: string;
}

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
        const plan = WIZARD_PLANS.find((p) => p.id === planId);
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
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Top Header */}
                <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-amber-300">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">معالج تأسيس المدرسة الذكية</h3>
                            <p className="text-xs text-indigo-200 mt-0.5">
                                رحلة مبسطة من 4 خطوات لتسجيل وتفعيل المدرسة والفصول والخدمات فورياً
                            </p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/10">
                        {[
                            { num: 1, label: 'البيانات الأساسية' },
                            { num: 2, label: 'الباقة والخدمات' },
                            { num: 3, label: 'القيادة والإشراف' },
                            { num: 4, label: 'الفصول المبدئية' },
                        ].map((s) => (
                            <div
                                key={s.num}
                                className={`text-center transition-all ${
                                    step === s.num
                                        ? 'opacity-100 font-black'
                                        : step > s.num
                                        ? 'opacity-80 text-emerald-300'
                                        : 'opacity-40'
                                }`}
                            >
                                <div className="text-[11px] flex items-center justify-center gap-1">
                                    <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                                        step === s.num
                                            ? 'bg-amber-400 text-slate-950 font-black'
                                            : step > s.num
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/20 text-white'
                                    }`}>
                                        {step > s.num ? '✓' : s.num}
                                    </span>
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
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

                    {step === 1 && (
                        <WizardStepBasicInfo
                            name={name}
                            setName={setName}
                            stage={stage}
                            setStage={setStage}
                            city={city}
                            setCity={setCity}
                            description={description}
                            setDescription={setDescription}
                        />
                    )}

                    {step === 2 && (
                        <WizardStepPlanAndModules
                            selectedPlanId={selectedPlanId}
                            onSelectPlan={handleSelectPlan}
                            modules={modules}
                            toggleModule={toggleModule}
                            targetStudents={targetStudents}
                            setTargetStudents={setTargetStudents}
                        />
                    )}

                    {step === 3 && (
                        <WizardStepLeadership
                            directorName={directorName}
                            setDirectorName={setDirectorName}
                            directorEmail={directorEmail}
                            setDirectorEmail={setDirectorEmail}
                        />
                    )}

                    {step === 4 && (
                        <WizardStepQuickClasses
                            stage={stage}
                            classesList={classesList}
                            newClassNameInput={newClassNameInput}
                            setNewClassNameInput={setNewClassNameInput}
                            onAddCustomClass={handleAddCustomClass}
                            onRemoveClass={handleRemoveClass}
                            onGeneratePresetClasses={handleGeneratePresetClasses}
                        />
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
