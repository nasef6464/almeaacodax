import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Award, CheckCircle2, ChevronRight, CreditCard, LayoutGrid, Lock, Unlock } from 'lucide-react';
import { LearningSection } from '../components/LearningSection';
import { normalizePathId } from '../utils/normalizePathId';
import { PaymentModal } from '../components/PaymentModal';
import { isMockQuiz, isTrainingQuiz } from '../utils/quizPlacement';
import { getMockExamQuestionCount, getMockExamSections, getMockExamTimeLimit, isPathMockExam } from '../utils/mockExam';

const packageContentLabels: Record<string, { label: string; description: string }> = {
    courses: { label: 'الدورات', description: 'دورات المسار المسجلة.' },
    foundation: { label: 'التأسيس', description: 'الموضوعات والدروس التأسيسية.' },
    banks: { label: 'التدريب', description: 'تدريبات وبنوك أسئلة.' },
    tests: { label: 'الاختبارات', description: 'اختبارات محاكية وموجهة.' },
    library: { label: 'المكتبة', description: 'ملفات ومراجع داعمة.' },
    all: { label: 'شاملة', description: 'تفتح كل مساحات التعلم في هذا المسار.' },
};

const resolvePackageContentTypes = (pkg: { packageContentTypes?: string[] }) => {
    const contentTypes = pkg.packageContentTypes?.length ? pkg.packageContentTypes : ['all'];
    return contentTypes.includes('all') ? ['all'] : contentTypes;
};

const themeColorMap: Record<string, string> = {
    purple: '#7c3aed',
    blue: '#2563eb',
    emerald: '#10b981',
    amber: '#f59e0b',
    indigo: '#4f46e5',
    rose: '#f43f5e',
    teal: '#14b8a6',
    orange: '#f97316',
    gray: '#6b7280',
};

const resolveThemeColor = (value?: string, fallback = '#4f46e5') => {
    if (!value) return fallback;
    if (value.startsWith('#')) return value;
    return themeColorMap[value] || fallback;
};

