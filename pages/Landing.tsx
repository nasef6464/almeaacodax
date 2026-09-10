import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, BookOpen, Target, Zap, Book, Users, Video, BarChart, Star, CheckCircle, Eye, ShoppingCart, Megaphone, Quote, Sparkles, Trophy, X, ChevronLeft, ChevronRight, Clock, Check, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { HomepageSettings } from '../types';
import { sanitizeHomepageSettings } from '../utils/sanitizeMojibakeArabic';
import { getCourseAudienceCount, getCourseRating } from '../utils/courseStats';
import { resolveIconComponent } from '../dashboards/admin/PathsManager/pathDisplayPresentation';
import { DEFAULT_PLATFORM_ARTICLES, type PlatformArticle } from '../data/defaultArticles';
import { ArticleReaderModal } from '../components/ArticleReaderModal';

const DEFAULT_HERO_BOY_IMAGE =
    '/images/homepage-hero-boy-platform.jpg?v=20260512';

const LEGACY_HERO_IMAGE_HINTS = [
    'saudi-arab-boy-student-wearing-thobe-holding-tablet_1258-122164',
    'girl',
    'woman',
    'female',
    'student-smiling',
    'young-woman',
    'portrait-woman',
    'girl-student',
];

const resolveHomepageHeroImage = (imageUrl?: string) => {
    const trimmed = imageUrl?.trim();
    if (!trimmed) {
        return DEFAULT_HERO_BOY_IMAGE;
    }

    const normalized = trimmed.toLowerCase();
    if (LEGACY_HERO_IMAGE_HINTS.some((hint) => normalized.includes(hint))) {
        return DEFAULT_HERO_BOY_IMAGE;
    }

    return trimmed;
};

const defaultHomepageSettings: HomepageSettings = {
    key: 'default',
    hero: {
        badgeText: 'المنصة الأولى للقدرات والتحصيلي',
        titlePrefix: 'حقق',
        titleHighlight: 'المئة',
        titleSuffix: 'في اختباراتك',
        description: 'رحلة تعليمية ذكية تجمع بين التدريب المكثف، الشروحات التفاعلية، والتحليل الدقيق لنقاط ضعفك لضمان أعلى الدرجات.',
        primaryCtaLabel: 'ابدأ التدريب مجانًا',
        primaryCtaLink: '/dashboard',
        secondaryCtaLabel: 'تصفح الدورات',
        secondaryCtaLink: '/courses',
        tertiaryCtaLabel: '',
        tertiaryCtaLink: '',
        badgeTextColor: '',
        titlePrefixColor: '',
        titleHighlightColor: '',
        titleSuffixColor: '',
        descriptionColor: '',
        primaryCtaColor: '',
        secondaryCtaColor: '',
        tertiaryCtaColor: '',
        imageUrl: DEFAULT_HERO_BOY_IMAGE,
        imageAlt: 'طالب يستخدم منصة المئة',
        galleryImages: [],
        autoRotateImages: true,
        rotateIntervalSeconds: 6,
        floatingCardTitle: 'منصة المئة',
        floatingCardSubtitle: 'مستواك: متقدم',
        floatingCardProgressLabel: 'التقدم',
        floatingCardProgressValue: '75%',
    },
    stats: [
        { id: 'students', label: 'طالب وطالبة', mode: 'dynamic', source: 'students', manualValue: '' },
        { id: 'courses', label: 'دورة تدريبية', mode: 'dynamic', source: 'courses', manualValue: '' },
        { id: 'assets', label: 'مادة تعليمية', mode: 'dynamic', source: 'assets', manualValue: '' },
        { id: 'rating', label: 'تقييم عام', mode: 'dynamic', source: 'rating', manualValue: '' },
    ],
    sections: {
        featuredCoursesTitle: 'الدورات الأكثر طلبًا',
        featuredCoursesSubtitle: 'اختر دورتك وابدأ رحلة التفوق اليوم',
        whyChooseTitle: 'لماذا يختار الطلاب منصة المئة؟',
        whyChooseDescription: 'نحن لا نقدم مجرد دورات، بل نقدم نظامًا تعليميًا متكاملًا يساعدك على الفهم العميق، التدريب المستمر، وتحليل الأداء بطريقة بسيطة وفعالة.',
        testimonialsTitle: 'قصص نجاح نعتز بها',
        testimonialsSubtitle: 'انضم لآلاف الطلاب الذين حققوا أحلامهم معنا',
    },
    typography: {
        headingFont: 'tajawal',
        bodyFont: 'tajawal',
        headingWeight: 'black',
    },
    testimonials: [
        {
            id: 't1',
            name: 'سارة العتيبي',
            degree: '98% قدرات',
            text: 'المنصة غيرت طريقة مذاكرتي تمامًا. تحليل نقاط الضعف ساعدني أركز جهدي في المكان الصح.',
            image: 'https://i.pravatar.cc/100?img=5',
        },
        {
            id: 't2',
            name: 'فهد الشمري',
            degree: '96% تحصيلي',
            text: 'الشروحات والتدريبات كانت مرتبة جدًا وواضحة، وحسيت فعلًا أن عندي خطة كاملة وليست مجرد دروس.',
            image: 'https://i.pravatar.cc/100?img=11',
        },
        {
            id: 't3',
            name: 'نورة السالم',
            degree: '99% قدرات',
            text: 'الاختبارات المحاكية كانت قريبة جدًا من الاختبار الحقيقي، وهذا رفع ثقتي قبل يوم الاختبار.',
            image: 'https://i.pravatar.cc/100?img=9',
        },
    ],
    featuredPathIds: [],
    featuredCourseIds: [],
    featuredArticleLessonIds: [],
};

