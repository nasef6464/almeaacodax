import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { LearningSection } from '../components/LearningSection';
import { normalizePathId } from '../utils/normalizePathId';

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

export const GenericPathPage: React.FC = () => {
    const { pathId } = useParams<{ pathId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { paths, levels, subjects, user, courses } = useStore();

    const initialLevelId = searchParams.get('level') || null;
    const initialSubjectId = searchParams.get('subject') || null;

    const [selectedLevelId, setSelectedLevelId] = useState<string | null>(initialLevelId);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId);
    const normalizedPathId = normalizePathId(pathId);

    // Sync state with URL changes
    useEffect(() => {
        setSelectedLevelId(searchParams.get('level') || null);
        setSelectedSubjectId(searchParams.get('subject') || null);
    }, [searchParams]);

    const updateUrl = (levelId: string | null, subjectId: string | null) => {
        const params = new URLSearchParams();
        if (levelId) params.set('level', levelId);
        if (subjectId) params.set('subject', subjectId);
        navigate(`/category/${normalizedPathId}?${params.toString()}`);
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

    const canSeeHiddenPaths = ['admin', 'teacher', 'supervisor'].includes(user?.role || '');
    const path = paths.find(p => p.id === normalizedPathId);
    
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

    const pathLevels = levels?.filter(l => l.pathId === path.id) || [];
    const pathSubjects = subjects.filter(s => s.pathId === path.id);
    const pathPackages = courses.filter(
        c => (c.pathId || c.category) === path.id && c.isPackage && (canSeeHiddenPaths || c.showOnPlatform !== false),
    );
    const isPackagesTab = searchParams.get('tab') === 'packages';

    const getPathStyle = () => {
        const c = path.color || 'indigo';
        const isHex = c.startsWith('#');
        return { 
            color: c, 
            bg: isHex ? '' : `bg-${c}-600`, 
            inlineBg: isHex ? { backgroundColor: c } : {},
            icon: path.iconUrl ? <img src={path.iconUrl} className="w-10 h-10 object-contain mx-auto mb-2" alt={path.name}/> : (path.icon || '🎓') 
        };
    };

    const style = getPathStyle();

    const renderPackages = () => {
        if (pathPackages.length === 0) return null;
        return (
            <div className="mt-16 border-t border-gray-200 pt-16" id="packages">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4 leading-tight">العروض والباقات</h2>
                    <p className="text-gray-500">اختر الباقة الأنسب لك للبدء في مسار {path.name}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pathPackages.map(pkg => {
                        const contentTypes = resolvePackageContentTypes(pkg);
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
                                     {pkg.showOnPlatform === false ? (
                                         <span className="inline-flex rounded-full bg-gray-900/40 px-3 py-1 text-xs font-black text-white">مخفية عن الطلاب</span>
                                     ) : null}
                                 </div>
                             </div>
                             <div className="p-5 sm:p-6 flex-1 flex flex-col">
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
                                 <button onClick={() => navigate(`/course/${pkg.id}`)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                     مشتركة الآن
                                 </button>
                             </div>
                         </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

const renderSubjectCard = (s: any, levelId: string | null) => {
        const sColor = s.color || style.color;
        const isHex = sColor.startsWith('#');
        const iconStyle = s.iconStyle || (path as any).iconStyle || 'default';
        const icon = s.iconUrl ? <img src={s.iconUrl} className="w-12 h-12 object-contain mx-auto" alt={s.name} /> : <div className="text-4xl">{s.icon || '📚'}</div>;

        if (iconStyle === 'modern') {
            return (
                <div 
                    key={s.id} 
                    className={`p-8 bg-white border-2 border-gray-100 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl rounded-[2rem] shadow-sm hover:border-${isHex ? '' : sColor}-500 group`}
                    style={isHex ? { borderColor: isHex ? sColor : undefined } : {}}
                    onClick={() => handleSubjectSelect(levelId, s.id)}
                >
                    <div className={`mb-4 inline-block p-4 rounded-2xl ${isHex ? '' : `bg-${sColor}-50`}`} style={isHex ? { backgroundColor: `${sColor}20` } : {}}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3">{s.name}</h3>
                    <div className="text-gray-500 text-sm font-bold flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                    </div>
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
                    <div className={`mb-3 ${isHex ? '' : `text-${sColor}-600`}`} style={isHex ? { color: sColor } : {}}>
                        {icon}
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">{s.name}</h3>
                    <div className="text-gray-400 text-xs flex gap-2 justify-center">
                        <span>تأسيس</span> • <span>نماذج</span>
                    </div>
                </div>
            );
        }

        if (iconStyle === 'playful') {
            return (
                <div 
                    key={s.id} 
                    className={`p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[12px_12px_0px_#00000030] shadow-[8px_8px_0px_#00000020] ${isHex ? '' : `bg-${sColor}-400`} text-white rounded-[2rem] border-4 border-white relative overflow-hidden group`}
                    style={isHex ? { backgroundColor: sColor } : {}}
                    onClick={() => handleSubjectSelect(levelId, s.id)}
                >
                    <div className="absolute top-2 right-2 text-white/30 transform rotate-12 text-5xl">✨</div>
                    <div className="mb-4 bg-white text-gray-800 p-4 rounded-full shadow-md inline-block group-hover:rotate-12 transition-transform">
                        {icon}
                    </div>
                    <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                </div>
            );
        }

        return (
            <div 
                key={s.id} 
                className={`p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${isHex ? '' : `bg-${sColor}-500 hover:bg-${sColor}-600`} text-white rounded-[2rem] shadow-md`}
                style={isHex ? { backgroundColor: sColor } : {}}
                onClick={() => handleSubjectSelect(levelId, s.id)}
            >
                <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm inline-block shadow-sm">
                    {icon}
                </div>
                <h3 className="text-3xl font-black mb-3">{s.name}</h3>
                <div className="text-white/80 text-sm font-bold flex gap-2 justify-center">
                    <span>تأسيس</span> • <span>نماذج</span> • <span>تدريب</span>
                </div>
            </div>
        );
    };

    // If tab=packages, scroll or only show packages
    if (isPackagesTab) {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <header className={`${style.bg} text-white py-16 text-center relative overflow-hidden`} style={style.inlineBg}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 justify-center mx-auto text-white/80 hover:text-white mb-6 transition-colors">
                            <ChevronRight size={20} /> عودة للمسار
                        </button>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">عروض وباقات {path.name}</h1>
                        <p className="text-white/80 text-lg">اختر الباقة الأنسب لك</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-8">
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
                    <header className={`${style.bg} text-white py-16 text-center relative overflow-hidden`} style={style.inlineBg}>
                        <div className="max-w-7xl mx-auto px-4 relative z-10">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">{path.name}</h1>
                            <p className="text-white/80 text-lg">تأسيس شامل، تدريب مكثف، واختبارات محاكية</p>
                        </div>
                    </header>
                    <div className="max-w-5xl mx-auto px-4 py-12">
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
                    <header className={`${style.bg} text-white py-12 relative overflow-hidden`} style={style.inlineBg}>
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
                <header className={`${style.bg} text-white py-16 text-center relative overflow-hidden`} style={style.inlineBg}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight break-words">{path.name}</h1>
                        <p className="text-white/80 text-lg">اختر المرحلة الدراسية للبدء</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pathLevels.map(level => {
                            const shortText = level.name.split(' ')[0] || level.name;
                            const isHex = style.color.startsWith('#');
                            return (
                                <div 
                                    key={level.id} 
                                    className={`p-8 text-center cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl ${isHex ? '' : `bg-${style.color}-500`} text-white rounded-[2rem] shadow-md`}
                                    style={isHex ? { backgroundColor: style.color } : {}}
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
        const levelSubjects = subjects.filter(s => s.levelId === selectedLevelId);
        
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <header className={`${style.bg} text-white py-12 relative overflow-hidden`} style={style.inlineBg}>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <button onClick={() => updateUrl(null, null)} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                            <ChevronRight size={20} /> عودة لصفحة المسار
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-black mb-2 leading-tight break-words">{currentLevel?.name}</h1>
                        <p className="text-white/80">اختر المادة للبدء في التدريب</p>
                    </div>
                </header>
                <div className="max-w-5xl mx-auto px-4 py-12">
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
            <header className={`${style.bg} text-white py-12 relative overflow-hidden`} style={style.inlineBg}>
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
