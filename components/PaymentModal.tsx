import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, CreditCard, Landmark, Lock, ShieldCheck, Wallet, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { PaymentMethodKey, PaymentSettings } from '../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    type?: 'course' | 'package' | 'skill' | 'test' | 'bank';
}

type PaymentPackageOption = {
    id: string;
    title: string;
    price?: number;
    currency?: string;
    description?: string;
    packageId?: string;
    purchaseType?: string;
    contentTypes?: string[];
    packageContentTypes?: string[];
    pathIds?: string[];
    subjectIds?: string[];
    includedCourseIds?: string[];
    courseIds?: string[];
    accessContext?: string;
};

const fallbackSettings: PaymentSettings = {
    key: 'default',
    currency: 'SAR',
    manualReviewRequired: true,
    card: {
        enabled: true,
        label: 'بطاقة بنكية',
        instructions: 'سيتم إرسال طلب دفع آمن ومراجعته من الإدارة قبل التفعيل.',
    },
    transfer: {
        enabled: true,
        label: 'تحويل بنكي',
        bankName: '',
        accountName: '',
        accountNumber: '',
        iban: '',
        instructions: '',
        publishDetailsToStudents: true,
    },
    wallet: {
        enabled: true,
        label: 'محفظة إلكترونية',
        providerName: '',
        phoneNumber: '',
        instructions: '',
        publishDetailsToStudents: true,
    },
    notes: '',
};

