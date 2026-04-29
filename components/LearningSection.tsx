import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { Video, BookOpen, FileText, PlayCircle, MonitorPlay, Star, User, Library, Eye, Lock } from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';
import { SkillDetailsModal } from './SkillDetailsModal';
import { SimulatedTestExperience } from './SimulatedTestExperience';
import { FileModal } from './FileModal';
import { PaymentModal } from './PaymentModal';
import { useStore } from '../store/useStore';
import { PackageContentType } from '../types';
import { openExternalUrl } from '../utils/openExternalUrl';

interface LearningSectionProps {
    category: string;
    subject: string;
    grade?: string;
    title?: string;
    colorTheme?: 'indigo' | 'amber' | 'emerald' | 'purple' | 'rose';
}

export const LearningSection: React.FC<LearningSectionProps> = ({ category, subject, grade, title, colorTheme = 'indigo' }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, enrolledCourses, subjects, courses, libraryItems, quizzes, hasScopedPackageAccess, getMatchingPackage } = useStore();
    const [activeTab, setActiveTab] = useState<'courses' | 'skills' | 'banks' | 'tests' | 'library'>('courses');
    const safeColorTheme = colorTheme.startsWith('#') ? 'indigo' : colorTheme;
    
    // Get Subject Settings
    const currentSubjectData = subjects.find(s => s.id === subject);
    const settings = currentSubjectData?.settings || {};
    const enabledTabs = {
        courses: settings.showCourses ?? true,
        skills: settings.showSkills ?? true,
        banks: settings.showBanks ?? true,
        tests: settings.showTests ?? true,
        library: settings.showLibrary ?? true,
    };
    const isTabEnabled = (tab: typeof activeTab) => enabledTabs[tab];
    const firstEnabledTab = (Object.entries(enabledTabs).find(([, enabled]) => enabled)?.[0] || 'courses') as typeof activeTab;

    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['courses', 'skills', 'banks', 'tests', 'library'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!isTabEnabled(activeTab)) {
            setActiveTab(firstEnabledTab);
        }
    }, [activeTab, firstEnabledTab, settings.showBanks, settings.showCourses, settings.showLibrary, settings.showSkills, settings.showTests]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as any);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        setSearchParams(nextParams);
    };

    const [selectedSkill, setSelectedSkill] = useState<any>(null);
    const [viewingFile, setViewingFile] = useState<any>(null);
    const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean, item: any, type: string }>({ isOpen: false, item: null, type: '' });
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);
    const accessibleCourseIds = new Set([
        ...enrolledCourses,
        ...(user.subscription?.purchasedCourses || []),
    ]);
    const buildScopedPackageItem = (contentType: PackageContentType, fallbackTitle: string, fallbackDescription: string) => {
        const matchedPackage = getMatchingPackage(contentType, category, subject);
        if (!matchedPackage) {
            return null;
        }
        const contentTypeLabels: Record<PackageContentType, string> = {
            courses: 'الدورات',
            foundation: 'التأسيس',
            banks: 'التدريبات',
            tests: 'الاختبارات',
            library: 'المكتبة',
            all: 'الباقة الشاملة',
        };

        return {
            id: matchedPackage.id,
            packageId: matchedPackage.id,
            purchaseType: 'package',
            title: matchedPackage.name || fallbackTitle,
            price: 99,
            currency: 'ر.س',
            description: matchedPackage
                ? `هذه الباقة تفتح ${contentTypeLabels[contentType]} في ${currentSubjectData?.name || subject}.`
                : fallbackDescription,
            contentTypes: matchedPackage.contentTypes || [contentType],
            pathIds: matchedPackage.pathIds || [category],
            subjectIds: matchedPackage.subjectIds || [subject],
            includedCourseIds: matchedPackage.courseIds || [],
            courseIds: matchedPackage.courseIds || [],
        };
    };

    const hasCourseAccess = isStaffViewer || hasScopedPackageAccess('courses', category, subject);
    const hasFoundationAccess = isStaffViewer || hasScopedPackageAccess('foundation', category, subject);
    const hasBanksAccess = isStaffViewer || hasScopedPackageAccess('banks', category, subject);
    const hasTestsAccess = isStaffViewer || hasScopedPackageAccess('tests', category, subject);
    const hasLibraryAccess = isStaffViewer || hasScopedPackageAccess('library', category, subject);

    const isPremiumLocked = (shouldLock?: boolean, accessGranted = false) => Boolean(!isStaffViewer && shouldLock && !accessGranted);
    const canStudentSeeCourse = (course: (typeof courses)[number]) =>
        isStaffViewer || (course.showOnPlatform !== false && course.isPublished !== false && (!course.approvalStatus || course.approvalStatus === 'approved'));
    const canStudentSeeQuiz = (quiz: (typeof quizzes)[number]) =>
        isStaffViewer || (quiz.showOnPlatform !== false && quiz.isPublished !== false && (!quiz.approvalStatus || quiz.approvalStatus === 'approved'));
    const canStudentSeeLibraryItem = (item: (typeof libraryItems)[number]) =>
        isStaffViewer || (item.showOnPlatform !== false && (!item.approvalStatus || item.approvalStatus === 'approved'));
    const matchesScopedContent = (pathId?: string | null, subjectId?: string | null) => {
        const normalizedPathId = pathId || null;
        const normalizedSubjectId = subjectId || null;
        const pathMatches = !normalizedPathId || normalizedPathId === category;
        const subjectMatches = !normalizedSubjectId || normalizedSubjectId === subject || normalizedSubjectId === `${category}_${subject}`;
        return pathMatches && subjectMatches;
    };

    // Data Retrieval from Store
    let sectionCourses = courses.filter((course) => {
        const coursePathId = course.pathId || course.category;
        const courseSubjectId = course.subjectId || course.subject;
        if (!canStudentSeeCourse(course)) return false;
        return matchesScopedContent(coursePathId, courseSubjectId);
    });

    const topicList = useStore(state => state.topics);
    const quizList = useStore(state => state.quizzes);

    let mappedSkills = topicList
        .filter(t => !t.parentId && (isStaffViewer || t.showOnPlatform !== false) && matchesScopedContent(t.pathId, t.subjectId))
        .sort((a, b) => a.order - b.order)
        .map(topic => {
            const subTopics = topicList.filter(t => t.parentId === topic.id && matchesScopedContent(t.pathId, t.subjectId));
            let totalLessons = topic.lessonIds?.length || 0;
            let totalQuizzes = topic.quizIds?.length || 0;
            subTopics.forEach(sub => {
                totalLessons += (sub.lessonIds?.length || 0);
                totalQuizzes += (sub.quizIds?.length || 0);
            });
            
            // Dummy progress for demo purposes until user progress is tracked properly
            const progress = 0; 
            
            return {
                id: topic.id,
                title: topic.title,
                totalLessons: totalLessons || 1,
                completed: Math.floor((progress / 100) * (totalLessons || 1)),
                totalQuizzes: totalQuizzes,
                isLocked: isPremiumLocked(settings.lockSkillsForNonSubscribers, hasFoundationAccess),
                progress: progress,
                originalTopic: topic // Keep a reference to the real topic
            };
        });

    let banks = quizzes.filter(q => canStudentSeeQuiz(q) && matchesScopedContent(q.pathId, q.subjectId) && q.type === 'bank').map(q => ({
        id: q.id,
        title: q.title,
        questions: q.questionIds?.length || 0,
        updated: new Date(q.createdAt).toISOString(),
        type: 'bank',
        level: 'متعدد',
        isLocked: (q.access.type !== 'free' && !hasBanksAccess) || isPremiumLocked(settings.lockBanksForNonSubscribers, hasBanksAccess),
        duration: 'غير محدد'
    }));

    let tests = quizzes.filter(q => canStudentSeeQuiz(q) && matchesScopedContent(q.pathId, q.subjectId) && q.type !== 'bank').map(q => ({
        id: q.id,
        title: q.title,
        duration: `${q.settings?.timeLimit || 60} دقيقة`,
        questions: q.questionIds?.length || 0,
        type: 'simulated',
        level: 'متوسط',
        isLocked: (q.access.type !== 'free' && !hasTestsAccess) || isPremiumLocked(settings.lockTestsForNonSubscribers, hasTestsAccess)
    }));

    let sectionLibraryItems = libraryItems.filter(item => canStudentSeeLibraryItem(item) && matchesScopedContent(item.pathId, item.subjectId)).map(item => ({
        ...item,
        isLocked: isPremiumLocked(settings.lockLibraryForNonSubscribers, hasLibraryAccess)
    }));
    banks = banks.filter((bank) => {
        const sourceQuiz = quizList.find((quiz) => quiz.id === bank.id);
        return !!sourceQuiz && sourceQuiz.pathId === category && (!subject || sourceQuiz.subjectId === subject);
    });
    tests = tests.filter((test) => {
        const sourceQuiz = quizList.find((quiz) => quiz.id === test.id);
        if (!sourceQuiz) return false;
        if (sourceQuiz.pathId !== category || (subject && sourceQuiz.subjectId !== subject)) return false;
        if (!isStaffViewer) {
            const mode = sourceQuiz.mode || 'regular';
            const hasExplicitTargets = (sourceQuiz.targetUserIds || []).length > 0 || (sourceQuiz.targetGroupIds || []).length > 0;
            if (mode === 'central' || mode === 'saher' || hasExplicitTargets) return false;
        }
        return true;
    });
    sectionLibraryItems = sectionLibraryItems.filter((item) => {
        const pathMatches = !item.pathId || item.pathId === category;
        const subjectMatches = !subject || item.subjectId === subject;
        return pathMatches && subjectMatches;
    });

    const handleItemClick = (item: any, type: string) => {
        if (item.isLocked) {
            const packageMap: Record<string, any> = {
                skill: buildScopedPackageItem('foundation', 'باقة التأسيس', 'اشترك الآن لفتح موضوعات التأسيس والدروس المرتبطة بها.'),
                bank: buildScopedPackageItem('banks', 'باقة التدريبات', 'اشترك الآن لفتح بنوك الأسئلة والتدريبات القصيرة.'),
                test: buildScopedPackageItem('tests', 'باقة الاختبارات', 'اشترك الآن لفتح الاختبارات المحاكية والمركزية.'),
                library: buildScopedPackageItem('library', 'باقة المكتبة', 'اشترك الآن لفتح ملفات المراجعة والمكتبة العلمية.'),
            };
            const matchedPackage = packageMap[type];
            setPaymentModalData({
                isOpen: true,
                item: matchedPackage || item,
                type: matchedPackage ? 'package' : type,
            });
        } else {
            if (type === 'skill') setSelectedSkill(item);
            // Tests and Banks are handled by SimulatedTestExperience directly
        }
    };

    return (
        <div className="w-full">
            {/* Tabs */}
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap justify-center gap-2 md:gap-4 mb-12">
                {(settings.showCourses ?? true) && <TabButton active={activeTab === 'courses'} onClick={() => handleTabChange('courses')} icon={<MonitorPlay size={20} />} label="الدورات" colorTheme={colorTheme} />}
                {(settings.showSkills ?? true) && <TabButton active={activeTab === 'skills'} onClick={() => handleTabChange('skills')} icon={<Video size={20} />} label="التأسيس" colorTheme={colorTheme} />}
                {(settings.showBanks ?? true) && <TabButton active={activeTab === 'banks'} onClick={() => handleTabChange('banks')} icon={<BookOpen size={20} />} label="التدريب" colorTheme={colorTheme} />}
                {(settings.showTests ?? true) && <TabButton active={activeTab === 'tests'} onClick={() => handleTabChange('tests')} icon={<FileText size={20} />} label="الاختبارات المحاكية" colorTheme={colorTheme} />}
                {(settings.showLibrary ?? true) && <TabButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={<Library size={20} />} label="المكتبة" colorTheme={colorTheme} />}
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'courses' && enabledTabs.courses && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sectionCourses.map((baseCourse) => {
                            const coursePurchaseItem = buildScopedPackageItem(
                                'courses',
                                'باقة الدورات',
                                'اشترك الآن لفتح الدورات المرتبطة بهذا المسار وهذه المادة.'
                            );
                            const course = {
                                ...baseCourse,
                                isPurchased: accessibleCourseIds.has(baseCourse.id) || hasCourseAccess || baseCourse.isPurchased,
                            };
                            const isPurchased = course.isPurchased;

                            return (
                            <Card key={course.id} className={`flex flex-col overflow-hidden border-2 border-transparent hover:border-${safeColorTheme}-300 hover:shadow-xl transition-all duration-300 cursor-pointer rounded-3xl`}>
                                <div className="relative h-48 bg-gray-900 group">
                                    <img 
                                        src={course.thumbnail} 
                                        alt={course.title} 
                                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    />
                                    {!isPurchased && (
                                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white p-2 rounded-full">
                                            <Lock size={16} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                    
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">{course.category}</span>
                                        <h3 className="font-bold text-xl text-white mb-1">{course.title}</h3>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col bg-white">
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold">
                                            <span>{course.progress}% مكتمل</span>
                                        </div>
                                        <ProgressBar percentage={course.progress} showPercentage={false} color={safeColorTheme as any} />
                                    </div>
                                    <div className="mt-auto">
                                        {!isPurchased && (
                                            <button
                                                onClick={() => setPaymentModalData({
                                                    isOpen: true,
                                                    item: coursePurchaseItem || course,
                                                    type: coursePurchaseItem ? 'package' : 'course',
                                                })}
                                                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-transform hover:-translate-y-1 flex items-center justify-center bg-${safeColorTheme}-500 hover:bg-${safeColorTheme}-600 mb-0`}
                                            >
                                                اشترك الآن
                                            </button>
                                        )}
                                        <Link to={`/course/${course.id}`} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-transform hover:-translate-y-1 flex items-center justify-center bg-${safeColorTheme}-500 hover:bg-${safeColorTheme}-600 ${!isPurchased ? 'hidden' : ''}`}>
                                            {course.isPurchased ? (course.progress > 0 ? 'مواصلة التعلم' : 'ابدأ التعلم') : 'اشترك الآن'}
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                            );
                        })}
                        {sectionCourses.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <MonitorPlay size={48} className="mx-auto mb-4 opacity-20" />
                                <p>لا توجد دورات متاحة حالياً في هذا القسم.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'skills' && enabledTabs.skills && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mappedSkills.map((skill) => (
                            <button
                                type="button"
                                key={skill.id}
                                className={`p-5 border-2 border-gray-100 hover:shadow-lg transition-all cursor-pointer group hover:border-${safeColorTheme}-300 rounded-3xl relative overflow-hidden bg-white text-right`}
                                onClick={() => handleItemClick(skill, 'skill')}
                            >
                                {skill.isLocked && (
                                    <div className="absolute top-3 left-3 text-gray-400">
                                        <Lock size={20} />
                                    </div>
                                )}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors bg-${safeColorTheme}-100 text-${safeColorTheme}-600 group-hover:bg-${safeColorTheme}-500 group-hover:text-white`}>
                                        <PlayCircle size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{skill.title}</h3>
                                        <span className="text-xs text-gray-500 font-medium">
                                            {skill.totalLessons} درس • {skill.totalQuizzes || 0} تدريب قصير
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>التقدم</span>
                                        <span>{Math.round((skill.completed / skill.totalLessons) * 100)}%</span>
                                    </div>
                                    <ProgressBar percentage={(skill.completed / skill.totalLessons) * 100} showPercentage={false} color={safeColorTheme as any} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'banks' && enabledTabs.banks && (
                    <SimulatedTestExperience 
                        mode="bank"
                        tests={banks.map(bank => ({
                            id: bank.id,
                            title: bank.title,
                            questions: bank.questions,
                            duration: 'غير محدد',
                            type: 'bank',
                            level: 'متعدد',
                            isLocked: bank.isLocked
                        }))} 
                        onStartTest={(test) => navigate(`/quiz/${test.id}`)}
                        onLockedClick={(test) => handleItemClick(test, 'bank')}
                    />
                )}

                {activeTab === 'tests' && enabledTabs.tests && (
                    <SimulatedTestExperience 
                        tests={tests} 
                        onStartTest={(test) => navigate(`/quiz/${test.id}`)}
                        onLockedClick={(test) => handleItemClick(test, 'test')}
                    />
                )}

                {activeTab === 'library' && enabledTabs.library && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sectionLibraryItems.map((item: any) => (
                            <Card key={item.id} className={`p-6 border-2 border-gray-100 hover:border-${safeColorTheme}-200 hover:shadow-lg transition-all flex flex-col rounded-3xl relative`}>
                                {item.isLocked && (
                                    <div className="absolute top-4 left-4 text-gray-400">
                                        <Lock size={20} />
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <FileText size={28} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">{item.size}</span>
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 mb-2">{item.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                                    <User size={16} />
                                    <span>{item.downloads} تحميل</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                                    <button 
                                        onClick={() => {
                                            if (item.isLocked) {
                                                handleItemClick(item, 'library');
                                            } else if (item.url) {
                                                openExternalUrl(item.url);
                                            }
                                        }}
                                        className={`bg-indigo-50 text-indigo-700 py-3 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-colors shadow-sm ${item.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        تحميل
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (item.isLocked) {
                                                handleItemClick(item, 'library');
                                            } else if (item.url && item.url.includes('drive.google.com')) {
                                                openExternalUrl(item.url); // Some Google Drive links better opened directly to avoid iframe issues
                                            } else {
                                                setViewingFile(item);
                                            }
                                        }}
                                        className="bg-emerald-50 text-emerald-700 py-3 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Eye size={18} />
                                        عرض
                                    </button>
                                </div>
                            </Card>
                        ))}
                        {sectionLibraryItems.length === 0 && (
                            <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <Library size={64} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">لا توجد ملفات متاحة حالياً في المكتبة.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SkillDetailsModal 
                isOpen={!!selectedSkill} 
                onClose={() => setSelectedSkill(null)} 
                skill={selectedSkill} 
            />

            {viewingFile && (
                <FileModal 
                    fileUrl={viewingFile.url || (viewingFile.type === 'pdf' ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : "https://picsum.photos/seed/library/800/1200")}
                    title={viewingFile.title}
                    type={viewingFile.type}
                    onClose={() => setViewingFile(null)}
                />
            )}

            <PaymentModal 
                isOpen={paymentModalData.isOpen} 
                onClose={() => setPaymentModalData({ isOpen: false, item: null, type: '' })} 
                item={{
                    ...paymentModalData.item,
                    id: paymentModalData.item?.id,
                    packageId: paymentModalData.item?.packageId,
                    purchaseType: paymentModalData.item?.purchaseType || (paymentModalData.type === 'course' ? 'course' : 'package'),
                    title: paymentModalData.item?.title || `باقة ${paymentModalData.type === 'skill' ? 'التأسيس' : paymentModalData.type === 'bank' ? 'بنك الأسئلة' : paymentModalData.type === 'test' ? 'الاختبارات' : 'شاملة'}`,
                    price: paymentModalData.item?.price || 99,
                    currency: paymentModalData.item?.currency || 'ر.س',
                    description: paymentModalData.item?.description || `اشترك الآن للوصول إلى ${paymentModalData.item?.title || 'المحتوى'} والمزيد من المحتوى الحصري.`,
                    thumbnail: 'https://picsum.photos/seed/package/800/600',
                    features: ['وصول كامل للمحتوى', 'تحديثات مستمرة', 'دعم فني'],
                    category: 'باقة اشتراك',
                    includedCourseIds: paymentModalData.item?.includedCourseIds || paymentModalData.item?.courseIds || [],
                    contentTypes: paymentModalData.item?.contentTypes || ['all'],
                    pathIds: paymentModalData.item?.pathIds || [category],
                    subjectIds: paymentModalData.item?.subjectIds || [subject],
                }}
                type={paymentModalData.type as any}
            />
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, colorTheme }: any) => {
    const isHex = colorTheme?.startsWith('#');
    return (
        <button 
            onClick={onClick}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                active 
                ? `${isHex ? '' : `bg-${colorTheme}-600`} text-white shadow-lg transform -translate-y-1` 
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
            style={active && isHex ? { backgroundColor: colorTheme } : {}}
        >
            {icon}
            {label}
        </button>
    );
};
