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
    WizardStepQuickClasses,
} from './NewSchoolWizardSteps';
import { NewSchoolWizardLeadershipStep } from './NewSchoolWizardLeadershipStep';

interface NewSchoolWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchoolCreated: (school: Group) => void;
    createGroupAsync: (payload: any) => Promise<Group>;
    userId: string;
}

const normalizeGroupId = (group: Group) => group.id || (group as any)._id;
const normalizeUserId = (user: any) => String(user?.id || user?._id || '').trim();
const hasStrongTemporaryPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
    const [progressMessage, setProgressMessage] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [stage, setStage] = useState('ثانوي');
    const [city, setCity] = useState('الرياض');
    const [description, setDescription] = useState('');

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

    const [directorName, setDirectorName] = useState('');
    const [directorEmail, setDirectorEmail] = useState('');
    const [directorPassword, setDirectorPassword] = useState('');

    const [classesList, setClassesList] = useState<string[]>([
        'أول ثانوي - أ',
        'أول ثانوي - ب',
        'ثاني ثانوي - علمي أ',
        'ثاني ثانوي - علمي ب',
        'ثالث ثانوي - عام أ',
    ]);
    const [newClassNameInput, setNewClassNameInput] = useState('');

    // Provisioning checkpoint state. A retry continues the existing school instead of creating duplicates.
    const [provisionedSchool, setProvisionedSchool] = useState<Group | null>(null);
    const [contractProvisioned, setContractProvisioned] = useState(false);
    const [createdClassNames, setCreatedClassNames] = useState<string[]>([]);
    const [directorUserId, setDirectorUserId] = useState<string | null>(null);
    const [directorLinked, setDirectorLinked] = useState(false);

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

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        const plan = WIZARD_PLANS.find((item) => item.id === planId);
        if (plan) setModules(plan.defaultModules);
    };

    const toggleModule = (modId: string) => {
        if (modId === 'SCHOOL_CORE') return;
        setModules((current) => current.includes(modId)
            ? current.filter((moduleId) => moduleId !== modId)
            : [...current, modId]);
    };

    const handleAddCustomClass = () => {
        const trimmed = newClassNameInput.trim();
        if (trimmed && !classesList.includes(trimmed)) {
            setClassesList([...classesList, trimmed]);
            setNewClassNameInput('');
        }
    };

    const handleRemoveClass = (indexToRemove: number) => {
        const className = classesList[indexToRemove];
        if (createdClassNames.includes(className)) {
            setError('هذا الفصل تم إنشاؤه بالفعل على الخادم، لذلك لا يمكن حذفه من قائمة التأسيس هنا. يمكنك إدارته بعد فتح المدرسة.');
            return;
        }
        setClassesList(classesList.filter((_, index) => index !== indexToRemove));
    };

    const handleGeneratePresetClasses = (presetStage: string) => {
        if (createdClassNames.length > 0) {
            setError('تم إنشاء بعض الفصول بالفعل على الخادم. أكمل التأسيس الحالي ثم عدّل الفصول من مساحة المدرسة لتجنب التكرار.');
            return;
        }
        if (presetStage === 'ثانوي') {
            setClassesList(['أول ثانوي - 1', 'أول ثانوي - 2', 'ثاني ثانوي - 1', 'ثاني ثانوي - 2', 'ثالث ثانوي - 1', 'ثالث ثانوي - 2']);
        } else if (presetStage === 'متوسط') {
            setClassesList(['أول متوسط - 1', 'أول متوسط - 2', 'ثاني متوسط - 1', 'ثاني متوسط - 2', 'ثالث متوسط - 1', 'ثالث متوسط - 2']);
        } else {
            setClassesList(['فصل 1', 'فصل 2', 'فصل 3', 'فصل 4']);
        }
        setError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        if (provisionedSchool) onSchoolCreated(provisionedSchool);
        onClose();
    };

    const ensureSchool = async () => {
        if (provisionedSchool) return provisionedSchool;

        setProgressMessage('1/4 إنشاء سجل المدرسة على الخادم...');
        const created = await createGroupAsync({
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
                    status: 'active',
                },
            },
        });
        setProvisionedSchool(created);
        return created;
    };

    const ensureContract = async (schoolId: string) => {
        if (contractProvisioned) return;

        setProgressMessage('2/4 حفظ العقد والخدمات والتحقق منها...');
        const expectedModules = Array.from(new Set(['SCHOOL_CORE', ...modules]));
        const validFrom = new Date().toISOString();
        const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await api.updateSchoolContract(schoolId, {
            status: 'active',
            modules: expectedModules,
            validFrom,
            validUntil,
        });

        const verification = await api.getSchoolContract(schoolId);
        const contract = verification?.contract as any;
        if (!contract || contract.status !== 'active') {
            throw new Error('تم إنشاء المدرسة لكن تعذر تأكيد العقد النشط من الخادم. أعد المحاولة لإكمال نفس المدرسة.');
        }
        const verifiedModules = Array.isArray(contract.modules) ? contract.modules : [];
        const missingModule = expectedModules.find((moduleId) => !verifiedModules.includes(moduleId));
        if (missingModule) {
            throw new Error(`تم حفظ العقد لكن خدمة ${missingModule} لم تظهر عند إعادة القراءة. أعد المحاولة قبل التسليم.`);
        }
        setContractProvisioned(true);
    };

    const ensureClasses = async (schoolId: string) => {
        setProgressMessage('3/4 إنشاء الفصول المبدئية...');
        const completed = new Set(createdClassNames);
        const failures: string[] = [];

        for (const rawName of classesList) {
            const className = rawName.trim();
            if (!className || completed.has(className)) continue;
            try {
                await createGroupAsync({
                    name: className,
                    type: 'CLASS',
                    parentId: schoolId,
                    ownerId: userId || 'admin',
                    supervisorIds: [],
                    studentIds: [],
                    courseIds: [],
                    metadata: { description: `فصل في ${name.trim()}` },
                });
                completed.add(className);
                setCreatedClassNames(Array.from(completed));
            } catch {
                failures.push(className);
            }
        }

        if (failures.length > 0) {
            throw new Error(`تم إنشاء المدرسة والعقد، لكن تعذر إنشاء ${failures.length} فصل: ${failures.join('، ')}. أعد المحاولة وسيتم تخطي الفصول التي نجحت مسبقًا.`);
        }
    };

    const ensureDirector = async (schoolId: string) => {
        if (!directorRequested || directorLinked) return;

        setProgressMessage('4/4 إنشاء حساب مدير المدرسة وربط الصلاحيات...');
        let resolvedDirectorId = directorUserId;
        if (!resolvedDirectorId) {
            const response = await api.createAdminUser({
                name: directorName.trim(),
                email: directorEmail.trim().toLowerCase(),
                password: directorPassword,
                role: 'school_admin',
                schoolId,
                groupIds: [],
            });
            resolvedDirectorId = normalizeUserId((response as any)?.user);
            if (!resolvedDirectorId) {
                throw new Error('تم إنشاء المدرسة لكن الخادم لم يرجع معرّف حساب المدير. لم يتم اعتبار التأسيس مكتملًا.');
            }
            setDirectorUserId(resolvedDirectorId);
        }

        const access = await api.getSchoolDirectors(schoolId);
        const permissions = Array.isArray(access?.defaults) ? access.defaults : [];
        if (permissions.length === 0) {
            throw new Error('تعذر قراءة صلاحيات مدير المدرسة الافتراضية من الخادم. الحساب لم يُربط بصلاحيات ناقصة.');
        }

        await api.updateSchoolDirectorAccess(schoolId, resolvedDirectorId, {
            status: 'active',
            permissions,
        });

        const verified = await api.getSchoolDirectors(schoolId);
        const membership = (verified?.directors || []).find((item) => String(item.userId) === resolvedDirectorId);
        if (!membership || membership.status !== 'active') {
            throw new Error('تم إنشاء حساب المدير لكن تعذر تأكيد عضويته النشطة في المدرسة. أعد المحاولة لإكمال الربط فقط.');
        }
        setDirectorLinked(true);
    };

    const handleFinishWizard = async () => {
        if (!name.trim()) {
            setError('اسم المدرسة مطلوب للمتابعة');
            setStep(1);
            return;
        }
        const directorError = validateDirector();
        if (directorError) {
            setError(directorError);
            setStep(3);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setProgressMessage(null);

        try {
            const school = await ensureSchool();
            const schoolId = normalizeGroupId(school);
            if (!schoolId) throw new Error('تعذر قراءة معرّف المدرسة بعد الإنشاء.');

            await ensureContract(schoolId);
            await ensureClasses(schoolId);
            await ensureDirector(schoolId);

            setProgressMessage('اكتمل التأسيس وتم التحقق من العناصر الأساسية على الخادم.');
            onSchoolCreated(school);
            onClose();
        } catch (err: any) {
            setError(err.message || 'تعذر إكمال التأسيس. المدرسة التي تم إنشاؤها لن تُنشأ مرة ثانية عند إعادة المحاولة.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const goNext = () => {
        if (step === 1 && !name.trim()) {
            setError('يرجى إدخال اسم المدرسة');
            return;
        }
        if (step === 3) {
            const directorError = validateDirector();
            if (directorError) {
                setError(directorError);
                return;
            }
        }
        setError(null);
        setStep((current) => (current + 1) as 1 | 2 | 3 | 4);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-amber-300">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-bold mb-1">
                                <span>تشغيل المدارس والتعاقدات</span><span>/</span><span className="text-white font-bold">معالج التأسيس المتكامل</span>
                            </div>
                            <h3 className="text-lg font-black text-white">معالج تأسيس جهة تعليمية جديدة وتجهيز التعاقد</h3>
                            <p className="text-xs text-indigo-200 mt-0.5">أربع خطوات بخفظ خادمي حقيقي وقابل للاستكمال عند فشل أي مرحلة.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/10">
                        {[
                            { num: 1, label: 'البيانات الأساسية' },
                            { num: 2, label: 'الباقة والخدمات' },
                            { num: 3, label: 'القيادة والإشراف' },
                            { num: 4, label: 'الفصول المبدئية' },
                        ].map((item) => (
                            <div key={item.num} className={`text-center transition-all ${step === item.num ? 'opacity-100 font-black' : step > item.num ? 'opacity-80 text-emerald-300' : 'opacity-40'}`}>
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
                    {provisionedSchool && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-900">
                            تم إنشاء سجل المدرسة على الخادم. أي إعادة محاولة ستكمل هذا السجل نفسه ولن تنشئ مدرسة مكررة.
                        </div>
                    )}
                    {progressMessage && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                            {progressMessage}
                        </div>
                    )}
                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-6">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <WizardStepBasicInfo name={name} setName={setName} stage={stage} setStage={setStage} city={city} setCity={setCity} description={description} setDescription={setDescription} />
                    )}
                    {step === 2 && (
                        <WizardStepPlanAndModules selectedPlanId={selectedPlanId} onSelectPlan={handleSelectPlan} modules={modules} toggleModule={toggleModule} targetStudents={targetStudents} setTargetStudents={setTargetStudents} />
                    )}
                    {step === 3 && (
                        <NewSchoolWizardLeadershipStep
                            directorName={directorName}
                            setDirectorName={setDirectorName}
                            directorEmail={directorEmail}
                            setDirectorEmail={setDirectorEmail}
                            directorPassword={directorPassword}
                            setDirectorPassword={setDirectorPassword}
                        />
                    )}
                    {step === 4 && (
                        <WizardStepQuickClasses stage={stage} classesList={classesList} newClassNameInput={newClassNameInput} setNewClassNameInput={setNewClassNameInput} onAddCustomClass={handleAddCustomClass} onRemoveClass={handleRemoveClass} onGeneratePresetClasses={handleGeneratePresetClasses} />
                    )}
                </div>

                <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3 | 4)} disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-gray-700 hover:bg-slate-100 transition-colors disabled:opacity-50">
                            <ChevronRight size={16} /> السابق
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button type="button" onClick={goNext} disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50">
                            التالي <ChevronLeft size={16} />
                        </button>
                    ) : (
                        <button type="button" onClick={handleFinishWizard} disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60">
                            {isSubmitting ? 'جارٍ تنفيذ التأسيس والتحقق...' : <><Sparkles size={16} /> إتمام التأسيس والتحقق</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};