const normalizeArabicLookup = (value?: string | null) =>
    (value || '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();

const legacyPathNameAliases: Record<string, string[]> = {
    p_qudrat: ['القدرات', 'قدرات'],
    p_tahsili: ['التحصيلي', 'تحصيلي'],
    p_nafes: ['نافس', 'اختبارات نافس', 'اختبارت نافس'],
    p_step: ['ستيب', 'step'],
};

const legacySubjectNameAliases: Record<string, string[]> = {
    sub_quant: ['الكمي', 'كمي'],
    sub_verbal: ['اللفظي', 'لفظي'],
    sub_math: ['الرياضيات', 'رياضيات'],
    sub_physics: ['الفيزياء', 'فيزياء'],
    sub_chemistry: ['الكيمياء', 'كيمياء'],
    sub_biology: ['الأحياء', 'الاحياء', 'احياء'],
};

const hasNameAlias = (name: string | undefined, aliases: string[]) => {
    const normalizedName = normalizeArabicLookup(name);
    return aliases.map(normalizeArabicLookup).some((alias) => normalizedName === alias || normalizedName.includes(alias));
};

export const GenericPathPage: React.FC = () => {
    const { pathId } = useParams<{ pathId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { paths, levels, subjects, user, courses, topics, quizzes, libraryItems, hasScopedPackageAccess } = useStore();

    const initialLevelId = searchParams.get('level') || null;
    const initialSubjectId = searchParams.get('subject') || null;

    const [selectedLevelId, setSelectedLevelId] = useState<string | null>(initialLevelId);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId);
    const [selectedPackageForPayment, setSelectedPackageForPayment] = useState<any | null>(null);
    const normalizedPathId = normalizePathId(pathId);
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user?.role || '');
    const isAdminViewer = user?.role === 'admin';
    const showPublicAdminDiagnostics = isAdminViewer && searchParams.get('adminDebug') === '1';
    const canSeeHiddenPaths = isStaffViewer;
    const directPath = paths.find(p => p.id === normalizedPathId);
    const aliasedPath = !directPath
        ? paths.find((p) => hasNameAlias(p.name, legacyPathNameAliases[normalizedPathId] || []))
        : null;
    const path = directPath || aliasedPath;
    const resolvedPathId = path?.id || normalizedPathId;
    const pathLevels = levels?.filter(l => l.pathId === path?.id) || [];
    const pathSubjects = subjects.filter(s => s.pathId === path?.id);
    const selectedSubject = selectedSubjectId ? pathSubjects.find((subject) => subject.id === selectedSubjectId) || null : null;
    const pathSubjectIds = new Set(pathSubjects.map((subject) => subject.id));
    const resolveSubjectId = (subjectId: string | null) => {
        if (!subjectId) return null;
        if (pathSubjects.some((subject) => subject.id === subjectId)) return subjectId;
        const aliases = legacySubjectNameAliases[subjectId] || [];
        return pathSubjects.find((subject) => hasNameAlias(subject.name, aliases))?.id || null;
    };

    // Sync state with URL changes
    useEffect(() => {
        setSelectedLevelId(searchParams.get('level') || null);
        setSelectedSubjectId(searchParams.get('subject') || null);
    }, [searchParams]);

    const updateUrl = (levelId: string | null, subjectId: string | null, replace = false) => {
        const params = new URLSearchParams();
        if (levelId) params.set('level', levelId);
        if (subjectId) params.set('subject', subjectId);
        navigate(`/category/${resolvedPathId}?${params.toString()}`, { replace });
    };

    const buildSubjectUrl = (levelId: string | null, subjectId: string) => {
        const params = new URLSearchParams();
        if (levelId) params.set('level', levelId);
        params.set('subject', subjectId);
        return `/category/${resolvedPathId}?${params.toString()}`;
    };

    const handleLevelSelect = (levelId: string | null) => {
        updateUrl(levelId, null);
    };

    const handleSubjectSelect = (levelId: string | null, subjectId: string | null) => {
        updateUrl(levelId, subjectId);
    };

    useEffect(() => {
        if (pathId && resolvedPathId && pathId !== resolvedPathId) {
            navigate(`/category/${resolvedPathId}${window.location.search || ''}`, { replace: true });
        }
    }, [navigate, pathId, resolvedPathId]);

    useEffect(() => {
        if (pathLevels.length === 0) {
            const resolvedSubjectId = resolveSubjectId(selectedSubjectId);
            if (selectedSubjectId && !resolvedSubjectId) {
                updateUrl(null, null, true);
                return;
            }
            if (selectedSubjectId && resolvedSubjectId !== selectedSubjectId) {
                updateUrl(null, resolvedSubjectId, true);
                return;
            }
            if (selectedLevelId) {
                updateUrl(null, selectedSubjectId, true);
            }
            return;
        }

        const validLevel = selectedLevelId ? pathLevels.find((level) => level.id === selectedLevelId) : null;
        if (selectedLevelId && !validLevel) {
            updateUrl(pathLevels[0].id, null, true);
            return;
        }

        if (!selectedLevelId && pathLevels.length === 1) {
            updateUrl(pathLevels[0].id, null, true);
            return;
        }

        if (selectedLevelId) {
            const validLevelSubjects = subjects.filter((subject) => subject.levelId === selectedLevelId && subject.pathId === path.id);
            if (!selectedSubjectId && validLevelSubjects.length === 1) {
                updateUrl(selectedLevelId, validLevelSubjects[0].id, true);
                return;
            }
            if (selectedSubjectId && !validLevelSubjects.some((subject) => subject.id === selectedSubjectId)) {
                updateUrl(selectedLevelId, null, true);
            }
        }
    }, [path?.id, pathLevels, selectedLevelId, selectedSubjectId, subjects]);
    
    if (!path || (!canSeeHiddenPaths && path.isActive === false)) {
        const visiblePathSuggestions = paths
            .filter((item) => (canSeeHiddenPaths || item.isActive !== false) && item.showInNavbar !== false)
            .slice(0, 6);

        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="w-full max-w-2xl text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-tight">المسار غير موجود</h2>
                    <p className="mx-auto mb-6 max-w-xl text-sm leading-7 text-gray-500">
                        قد يكون الرابط قديمًا أو أن المسار تغير من لوحة الإدارة. اختر مسارًا متاحًا الآن أو عد للوحة التحكم.
                    </p>
                    {visiblePathSuggestions.length > 0 ? (
                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {visiblePathSuggestions.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/category/${item.id}`}
                                    className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-black text-gray-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                    <button onClick={() => navigate('/dashboard')} className="text-indigo-600 hover:underline">
                        العودة للوحة التحكم
                    </button>
                </div>
            </div>
        );
    }

    const purchasedPackageIds = new Set(user.subscription?.purchasedPackages || []);
    const isPublicPackageVisible = (pkg: any) =>
        pkg.showOnPlatform !== false &&
        pkg.isPublished !== false &&
        (!pkg.approvalStatus || pkg.approvalStatus === 'approved');
    const pathPackages = courses.filter(
        c => (c.pathId || c.category) === path.id && c.isPackage && (canSeeHiddenPaths || isPublicPackageVisible(c)),
    );
    const isPackagesTab = searchParams.get('tab') === 'packages';
    const isMockExamsTab = searchParams.get('tab') === 'mock-exams';
    const canStudentSeeContent = (item: { showOnPlatform?: boolean; approvalStatus?: string; isPublished?: boolean }) =>
        canSeeHiddenPaths || (
            item.showOnPlatform !== false &&
            item.isPublished !== false &&
            (!item.approvalStatus || item.approvalStatus === 'approved')
        );
    const isWithinPackageScope = (
        item: { pathId?: string; subjectId?: string; category?: string; subject?: string },
        packageSubjectId?: string,
    ) => {
        const itemPathId = item.pathId || item.category;
        const itemSubjectId = item.subjectId || item.subject;
        const matchesPath = itemPathId ? itemPathId === path.id : !itemSubjectId || pathSubjectIds.has(itemSubjectId);
        const matchesSubject = !packageSubjectId || itemSubjectId === packageSubjectId;
        return matchesPath && matchesSubject;
    };
    const getPackageCoverage = (pkg: any, contentTypes: string[]) => {
        const includesAll = contentTypes.includes('all');
        const packageSubjectId = pkg.subjectId || pkg.subject;
        const shouldCount = (type: string) => includesAll || contentTypes.includes(type);
        const scopedCourses = courses.filter(
            (course) =>
                !course.isPackage &&
                canStudentSeeContent(course) &&
                isWithinPackageScope(course, packageSubjectId),
        );

        return [
            {
                label: 'دورات',
                count: shouldCount('courses') ? scopedCourses.length : 0,
            },
            {
                label: 'تأسيس',
                count: shouldCount('foundation')
                    ? topics.filter((topic) => canStudentSeeContent(topic) && isWithinPackageScope(topic, packageSubjectId)).length
                    : 0,
            },
            {
                label: 'تدريبات',
                count: shouldCount('banks')
                    ? quizzes.filter((quiz) => isTrainingQuiz(quiz) && canStudentSeeContent(quiz) && isWithinPackageScope(quiz, packageSubjectId)).length
                    : 0,
            },
            {
                label: 'اختبارات',
                count: shouldCount('tests')
                    ? quizzes.filter((quiz) => isMockQuiz(quiz) && canStudentSeeContent(quiz) && isWithinPackageScope(quiz, packageSubjectId)).length
                    : 0,
            },
            {
                label: 'مكتبة',
                count: shouldCount('library')
                    ? libraryItems.filter((item) => canStudentSeeContent(item) && isWithinPackageScope(item, packageSubjectId)).length
                    : 0,
            },
        ].filter((item) => item.count > 0);
    };
    const contentAccessRows = [
        { type: 'courses', label: 'الدورات' },
        { type: 'foundation', label: 'التأسيس' },
        { type: 'banks', label: 'التدريب' },
        { type: 'tests', label: 'الاختبارات' },
        { type: 'library', label: 'المكتبة' },
    ] as const;
    const pathMockQuizzes = quizzes
        .filter((quiz) => {
            return isPathMockExam(quiz, path.id) && canStudentSeeContent(quiz);
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const getSubjectContentSummary = (subjectId: string) => {
        const matchesSubjectScope = (item: { pathId?: string; category?: string; subjectId?: string; subject?: string }) => {
            const itemPathId = item.pathId || item.category;
            const itemSubjectId = item.subjectId || item.subject;
            return itemPathId === path.id && itemSubjectId === subjectId;
        };
        const visibleCounts = {
            courses: courses.filter((course) => !course.isPackage && canStudentSeeContent(course) && matchesSubjectScope(course)).length,
            foundation: topics.filter((topic) => canStudentSeeContent(topic) && matchesSubjectScope(topic)).length,
            banks: quizzes.filter((quiz) => isTrainingQuiz(quiz) && canStudentSeeContent(quiz) && matchesSubjectScope(quiz)).length,
            tests: quizzes.filter((quiz) => isMockQuiz(quiz) && canStudentSeeContent(quiz) && matchesSubjectScope(quiz)).length,
            library: libraryItems.filter((item) => canStudentSeeContent(item) && matchesSubjectScope(item)).length,
        };
        const unlockedRows = contentAccessRows.filter(({ type }) => hasScopedPackageAccess(type, path.id, subjectId));
        const lockedRows = contentAccessRows.filter(({ type }) => visibleCounts[type] > 0 && !hasScopedPackageAccess(type, path.id, subjectId));

        return {
            visibleCounts,
            unlockedRows,
            lockedRows,
            totalVisible: Object.values(visibleCounts).reduce((sum, count) => sum + count, 0),
        };
    };
    const isPackageActiveForCurrentUser = (pkg: any) => {
        if (canSeeHiddenPaths || purchasedPackageIds.has(pkg.id)) {
            return true;
        }

        const packageSubjectId = pkg.subjectId || pkg.subject;
        const contentTypes = resolvePackageContentTypes(pkg);
        const scopedTypes = contentTypes.includes('all') ? contentAccessRows.map((row) => row.type) : contentTypes;

        return scopedTypes.every((type) => hasScopedPackageAccess(type as any, path.id, packageSubjectId));
    };
    const getPackageStudentAccessNote = (pkg: any, contentTypes: string[]) => {
        const packageSubjectId = pkg.subjectId || pkg.subject;
        const packageSubjectName = packageSubjectId
            ? subjects.find((subject) => subject.id === packageSubjectId)?.name
            : '';
        const contentLabel = contentTypes.includes('all')
            ? 'كل مساحات التعلم'
            : contentTypes.map((type) => packageContentLabels[type]?.label || type).join(' + ');

        return packageSubjectName
            ? `هذه الباقة تفتح ${contentLabel} داخل مادة ${packageSubjectName} في مسار ${path.name}.`
            : `هذه الباقة تفتح ${contentLabel} داخل مسار ${path.name}.`;
    };
    const buildPaymentPackage = (pkg: any, contentTypes = resolvePackageContentTypes(pkg)) => {
        const packageSubjectId = pkg.subjectId || pkg.subject;
        return {
            ...pkg,
            packageId: pkg.id,
            purchaseType: 'package',
            contentTypes,
            packageContentTypes: contentTypes,
            pathIds: [path.id],
            subjectIds: packageSubjectId ? [packageSubjectId] : [],
            courseIds: [],
            accessContext: getPackageStudentAccessNote(pkg, contentTypes),
        };
    };
    const getSuggestedPackageForSubject = (subjectId: string, wantedTypes: readonly string[]) => {
        return pathPackages
            .filter((pkg) => canSeeHiddenPaths || isPublicPackageVisible(pkg))
            .filter((pkg) => {
                const packageSubjectId = pkg.subjectId || pkg.subject;
                const contentTypes = resolvePackageContentTypes(pkg);
                const matchesSubject = !packageSubjectId || packageSubjectId === subjectId;
                const matchesType = contentTypes.includes('all') || wantedTypes.some((type) => contentTypes.includes(type));
                return matchesSubject && matchesType;
            })
            .sort((a, b) => {
                const scorePackage = (pkg: any) => {
                    const packageSubjectId = pkg.subjectId || pkg.subject;
                    const contentTypes = resolvePackageContentTypes(pkg);
                    return (
                        (packageSubjectId === subjectId ? 8 : 0) +
                        (wantedTypes.some((type) => contentTypes.includes(type)) ? 4 : 0) +
                        (contentTypes.includes('all') ? 1 : 0)
                    );
                };
                return scorePackage(b) - scorePackage(a);
            })[0];
    };
    const renderPackagePaymentModal = () => (
        <PaymentModal
            isOpen={!!selectedPackageForPayment}
            onClose={() => setSelectedPackageForPayment(null)}
            item={selectedPackageForPayment || {}}
            type="package"
        />
    );
    const renderSubjectAccessGuide = (subjectId: string) => {
        if (isStaffViewer || showPublicAdminDiagnostics) return null;
        const summary = getSubjectContentSummary(subjectId);
        const availableRows = contentAccessRows
            .map((row) => ({
                ...row,
                count: summary.visibleCounts[row.type],
                isOpen: hasScopedPackageAccess(row.type, path.id, subjectId),
            }))
            .filter((row) => row.count > 0);

        if (availableRows.length === 0) return null;

        const lockedRows = availableRows.filter((row) => !row.isOpen);
        const suggestedPackage = lockedRows.length
            ? getSuggestedPackageForSubject(subjectId, lockedRows.map((row) => row.type))
            : null;
        const suggestedContentTypes = suggestedPackage ? resolvePackageContentTypes(suggestedPackage) : [];

        return (
            <Card className="mb-6 border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-xs font-black text-slate-500">حالة الوصول لهذه المادة</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {availableRows.map((row) => (
                                <span
                                    key={row.type}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
                                        row.isOpen
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                    }`}
                                >
                                    {row.isOpen ? <CheckCircle2 size={14} /> : <Lock size={14} />}
                                    {row.label}
                                    <span className="font-bold opacity-75">{row.isOpen ? 'مفتوح' : 'يحتاج باقة'}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {lockedRows.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (suggestedPackage) {
                                    setSelectedPackageForPayment(buildPaymentPackage(suggestedPackage, suggestedContentTypes));
                                    return;
                                }
                                navigate(`/category/${path.id}?tab=packages`);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-100 transition hover:bg-amber-600"
                        >
                            <CreditCard size={18} />
                            فتح المحتوى المقفول
                        </button>
                    ) : (
                        <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                            <Unlock size={18} />
                            كل المحتوى المنشور متاح لديك
                        </div>
                    )}
                </div>
            </Card>
        );
    };
    const pathOverview = {
        subjects: pathSubjects.length,
        packages: pathPackages.length,
        activePackages: pathPackages.filter((pkg) => isPackageActiveForCurrentUser(pkg)).length,
        openSubjects: pathSubjects.filter((subject) => getSubjectContentSummary(subject.id).lockedRows.length === 0).length,
    };
    const renderPathOverview = () => {
        if (!showPublicAdminDiagnostics) return null;

        return (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="text-xs font-black text-gray-500">مواد المسار</div>
                <div className="mt-2 text-3xl font-black text-gray-900">{pathOverview.subjects}</div>
                <div className="mt-2 text-xs font-bold text-gray-400">مهيأة للتوسع والإضافة</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="text-xs font-black text-gray-500">الباقات العامة</div>
                <div className="mt-2 text-3xl font-black text-gray-900">{pathOverview.packages}</div>
                <div className="mt-2 text-xs font-bold text-gray-400">المعروضة داخل هذا المسار</div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <div className="text-xs font-black text-emerald-700">باقات مفعلة لديك</div>
                <div className="mt-2 text-3xl font-black text-emerald-800">{pathOverview.activePackages}</div>
                <div className="mt-2 text-xs font-bold text-emerald-600">يتم احتسابها تلقائيًا</div>
            </div>
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
                <div className="text-xs font-black text-indigo-700">مواد مفتوحة بالكامل</div>
                <div className="mt-2 text-3xl font-black text-indigo-800">{pathOverview.openSubjects}</div>
                <div className="mt-2 text-xs font-bold text-indigo-600">بدون أجزاء مغلقة على الطالب</div>
            </div>
        </div>
        );
    };

    const style = {
        color: resolveThemeColor(path.color, '#4f46e5'),
        icon: path.iconUrl ? <img src={path.iconUrl} className="w-10 h-10 object-contain mx-auto mb-2" alt={path.name}/> : (path.icon || '🎓'),
    };

    const renderPackages = () => {
        if (pathPackages.length === 0) return null;
        if (!showPublicAdminDiagnostics) {
            return (
                <div className="mt-16 border-t border-gray-200 pt-16" id="packages">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4 leading-tight">العروض والباقات</h2>
                        <p className="text-gray-500">اختر الباقة المناسبة لك للبدء في مسار {path.name}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pathPackages.map(pkg => {
                            const contentTypes = resolvePackageContentTypes(pkg);
                            const packageIsActive = isPackageActiveForCurrentUser(pkg);
                            const packageSubjectId = pkg.subjectId || pkg.subject;
                            const packageAccessNote = getPackageStudentAccessNote(pkg, contentTypes);
                            const scopeLabel = contentTypes.includes('all')
                                ? 'باقة شاملة'
                                : `تشمل: ${contentTypes.map((type) => packageContentLabels[type]?.label).filter(Boolean).join(' + ')}`;

                            return (
                                <Card key={pkg.id} className="overflow-hidden border-2 border-transparent hover:border-amber-500 hover:shadow-xl transition-all cursor-pointer flex flex-col">
                                    <div className="bg-amber-500 text-white p-5 sm:p-6 text-center">
                                        <h3 className="text-xl sm:text-2xl font-black mb-2 leading-tight break-words">{pkg.title}</h3>
                                        <div className="text-2xl sm:text-3xl font-bold">{pkg.price} {pkg.currency}</div>
                                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                                            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">{scopeLabel}</span>
                                            {packageIsActive ? (
                                                <span className="inline-flex rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-black text-white">مفعلة لديك</span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6 flex-1 flex flex-col">
                                        <p className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                                            {packageIsActive
                                                ? 'هذه الباقة مفعلة لديك ويمكنك فتح محتواها مباشرة.'
                                                : packageAccessNote}
                                        </p>
                                        <ul className="mb-6 space-y-2 flex-1 text-sm text-gray-600">
                                            {(pkg.features || []).slice(0, 3).map((f, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (packageSubjectId) {
                                                    navigate(`/category/${path.id}?subject=${packageSubjectId}&tab=courses&package=${pkg.id}`);
                                                    return;
                                                }
                                                navigate(`/category/${path.id}?tab=packages&package=${pkg.id}`);
                                            }}
                                            className="mb-3 w-full rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                                        >
                                            معاينة الباقة
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!packageIsActive) {
                                                    setSelectedPackageForPayment({
                                                        ...pkg,
                                                        packageId: pkg.id,
                                                        purchaseType: 'package',
                                                        contentTypes,
                                                        packageContentTypes: contentTypes,
                                                        pathIds: [path.id],
                                                        subjectIds: packageSubjectId ? [packageSubjectId] : [],
                                                        courseIds: [],
                                                        accessContext: packageAccessNote,
                                                    });
                                                    return;
                                                }
                                                if (packageSubjectId) {
                                                    navigate(`/category/${path.id}?subject=${packageSubjectId}&tab=courses&package=${pkg.id}`);
                                                    return;
                                                }
                                                navigate(`/course/${pkg.id}`);
                                            }}
                                            className={`w-full rounded-xl py-3 font-bold transition-colors ${
                                                packageIsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-900 text-white hover:bg-black'
                                            }`}
                                        >
                                            {packageIsActive ? 'افتح محتوى الباقة' : 'اشترك الآن'}
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                    {renderPackagePaymentModal()}
                </div>
            );
        }
        return (
            <div className="mt-16 border-t border-gray-200 pt-16" id="packages">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4 leading-tight">العروض والباقات</h2>
                    <p className="text-gray-500">اختر الباقة الأنسب لك للبدء في مسار {path.name}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pathPackages.map(pkg => {
                        const contentTypes = resolvePackageContentTypes(pkg);
                        const packageCoverage = getPackageCoverage(pkg, contentTypes);
                        const packageIsActive = isPackageActiveForCurrentUser(pkg);
                        const packageSubjectId = pkg.subjectId || pkg.subject;
                        const packageAccessNote = getPackageStudentAccessNote(pkg, contentTypes);
                        const scopeLabel = contentTypes.includes('all')
                            ? 'باقة شاملة'
                            : `تشمل: ${contentTypes.map((type) => packageContentLabels[type]?.label).filter(Boolean).join(' + ')}`;

                        const paymentPackage = {
                            ...pkg,
                            packageId: pkg.id,
                            purchaseType: 'package',
                            contentTypes,
                            packageContentTypes: contentTypes,
                            pathIds: [path.id],
                            subjectIds: packageSubjectId ? [packageSubjectId] : [],
                            courseIds: [],
                            accessContext: packageAccessNote,
                        };

                        return (
                         <Card key={pkg.id} className="overflow-hidden border-2 border-transparent hover:border-amber-500 hover:shadow-xl transition-all cursor-pointer flex flex-col">
                             <div className="bg-amber-500 text-white p-5 sm:p-6 text-center">
                                 <h3 className="text-xl sm:text-2xl font-black mb-2 leading-tight break-words">{pkg.title}</h3>
                                 <div className="text-2xl sm:text-3xl font-bold">{pkg.price} {pkg.currency}</div>
                                 <div className="mt-3 flex flex-wrap justify-center gap-2">
                                     <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">{scopeLabel}</span>
                                     {packageIsActive ? (
                                         <span className="inline-flex rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-black text-white">مفعلة لديك</span>
                                     ) : null}
                                     {!isPublicPackageVisible(pkg) ? (
                                         <span className="inline-flex rounded-full bg-gray-900/40 px-3 py-1 text-xs font-black text-white">مخفية عن الطلاب</span>
                                     ) : null}
                                 </div>
                             </div>
                              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                                  <div className={`mb-5 rounded-2xl border px-4 py-3 text-xs font-bold leading-6 ${
                                      packageIsActive
                                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                          : 'border-slate-100 bg-slate-50 text-slate-600'
                                  }`}>
                                      {packageIsActive
                                          ? 'الوصول مفعل لهذا الحساب. يمكنك فتح محتوى الباقة مباشرة.'
                                          : packageAccessNote}
                                  </div>
                                  {packageCoverage.length > 0 ? (
                                      <div className="mb-5 rounded-2xl border border-amber-100 bg-white p-4">
                                          <div className="mb-3 text-xs font-black text-gray-500">ماذا تفتح هذه الباقة؟</div>
                                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                              {packageCoverage.map((item) => (
                                                  <div key={item.label} className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                                                      <div className="text-lg font-black text-amber-700">{item.count}</div>
                                                      <div className="text-[11px] font-bold text-amber-600">{item.label}</div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ) : null}
                                  <div className="mb-5 grid grid-cols-1 gap-2">
                                     {contentTypes.map((type) => {
                                         const meta = packageContentLabels[type] || { label: type, description: '' };
                                         return (
                                             <div key={type} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                                                 <div className="font-black text-amber-800">{meta.label}</div>
                                                 {meta.description ? <div className="mt-1 text-xs leading-5 text-amber-700">{meta.description}</div> : null}
                                             </div>
                                         );
                                     })}
                                 </div>
                                 <ul className="mb-6 space-y-3 flex-1">
                                     {pkg.features?.map((f, i) => (
                                         <li key={i} className="flex items-center gap-2 text-gray-600">
                                             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs">✓</div>
                                             {f}
                                         </li>
                                     ))}
                                 </ul>
                                 <button
                                     type="button"
                                     onClick={() => {
                                         if (packageSubjectId) {
                                             navigate(`/category/${path.id}?subject=${packageSubjectId}&tab=courses&package=${pkg.id}`);
                                             return;
                                         }
                                         navigate(`/category/${path.id}?tab=packages&package=${pkg.id}`);
                                     }}
                                     className="mb-3 w-full rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                                 >
                                     معاينة الباقة
                                 </button>
                                 <button
                                     onClick={() => {
                                         if (!packageIsActive) {
                                             setSelectedPackageForPayment(paymentPackage);
                                             return;
                                         }
                                         if (packageSubjectId) {
                                             navigate(`/category/${path.id}?subject=${packageSubjectId}&tab=courses&package=${pkg.id}`);
                                             return;
                                         }
                                         navigate(`/course/${pkg.id}`);
                                     }}
                                     className={`w-full rounded-xl py-3 font-bold transition-colors ${
                                         packageIsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-900 text-white hover:bg-black'
                                     }`}
                                 >
                                     {packageIsActive ? 'افتح محتوى الباقة' : 'اشترك الآن'}
                                 </button>
                             </div>
                         </Card>
                        );
                    })}
                </div>
                <PaymentModal
                    isOpen={!!selectedPackageForPayment}
                    onClose={() => setSelectedPackageForPayment(null)}
                    item={selectedPackageForPayment || {}}
                    type="package"
                />
            </div>
        );
    };

const renderSubjectCard = (s: any, levelId: string | null) => {
        const sColor = resolveThemeColor(s.color || style.color, style.color);
        const iconStyle = s.iconStyle || (path as any).iconStyle || 'default';
        const icon = s.iconUrl ? <img src={s.iconUrl} className="w-12 h-12 object-contain mx-auto" alt={s.name} /> : <div className="text-4xl">{s.icon || '📚'}</div>;
        const summary = getSubjectContentSummary(s.id);
        const topContentRows = showPublicAdminDiagnostics
            ? contentAccessRows
                .map((row) => ({ ...row, count: summary.visibleCounts[row.type] }))
                .filter((row) => row.count > 0)
                .slice(0, 3)
            : [];
        const hasLockedAreas = summary.lockedRows.length > 0;
        const footer = showPublicAdminDiagnostics ? (
            <>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                        hasLockedAreas ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {hasLockedAreas ? <Lock size={14} /> : <Unlock size={14} />}
                        {hasLockedAreas ? `يحتاج باقة في ${summary.lockedRows.length} مساحة` : 'مفتوحة بالكامل'}
                    </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {topContentRows.length > 0 ? topContentRows.map((row) => (
                        <div key={row.type} className="rounded-2xl bg-white/70 px-2 py-2 text-center text-xs font-black text-gray-700">
                            <div className="text-base text-gray-900">{row.count}</div>
                            <div>{row.label}</div>
                        </div>
                    )) : (
                        <div className="col-span-3 rounded-2xl bg-white/70 px-3 py-3 text-center text-xs font-bold text-gray-500">
                            لا توجد عناصر منشورة بعد في هذه المادة.
                        </div>
                    )}
                </div>
            </>
        ) : null;

        if (iconStyle === 'modern') {
            return (
                <Link
                    key={s.id} 
                    to={buildSubjectUrl(levelId, s.id)}
                    className="block p-8 bg-white border-2 border-gray-100 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl rounded-[2rem] shadow-sm group"
                    style={{ borderColor: sColor }}
                >
                    <div className="mb-4 inline-block p-4 rounded-2xl" style={{ backgroundColor: `${sColor}20` }}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3">{s.name}</h3>
                    <div className="text-gray-500 text-sm font-bold flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                    </div>
                    {footer}
                </Link>
            );
        }

        if (iconStyle === 'minimal') {
            return (
                <Link
                    key={s.id} 
                    to={buildSubjectUrl(levelId, s.id)}
                    className="block p-8 bg-gray-50 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white rounded-2xl group border border-transparent hover:border-gray-200"
                >
                    <div className="mb-3" style={{ color: sColor }}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">{s.name}</h3>
                    <div className="text-gray-400 text-xs flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span>
                    </div>
                    {footer}
                </Link>
            );
        }

        if (iconStyle === 'playful') {
            return (
                <Link
                    key={s.id} 
                    to={buildSubjectUrl(levelId, s.id)}
                    className="block p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[12px_12px_0px_#00000030] shadow-[8px_8px_0px_#00000020] text-white rounded-[2rem] border-4 border-white relative overflow-hidden group"
                    style={{ backgroundColor: sColor }}
                >
                    <div className="absolute top-2 right-2 text-white/30 transform rotate-12 text-5xl">✨</div>
                    <div className="mb-4 bg-white text-gray-800 p-4 rounded-full shadow-md inline-block group-hover:rotate-12 transition-transform">
                        {icon}
                    </div>
                    <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                    {footer}
                </Link>
            );
        }

        return (
            <Link
                key={s.id} 
                to={buildSubjectUrl(levelId, s.id)}
                className="block p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md"
                style={{ backgroundColor: sColor }}
            >
                <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm inline-block shadow-sm">
                    {icon}
                </div>
                <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                <div className="text-white/80 text-sm font-bold flex gap-2 justify-center">
                    <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                </div>
                {footer}
            </Link>
        );
    };

    const renderUnavailableSubjectState = (levelId: string | null) => {
        const fallbackSubjects = (levelId ? pathSubjects.filter((subject) => subject.levelId === levelId) : pathSubjects).slice(0, 6);

        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <header className="text-white py-14 text-center relative overflow-hidden" style={{ backgroundColor: style.color }}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(levelId, null, true)} className="flex items-center gap-2 justify-center mx-auto text-white/80 hover:text-white mb-5 transition-colors">
                            <ChevronRight size={20} /> عودة لصفحة المسار
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-black mb-3 leading-tight break-words">{path.name}</h1>
                        <p className="text-white/80 text-base sm:text-lg">هذه المادة غير متاحة الآن أو تم تغييرها من لوحة الإدارة</p>
                    </div>
                </header>

                <div className="max-w-4xl mx-auto px-4 py-10">
                    <div className="rounded-3xl border border-amber-100 bg-white p-6 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <LayoutGrid size={26} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">المادة غير موجودة داخل هذا المسار</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-500">
                            الرابط الذي فتحته يشير إلى مادة قديمة أو محذوفة. لم نعرض صفحة بيضاء، ويمكنك اختيار مادة متاحة الآن من نفس المسار.
                        </p>

                        {fallbackSubjects.length > 0 ? (
                            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {fallbackSubjects.map((subject) => (
                                    <Link
                                        key={subject.id}
                                        to={buildSubjectUrl(levelId, subject.id)}
                                        className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-black text-gray-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                    >
                                        {subject.name}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                                لا توجد مواد منشورة في هذا المسار حاليا.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (selectedSubjectId && !selectedSubject) {
        return renderUnavailableSubjectState(selectedLevelId);
    }

    // If tab=packages, scroll or only show packages
    if (isPackagesTab) {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <header className="text-white py-16 text-center relative overflow-hidden" style={{ backgroundColor: style.color }}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 justify-center mx-auto text-white/80 hover:text-white mb-6 transition-colors">
                            <ChevronRight size={20} /> عودة للمسار
                        </button>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">عروض وباقات {path.name}</h1>
                        <p className="text-white/80 text-lg">اختر الباقة الأنسب لك</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-8">
                    {renderPathOverview()}
                    {renderPackages()}
                    {pathPackages.length === 0 && <div className="text-center py-12 text-gray-500">لا توجد عروض حالياً.</div>}
                </div>
            </div>
        );
    }

    if (isMockExamsTab) {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <header className="text-white py-16 text-center relative overflow-hidden" style={{ backgroundColor: style.color }}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 justify-center mx-auto text-white/80 hover:text-white mb-6 transition-colors">
                            <ChevronRight size={20} /> عودة للمسار
                        </button>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
                            <Award size={28} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">الاختبارات المحاكية - {path.name}</h1>
                        <p className="mx-auto max-w-2xl text-white/80 text-base sm:text-lg leading-8">
                            تجربة كاملة على مستوى المسار، منفصلة عن اختبارات كل مادة.
                        </p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-8">
                    {pathMockQuizzes.length > 0 ? (
                        <div className="space-y-4">
                            {pathMockQuizzes.map((quiz) => {
                                const quizSubject = subjects.find((subject) => subject.id === quiz.subjectId);
                                const sectionCount = getMockExamSections(quiz).length;
                                return (
                                    <Card key={quiz.id} className="p-5 border border-gray-100 shadow-sm">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                    <Award size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-black text-gray-900">{quiz.title}</h2>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                                                        <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamQuestionCount(quiz)} سؤال</span>
                                                        <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamTimeLimit(quiz)} دقيقة</span>
                                                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{sectionCount > 1 ? `${sectionCount} أقسام` : (quizSubject?.name || 'مسار كامل')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                                                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                                            >
                                                ابدأ الاختبار
                                            </button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="p-8 text-center border-dashed border-2 border-gray-200">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Award size={26} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900">لا توجد اختبارات محاكية منشورة بعد</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-500">
                                عند إنشاء مركز المحاكيات المنفصل سيتم عرض اختبارات المسار هنا مباشرة.
                            </p>
                        </Card>
                    )}
                    {renderPackages()}
                </div>
            </div>
        );
    }

    // Scene 1: Path without levels -> directly display subjects
    if (pathLevels.length === 0) {
        if (!selectedSubjectId) {
            return (
                <div className="bg-gray-50 min-h-screen pb-20">
                    <header className="text-white py-16 text-center relative overflow-hidden" style={{ backgroundColor: style.color }}>
                        <div className="max-w-7xl mx-auto px-4 relative z-10">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">{path.name}</h1>
                            <p className="text-white/80 text-lg">تأسيس شامل، تدريب مكثف، واختبارات محاكية</p>
                        </div>
                    </header>
                    <div className="max-w-5xl mx-auto px-4 py-12">
                        {renderPathOverview()}
                        {pathSubjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Link
                                    to={`/category/${path.id}?tab=mock-exams`}
                                    className="block p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md bg-indigo-600"
                                >
                                    <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm inline-block shadow-sm">
                                        <Award size={34} />
                                    </div>
                                    <h3 className="text-3xl font-black mb-3">اختبارات محاكية</h3>
                                    <div className="text-white/80 text-sm font-bold">تجربة كاملة للمسار</div>
                                </Link>
                                <Link
                                    to={`/category/${path.id}?tab=packages`}
                                    className="block p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md bg-emerald-600"
                                >
                                    <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm inline-block shadow-sm">
                                        <CreditCard size={34} />
                                    </div>
                                    <h3 className="text-3xl font-black mb-3">عروض وباقات</h3>
                                    <div className="text-white/80 text-sm font-bold">فتح محتوى المسار</div>
                                </Link>
                                {pathSubjects.map(s => renderSubjectCard(s, null))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                لا توجد مواد حالياً في هذا المسار.
                            </div>
                        )}
                        {renderPackages()}
                    </div>
                </div>
            );
        } else {
            const currentSubject = selectedSubject;
            return (
                <div className="bg-gray-50 min-h-screen pb-20">
                    <header className="text-white py-12 relative overflow-hidden" style={{ backgroundColor: style.color }}>
                        <div className="max-w-7xl mx-auto px-4 relative z-10">
                            <button onClick={() => handleSubjectSelect(null, null)} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                                <ChevronRight size={20} /> عودة لصفحة المسار
                            </button>
                            <h1 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">{currentSubject?.name} - {path.name}</h1>
                            <p className="text-white/80">مساحة التعلم الخاصة بك</p>
                        </div>
                    </header>
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        {renderSubjectAccessGuide(selectedSubjectId)}
                        <LearningSection category={path.id} subject={selectedSubjectId} title={`${currentSubject?.name}`} colorTheme={(currentSubject?.color || style.color) as any} />
                        {renderPackagePaymentModal()}
                    </div>
                </div>
            );
        }
    }

    // Scene 2: Path WITH levels -> Show Levels first
    if (!selectedLevelId) {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                    <header className="text-white py-16 text-center relative overflow-hidden" style={{ backgroundColor: style.color }}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">{path.name}</h1>
                        <p className="text-white/80 text-lg">اختر المرحلة الدراسية للبدء</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-12">
                    {renderPathOverview()}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link
                            to={`/category/${path.id}?tab=mock-exams`}
                            className="block p-8 text-center cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md bg-indigo-600"
                        >
                            <Award size={34} className="mx-auto mb-4" />
                            <h3 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">اختبارات محاكية</h3>
                            <p className="text-white/80 font-medium text-sm">تجربة كاملة للمسار</p>
                        </Link>
                        <Link
                            to={`/category/${path.id}?tab=packages`}
                            className="block p-8 text-center cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md bg-emerald-600"
                        >
                            <CreditCard size={34} className="mx-auto mb-4" />
                            <h3 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">عروض وباقات</h3>
                            <p className="text-white/80 font-medium text-sm">فتح محتوى المسار</p>
                        </Link>
                        {pathLevels.map(level => {
                            return (
                                <div 
                                    key={level.id} 
                                    className="p-8 text-center cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md"
                                    style={{ backgroundColor: style.color }}
                                    onClick={() => handleLevelSelect(level.id)}
                                >
                                    <h3 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">{level.name}</h3>
                                    <p className="text-white/80 font-medium text-sm">مقررات وتأسيس المرحلة</p>
                                </div>
                            )
                        })}
                    </div>
                    {renderPackages()}
                </div>
            </div>
        );
    }

    // Scene 3: Level is selected -> display level subjects
    if (!selectedSubjectId) {
        const currentLevel = levels.find(l => l.id === selectedLevelId);
        const levelSubjects = subjects.filter(s => s.levelId === selectedLevelId && s.pathId === path.id);
        
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                    <header className="text-white py-12 relative overflow-hidden" style={{ backgroundColor: style.color }}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                            <ChevronRight size={20} /> عودة لصفحة المسار
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">{currentLevel?.name}</h1>
                        <p className="text-white/80">اختر المادة للبدء في التدريب</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-12">
                    {renderPathOverview()}
                    {levelSubjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {levelSubjects.map(s => renderSubjectCard(s, selectedLevelId))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            لا توجد مواد مرتبطة بهذه المرحلة بعد.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Scene 4: Subject selected within a level
    const currentLevel = levels.find(l => l.id === selectedLevelId);
    const currentSubject = selectedSubject;
    
    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <header className="text-white py-12 relative overflow-hidden" style={{ backgroundColor: style.color }}>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                        <ChevronRight size={20} /> عودة لصفحة المسار
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">{currentSubject?.name} - {currentLevel?.name}</h1>
                    <p className="text-white/80">تأسيس شامل، تدريب مكثف، واختبارات محاكية</p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {renderSubjectAccessGuide(selectedSubjectId)}
                <LearningSection category={path.id} subject={selectedSubjectId} title={`${currentSubject?.name}`} colorTheme={(currentSubject?.color || style.color) as any} />
                {renderPackagePaymentModal()}
            </div>
        </div>
    );
};