const packageContentLabels: Record<string, string> = {
    courses: 'الدورات',
    foundation: 'التأسيس',
    banks: 'التدريب',
    tests: 'الاختبارات',
    library: 'المكتبة',
    all: 'الباقة الشاملة',
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, item, type = 'course' }) => {
    const [step, setStep] = useState<'method' | 'details' | 'success'>('method');
    const [method, setMethod] = useState<PaymentMethodKey | null>(null);
    const [loading, setLoading] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settings, setSettings] = useState<PaymentSettings>(fallbackSettings);
    const [accessCode, setAccessCode] = useState('');
    const [accessCodeLoading, setAccessCodeLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [cardHolderName, setCardHolderName] = useState('');
    const [cardLast4, setCardLast4] = useState('');
    const [transferReference, setTransferReference] = useState('');
    const [walletNumber, setWalletNumber] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const { redeemAccessCode } = useStore();

    const packageOptions = useMemo<PaymentPackageOption[]>(() => {
        if (!Array.isArray(item?.packageOptions)) return [];
        return item.packageOptions.filter((option: PaymentPackageOption) => option?.id);
    }, [item]);

    const purchaseItem = useMemo(() => {
        if (!packageOptions.length) return item;
        return packageOptions.find((option) => option.id === selectedPackageId) || packageOptions[0] || item;
    }, [item, packageOptions, selectedPackageId]);

    useEffect(() => {
        if (!isOpen) return;
        setStep('method');
        setMethod(null);
        setLoading(false);
        setAccessCode('');
        setAccessCodeLoading(false);
        setActionError(null);
        setSuccessMessage(null);
        setCardHolderName('');
        setCardLast4('');
        setTransferReference('');
        setWalletNumber('');
        setReceiptUrl('');
        setNotes('');
        setDiscountCode('');
        setSelectedPackageId(Array.isArray(item?.packageOptions) && item.packageOptions[0]?.id ? item.packageOptions[0].id : '');
    }, [isOpen, item?.id, type]);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        const loadSettings = async () => {
            setSettingsLoading(true);
            try {
                const response = await api.getPaymentSettings();
                if (!cancelled && response) {
                    setSettings(response as PaymentSettings);
                }
            } catch {
                if (!cancelled) {
                    setSettings(fallbackSettings);
                }
            } finally {
                if (!cancelled) {
                    setSettingsLoading(false);
                }
            }
        };

        void loadSettings();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const enabledMethods = useMemo(
        () => (['card', 'transfer', 'wallet'] as PaymentMethodKey[]).filter((key) => settings[key]?.enabled),
        [settings],
    );

    if (!isOpen || !item) return null;

    const shouldPurchaseAsPackage =
        type === 'package' ||
        purchaseItem?.purchaseType === 'package' ||
        ((type === 'skill' || type === 'test' || type === 'bank') && (purchaseItem?.packageId || purchaseItem?.includedCourseIds?.length));

    const getTitle = () => {
        if (type === 'package') return 'الاشتراك في الباقة';
        if (type === 'skill') return 'فتح التأسيس';
        if (type === 'bank') return 'فتح التدريب';
        if (type === 'test') return 'فتح الاختبار';
        return 'الاشتراك في الدورة';
    };

    const getItemName = () => purchaseItem.title || purchaseItem.name || 'العنصر المحدد';
    const getPrice = () => purchaseItem.price || 0;
    const getCurrency = () => purchaseItem.currency || settings.currency || 'SAR';
    const itemContentTypes = Array.isArray(purchaseItem?.contentTypes) && purchaseItem.contentTypes.length
        ? purchaseItem.contentTypes
        : Array.isArray(purchaseItem?.packageContentTypes) && purchaseItem.packageContentTypes.length
            ? purchaseItem.packageContentTypes
            : shouldPurchaseAsPackage
                ? ['all']
                : [];
    const itemCoverageSummary = [
        purchaseItem?.includedCourseIds?.length || purchaseItem?.courseIds?.length ? { label: 'دورات مرفقة', value: purchaseItem?.includedCourseIds?.length || purchaseItem?.courseIds?.length } : null,
        purchaseItem?.pathIds?.length ? { label: 'مسارات مستهدفة', value: purchaseItem.pathIds.length } : null,
        purchaseItem?.subjectIds?.length ? { label: 'مواد مستهدفة', value: purchaseItem.subjectIds.length } : null,
    ].filter(Boolean) as { label: string; value: number }[];
    const scopeLabel = purchaseItem?.subjectIds?.length
        ? 'محتوى مادة محددة'
        : purchaseItem?.pathIds?.length
            ? 'محتوى مسار كامل'
            : shouldPurchaseAsPackage
                ? 'باقة عامة'
                : 'عنصر منفرد';
    const audienceLabel = shouldPurchaseAsPackage ? 'عرض شراء فردي' : 'تفعيل مباشر لهذا العنصر';
    const accessContext = typeof purchaseItem?.accessContext === 'string' ? purchaseItem.accessContext : '';

    const buildPaymentRequestPayload = () => {
        const packageId = purchaseItem.packageId || (shouldPurchaseAsPackage ? purchaseItem.id : undefined);
        const includedCourseIds = purchaseItem.includedCourseIds || purchaseItem.includedCourses || purchaseItem.courseIds || [];
        const extraNotes = [
            notes.trim(),
            discountCode.trim() ? `كود الخصم: ${discountCode.trim().toUpperCase()}` : '',
            method === 'card' && cardHolderName.trim() ? `اسم حامل البطاقة: ${cardHolderName.trim()}` : '',
            method === 'card' && cardLast4.trim() ? `آخر 4 أرقام: ${cardLast4.trim()}` : '',
        ].filter(Boolean).join(' | ');

        return {
            itemType: shouldPurchaseAsPackage ? 'package' : type === 'bank' ? 'test' : type,
            itemId: purchaseItem.id,
            itemName: getItemName(),
            packageId,
            includedCourseIds,
            amount: getPrice(),
            currency: getCurrency(),
            paymentMethod: method,
            transferReference: method === 'transfer' ? transferReference.trim() : '',
            walletNumber: method === 'wallet' ? walletNumber.trim() : '',
            receiptUrl: receiptUrl.trim(),
            discountCode: discountCode.trim().toUpperCase(),
            notes: extraNotes,
        };
    };

    const handlePayment = async () => {
        if (!method) return;

        if (method === 'transfer' && !transferReference.trim() && !receiptUrl.trim()) {
            setActionError('أدخل رقم مرجع التحويل أو رابط الإيصال حتى نراجع الطلب.');
            return;
        }

        if (method === 'wallet' && !walletNumber.trim()) {
            setActionError('أدخل رقم المحفظة أو رقم الجوال المرتبط بها.');
            return;
        }

        if (method === 'card' && !cardHolderName.trim()) {
            setActionError('أدخل اسم حامل البطاقة حتى نراجع الطلب.');
            return;
        }

        setLoading(true);
        setActionError(null);

        try {
            await api.createPaymentRequest(buildPaymentRequestPayload());
            setSuccessMessage(
                settings.manualReviewRequired
                    ? `تم إرسال طلب الدفع الخاص بـ ${getItemName()} بنجاح، وسيتم مراجعته من الإدارة ثم تفعيل الوصول على حسابك.`
                    : `تم تسجيل طلب الدفع الخاص بـ ${getItemName()} بنجاح.`,
            );
            setStep('success');
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'تعذر إرسال طلب الدفع الآن.');
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemAccessCode = async () => {
        if (!accessCode.trim()) {
            setActionError('أدخل كود التفعيل أولًا.');
            return;
        }

        setAccessCodeLoading(true);
        setActionError(null);

        try {
            await redeemAccessCode(accessCode.trim());
            setSuccessMessage('تم تفعيل الكود بنجاح وإضافة الباقة المرتبطة إلى حسابك.');
            setStep('success');
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'تعذر تفعيل الكود الآن.');
        } finally {
            setAccessCodeLoading(false);
        }
    };

    const selectMethod = (selectedMethod: PaymentMethodKey) => {
        setActionError(null);
        setMethod(selectedMethod);
        setStep('details');
    };

    const renderMethodButton = (
        selectedMethod: PaymentMethodKey,
        title: string,
        description: string,
        icon: React.ReactNode,
        iconClasses: string,
    ) => (
        <button
            onClick={() => selectMethod(selectedMethod)}
            className="w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${iconClasses}`}>{icon}</div>
                <div className="text-right">
                    <p className="font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
            <ChevronLeft size={20} className="text-gray-400" />
        </button>
    );

    const renderMethodSelector = () => (
        <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-black text-gray-800 mb-6 text-right">{getTitle()}</h3>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-right">
                <div className="text-xs font-black text-gray-500">العنصر الذي ستفعله</div>
                <div className="mt-2 text-lg font-black text-gray-900">{getItemName()}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{audienceLabel}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{scopeLabel}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {itemContentTypes.map((contentType: string) => (
                        <span key={contentType} className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">
                            {packageContentLabels[contentType] || contentType}
                        </span>
                    ))}
                </div>
                {itemCoverageSummary.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {itemCoverageSummary.map((entry) => (
                            <div key={entry.label} className="rounded-xl bg-white px-3 py-2 text-center">
                                <div className="text-base font-black text-gray-900">{entry.value}</div>
                                <div className="text-[11px] font-bold text-gray-500">{entry.label}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
                {accessContext ? (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
                        {accessContext}
                    </div>
                ) : null}
            </div>

            {packageOptions.length > 1 ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-right">
                    <div className="mb-3 text-sm font-black text-gray-900">اختر الباقة المناسبة</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {packageOptions.map((option) => {
                            const isSelected = option.id === (selectedPackageId || packageOptions[0]?.id);
                            const contentTypes = option.contentTypes?.length ? option.contentTypes : option.packageContentTypes || [];
                            const label = contentTypes.includes('all')
                                ? 'شاملة'
                                : contentTypes.map((contentType) => packageContentLabels[contentType] || contentType).join(' + ');

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedPackageId(option.id)}
                                    className={`rounded-2xl border px-4 py-3 text-right transition-all ${
                                        isSelected
                                            ? 'border-indigo-500 bg-white shadow-sm ring-2 ring-indigo-100'
                                            : 'border-white bg-white/70 hover:border-indigo-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-black text-gray-900">{option.title}</span>
                                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700">{label}</span>
                                    </div>
                                    <div className="mt-2 text-xs font-bold text-gray-500">{option.price || 0} {option.currency || getCurrency()}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-right">
                <div>
                    <p className="font-bold text-amber-900">لديك كود تفعيل؟</p>
                    <p className="text-xs text-amber-700 mt-1">فعّل الباقة أو الدورة مباشرة من نفس النافذة بدون خطوات دفع إضافية.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
                        placeholder="أدخل كود التفعيل"
                        className="flex-1 p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-400 outline-none font-mono"
                    />
                    <button
                        onClick={() => void handleRedeemAccessCode()}
                        disabled={accessCodeLoading}
                        className="bg-amber-500 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-60"
                    >
                        {accessCodeLoading ? 'جارٍ التفعيل...' : 'تفعيل الكود'}
                    </button>
                </div>
            </div>

            {settings.notes && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 text-right">{settings.notes}</div>}
            {actionError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">{actionError}</div>}
            {settingsLoading && <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 text-right">جارٍ تحميل إعدادات الدفع...</div>}
            {!settingsLoading && enabledMethods.length === 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
                    لا توجد وسيلة دفع مفعلة حاليًا. يمكنك استخدام كود تفعيل أو التواصل مع الإدارة.
                </div>
            )}

            {enabledMethods.includes('card') && renderMethodButton('card', settings.card.label || 'بطاقة بنكية', settings.card.instructions || 'إرسال طلب دفع ومراجعته من الإدارة أو تفعيل الدفع الآمن لاحقًا.', <CreditCard size={24} />, 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white')}
            {enabledMethods.includes('transfer') && renderMethodButton('transfer', settings.transfer.label || 'تحويل بنكي', settings.transfer.instructions || 'سجّل رقم المرجع أو أرفق رابط إيصال التحويل.', <Landmark size={24} />, 'bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white')}
            {enabledMethods.includes('wallet') && renderMethodButton('wallet', settings.wallet.label || 'محفظة إلكترونية', settings.wallet.instructions || 'أدخل رقم المحفظة أو الجوال المرتبط بها.', <Wallet size={24} />, 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white')}
        </div>
    );

    const renderDetails = () => (
        <div className="space-y-6 animate-fade-in text-right">
            <button className="flex items-center gap-2 text-indigo-600 mb-4" onClick={() => setStep('method')}>
                <ChevronLeft size={20} className="rotate-180" />
                <span className="font-bold text-sm">العودة لطرق الدفع</span>
            </button>

            {actionError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

            {method === 'card' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">طلب دفع بالبطاقة</h3>
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                        {settings.card.instructions || 'سيتم إرسال رابط دفع آمن أو مراجعة الطلب من الإدارة.'}
                    </div>
                    <input value={cardHolderName} onChange={(event) => setCardHolderName(event.target.value)} placeholder="اسم حامل البطاقة" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <input value={cardLast4} onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="آخر 4 أرقام من البطاقة (اختياري)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            )}

            {method === 'transfer' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">بيانات التحويل</h3>
                    <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-100">
                        {settings.transfer.bankName && <InfoRow label="اسم البنك" value={settings.transfer.bankName} />}
                        {settings.transfer.iban && <InfoRow label="رقم الآيبان (IBAN)" value={settings.transfer.iban} mono />}
                        {settings.transfer.accountName && <InfoRow label="اسم المستفيد" value={settings.transfer.accountName} />}
                        {settings.transfer.accountNumber && <InfoRow label="رقم الحساب" value={settings.transfer.accountNumber} />}
                    </div>
                    <input value={transferReference} onChange={(event) => setTransferReference(event.target.value)} placeholder="رقم مرجع التحويل أو العملية" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="رابط إيصال التحويل (اختياري)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            )}

            {method === 'wallet' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">الدفع عبر المحفظة</h3>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {settings.wallet.instructions || 'أدخل رقم المحفظة أو الجوال المرتبط بها ليتم مراجعة الطلب.'}
                    </div>
                    {settings.wallet.providerName && (
                        <div className="p-4 border-2 border-emerald-500 bg-emerald-50 rounded-xl text-center">
                            <p className="font-bold text-emerald-700">{settings.wallet.providerName}</p>
                            {settings.wallet.phoneNumber && <p className="text-xs text-emerald-500 mt-1">{settings.wallet.phoneNumber}</p>}
                        </div>
                    )}
                    <input value={walletNumber} onChange={(event) => setWalletNumber(event.target.value)} placeholder="رقم المحفظة / الجوال" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="رابط إيصال الدفع (اختياري)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            )}

            <input
                value={discountCode}
                onChange={(event) => setDiscountCode(event.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 40))}
                placeholder="كود خصم (اختياري)"
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="ملاحظات إضافية للإدارة (اختياري)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />

            <div className="pt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6 bg-gray-50 p-4 rounded-xl">
                    <span className="text-gray-500 font-bold">إجمالي المبلغ:</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600">{getPrice()} {getCurrency()}</span>
                </div>

                <button onClick={() => void handlePayment()} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جارٍ إرسال الطلب...
                        </>
                    ) : (
                        <>إرسال طلب الدفع <ShieldCheck size={20} /></>
                    )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-400 text-xs">
                    <Lock size={12} />
                    <span>المراجعة تتم من الإدارة قبل تفعيل الوصول</span>
                </div>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center py-12 animate-scale-up">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                <CheckCircle2 size={64} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 leading-tight">تم تسجيل الطلب بنجاح</h3>
            <p className="text-gray-500 mb-8 sm:mb-10 max-w-sm mx-auto leading-relaxed">
                {successMessage || `تم تسجيل طلب الدفع الخاص بـ ${getItemName()} وسيظهر في طلباتك لحين المراجعة.`}
            </p>
            <button onClick={onClose} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg">
                إغلاق
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
            <div className="bg-white w-full max-w-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-scale-up">
                <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10" aria-label="إغلاق">
                    <X size={20} />
                </button>
                <div className="p-5 sm:p-8 md:p-12">
                    {step === 'method' && renderMethodSelector()}
                    {step === 'details' && renderDetails()}
                    {step === 'success' && renderSuccess()}
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
    <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`font-bold text-gray-800 break-all ${mono ? 'font-mono text-indigo-600 text-lg' : ''}`}>{value}</p>
    </div>
);
