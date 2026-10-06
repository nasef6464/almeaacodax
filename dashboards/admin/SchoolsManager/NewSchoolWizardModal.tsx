import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import type { Group } from '../../../types';
import {
    WIZARD_PLANS,
    WizardStepBasicInfo,
    WizardStepPlanAndModules,
    WizardStepQuickClasses,
} from './NewSchoolWizardSteps';
import { NewSchoolWizardLeadershipStep } from './NewSchoolWizardLeadershipStep';
import { useSchoolWizardProvisioning } from './useSchoolWizardProvisioning';

interface NewSchoolWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchoolCreated: (school: Group) => void;
    createGroupAsync: (payload: any) => Promise<Group>;
    userId: string;
}

type WizardStep = 1 | 2 | 3 | 4;

const hasStrongTemporaryPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const NewSchoolWizardModal: React.FC<NewSchoolWizardModalProps> = ({
    isOpen,
    onClose,
    onSchoolCreated,
    createGroupAsync,
    userId,
}) => {
    const [step, setStep] = useState<WizardStep>(1);
    const [name, setName] = useState('');
    const [stage, setStage] = useState('ثانوي');
    const [city, setCity] = useState('الرياض');
    const [description, setDescription] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState('smart_school');
    const [modules, setModules] = useState<string[]>([
        'SCHOOL_CORE', 'QUESTION_BANK', 'SCHOOL_ASSESSMENTS', 'SMART_CLASSROOM',
        'SCHOOL_INTELLIGENCE', 'INTERVENTION_CENTER', 'PATHS_AND_COURSES',
    ]);
    const [targetStudents, setTargetStudents] = useState(250);
    const [directorName, setDirectorName] = useState('');
    const [directorEmail, setDirectorEmail] = useState('');
    const [directorPassword, setDirectorPassword] = useState('');
    const [classesList, setClassesList] = useState<string[]>([
        'أول ثانوي - أ', 'أول ثانوي - ب', 'ثاني ثانوي - علمي أ',
        'ثاني ثانوي - علمي ب', 'ثالث ثانوي - عام أ',
    ]);
    const [newClassNameInput, setNewClassNameInput] = useState('');

    const provisioning = useSchoolWizardProvisioning({
        name, stage, city, description, targetStudents, modules, classesList,
        directorName, directorEmail, directorPassword, userId,
        createGroupAsync, onSchoolCreated, onClose,
    });

    if (!isOpen) return null;

    const directorRequested = Boolean(directorName.trim() || directorEmail.trim() || directorPassword);
    const validateDirector = () => {
        if (!directorRequested) return null;
        if (directorName.trim().length < 2) return 'أدخل اسم مدير المدرسة كاملًا أو اترك بيانات المدير كلها فارغة.';
        if (!isEmail(directorEmail)) return 'أدخل بريدًا إلكترونيًا صحيحًا لمدير المدرسة.';
        if (!hasStrongTemporaryPassword(directorPassword)) {
            return 'كلمة المرور المؤقتة للمدير يجب أن تكون 8 أحرف على الأقل وتحتوي حرفًا ورقمًا.';
        }
        return null;
    };

    const selectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        const plan = WIZARD_PLANS.find((item) => item.id === planId);
        if (plan) setModules(plan.defaultModules);
    };

    const toggleModule = (moduleId: string) => {
        if (moduleId === 'SCHOOL_CORE') return;
        setModules((current) => current.includes(moduleId)
            ? current.filter((item) => item !== moduleId)
            : [...current, moduleId]);
    };

    const addClass = () => {
        const className = newClassNameInput.trim();
        if (className && !classesList.includes(className)) {
            setClassesList((current) => [...current, className]);
            setNewClassNameInput('');
        }
    };

    const removeClass = (index: number) => {
        const className = classesList[index];
        if (provisioning.createdClassNames.includes(className)) {
            provisioning.setError('هذا الفصل تم إنشاؤه بالفعل على الخادم. أكمل التأسيس ثم عدّله من مساحة المدرسة.');
            return;
        }
        setClassesList((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const generatePresetClasses = (presetStage: string) => {
        if (provisioning.createdClassNames.length > 0) {
            provisioning.setError('تم إنشاء بعض الفصول بالفعل. أكمل التأسيس الحالي قبل إعادة توليد قائمة الفصول.');
            return;
        }
        setClassesList(presetStage === 'ثانوي'
            ? ['أول ثانوي - 1', 'أول ثانوي - 2', 'ثاني ثانوي - 1', 'ثاني ثانوي - 2', 'ثالث ثانوي - 1', 'ثالث ثانوي - 2']
            : presetStage === 'متوسط'
                ? ['أول متوسط - 1', 'أول متوسط - 2', 'ثاني متوسط - 1', 'ثاني متوسط - 2', 'ثالث متوسط - 1', 'ثالث متوسط - 2']
                : ['فصل 1', 'فصل 2', 'فصل 3', 'فصل 4']);
        provisioning.setError(null);
    };

    const next = () => {
        if (step === 1 && !name.trim()) {
            provisioning.setError('يرجى إدخال اسم المدرسة');
            return;
        }
        if (step === 3) {
            const directorError = validateDirector();
            if (directorError) {
                provisioning.setError(directorError);
                return;
            }
        }
        provisioning.setError(null);
        setStep((current) => (current + 1) as WizardStep);
    };

    const finish = async () => {
        if (!name.trim()) {
            provisioning.setError('اسم المدرسة مطلوب للمتابعة');
            setStep(1);
            return;
        }
        const directorError = validateDirector();
        if (directorError) {
            provisioning.setError(directorError);
            setStep(3);
            return;
        }
        await provisioning.finish();
    };

    const steps = [
        { num: 1, label: 'البيانات الأساسية' },
        { num: 2, label: 'الباقة والخدمات' },
        { num: 3, label: 'القيادة والإشراف' },
        { num: 4, label: 'الفصول المبدئية' },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
                    <button type="button" onClick={provisioning.close} disabled={provisioning.isSubmitting}
                        className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-amber-300"><Sparkles size={24} /></div>
                        <div>
                            <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-bold mb-1">
                                <span>تشغيل المدارس والتعاقدات</span><span>/</span><span className="text-white">معالج التأسيس المتكامل</span>
                            </div>
                            <h3 className="text-lg font-black">تأسيس جهة تعليمية جديدة وتجهيز التعاقد</h3>
                            <p className="text-xs text-indigo-200 mt-0.5">حفظ خادمي حقيقي وقابل للاستكمال عند فشل أي مرحلة.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/10">
                        {steps.map((item) => (
                            <div key={item.num} className={`text-center ${step === item.num ? 'opacity-100 font-black' : step > item.num ? 'opacity-80 text-emerald-300' : 'opacity-40'}`}>
                                <div className="text-[11px] flex items-center justify-center gap-1">
                                    <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${step === item.num ? 'bg-amber-400 text-slate-950 font-black' : step > item.num ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'}`}>
                                        {step > item.num ? '✓' : item.num}
                                    </span>
                                    <span className="hidden sm:inline">{item.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
                    {provisioning.provisionedSchool && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-900">
                            تم إنشاء سجل المدرسة على الخادم. إعادة المحاولة ستكمل نفس السجل ولن تنشئ مدرسة مكررة.
                        </div>
                    )}
                    {provisioning.progressMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{provisioning.progressMessage}</div>}
                    {provisioning.error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-6">{provisioning.error}</div>}

                    {step === 1 && <WizardStepBasicInfo name={name} setName={setName} stage={stage} setStage={setStage} city={city} setCity={setCity} description={description} setDescription={setDescription} />}
                    {step === 2 && <WizardStepPlanAndModules selectedPlanId={selectedPlanId} onSelectPlan={selectPlan} modules={modules} toggleModule={toggleModule} targetStudents={targetStudents} setTargetStudents={setTargetStudents} />}
                    {step === 3 && <NewSchoolWizardLeadershipStep directorName={directorName} setDirectorName={setDirectorName} directorEmail={directorEmail} setDirectorEmail={setDirectorEmail} directorPassword={directorPassword} setDirectorPassword={setDirectorPassword} />}
                    {step === 4 && <WizardStepQuickClasses stage={stage} classesList={classesList} newClassNameInput={newClassNameInput} setNewClassNameInput={setNewClassNameInput} onAddCustomClass={addClass} onRemoveClass={removeClass} onGeneratePresetClasses={generatePresetClasses} />}
                </div>

                <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((current) => (current - 1) as WizardStep)} disabled={provisioning.isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-gray-700 hover:bg-slate-100 disabled:opacity-50">
                            <ChevronRight size={16} /> السابق
                        </button>
                    ) : <div />}
                    {step < 4 ? (
                        <button type="button" onClick={next} disabled={provisioning.isSubmitting}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 disabled:opacity-50">
                            التالي <ChevronLeft size={16} />
                        </button>
                    ) : (
                        <button type="button" onClick={() => void finish()} disabled={provisioning.isSubmitting}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-600/25 disabled:opacity-60">
                            {provisioning.isSubmitting ? 'جارٍ تنفيذ التأسيس والتحقق...' : <><Sparkles size={16} /> إتمام التأسيس والتحقق</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