const colorMap: Record<string, { soft: string; text: string; base: string; border: string }> = {
    indigo: { soft: '#eef2ff', text: '#4338ca', base: '#4f46e5', border: '#e0e7ff' },
    blue: { soft: '#eff6ff', text: '#1d4ed8', base: '#2563eb', border: '#dbeafe' },
    sky: { soft: '#f0f9ff', text: '#0369a1', base: '#0284c7', border: '#bae6fd' },
    cyan: { soft: '#ecfeff', text: '#0e7490', base: '#0891b2', border: '#a5f3fc' },
    teal: { soft: '#f0fdfa', text: '#0f766e', base: '#0d9488', border: '#99f6e4' },
    emerald: { soft: '#d1fae5', text: '#047857', base: '#10b981', border: '#a7f3d0' },
    green: { soft: '#f0fdf4', text: '#15803d', base: '#16a34a', border: '#bbf7d0' },
    lime: { soft: '#f7fee7', text: '#4d7c0f', base: '#65a30d', border: '#d9f99d' },
    yellow: { soft: '#fefce8', text: '#a16207', base: '#ca8a04', border: '#fef08a' },
    amber: { soft: '#fef3c7', text: '#b45309', base: '#f59e0b', border: '#fde68a' },
    orange: { soft: '#fff7ed', text: '#c2410c', base: '#ea580c', border: '#fed7aa' },
    red: { soft: '#fef2f2', text: '#b91c1c', base: '#dc2626', border: '#fecaca' },
    rose: { soft: '#ffe4e6', text: '#be123c', base: '#f43f5e', border: '#fecdd3' },
    pink: { soft: '#fdf2f8', text: '#be185d', base: '#db2777', border: '#fbcfe8' },
    fuchsia: { soft: '#fdf4ff', text: '#a21caf', base: '#c026d3', border: '#f5d0fe' },
    purple: { soft: '#ede9fe', text: '#6d28d9', base: '#7c3aed', border: '#ddd6fe' },
    violet: { soft: '#ede9fe', text: '#6d28d9', base: '#7c3aed', border: '#ddd6fe' },
    slate: { soft: '#f8fafc', text: '#334155', base: '#475569', border: '#cbd5e1' },
    gray: { soft: '#f3f4f6', text: '#4b5563', base: '#6b7280', border: '#d1d5db' },
};

const resolveColor = (value?: string) => {
    if (!value) return colorMap.indigo;
    const trimmed = String(value).trim();
    if (trimmed.startsWith('#')) {
        return { soft: `${trimmed}18`, text: trimmed, base: trimmed, border: `${trimmed}33` };
    }
    return colorMap[trimmed.toLowerCase()] || colorMap.indigo;
};

