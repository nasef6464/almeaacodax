import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { ChevronRight, LayoutGrid, Lock, Unlock } from 'lucide-react';
import { LearningSection } from '../components/LearningSection';
import { normalizePathId } from '../utils/normalizePathId';
import { PaymentModal } from '../components/PaymentModal';

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
    const path = paths.find(p => p.id === normalizedPathId);
    const pathLevels = levels?.filter(l => l.pathId === path?.id) || [];
    const pathSubjects = subjects.filter(s => s.pathId === path?.id);
    const pathSubjectIds = new Set(pathSubjects.map((subject) => subject.id));

    // Sync state with URL changes
    useEffect(() => {
        setSelectedLevelId(searchParams.get('level') || null);
        setSelectedSubjectId(searchParams.get('subject') || null);
    }, [searchParams]);

    const updateUrl = (levelId: string | null, subjectId: string | null, replace = false) => {
        const params = new URLSearchParams();
        if (levelId) params.set('level', levelId);
        if (subjectId) params.set('subject', subjectId);
        navigate(`/category/${normalizedPathId}?${params.toString()}`, { replace });
    };

    const handleLevelSelect = (levelId: string | null) => {
        updateUrl(levelId, null);
    };

    const handleSubjectSelect = (levelId: string | null, subjectId: string | null) => {
        updateUrl(levelId, subjectId);
    };

    useEffect(() => {
        if (pathId && normalizedPathId && pathId !== normalizedPathId) {
            navigate(`/category/${normalizedPathId}${window.location.search || ''}`, { replace: true });
        }
    }, [navigate, normalizedPathId, pathId]);

    useEffect(() => {
        if (pathLevels.length === 0) {
            if (selectedSubjectId && !pathSubjects.some((subject) => subject.id === selectedSubjectId)) {
                updateUrl(null, null, true);
                return;
            }
            if (!selectedLevelId && !selectedSubjectId && pathSubjects.length === 1) {
                updateUrl(null, pathSubjects[0].id, true);
                return;
            }
            if (selectedLevelId || selectedSubjectId) {
                updateUrl(null, null, true);
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
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-tight">المسار غير موجود</h2>
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
                    ? quizzes.filter((quiz) => quiz.type === 'bank' && canStudentSeeContent(quiz) && isWithinPackageScope(quiz, packageSubjectId)).length
                    : 0,
            },
            {
                label: 'اختبارات',
                count: shouldCount('tests')
                    ? quizzes.filter((quiz) => quiz.type !== 'bank' && canStudentSeeContent(quiz) && isWithinPackageScope(quiz, packageSubjectId)).length
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
    const getSubjectContentSummary = (subjectId: string) => {
        const matchesSubjectScope = (item: { pathId?: string; category?: string; subjectId?: string; subject?: string }) => {
            const itemPathId = item.pathId || item.category;
            const itemSubjectId = item.subjectId || item.subject;
            return itemPathId === path.id && itemSubjectId === subjectId;
        };
        const visibleCounts = {
            courses: courses.filter((course) => !course.isPackage && canStudentSeeContent(course) && matchesSubjectScope(course)).length,
            foundation: topics.filter((topic) => canStudentSeeContent(topic) && matchesSubjectScope(topic)).length,
            banks: quizzes.filter((quiz) => quiz.type === 'bank' && canStudentSeeContent(quiz) && matchesSubjectScope(quiz)).length,
            tests: quizzes.filter((quiz) => quiz.type !== 'bank' && canStudentSeeContent(quiz) && matchesSubjectScope(quiz)).length,
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
                <div 
                    key={s.id} 
                    className="p-8 bg-white border-2 border-gray-100 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl rounded-[2rem] shadow-sm group"
                    style={{ borderColor: sColor }}
                    onClick={() => handleSubjectSelect(levelId, s.id)}
                >
                    <div className="mb-4 inline-block p-4 rounded-2xl" style={{ backgroundColor: `${sColor}20` }}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3">{s.name}</h3>
                    <div className="text-gray-500 text-sm font-bold flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                    </div>
                    {footer}
                </div>
            );
        }

        if (iconStyle === 'minimal') {
            return (
                <div 
                    key={s.id} 
                    className="p-8 bg-gray-50 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white rounded-2xl group border border-transparent hover:border-gray-200"
                    onClick={() => handleSubjectSelect(levelId, s.id)}
                >
                    <div className="mb-3" style={{ color: sColor }}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">{s.name}</h3>
                    <div className="text-gray-400 text-xs flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span>
                    </div>
                    {footer}
                </div>
            );
        }

        if (iconStyle === 'playful') {
            return (
                <div 
                    key={s.id} 
                    className="p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[12px_12px_0px_#00000030] shadow-[8px_8px_0px_#00000020] text-white rounded-[2rem] border-4 border-white relative overflow-hidden group"
                    style={{ backgroundColor: sColor }}
                    onClick={() => handleSubjectSelect(levelId, s.id)}
                >
                    <div className="absolute top-2 right-2 text-white/30 transform rotate-12 text-5xl">✨</div>
                    <div className="mb-4 bg-white text-gray-800 p-4 rounded-full shadow-md inline-block group-hover:rotate-12 transition-transform">
                        {icon}
                    </div>
                    <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                    {footer}
                </div>
            );
        }

        return (
            <div 
                key={s.id} 
                className="p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl text-white rounded-[2rem] shadow-md"
                style={{ backgroundColor: sColor }}
                onClick={() => handleSubjectSelect(levelId, s.id)}
            >
                <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm inline-block shadow-sm">
                    {icon}
                </div>
                <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                <div className="text-white/80 text-sm font-bold flex gap-2 justify-center">
                    <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                </div>
                {footer}
            </div>
        );
    };

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
            const currentSubject = subjects.find(s => s.id === selectedSubjectId);
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
                        <LearningSection category={path.id} subject={selectedSubjectId} title={`${currentSubject?.name}`} colorTheme={(currentSubject?.color || style.color) as any} />
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
    const currentSubject = subjects.find(s => s.id === selectedSubjectId);
    
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
                <LearningSection category={path.id} subject={selectedSubjectId} title={`${currentSubject?.name}`} colorTheme={(currentSubject?.color || style.color) as any} />
            </div>
        </div>
    );
};
