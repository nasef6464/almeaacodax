import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign, ExternalLink, Eye, EyeOff, Landmark, LockKeyhole, Save, TrendingUp, Users, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';
import { PackageContentType, PaymentRequest, PaymentRequestStatus, PaymentSettings } from '../../types';

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
    const { users, groups, b2bPackages, accessCodes, courses, paths, subjects, lessons, quizzes, libraryItems, updateCourse } = useStore();
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
    const schoolPackageIds = useMemo(() => new Set(b2bPackages.map((pkg) => pkg.id)), [b2bPackages]);
    const publicPackages = useMemo(() => courses.filter((course) => course.isPackage), [courses]);
    const publicPackageIds = useMemo(() => new Set(publicPackages.map((pkg) => pkg.id)), [publicPackages]);
    const b2cPremiumUsers = useMemo(() => users.filter((user) => {
        const purchasedPackages = user.subscription?.purchasedPackages || [];
        const hasPublicPackage = purchasedPackages.some((packageId) => publicPackageIds.has(packageId));
        const hasOnlySchoolPackages = purchasedPackages.length > 0 && purchasedPackages.every((packageId) => schoolPackageIds.has(packageId));
        return hasPublicPackage || (user.subscription?.plan === 'premium' && !hasOnlySchoolPackages);
    }), [publicPackageIds, schoolPackageIds, users]);
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

    const contentTypeLabel = (type: PackageContentType) => {
        switch (type) {
            case 'courses':
                return 'الدورات';
            case 'foundation':
                return 'التأسيس';
            case 'banks':
                return 'التدريب';
            case 'tests':
                return 'الاختبارات';
            case 'library':
                return 'المكتبة';
            default:
                return 'كل المحتوى';
        }
    };

    const publicPackageRows = useMemo(() => {
        return publicPackages.map((pkg) => {
            const packageRequests = paymentRequests.filter((request) => (
                request.itemType === 'package' && (request.itemId === pkg.id || request.packageId === pkg.id)
            ));
            const approvedRequests = packageRequests.filter((request) => request.status === 'approved');
            const pendingRequests = packageRequests.filter((request) => request.status === 'pending');
            const purchasedUsers = users.filter((currentUser) => (currentUser.subscription?.purchasedPackages || []).includes(pkg.id));
            const contentTypes = pkg.packageContentTypes?.length ? pkg.packageContentTypes : ['all' as PackageContentType];
            const pathName = paths.find((path) => path.id === (pkg.pathId || pkg.category))?.name || 'عام';
            const subjectName = pkg.subjectId ? subjects.find((subject) => subject.id === pkg.subjectId)?.name : '';
            const coversAll = contentTypes.includes('all' as PackageContentType);
            const hasType = (type: PackageContentType) => coversAll || contentTypes.includes(type);
            const isInScope = (item: { pathId?: string; subjectId?: string }) => {
                const pathId = pkg.pathId || pkg.category;
                const subjectId = pkg.subjectId || pkg.subject;
                const pathMatches = !pathId || item.pathId === pathId;
                const subjectMatches = !subjectId || item.subjectId === subjectId;
                return pathMatches && subjectMatches;
            };
            const coverageCounts = {
                courses: courses.filter((course) => !course.isPackage && hasType('courses') && isInScope(course)).length,
                foundation: lessons.filter((lesson) => hasType('foundation') && isInScope(lesson)).length,
                banks: quizzes.filter((quiz) => hasType('banks') && quiz.type === 'bank' && isInScope(quiz)).length,
                tests: quizzes.filter((quiz) => hasType('tests') && quiz.type !== 'bank' && isInScope(quiz)).length,
                library: libraryItems.filter((item) => hasType('library') && isInScope(item)).length,
            };
            const coveredItems = coverageCounts.courses + coverageCounts.foundation + coverageCounts.banks + coverageCounts.tests + coverageCounts.library;
            const readinessWarnings = [
                pkg.price <= 0 ? 'السعر غير محدد' : '',
                !(pkg.pathId || pkg.category) ? 'غير مربوطة بمسار' : '',
                coveredItems === 0 ? 'لا يوجد محتوى داخل نطاق الباقة' : '',
                pkg.showOnPlatform !== false && pkg.isPublished === false ? 'ظاهرة لكن غير منشورة' : '',
                pkg.showOnPlatform !== false && pkg.approvalStatus && pkg.approvalStatus !== 'approved' ? 'تحتاج اعتماد قبل البيع' : '',
            ].filter(Boolean);

            return {
                id: pkg.id,
                title: pkg.title,
                pathId: pkg.pathId || pkg.category || '',
                subjectId: pkg.subjectId || pkg.subject || '',
                pathName,
                subjectName,
                price: pkg.price || 0,
                originalPrice: pkg.originalPrice || 0,
                isVisible: pkg.showOnPlatform !== false && pkg.isPublished !== false && (!pkg.approvalStatus || pkg.approvalStatus === 'approved'),
                contentTypes,
                requests: packageRequests.length,
                pending: pendingRequests.length,
                buyers: purchasedUsers.length,
                revenue: approvedRequests.reduce((sum, request) => sum + (request.amount || 0), 0),
                coverageCounts,
                coveredItems,
                readinessWarnings,
                isReadyForSale: readinessWarnings.length === 0,
            };
        }).sort((a, b) => Number(b.isVisible) - Number(a.isVisible) || b.revenue - a.revenue);
    }, [courses, lessons, libraryItems, paths, paymentRequests, publicPackages, quizzes, subjects, users]);

    const togglePublicPackageVisibility = (packageId: string) => {
        const pkg = publicPackages.find((item) => item.id === packageId);
        if (!pkg) return;

        const isCurrentlyVisible =
            pkg.showOnPlatform !== false &&
            pkg.isPublished !== false &&
            (!pkg.approvalStatus || pkg.approvalStatus === 'approved');
        const nextVisible = !isCurrentlyVisible;

        updateCourse(packageId, {
            showOnPlatform: nextVisible,
            isPublished: nextVisible,
            approvalStatus: nextVisible ? 'approved' : 'draft',
            approvedAt: nextVisible ? Date.now() : undefined,
        });
        setFeedback(nextVisible ? 'تم إظهار الباقة العامة للطلاب.' : 'تم إخفاء الباقة العامة مؤقتًا بدون حذفها.');
    };

    const previewPublicPackage = (packageId: string) => {
        const pkg = publicPackages.find((item) => item.id === packageId);
        if (!pkg) return;

        const pathId = pkg.pathId || pkg.category;
        if (!pathId) return;
        const subjectId = pkg.subjectId || pkg.subject || subjects.find((subject) => subject.pathId === pathId)?.id;
        const query = subjectId ? `?subject=${subjectId}&tab=courses&package=${pkg.id}` : `?package=${pkg.id}`;
        window.open(`/#/category/${pathId}${query}`, '_blank', 'noopener,noreferrer');
    };

    const packageCoverageRows = useMemo(() => {
        return b2bPackages.map((pkg) => {
            const packagePathIds = new Set(pkg.pathIds || []);
            const packageSubjectIds = new Set(pkg.subjectIds || []);
            const packageCourseIds = new Set(pkg.courseIds || []);
            const coversAll = (pkg.contentTypes || []).includes('all');
            const hasType = (type: PackageContentType) => coversAll || (pkg.contentTypes || []).includes(type);
            const isInScope = (item: { pathId?: string; subjectId?: string }) => {
                const pathMatches = packagePathIds.size === 0 || (item.pathId ? packagePathIds.has(item.pathId) : false);
                const subjectMatches = packageSubjectIds.size === 0 || (item.subjectId ? packageSubjectIds.has(item.subjectId) : false);
                return pathMatches && subjectMatches;
            };

            const scopedCourses = courses.filter((course) => packageCourseIds.has(course.id) || (hasType('courses') && isInScope(course)));
            const scopedLessons = lessons.filter((lesson) => hasType('foundation') && isInScope(lesson));
            const scopedTraining = quizzes.filter((quiz) => hasType('banks') && quiz.type === 'bank' && isInScope(quiz));
            const scopedTests = quizzes.filter((quiz) => hasType('tests') && quiz.type !== 'bank' && isInScope(quiz));
            const scopedLibrary = libraryItems.filter((item) => hasType('library') && isInScope(item));
            const packageCodes = accessCodes.filter((code) => code.packageId === pkg.id);
            const activePackageCodes = packageCodes.filter((code) => code.expiresAt > Date.now());
            const usedSeats = packageCodes.reduce((sum, code) => sum + (code.currentUses || 0), 0);
            const seatRate = pkg.maxStudents > 0 ? Math.min(Math.round((usedSeats / pkg.maxStudents) * 100), 100) : 0;
            const pathNames = (pkg.pathIds || [])
                .map((pathId) => paths.find((path) => path.id === pathId)?.name)
                .filter(Boolean);
            const subjectNames = (pkg.subjectIds || [])
                .map((subjectId) => subjects.find((subject) => subject.id === subjectId)?.name)
                .filter(Boolean);

            return {
                id: pkg.id,
                name: pkg.name,
                schoolName: groups.find((group) => group.id === pkg.schoolId)?.name || 'جهة تعليمية',
                status: pkg.status,
                type: pkg.type,
                discountPercentage: pkg.discountPercentage,
                maxStudents: pkg.maxStudents,
                usedSeats,
                seatRate,
                activeCodes: activePackageCodes.length,
                contentTypes: pkg.contentTypes || ['all'],
                pathNames,
                subjectNames,
                counts: {
                    courses: scopedCourses.length,
                    foundation: scopedLessons.length,
                    banks: scopedTraining.length,
                    tests: scopedTests.length,
                    library: scopedLibrary.length,
                },
            };
        }).sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.usedSeats - a.usedSeats);
    }, [accessCodes, b2bPackages, courses, groups, lessons, libraryItems, paths, quizzes, subjects]);

    const premiumRows = useMemo(() => {
        return b2cPremiumUsers.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email || '-',
            courses: user.subscription?.purchasedCourses?.length || 0,
            packages: (user.subscription?.purchasedPackages || []).filter((packageId) => publicPackageIds.has(packageId)).length,
            plan: user.subscription?.plan || 'free',
            status: user.isActive === false ? 'موقوف' : 'نشط',
        }));
    }, [b2cPremiumUsers, publicPackageIds]);

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
                <div className="space-y-6">
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

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">مراجعة تغطية الباقات والوصول</h2>
                                <p className="text-xs text-gray-500 mt-1">هذه اللوحة تساعدك تعرف الباقة تفتح أي مسارات ومواد ومحتوى قبل تسليمها لمدرسة أو مجموعة.</p>
                            </div>
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{packageCoverageRows.length} باقة</span>
                        </div>

                        <div className="grid gap-4">
                            {packageCoverageRows.map((pkg) => (
                                <div key={pkg.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-black text-gray-900">{pkg.name}</h3>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {pkg.status === 'active' ? 'نشطة' : 'منتهية'}
                                                </span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-600">{pkg.schoolName}</span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-600">
                                                    {pkg.type === 'free_access' ? 'فتح وصول' : `خصم ${pkg.discountPercentage || 0}%`}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {pkg.contentTypes.map((type) => (
                                                    <span key={type} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                                        <Eye size={12} />
                                                        {contentTypeLabel(type)}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                المسارات: {pkg.pathNames.length ? pkg.pathNames.join('، ') : 'كل المسارات حسب إعداد الباقة'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                المواد: {pkg.subjectNames.length ? pkg.subjectNames.join('، ') : 'كل المواد داخل المسار المحدد'}
                                            </div>
                                        </div>

                                        <div className="min-w-[220px] rounded-2xl bg-white p-4 shadow-sm">
                                            <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-600">
                                                <span>استخدام المقاعد</span>
                                                <span>{pkg.usedSeats}/{pkg.maxStudents || 0}</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pkg.seatRate}%` }} />
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500">{pkg.activeCodes} كود نشط لهذه الباقة</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                                        {[
                                            ['دورات', pkg.counts.courses],
                                            ['تأسيس', pkg.counts.foundation],
                                            ['تدريب', pkg.counts.banks],
                                            ['اختبارات', pkg.counts.tests],
                                            ['مكتبة', pkg.counts.library],
                                        ].map(([label, value]) => (
                                            <div key={label} className="rounded-2xl bg-white p-3 text-center">
                                                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                                    <LockKeyhole size={14} />
                                                </div>
                                                <p className="text-xs font-bold text-gray-500">{label}</p>
                                                <p className="text-lg font-black text-gray-900">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {packageCoverageRows.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                                    لا توجد باقات مدارس بعد. عند إنشاء باقة ستظهر هنا تغطيتها ونطاق الوصول الخاص بها.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'b2c' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">عروض الأفراد المعروضة على الموقع</h2>
                                <p className="text-xs text-gray-500 mt-1">هذه هي الباقات التي تظهر للطالب المستقل داخل صفحات المسارات، منفصلة تمامًا عن باقات المدارس.</p>
                            </div>
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{publicPackageRows.length} عرض</span>
                        </div>
                        <div className="grid gap-4">
                            {publicPackageRows.map((pkg) => (
                                <div key={pkg.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-black text-gray-900">{pkg.title}</h3>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${pkg.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                    {pkg.isVisible ? 'ظاهر للطلاب' : 'مخفي'}
                                                </span>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${pkg.isReadyForSale ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-100 text-amber-800'}`}>
                                                    {pkg.isReadyForSale ? 'جاهزة للبيع' : 'تحتاج ضبط'}
                                                </span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-600">{pkg.pathName}</span>
                                                {pkg.subjectName && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-600">{pkg.subjectName}</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {pkg.contentTypes.map((type) => (
                                                    <span key={type} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                                        <Eye size={12} />
                                                        {contentTypeLabel(type)}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-gray-600 sm:grid-cols-5">
                                                {[
                                                    ['دورات', pkg.coverageCounts.courses],
                                                    ['تأسيس', pkg.coverageCounts.foundation],
                                                    ['تدريب', pkg.coverageCounts.banks],
                                                    ['اختبارات', pkg.coverageCounts.tests],
                                                    ['مكتبة', pkg.coverageCounts.library],
                                                ].map(([label, value]) => (
                                                    <div key={label} className="rounded-xl bg-white px-3 py-2 text-center">
                                                        <span className="text-gray-400">{label}</span>
                                                        <span className="mx-1 text-gray-900">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {pkg.readinessWarnings.length > 0 && (
                                                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                                                    تنبيه قبل العرض: {pkg.readinessWarnings.join('، ')}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => previewPublicPackage(pkg.id)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <ExternalLink size={14} />
                                                    معاينة صفحة العرض
                                                </button>
                                                <button
                                                    onClick={() => togglePublicPackageVisibility(pkg.id)}
                                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                                                        pkg.isVisible
                                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {pkg.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    {pkg.isVisible ? 'إيقاف العرض مؤقتًا' : 'إظهار للطلاب'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
                                            <div className="rounded-2xl bg-white p-3 text-center">
                                                <p className="text-xs font-bold text-gray-500">السعر</p>
                                                <p className="text-lg font-black text-indigo-600">{settings.currency} {pkg.price.toLocaleString('en-US')}</p>
                                                {pkg.originalPrice > pkg.price && <p className="text-[11px] text-gray-400 line-through">{pkg.originalPrice.toLocaleString('en-US')}</p>}
                                            </div>
                                            <div className="rounded-2xl bg-white p-3 text-center">
                                                <p className="text-xs font-bold text-gray-500">طلبات معلقة</p>
                                                <p className="text-lg font-black text-amber-600">{pkg.pending}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white p-3 text-center">
                                                <p className="text-xs font-bold text-gray-500">مشتركون</p>
                                                <p className="text-lg font-black text-emerald-600">{pkg.buyers}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white p-3 text-center">
                                                <p className="text-xs font-bold text-gray-500">إيراد مثبت</p>
                                                <p className="text-lg font-black text-gray-900">{pkg.revenue.toLocaleString('en-US')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {publicPackageRows.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                                    لا توجد باقات عامة بعد. أنشئها من إدارة المسارات داخل تبويب الباقات الشاملة.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">طلاب الأفراد والمشتريات العامة</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4 font-medium">الاسم</th>
                                        <th className="p-4 font-medium">البريد</th>
                                        <th className="p-4 font-medium">الخطة</th>
                                        <th className="p-4 font-medium">الدورات</th>
                                        <th className="p-4 font-medium">الباقات العامة</th>
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