const resolveHeroColor = (value: string | undefined, fallback: string) => {
    const trimmed = String(value || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
};

export const Landing: React.FC = () => {
    const { paths, courses, quizzes, questions, lessons, subjects, user, announcementAds } = useStore();
    const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>(defaultHomepageSettings);
    const [dismissedBannerAdId, setDismissedBannerAdId] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<PlatformArticle | null>(null);
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const canSeeHiddenPaths = ['admin', 'teacher', 'supervisor'].includes(user?.role || '');

    useEffect(() => {
        let cancelled = false;

        const loadHomepageSettings = async () => {
            try {
                const response = await api.getHomepageSettings();
                if (!cancelled && response) {
                    setHomepageSettings(sanitizeHomepageSettings(response as HomepageSettings));
                }
            } catch {
                if (!cancelled) {
                    setHomepageSettings(defaultHomepageSettings);
                }
            }
        };

        void loadHomepageSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    const getPathLink = (pathId: string) => `/category/${pathId}`;

    const getPathColor = (path: any) => path?.color || 'blue';

    const getPathIcon = (path: any) => {
        if (path?.iconUrl) {
            return <img src={path.iconUrl} alt={path.name} className="w-8 h-8 object-contain" />;
        }
        if (!path?.icon) {
            return <Zap size={24} />;
        }
        return resolveIconComponent(path.icon, 'w-6 h-6', '⚡');
    };

    const homepagePaths = paths.filter(
        (path) =>
            path.showInHome !== false &&
            (canSeeHiddenPaths || path.isActive !== false) &&
            typeof path.id === 'string' &&
            path.id.trim().length > 0 &&
            typeof path.name === 'string' &&
            path.name.trim().length > 0,
    );
    const visiblePathIds = new Set(homepagePaths.map((path) => path.id));

    const displayedHomepagePaths = useMemo(() => {
        if (homepageSettings.featuredPathIds?.length) {
            const selected = homepagePaths.filter((path) => homepageSettings.featuredPathIds.includes(path.id));
            if (selected.length > 0) {
                return selected;
            }
        }
        return homepagePaths;
    }, [homepagePaths, homepageSettings.featuredPathIds]);

    const publishedCourses = courses.filter(
        (course) =>
            !course.isPackage &&
            course.isPublished !== false &&
            course.showOnPlatform !== false &&
            (!course.pathId || visiblePathIds.has(course.pathId)),
    );
    const sortedPublishedCourses = [...publishedCourses].sort((a, b) => {
        const studentsA = getCourseAudienceCount(a);
        const studentsB = getCourseAudienceCount(b);
        const ratingA = getCourseRating(a);
        const ratingB = getCourseRating(b);
        return studentsB + ratingB * 100 - (studentsA + ratingA * 100);
    });

    const featuredCourses = useMemo(() => {
        if (homepageSettings.featuredCourseIds?.length) {
            const selected = sortedPublishedCourses.filter((course) => homepageSettings.featuredCourseIds.includes(course.id));
            if (selected.length > 0) {
                return selected.slice(0, 3);
            }
        }
        return sortedPublishedCourses.slice(0, 3);
    }, [homepageSettings.featuredCourseIds, sortedPublishedCourses]);

    const publishedArticleLessons = useMemo(
        () =>
            lessons
                .filter((lesson) => {
                    const isPublished = lesson.approvalStatus !== 'pending_review' && lesson.approvalStatus !== 'rejected';
                    const hasArticleContent = lesson.type === 'text' || Boolean(lesson.content?.trim());
                    return isPublished && hasArticleContent && lesson.showOnPlatform !== false && (!lesson.pathId || visiblePathIds.has(lesson.pathId));
                })
                .sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)),
        [lessons],
    );

    const featuredArticleLessons = useMemo(() => {
        if (homepageSettings.featuredArticleLessonIds?.length) {
            const selected = homepageSettings.featuredArticleLessonIds
                .map((lessonId) => publishedArticleLessons.find((lesson) => lesson.id === lessonId))
                .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));

            if (selected.length > 0) {
                return selected.slice(0, 3);
            }
        }

        return publishedArticleLessons.slice(0, 3);
    }, [homepageSettings.featuredArticleLessonIds, publishedArticleLessons]);

    const displayArticles = useMemo<PlatformArticle[]>(() => {
        if (featuredArticleLessons.length > 0) {
            return featuredArticleLessons.map((lesson) => {
                const subject = subjects.find((item) => item.id === lesson.subjectId);
                const path = paths.find((item) => item.id === lesson.pathId);
                const summary =
                    lesson.description ||
                    lesson.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) ||
                    'شرح مبسط ومراجعة سريعة تساعدك على التقدم داخل المسار.';
                return {
                    id: lesson.id,
                    title: lesson.title,
                    summary,
                    category: subject?.name || path?.name || 'مقال تعليمي',
                    categoryColor: 'indigo',
                    readTime: '5 دقائق',
                    authorName: 'فريق منصة المئة الأكاديمي',
                    authorRole: 'محتوى معتمد',
                    date: 'محتوى حديث',
                    tags: ['تأسيس', 'مراجعة'],
                    content: [lesson.content || summary],
                    highlights: ['مراجعة شاملة مدعومة بالأمثلة', 'ربط مباشر بمسار التعلم في المنصة'],
                    keyTakeaway: summary,
                    trackId: lesson.pathId,
                };
            });
        }
        return DEFAULT_PLATFORM_ARTICLES.slice(0, 3);
    }, [featuredArticleLessons, paths, subjects]);

    const totalStudents = publishedCourses.reduce((sum, course) => sum + getCourseAudienceCount(course), 0);
    const totalQA = publishedCourses.reduce((sum, course) => sum + (course.qa?.length || 0), 0);
    const averageRating = publishedCourses.length > 0
        ? publishedCourses.reduce((sum, course) => sum + getCourseRating(course), 0) / publishedCourses.length
        : 0;
    const publishedQuizzes = quizzes.filter(
        (quiz) => quiz.isPublished !== false && quiz.showOnPlatform !== false && (!quiz.pathId || visiblePathIds.has(quiz.pathId)),
    ).length;
    const totalLearningAssets = questions.length + publishedQuizzes;

    const formatCompactNumber = (value: number) => {
        if (value >= 1000) {
            return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
        }
        return value.toString();
    };

    const homepageStats = (homepageSettings.stats?.length ? homepageSettings.stats : defaultHomepageSettings.stats).map((stat) => {
        if (stat.mode === 'manual' && stat.manualValue) {
            return { ...stat, displayValue: stat.manualValue };
        }

        switch (stat.source) {
            case 'courses':
                return { ...stat, displayValue: publishedCourses.length.toString() };
            case 'assets':
                return { ...stat, displayValue: formatCompactNumber(totalQA || totalLearningAssets) };
            case 'rating':
                return { ...stat, displayValue: averageRating.toFixed(1) };
            case 'students':
            default:
                return { ...stat, displayValue: formatCompactNumber(totalStudents) };
        }
    });

    const sectionTexts = {
        featuredCoursesTitle: homepageSettings.sections?.featuredCoursesTitle || defaultHomepageSettings.sections.featuredCoursesTitle,
        featuredCoursesSubtitle: homepageSettings.sections?.featuredCoursesSubtitle || defaultHomepageSettings.sections.featuredCoursesSubtitle,
        featuredArticlesTitle:
            homepageSettings.sections?.featuredArticlesTitle ||
            defaultHomepageSettings.sections.featuredArticlesTitle ||
            'مقالات ومراجعات مهمة',
        featuredArticlesSubtitle:
            homepageSettings.sections?.featuredArticlesSubtitle ||
            defaultHomepageSettings.sections.featuredArticlesSubtitle ||
            'مجموعة مبسطة من الشروحات النصية والمراجعات التي تساعدك على الفهم الأسرع.',
        whyChooseTitle: homepageSettings.sections?.whyChooseTitle || defaultHomepageSettings.sections.whyChooseTitle,
        whyChooseDescription: homepageSettings.sections?.whyChooseDescription || defaultHomepageSettings.sections.whyChooseDescription,
        testimonialsTitle: homepageSettings.sections?.testimonialsTitle || defaultHomepageSettings.sections.testimonialsTitle,
        testimonialsSubtitle: homepageSettings.sections?.testimonialsSubtitle || defaultHomepageSettings.sections.testimonialsSubtitle,
    };

    const testimonials = homepageSettings.testimonials?.length ? homepageSettings.testimonials : defaultHomepageSettings.testimonials;
    const homepageTypography = {
        ...defaultHomepageSettings.typography,
        ...homepageSettings.typography,
    };
    const fontClassByChoice = {
        tajawal: 'font-tajawal',
        system: 'font-sans',
        serif: 'font-serif',
    } as const;
    const headingFontClass = fontClassByChoice[homepageTypography.headingFont || 'tajawal'];
    const bodyFontClass = fontClassByChoice[homepageTypography.bodyFont || 'tajawal'];
    const headingWeightClass = homepageTypography.headingWeight === 'bold' ? 'font-bold' : 'font-black';
    const heroColors = {
        badgeTextColor: resolveHeroColor(homepageSettings.hero.badgeTextColor, '#2563eb'),
        titlePrefixColor: resolveHeroColor(homepageSettings.hero.titlePrefixColor, '#111827'),
        titleHighlightColor: resolveHeroColor(homepageSettings.hero.titleHighlightColor, '#2563eb'),
        titleSuffixColor: resolveHeroColor(homepageSettings.hero.titleSuffixColor, '#111827'),
        descriptionColor: resolveHeroColor(homepageSettings.hero.descriptionColor, '#4b5563'),
        primaryCtaColor: resolveHeroColor(homepageSettings.hero.primaryCtaColor, '#f59e0b'),
        secondaryCtaColor: resolveHeroColor(homepageSettings.hero.secondaryCtaColor, '#374151'),
        tertiaryCtaColor: resolveHeroColor(homepageSettings.hero.tertiaryCtaColor, '#4f46e5'),
    };
    const tertiaryCtaLabel = String(homepageSettings.hero.tertiaryCtaLabel || '').trim();
    const tertiaryCtaLink = String(homepageSettings.hero.tertiaryCtaLink || '').trim() || '/courses';

    const activeAnnouncement = useMemo(() => {
        const now = Date.now();
        return (announcementAds || [])
            .filter((ad) => {
                if (!ad.isActive || ad.id === dismissedBannerAdId) return false;
                if (ad.startsAt && ad.startsAt > now) return false;
                if (ad.endsAt && ad.endsAt < now) return false;
                return true;
            })
            .sort((a, b) => (a.priority || 0) - (b.priority || 0) || (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
    }, [announcementAds, dismissedBannerAdId]);

    const heroGallery = useMemo(() => {
        const list: { url: string; alt: string }[] = [];
        const primaryUrl = resolveHomepageHeroImage(homepageSettings.hero.imageUrl || defaultHomepageSettings.hero.imageUrl);
        const primaryAlt = homepageSettings.hero.imageAlt || defaultHomepageSettings.hero.imageAlt || 'طالب يستخدم منصة المئة';
        list.push({ url: primaryUrl, alt: primaryAlt });

        if (Array.isArray(homepageSettings.hero.galleryImages)) {
            homepageSettings.hero.galleryImages.forEach((img, idx) => {
                if (img && typeof img === 'string' && img.trim() && img !== primaryUrl) {
                    list.push({ url: img, alt: `${primaryAlt} - ${idx + 2}` });
                }
            });
        }
        return list;
    }, [homepageSettings.hero.imageUrl, homepageSettings.hero.imageAlt, homepageSettings.hero.galleryImages]);

    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const [isHeroHovered, setIsHeroHovered] = useState(false);
    const autoRotate = homepageSettings.hero.autoRotateImages !== false && heroGallery.length > 1;
    const rotateInterval = Math.max(3, Math.min(60, Number(homepageSettings.hero.rotateIntervalSeconds) || 6));

    useEffect(() => {
        if (!autoRotate || isHeroHovered) return;
        const timer = setInterval(() => {
            setCurrentHeroIndex((prev) => (prev + 1) % heroGallery.length);
        }, rotateInterval * 1000);
        return () => clearInterval(timer);
    }, [autoRotate, isHeroHovered, heroGallery.length, rotateInterval]);

    return (
        <div className={`bg-white ${bodyFontClass}`}>
            <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white pt-12 pb-24 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                    <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                    <div className="absolute bottom-[-10%] right-[20%] w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Active Announcement Pill Banner */}
                    {activeAnnouncement ? (
                        <div className="mb-6 flex justify-center lg:justify-start">
                            <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-500/10 px-4 py-1.5 shadow-sm backdrop-blur-md transition-all hover:border-amber-300">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-black text-white shadow-xs">
                                    <Megaphone size={11} /> إعلان
                                </span>
                                <span className="truncate text-xs font-bold text-gray-800 sm:text-sm">
                                    {activeAnnouncement.title}
                                </span>
                                {activeAnnouncement.ctaUrl ? (
                                    <Link
                                        to={activeAnnouncement.ctaUrl}
                                        className="mr-1 inline-flex items-center gap-1 text-xs font-black text-indigo-700 hover:text-indigo-900 transition-colors shrink-0"
                                    >
                                        <span>{activeAnnouncement.ctaLabel || 'تفاصيل'}</span>
                                        <ArrowLeft size={12} />
                                    </Link>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => setDismissedBannerAdId(activeAnnouncement.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                                    title="إغلاق الإعلان"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
                        <div className="lg:w-1/2 text-center lg:text-right">
                            <div className="inline-flex items-center gap-2.5 bg-blue-50/90 text-blue-600 px-4 py-2 rounded-full text-xs sm:text-sm font-black mb-6 border border-blue-100 shadow-xs backdrop-blur-sm" style={{ color: heroColors.badgeTextColor }}>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                                </span>
                                <span>{homepageSettings.hero.badgeText || defaultHomepageSettings.hero.badgeText}</span>
                            </div>

                            <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl ${headingWeightClass} ${headingFontClass} text-gray-900 leading-[1.18] mb-6 tracking-tight`}>
                                <span style={{ color: heroColors.titlePrefixColor }}>{homepageSettings.hero.titlePrefix || defaultHomepageSettings.hero.titlePrefix}</span>{' '}
                                <span
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 drop-shadow-xs"
                                    style={{ color: heroColors.titleHighlightColor, backgroundImage: homepageSettings.hero.titleHighlightColor ? 'none' : undefined }}
                                >
                                    {homepageSettings.hero.titleHighlight || defaultHomepageSettings.hero.titleHighlight}
                                </span>
                                <br />
                                <span style={{ color: heroColors.titleSuffixColor }}>{homepageSettings.hero.titleSuffix || defaultHomepageSettings.hero.titleSuffix}</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{ color: heroColors.descriptionColor }}>
                                {homepageSettings.hero.description || defaultHomepageSettings.hero.description}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                <Link
                                    to={homepageSettings.hero.primaryCtaLink || defaultHomepageSettings.hero.primaryCtaLink || '/dashboard'}
                                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white text-lg font-black px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 border border-white/20"
                                    style={{ backgroundColor: heroColors.primaryCtaColor }}
                                >
                                    <Zap size={20} fill="currentColor" />
                                    {homepageSettings.hero.primaryCtaLabel || defaultHomepageSettings.hero.primaryCtaLabel}
                                </Link>
                                <Link
                                    to={homepageSettings.hero.secondaryCtaLink || defaultHomepageSettings.hero.secondaryCtaLink || '/courses'}
                                    className="w-full sm:w-auto bg-white text-gray-800 border border-gray-200 text-lg font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 hover:border-gray-300 shadow-xs transition-all flex items-center justify-center gap-2"
                                    style={{ color: heroColors.secondaryCtaColor }}
                                >
                                    <BookOpen size={20} />
                                    {homepageSettings.hero.secondaryCtaLabel || defaultHomepageSettings.hero.secondaryCtaLabel}
                                </Link>
                                {tertiaryCtaLabel ? (
                                    <Link
                                        to={tertiaryCtaLink}
                                        className="w-full sm:w-auto bg-white border border-indigo-100 text-lg font-bold px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                        style={{ color: heroColors.tertiaryCtaColor }}
                                    >
                                        <ArrowDown size={20} />
                                        {tertiaryCtaLabel}
                                    </Link>
                                ) : null}
                            </div>

                            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-gray-500 font-bold">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span>ضمان تحسن المستوى</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span>مدربون معتمدون</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star size={18} className="text-amber-500 fill-amber-500" />
                                    <span>+15,000 طالب متفوق</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-1/2 relative w-full">
                            <div className="relative w-full max-w-lg mx-auto">
                                <div
                                    className="relative w-full aspect-[4/3] sm:aspect-[3/2] rounded-3xl shadow-2xl border-4 border-white overflow-hidden bg-slate-900/5 group select-none"
                                    onMouseEnter={() => setIsHeroHovered(true)}
                                    onMouseLeave={() => setIsHeroHovered(false)}
                                >
                                    {heroGallery.map((imgItem, idx) => {
                                        const isActive = idx === (currentHeroIndex % heroGallery.length);
                                        return (
                                            <img
                                                key={`hero-img-${idx}`}
                                                src={resolveHomepageHeroImage(imgItem.url)}
                                                alt={imgItem.alt || homepageSettings.hero.imageAlt || defaultHomepageSettings.hero.imageAlt || 'طالب يستخدم منصة المئة'}
                                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                                                    isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0'
                                                }`}
                                            />
                                        );
                                    })}

                                    {heroGallery.length > 1 && (
                                        <>
                                            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-lg">
                                                {heroGallery.map((_, idx) => (
                                                    <button
                                                        key={`hero-dot-${idx}`}
                                                        type="button"
                                                        onClick={() => setCurrentHeroIndex(idx)}
                                                        className={`transition-all duration-300 rounded-full ${
                                                            idx === (currentHeroIndex % heroGallery.length)
                                                                ? 'w-6 h-1.5 bg-amber-400 shadow-xs'
                                                                : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                                                        }`}
                                                        title={`صورة ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentHeroIndex((prev) => (prev - 1 + heroGallery.length) % heroGallery.length)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs border border-white/20 shadow-md"
                                                title="الصورة السابقة"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentHeroIndex((prev) => (prev + 1) % heroGallery.length)}
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs border border-white/20 shadow-md"
                                                title="الصورة التالية"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Floating Rating Badge Card */}
                                <a
                                    href="#testimonials"
                                    className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-white/80 flex items-center gap-3 animate-float transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer group"
                                    title="شاهد آراء وتقييمات الطلاب المعتمدة"
                                >
                                    <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-white text-[11px] font-black ring-2 ring-white">
                                            99%
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-black ring-2 ring-white">
                                            98%
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-black ring-2 ring-white">
                                            97%
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1">
                                            <Star size={13} className="text-amber-400 fill-amber-400" />
                                            <span className="text-xs font-black text-gray-900">4.9 من 5</span>
                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full">معتمد</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-500 group-hover:text-indigo-600 transition-colors flex items-center gap-0.5 justify-end">
                                            <span>تقييم الطلاب</span>
                                            <span className="text-[9px]">▾</span>
                                        </div>
                                    </div>
                                </a>

                                {/* Floating Progress & Readiness Card */}
                                <a
                                    href="#paths"
                                    className="absolute -bottom-4 right-2 sm:-bottom-6 sm:-right-6 z-20 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-white/80 max-w-[195px] sm:max-w-[215px] animate-bounce-slow transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer block group"
                                    title="استكشف المسارات التعليمية والجاهزية"
                                >
                                    <div className="flex items-center gap-2.5 mb-2 border-b border-gray-100 pb-1.5">
                                        <div className="w-7 h-7 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                                            <Target size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{homepageSettings.hero.floatingCardTitle || defaultHomepageSettings.hero.floatingCardTitle}</div>
                                            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>{homepageSettings.hero.floatingCardSubtitle || defaultHomepageSettings.hero.floatingCardSubtitle}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden p-0.5">
                                            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full w-3/4 animate-pulse" />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                            <span>{homepageSettings.hero.floatingCardProgressLabel || defaultHomepageSettings.hero.floatingCardProgressLabel}</span>
                                            <span className="text-indigo-600 font-black">{homepageSettings.hero.floatingCardProgressValue || defaultHomepageSettings.hero.floatingCardProgressValue}</span>
                                        </div>
                                    </div>
                                </a>

                                {/* Floating A+ Badge */}
                                <a
                                    href="#why-choose"
                                    className="absolute top-10 left-2 sm:top-14 sm:-left-6 z-20 bg-gradient-to-br from-amber-400 to-amber-500 text-white p-2 sm:p-2.5 rounded-2xl shadow-xl shadow-amber-500/20 animate-float flex items-center gap-1 border-2 border-white transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                                    title="لماذا تختار منصة المئة؟"
                                >
                                    <span className="font-black text-base sm:text-lg">A+</span>
                                    <Sparkles size={15} className="text-amber-100 fill-amber-100" />
                                </a>

                                {/* Floating Achievement Strip */}
                                <a
                                    href="#testimonials"
                                    className="absolute bottom-16 left-2 sm:bottom-20 sm:-left-6 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-white/80 animate-float animation-delay-2000 flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
                                    title="شاهد تجارب وقصص نجاح الطلاب"
                                >
                                    <div className="w-6 h-6 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Trophy size={14} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-800 group-hover:text-indigo-600 transition-colors">تحسن ملحوظ</div>
                                        <div className="text-[9px] font-bold text-emerald-600">+15 درجة في القياس</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Compact Live Stats & Counters Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 py-5 sm:py-6 text-white border-y border-white/5">
                <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {homepageStats.slice(0, 4).map((stat) => {
                            const isRating = stat.source === 'rating';
                            const isStudents = stat.source === 'students';
                            const isCourses = stat.source === 'courses';

                            const icon = isRating ? (
                                <Star size={18} className="text-amber-400 fill-amber-400" />
                            ) : isStudents ? (
                                <Users size={18} className="text-blue-400" />
                            ) : isCourses ? (
                                <BookOpen size={18} className="text-emerald-400" />
                            ) : (
                                <Zap size={18} className="text-purple-400" />
                            );

                            const iconBg = isRating
                                ? 'bg-amber-400/15 text-amber-400 border-amber-400/25'
                                : isStudents
                                ? 'bg-blue-400/15 text-blue-400 border-blue-400/25'
                                : isCourses
                                ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25'
                                : 'bg-purple-400/15 text-purple-400 border-purple-400/25';

                            return (
                                <div
                                    key={stat.id}
                                    className="group relative overflow-hidden rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 py-3 sm:py-3.5 px-3 sm:px-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-md flex flex-col items-center text-center"
                                >
                                    <div className={`mb-2 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border shadow-xs transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
                                        {icon}
                                    </div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white mb-0.5 group-hover:text-amber-300 transition-colors">
                                        {isRating ? `${stat.displayValue} ⭐` : stat.displayValue}
                                    </div>
                                    <div className="text-[11px] sm:text-xs font-bold text-indigo-200/90">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="paths" className="py-20 bg-gray-50 scroll-mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">كل ما تحتاجه للتفوق</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">نقدم لك أدوات تعليمية متكاملة تغطي كافة جوانب التدريب والتقييم.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayedHomepagePaths.map((path, idx) => (
                            <OrganicCard
                                key={`hpath-${path.id}-${idx}`}
                                title={path.name}
                                subtitle={path.description || 'تأسيس وتدريب شامل'}
                                icon={getPathIcon(path)}
                                color={getPathColor(path)}
                                link={getPathLink(path.id)}
                                iconStyle={path.iconStyle}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-right">
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">{sectionTexts.featuredCoursesTitle}</h2>
                            <p className="text-gray-500">{sectionTexts.featuredCoursesSubtitle}</p>
                        </div>
                        <Link to="/courses" className="self-start sm:self-auto text-indigo-600 font-bold hover:underline flex items-center gap-2">
                            عرض الكل <ArrowDown className="transform rotate-90" size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredCourses.map((course, idx) => {
                            const coursePrice = Number(course.price || 0);
                            const originalPrice = Number(course.originalPrice || 0);
                            const hasDiscount = originalPrice > coursePrice && coursePrice > 0;
                            return (
                            <div key={`fcourse-${course.id}-${idx}`} className="group">
                                <Card className="overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 rounded-3xl group-hover:-translate-y-2">
                                    <div className="relative aspect-video overflow-hidden">
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-indigo-600 font-black text-sm shadow-sm">
                                            {hasDiscount ? <span className="ml-2 text-xs text-gray-400 line-through">{originalPrice}</span> : null}
                                            {coursePrice} ر.س
                                        </div>
                                    </div>
                                    <div className="p-6 text-right">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1 text-amber-400">
                                                <Star size={14} fill="currentColor" />
                                                <span className="text-xs font-bold text-gray-600">{getCourseRating(course)}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Users size={12} /> {getCourseAudienceCount(course)} طالب
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h3>
                                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                            <Users size={12} /> {course.instructor}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                                            <Link to={`/course/${course.id}`} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition-all hover:bg-gray-50">
                                                <Eye size={15} /> معاينة
                                            </Link>
                                            <Link to={`/course/${course.id}?buy=1`} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white transition-all hover:bg-indigo-700">
                                                <ShoppingCart size={15} /> شراء
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )})}
                    </div>
                    {featuredCourses.length === 0 && <div className="text-center py-12 text-gray-500">لا توجد دورات منشورة حاليًا.</div>}
                </div>
            </section>

            <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-black mb-3">
                                <BookOpen size={13} />
                                <span>مقالات واستراتيجيات قياس</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">{sectionTexts.featuredArticlesTitle}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{sectionTexts.featuredArticlesSubtitle}</p>
                        </div>
                        <Link to="/blog" className="self-start sm:self-auto text-indigo-600 dark:text-indigo-400 font-black hover:underline flex items-center gap-2 group">
                            استعرض جميع المقالات (10 مقالات) <ArrowDown className="transform rotate-90 group-hover:translate-x-[-3px] transition-transform" size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayArticles.map((article) => (
                            <div
                                key={`farticle-${article.id}`}
                                onClick={() => {
                                    setSelectedArticle(article);
                                    setIsArticleModalOpen(true);
                                }}
                                className="group cursor-pointer"
                            >
                                <Card className="h-full border border-gray-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-2xl transition-all duration-300 rounded-3xl group-hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
                                    <div className="p-6 text-right h-full flex flex-col">
                                        <div className="flex items-center justify-between gap-2 mb-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-bold">
                                                <BookOpen size={12} />
                                                {article.category}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                                                <Clock size={12} />
                                                {article.readTime}
                                            </span>
                                        </div>

                                        <h3 className="font-black text-gray-900 dark:text-white mb-3 text-lg leading-8 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>

                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 flex-1 mb-4">
                                            {article.summary}
                                        </p>

                                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="text-right">
                                                <span className="block text-xs font-black text-gray-800 dark:text-gray-200">{article.authorName}</span>
                                                <span className="block text-[10px] text-gray-400">{article.authorRole}</span>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black text-xs group-hover:translate-x-[-2px] transition-transform">
                                                اقرأ الآن
                                                <ArrowLeft size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="why-choose" className="py-20 bg-white dark:bg-slate-900 scroll-mt-16 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                        {/* Right: compelling SaaS text & trust metrics */}
                        <div className="lg:w-5/12 text-right">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black mb-4">
                                <Sparkles size={14} className="text-amber-500" />
                                <span>تجربة تعليمية استثنائية متكاملة</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-5 leading-tight">{sectionTexts.whyChooseTitle}</h2>
                            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">{sectionTexts.whyChooseDescription}</p>

                            {/* Trust metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-0.5">+25 درجة</div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">متوسط ارتفاع درجات الطلاب في أول شهر</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-0.5">98.4%</div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">نسبة رضا المشتركين والمدارس الشريكة</div>
                                </div>
                            </div>

                            <ul className="space-y-3.5 mb-8">
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0"><Check size={14} /></div>
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-sm">تحديث أسبوعي مستمر لبنوك الأسئلة وفق نماذج قياس الحديثة</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0"><Check size={14} /></div>
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-sm">مسارات تأسيس وتدريب ومحاكاة واختبارات قياس في منصة واحدة</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0"><Check size={14} /></div>
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-sm">دعم فني وأكاديمي على مدار الساعة مع نخبة المدربين</span>
                                </li>
                            </ul>

                            <Link to="/dashboard" className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/25 group">
                                <span>ابدأ رحلة التفوق الآن</span>
                                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                            </Link>
                        </div>

                        {/* Left: 6 High-Conversion Feature Cards */}
                        <div className="lg:w-7/12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <FeatureCard
                                icon={<Video size={22} className="text-purple-600 dark:text-purple-400" />}
                                iconBg="bg-purple-100 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800"
                                badge="تفاعلي 100%"
                                badgeColor="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                title="شرح مباشر وتفاعلي"
                                description="حصص حية ومسجلة بتقنيات تفاعلية وخطوات تأسيس منهجية تناسب كافة المستويات."
                            />
                            <FeatureCard
                                icon={<Users size={22} className="text-blue-600 dark:text-blue-400" />}
                                iconBg="bg-blue-100 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800"
                                badge="نخبة معتمدة"
                                badgeColor="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                title="أفضل خبراء القياس"
                                description="معلمون ومستشارون متخصصون في اختبارات قياس والتحصيلي بخبرة تزيد عن 15 عاماً."
                            />
                            <FeatureCard
                                icon={<BarChart size={22} className="text-emerald-600 dark:text-emerald-400" />}
                                iconBg="bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
                                badge="ذكاء اصطناعي"
                                badgeColor="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                title="تحليل الأداء"
                                description="لوحة قياس وتقارير دقيقة تشخص ثغراتك وتحدد بالضبط ما يحتاج لتركيزك دون إضاعة دقيقة واحدة."
                            />
                            <FeatureCard
                                icon={<ShoppingCart size={22} className="text-indigo-600 dark:text-indigo-400" />}
                                iconBg="bg-indigo-100 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800"
                                badge="اشتراك شفاف"
                                badgeColor="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                title="باقات وعروض واضحة"
                                description="باقات مخصصة للطلاب والمدارس والمجموعات توضح كل ميزة تفتحها دون أي تكاليف خفية."
                            />
                            <FeatureCard
                                icon={<Award size={22} className="text-cyan-600 dark:text-cyan-400" />}
                                iconBg="bg-cyan-100 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800"
                                badge="حلول مؤسسية"
                                badgeColor="bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                                title="مدارس وفصول ذكية"
                                description="مساحة عمل متكاملة للمدارس والمشرفين لمتابعة تقدم الفصول والتدخل العلاجي السريع."
                            />
                            <FeatureCard
                                icon={<Book size={22} className="text-amber-600 dark:text-amber-400" />}
                                iconBg="bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800"
                                badge="شاملة ومحدثة"
                                badgeColor="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                title="ملفات وتجميعات حصرية"
                                description="خرائط مفاهيم وملخصات سريعة واختبارات محاكية تحاكي بيئة اختبار قياس الفعلية."
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section id="testimonials" className="py-20 bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 text-white relative overflow-hidden scroll-mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold mb-4 backdrop-blur-sm">
                            <Sparkles size={14} />
                            <span>تجارب حقيقية تصنع الفارق</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black mb-3 text-white tracking-tight">{sectionTexts.testimonialsTitle}</h2>
                        <p className="text-indigo-200 text-base max-w-2xl mx-auto">{sectionTexts.testimonialsSubtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {testimonials.slice(0, 3).map((testimonial) => (
                            <TestimonialCard key={testimonial.id} name={testimonial.name} degree={testimonial.degree} text={testimonial.text} image={testimonial.image} />
                        ))}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />
            </section>

            <ArticleReaderModal
                article={selectedArticle}
                isOpen={isArticleModalOpen}
                onClose={() => setIsArticleModalOpen(false)}
            />
        </div>
    );
};

const OrganicCard = ({ title, subtitle, icon, color, link, iconStyle }: any) => {
    const palette = resolveColor(color);

    if (iconStyle === 'modern') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div
                    className="w-full min-h-[176px] bg-white border-2 flex flex-col items-center justify-between p-6 shadow-sm hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-2.5 hover:scale-[1.02] active:scale-[0.98] rounded-3xl relative overflow-hidden"
                    style={{ borderColor: palette.border || palette.base }}
                >
                    <div className="absolute inset-0 bg-radial-at-tr from-transparent via-transparent to-black/[0.02] pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                        <div className="mb-3.5 p-3.5 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-xs" style={{ backgroundColor: palette.soft, color: palette.text }}>
                            {icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 mb-1.5 break-words">{title}</h3>
                        <p className="text-gray-500 text-xs font-medium px-2 leading-relaxed line-clamp-2">{subtitle}</p>
                    </div>
                    <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 text-xs font-black transition-colors duration-300" style={{ color: palette.text }}>
                        <span>استكشف المسار</span>
                        <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </div>
                </div>
            </Link>
        );
    }

    if (iconStyle === 'minimal') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div className="w-full min-h-[176px] bg-gray-50 flex flex-col items-center justify-between p-6 hover:bg-white hover:border-gray-200 border border-gray-100 transition-all duration-500 ease-out transform hover:-translate-y-2.5 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] rounded-3xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                        <div className="mb-3.5 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" style={{ color: palette.text }}>
                            {icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-1.5 break-words">{title}</h3>
                        <p className="text-gray-500 text-xs text-center px-2 line-clamp-2">{subtitle}</p>
                    </div>
                    <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
                        <span>استكشف المسار</span>
                        <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </div>
                </div>
            </Link>
        );
    }

    if (iconStyle === 'playful') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div
                    className="w-full min-h-[176px] text-white flex flex-col items-center justify-between p-6 shadow-[8px_8px_0px_#00000020] hover:shadow-[12px_12px_0px_#00000030] transition-all duration-500 ease-out transform hover:-translate-y-2.5 hover:scale-[1.02] active:scale-[0.98] rounded-[2rem] border-4 border-white relative overflow-hidden"
                    style={{ backgroundColor: palette.base }}
                >
                    <div className="absolute top-2 right-2 text-white/25 transform rotate-12 text-5xl pointer-events-none">✨</div>
                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                        <div className="mb-3.5 bg-white text-gray-800 p-3.5 rounded-2xl shadow-md group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                            {icon}
                        </div>
                        <h3 className="text-xl font-black drop-shadow-sm mb-1.5 break-words">{title}</h3>
                        <p className="text-white/85 text-xs font-medium px-2 leading-relaxed line-clamp-2">{subtitle}</p>
                    </div>
                    <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-black text-white group-hover:bg-white group-hover:text-gray-900 transition-all duration-300 shadow-xs">
                        <span>استكشف المسار</span>
                        <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link to={link || '#'} className="group block h-full w-full">
            <div
                className="w-full min-h-[176px] text-white flex flex-col items-center justify-between p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-2.5 hover:scale-[1.02] active:scale-[0.98] rounded-3xl relative overflow-hidden border border-white/15"
                style={{ backgroundColor: palette.base }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl group-hover:scale-125 group-hover:bg-white/15 transition-all duration-700 pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full blur-lg group-hover:scale-125 transition-all duration-700 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center w-full">
                    <div className="mb-3.5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-xs backdrop-blur-md group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-white/30 transition-all duration-300 border border-white/20">
                        {icon}
                    </div>
                    <h3 className="text-xl font-black drop-shadow-xs mb-1.5 break-words tracking-tight">{title}</h3>
                    <p className="text-white/85 text-xs font-medium px-2 leading-relaxed max-w-[240px] line-clamp-2">{subtitle}</p>
                </div>

                <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black text-white group-hover:bg-white group-hover:text-gray-900 transition-all duration-300 shadow-xs border border-white/20">
                    <span>استكشف المسار</span>
                    <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1.5" />
                </div>
            </div>
        </Link>
    );
};

interface FeatureCardProps {
    icon: React.ReactNode;
    iconBg?: string;
    badge?: string;
    badgeColor?: string;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, iconBg, badge, badgeColor, title, description }) => (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 p-5 sm:p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-transform duration-300 group-hover:scale-110 ${iconBg || 'bg-gray-50 border-gray-100'}`}>
                    {icon}
                </div>
                {badge && (
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border border-current/20 ${badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {badge}
                    </span>
                )}
            </div>
            <h3 className="font-black text-gray-900 dark:text-white text-base sm:text-lg mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-relaxed font-normal">
                {description}
            </p>
        </div>
    </div>
);

const TestimonialCard = ({ name, degree, text, image }: any) => (
    <div className="group relative bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-amber-400/40 p-6 sm:p-7 rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between overflow-hidden">
        <Quote size={52} className="absolute -top-3 -left-3 text-white/[0.04] group-hover:text-amber-400/10 transition-colors pointer-events-none" />

        <div>
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="relative">
                        <img src={image} alt={name} className="w-12 h-12 rounded-full border-2 border-amber-400/80 object-cover shadow-sm" />
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] shadow-xs font-black">
                            ✓
                        </span>
                    </div>
                    <div className="text-right">
                        <h4 className="font-black text-sm sm:text-base text-white group-hover:text-amber-200 transition-colors">{name}</h4>
                        <span className="text-white/60 text-[11px] font-bold">مشترك معتمد</span>
                    </div>
                </div>

                {degree ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-xs font-black text-amber-300 border border-amber-400/30 shadow-xs">
                        <Trophy size={12} />
                        {degree}
                    </span>
                ) : null}
            </div>

            <p className="text-indigo-100/90 text-sm sm:text-base leading-relaxed font-medium mb-6 italic">"{text}"</p>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                    <Star key={`star-${name}-${i}`} size={15} fill="currentColor" className="drop-shadow-xs" />
                ))}
            </div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle size={12} /> تجربة موثقة
            </span>
        </div>
    </div>
);
