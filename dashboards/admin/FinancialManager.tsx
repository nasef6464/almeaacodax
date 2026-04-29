import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign, Landmark, Save, TrendingUp, Users, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';
import { PaymentRequest, PaymentRequestStatus, PaymentSettings } from '../../types';

type TransactionRow = {
    id: string;
    user: string;
    type: string;
    amount: string;
    date: string;
    status: string;
};

const BuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M12 6h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M8 14h.01"></path>
    </svg>
);

const defaultSettings: PaymentSettings = {
    key: 'default',
    currency: 'SAR',
    manualReviewRequired: true,
    card: { enabled: true, label: 'بطاقة بنكية', instructions: '' },
    transfer: { enabled: true, label: 'تحويل بنكي', bankName: '', accountName: '', accountNumber: '', iban: '', instructions: '', publishDetailsToStudents: true },
    wallet: { enabled: true, label: 'محفظة إلكترونية', providerName: '', phoneNumber: '', instructions: '', publishDetailsToStudents: true },
    notes: '',
};

export const FinancialManager: React.FC = () => {
    const { users, groups, b2bPackages, accessCodes, courses } = useStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'settings' | 'b2b' | 'b2c' | 'transactions'>('overview');
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadPaymentData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [settingsResponse, requestsResponse] = await Promise.all([
                    api.getPaymentSettings(),
                    api.getPaymentRequests(),
                ]);

                if (cancelled) return;
                setSettings(settingsResponse as PaymentSettings);
                setPaymentRequests(((requestsResponse as { requests?: PaymentRequest[] })?.requests || []).map((request) => ({
                    ...request,
                    id: String(request.id),
                    userId: String(request.userId),
                })));
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات المالية الآن.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadPaymentData();
        return () => {
            cancelled = true;
        };
    }, []);

    const schools = useMemo(() => groups.filter((group) => group.type === 'SCHOOL'), [groups]);
    const b2cPremiumUsers = useMemo(() => users.filter((user) => user.subscription?.plan === 'premium'), [users]);
    const activePackages = useMemo(() => b2bPackages.filter((pkg) => pkg.status === 'active'), [b2bPackages]);
    const activeCodes = useMemo(() => accessCodes.filter((code) => code.expiresAt > Date.now()), [accessCodes]);

    const estimatedB2BRevenue = useMemo(() => {
        return activePackages.reduce((sum, pkg) => {
            const courseValue = (pkg.courseIds || []).reduce((courseSum, courseId) => {
                const course = courses.find((item) => item.id === courseId);
                return courseSum + (course?.price || 0);
            }, 0);

            return sum + (courseValue * Math.max(pkg.maxStudents || 0, 0));
        }, 0);
    }, [activePackages, courses]);

    const estimatedB2CRevenue = b2cPremiumUsers.length * 199;
    const approvedRevenue = paymentRequests
        .filter((request) => request.status === 'approved')
        .reduce((sum, request) => sum + (request.amount || 0), 0);
    const pendingRevenue = paymentRequests
        .filter((request) => request.status === 'pending')
        .reduce((sum, request) => sum + (request.amount || 0), 0);
    const estimatedTotalRevenue = estimatedB2BRevenue + estimatedB2CRevenue + approvedRevenue;
    const totalCapacity = activePackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
    const totalCodeUsage = activeCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
    const utilizationRate = totalCapacity > 0 ? Math.round((totalCodeUsage / totalCapacity) * 100) : 0;
    const averageCustomerValue = users.length > 0 ? Math.round(estimatedTotalRevenue / users.length) : 0;

    const pendingRequestsCount = paymentRequests.filter((request) => request.status === 'pending').length;
    const pendingPaymentRequests = useMemo(
        () => paymentRequests.filter((request) => request.status === 'pending'),
        [paymentRequests],
    );
    const reviewedPaymentRequests = useMemo(
        () => paymentRequests.filter((request) => request.status !== 'pending'),
        [paymentRequests],
    );

    const kpis = [
        {
            label: 'الإيرادات المثبتة + التقديرية',
            value: `${settings.currency} ${estimatedTotalRevenue.toLocaleString('en-US')}`,
            trend: `${pendingRequestsCount} طلب بانتظار المراجعة`,
            isPositive: true,
            icon: <DollarSign size={24} />,
        },
        {
            label: 'إجمالي طلبات الدفع المعلقة',
            value: `${pendingRequestsCount}`,
            trend: `${settings.currency} ${pendingRevenue.toLocaleString('en-US')} قيد المراجعة`,
            isPositive: pendingRequestsCount > 0,
            icon: <CreditCard size={24} />,
        },
        {
            label: 'باقات المدارس (B2B)',
            value: `${b2bPackages.length}`,
            trend: `${schools.length} جهة تعليمية`,
            isPositive: true,
            icon: <BuildingIcon />,
        },
        {
            label: 'متوسط قيمة العميل',
            value: `${settings.currency} ${averageCustomerValue.toLocaleString('en-US')}`,
            trend: `${utilizationRate}% معدل الاستخدام`,
            isPositive: utilizationRate >= 50,
            icon: <TrendingUp size={24} />,
        },
    ];

    const requestStatusLabel = (status: PaymentRequestStatus) => {
        switch (status) {
            case 'approved':
                return 'معتمد';
            case 'rejected':
                return 'مرفوض';
            case 'cancelled':
                return 'ملغي';
            default:
                return 'بانتظار المراجعة';
        }
    };

    const requestStatusClasses = (status: PaymentRequestStatus) => {
        switch (status) {
            case 'approved':
                return 'bg-emerald-100 text-emerald-700';
            case 'rejected':
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-amber-100 text-amber-700';
        }
    };

    const recentTransactions = useMemo<TransactionRow[]>(() => {
        const requestTransactions = paymentRequests.slice(0, 8).map((request) => ({
            id: request.id,
            user: request.userName || request.userEmail || 'مستخدم',
            type: `طلب ${request.itemType === 'package' ? 'باقة' : request.itemType === 'course' ? 'دورة' : request.itemType === 'test' ? 'اختبار' : 'مهارة'}`,
            amount: `${request.currency} ${request.amount.toLocaleString('en-US')}`,
            date: new Date(request.createdAt || Date.now()).toLocaleDateString('ar-SA'),
            status: requestStatusLabel(request.status),
        }));

        const schoolTransactions = activePackages.slice(0, 6).map((pkg) => ({
            id: `B2B-${pkg.id}`,
            user: groups.find((group) => group.id === pkg.schoolId)?.name || 'جهة تعليمية',
            type: `B2B (${pkg.name})`,
            amount: `${settings.currency} ${((pkg.maxStudents || 0) * 99).toLocaleString('en-US')}`,
            date: new Date(pkg.createdAt).toLocaleDateString('ar-SA'),
            status: pkg.status === 'active' ? 'نشط' : 'منتهي',
        }));

        return [...requestTransactions, ...schoolTransactions].slice(0, 10);
    }, [paymentRequests, activePackages, groups, settings.currency]);

    const schoolRows = useMemo(() => {
        return schools.map((school) => {
            const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === school.id);
            const schoolCodes = accessCodes.filter((code) => code.schoolId === school.id);
            const activeSchoolCodes = schoolCodes.filter((code) => code.expiresAt > Date.now());
            const estimatedValue = schoolPackages.reduce((sum, pkg) => sum + ((pkg.maxStudents || 0) * 99), 0);
            const totalCapacity = schoolPackages.reduce((sum, pkg) => sum + (pkg.maxStudents || 0), 0);
            const usedSeats = schoolCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);

            return {
                id: school.id,
                name: school.name,
                packages: schoolPackages.length,
                activeCodes: activeSchoolCodes.length,
                estimatedValue,
                usedSeats,
                totalCapacity,
            };
        }).sort((a, b) => b.estimatedValue - a.estimatedValue);
    }, [accessCodes, b2bPackages, schools]);

    const premiumRows = useMemo(() => {
        return b2cPremiumUsers.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email || '-',
            courses: user.subscription?.purchasedCourses?.length || 0,
            packages: user.subscription?.purchasedPackages?.length || 0,
            plan: user.subscription?.plan || 'free',
            status: user.isActive === false ? 'موقوف' : 'نشط',
        }));
    }, [b2cPremiumUsers]);

    const saveSettings = async () => {
        setLoading(true);
        setError(null);
        setFeedback(null);
        try {
            const updated = await api.updatePaymentSettings(settings);
            setSettings(updated as PaymentSettings);
            setFeedback('تم حفظ إعدادات الدفع بنجاح.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ إعدادات الدفع.');
        } finally {
            setLoading(false);
        }
    };

    const reviewRequest = async (requestId: string, status: PaymentRequestStatus) => {
        setRequestActionLoading(requestId);
        setError(null);
        setFeedback(null);
        try {
            const response = await api.reviewPaymentRequest(requestId, {
                status,
                reviewerNotes: status === 'approved' ? 'تمت المراجعة والاعتماد من الإدارة.' : 'تمت مراجعة الطلب من الإدارة.',
            });
            const updatedRequest = (response as { request?: PaymentRequest }).request;
            if (updatedRequest) {
                setPaymentRequests((current) => current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request)));
            }
            setFeedback(status === 'approved' ? 'تم اعتماد الطلب وتفعيل الوصول على الحساب.' : 'تم تحديث حالة الطلب.');
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'تعذر تحديث حالة الطلب.');
        } finally {
            setRequestActionLoading(null);
        }
    };

    const updateMethodSettings = (method: 'card' | 'transfer' | 'wallet', field: string, value: string | boolean) => {
        setSettings((current) => ({
            ...current,
            [method]: {
                ...current[method],
                [field]: value,
            },
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المالية والاشتراكات</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة الإيرادات، طلبات الدفع، الباقات، وإعدادات وسائل الدفع على المنصة.</p>
                </div>
            </div>

            {(error || feedback) && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {error || feedback}
                </div>
            )}

            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {[
                    { id: 'overview', label: 'نظرة عامة' },
                    { id: 'requests', label: 'طلبات الدفع' },
                    { id: 'settings', label: 'إعدادات الدفع' },
                    { id: 'b2c', label: 'اشتراكات الأفراد' },
                    { id: 'b2b', label: 'باقات المدارس' },
                    { id: 'transactions', label: 'سجل العمليات' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        {kpi.icon}
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${kpi.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                                        {kpi.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {kpi.trend}
                                    </div>
                                </div>
                                <h3 className="text-gray-500 text-sm font-medium mb-1">{kpi.label}</h3>
                                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">أحدث طلبات الدفع</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4 font-medium">رقم الطلب</th>
                                        <th className="p-4 font-medium">العميل</th>
                                        <th className="p-4 font-medium">النوع</th>
                                        <th className="p-4 font-medium">المبلغ</th>
                                        <th className="p-4 font-medium">التاريخ</th>
                                        <th className="p-4 font-medium">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.map((trx) => (
                                        <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{trx.id}</td>
                                            <td className="p-4 text-gray-800">{trx.user}</td>
                                            <td className="p-4 text-gray-600">{trx.type}</td>
                                            <td className="p-4 font-bold text-indigo-600">{trx.amount}</td>
                                            <td className="p-4 text-gray-500">{trx.date}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    trx.status === 'معتمد' || trx.status === 'نشط'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : trx.status === 'بانتظار المراجعة'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {trx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">طلبات الدفع المرسلة من الطلاب</h2>
                            <p className="text-xs text-gray-500 mt-1">الطلبات المعلقة تظهر أولًا حتى لا تضيع وسط السجل القديم.</p>
                        </div>
                        <span className="text-sm text-gray-500">{pendingRequestsCount} بانتظار المراجعة / {paymentRequests.length} إجمالي</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">الطالب</th>
                                    <th className="p-4 font-medium">العنصر</th>
                                    <th className="p-4 font-medium">الطريقة</th>
                                    <th className="p-4 font-medium">المبلغ</th>
                                    <th className="p-4 font-medium">الحالة</th>
                                    <th className="p-4 font-medium">التفاصيل</th>
                                    <th className="p-4 font-medium">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[...pendingPaymentRequests, ...reviewedPaymentRequests].map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50 transition-colors align-top">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{request.userName || 'طالب'}</div>
                                            <div className="text-xs text-gray-500">{request.userEmail}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{request.itemName}</div>
                                            <div className="text-xs text-gray-500">{request.itemType}</div>
                                        </td>
                                        <td className="p-4 text-gray-600">{request.paymentMethod}</td>
                                        <td className="p-4 font-bold text-indigo-600">{request.currency} {request.amount.toLocaleString('en-US')}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${requestStatusClasses(request.status)}`}>
                                                {requestStatusLabel(request.status)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-500 space-y-1">
                                            {request.transferReference && <div>مرجع التحويل: {request.transferReference}</div>}
                                            {request.walletNumber && <div>رقم المحفظة: {request.walletNumber}</div>}
                                            {request.receiptUrl && (
                                                <a href={request.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                                    فتح الإيصال
                                                </a>
                                            )}
                                            {request.notes && <div>{request.notes}</div>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                <button
                                                    onClick={() => void reviewRequest(request.id, 'approved')}
                                                    disabled={requestActionLoading === request.id || request.status !== 'pending'}
                                                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                                                >
                                                    اعتماد
                                                </button>
                                                <button
                                                    onClick={() => void reviewRequest(request.id, 'rejected')}
                                                    disabled={requestActionLoading === request.id || request.status !== 'pending'}
                                                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    رفض
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">إعدادات وسائل الدفع</h2>
                            <button
                                onClick={() => void saveSettings()}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Save size={16} />
                                حفظ
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-bold text-gray-700">العملة</label>
                                <input
                                    value={settings.currency}
                                    onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))}
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <label className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-bold text-gray-800">مراجعة يدوية قبل التفعيل</p>
                                    <p className="text-xs text-gray-500 mt-1">إذا كانت مفعلة فلن يتم فتح الوصول إلا بعد اعتماد الإدارة.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.manualReviewRequired}
                                    onChange={(event) => setSettings((current) => ({ ...current, manualReviewRequired: event.target.checked }))}
                                    className="h-5 w-5"
                                />
                            </label>
                        </div>

                        {([
                            ['card', 'الدفع بالبطاقة', CreditCard],
                            ['transfer', 'التحويل البنكي', Landmark],
                            ['wallet', 'المحفظة الإلكترونية', Wallet],
                        ] as const).map(([method, title, Icon]) => (
                            <div key={method} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-white p-3 text-indigo-600 shadow-sm">
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{title}</h3>
                                            <p className="text-xs text-gray-500">يمكنك تعديل النصوص والبيانات المنشورة للطلاب.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings[method].enabled}
                                        onChange={(event) => updateMethodSettings(method, 'enabled', event.target.checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">الاسم الظاهر</label>
                                        <input
                                            value={settings[method].label || ''}
                                            onChange={(event) => updateMethodSettings(method, 'label', event.target.value)}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {method === 'transfer' && (
                                        <>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">اسم البنك</label>
                                                <input
                                                    value={settings.transfer.bankName || ''}
                                                    onChange={(event) => updateMethodSettings('transfer', 'bankName', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">اسم المستفيد</label>
                                                <input
                                                    value={settings.transfer.accountName || ''}
                                                    onChange={(event) => updateMethodSettings('transfer', 'accountName', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">رقم الحساب</label>
                                                <input
                                                    value={settings.transfer.accountNumber || ''}
                                                    onChange={(event) => updateMethodSettings('transfer', 'accountNumber', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">الآيبان</label>
                                                <input
                                                    value={settings.transfer.iban || ''}
                                                    onChange={(event) => updateMethodSettings('transfer', 'iban', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </>
                                    )}
                                    {method === 'wallet' && (
                                        <>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">اسم المزود</label>
                                                <input
                                                    value={settings.wallet.providerName || ''}
                                                    onChange={(event) => updateMethodSettings('wallet', 'providerName', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-700">رقم الجوال</label>
                                                <input
                                                    value={settings.wallet.phoneNumber || ''}
                                                    onChange={(event) => updateMethodSettings('wallet', 'phoneNumber', event.target.value)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700">تعليمات الطلب</label>
                                    <textarea
                                        value={settings[method].instructions || ''}
                                        onChange={(event) => updateMethodSettings(method, 'instructions', event.target.value)}
                                        rows={3}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit">
                        <h2 className="text-lg font-bold text-gray-900">ملخص الدفع الحالي</h2>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">طلبات معتمدة</p>
                            <p className="text-2xl font-black text-emerald-600">{settings.currency} {approvedRevenue.toLocaleString('en-US')}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">طلبات بانتظار المراجعة</p>
                            <p className="text-2xl font-black text-amber-600">{settings.currency} {pendingRevenue.toLocaleString('en-US')}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">وضع المراجعة</p>
                            <p className="text-lg font-bold text-gray-900">{settings.manualReviewRequired ? 'مراجعة يدوية مفعلة' : 'مراجعة يدوية معطلة'}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'b2b' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">المدارس والجهات المتعاقدة</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">الجهة</th>
                                    <th className="p-4 font-medium">الباقات</th>
                                    <th className="p-4 font-medium">الأكواد النشطة</th>
                                    <th className="p-4 font-medium">استخدام المقاعد</th>
                                    <th className="p-4 font-medium">القيمة التقديرية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {schoolRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{row.name}</td>
                                        <td className="p-4 text-gray-600">{row.packages}</td>
                                        <td className="p-4 text-gray-600">{row.activeCodes}</td>
                                        <td className="p-4 text-gray-600">{row.usedSeats}/{row.totalCapacity || 0}</td>
                                        <td className="p-4 font-bold text-indigo-600">{settings.currency} {row.estimatedValue.toLocaleString('en-US')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'b2c' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">اشتراكات الأفراد</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">الاسم</th>
                                    <th className="p-4 font-medium">البريد</th>
                                    <th className="p-4 font-medium">الخطة</th>
                                    <th className="p-4 font-medium">الدورات</th>
                                    <th className="p-4 font-medium">الباقات</th>
                                    <th className="p-4 font-medium">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {premiumRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{row.name}</td>
                                        <td className="p-4 text-gray-600">{row.email}</td>
                                        <td className="p-4 text-gray-600">{row.plan === 'premium' ? 'بريميوم' : 'مجاني'}</td>
                                        <td className="p-4 text-gray-600">{row.courses}</td>
                                        <td className="p-4 text-gray-600">{row.packages}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'نشط' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">سجل العمليات</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">رقم العملية</th>
                                    <th className="p-4 font-medium">العميل</th>
                                    <th className="p-4 font-medium">النوع</th>
                                    <th className="p-4 font-medium">القيمة</th>
                                    <th className="p-4 font-medium">التاريخ</th>
                                    <th className="p-4 font-medium">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentTransactions.map((trx) => (
                                    <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{trx.id}</td>
                                        <td className="p-4 text-gray-800">{trx.user}</td>
                                        <td className="p-4 text-gray-600">{trx.type}</td>
                                        <td className="p-4 font-bold text-indigo-600">{trx.amount}</td>
                                        <td className="p-4 text-gray-500">{trx.date}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                trx.status === 'معتمد' || trx.status === 'نشط'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : trx.status === 'بانتظار المراجعة'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-700'
                                            }`}>
                                                {trx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
