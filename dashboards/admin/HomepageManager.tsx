import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { HomepageSettings, HomepageStat, HomepageTestimonial } from '../../types';
import { sanitizeHomepageSettings } from '../../utils/sanitizeMojibakeArabic';

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
        imageUrl: 'https://img.freepik.com/free-photo/saudi-arab-boy-student-wearing-thobe-holding-tablet_1258-122164.jpg',
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
        featuredArticlesTitle: 'مقالات ومراجعات مهمة',
        featuredArticlesSubtitle: 'اختر مجموعة مبسطة من المقالات والشروحات النصية لتظهر للزائر في الصفحة الرئيسية.',
        whyChooseTitle: 'لماذا يختار الطلاب منصة المئة؟',
        whyChooseDescription: 'نحن لا نقدم مجرد دورات، بل نقدم نظامًا تعليميًا متكاملًا يساعدك على الفهم العميق، التدريب المستمر، وتحليل الأداء بطريقة بسيطة وفعالة.',
        testimonialsTitle: 'قصص نجاح نعتز بها',
        testimonialsSubtitle: 'انضم لآلاف الطلاب الذين حققوا أحلامهم معنا',
    },
    testimonials: [
        { id: 't1', name: 'سارة العتيبي', degree: '98% قدرات', text: 'المنصة غيرت طريقة مذاكرتي تمامًا.', image: 'https://i.pravatar.cc/100?img=5' },
        { id: 't2', name: 'فهد الشمري', degree: '96% تحصيلي', text: 'الشروحات والتدريبات كانت مرتبة جدًا.', image: 'https://i.pravatar.cc/100?img=11' },
        { id: 't3', name: 'نورة السالم', degree: '99% قدرات', text: 'الاختبارات المحاكية كانت قريبة من الاختبار الحقيقي.', image: 'https://i.pravatar.cc/100?img=9' },
    ],
    featuredPathIds: [],
    featuredCourseIds: [],
    featuredArticleLessonIds: [],
};

const createEmptyStat = (): HomepageStat => ({
    id: `stat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    mode: 'manual',
    source: 'students',
    manualValue: '',
});

const createEmptyTestimonial = (): HomepageTestimonial => ({
    id: `testimonial_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    degree: '',
    text: '',
    image: '',
});

export const HomepageManager: React.FC = () => {
    const { paths, courses, lessons, subjects } = useStore();
    const [settings, setSettings] = useState<HomepageSettings>(defaultHomepageSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSettings = async () => {
            try {
                const response = await api.getHomepageSettings();
                if (!cancelled && response) {
                    setSettings(sanitizeHomepageSettings(response as HomepageSettings));
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل إعدادات الصفحة الرئيسية.');
                    setSettings(defaultHomepageSettings);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    const availablePaths = useMemo(
        () => paths.filter((path) => path.isActive !== false && path.id && path.name),
        [paths],
    );

    const availableArticleLessons = useMemo(
        () =>
            lessons.filter(
                (lesson) =>
                    (lesson.type === 'text' || Boolean(lesson.content?.trim())) &&
                    lesson.showOnPlatform !== false &&
                    lesson.approvalStatus !== 'pending_review' &&
                    lesson.approvalStatus !== 'rejected' &&
                    lesson.id &&
                    lesson.title,
            ),
        [lessons],
    );

    const availableCourses = useMemo(
        () => courses.filter((course) => !course.isPackage && course.id && course.title),
        [courses],
    );

    const homepageSummary = useMemo(() => {
        const featuredPathsCount = settings.featuredPathIds.length > 0 ? settings.featuredPathIds.length : availablePaths.length;
        const featuredCoursesCount = settings.featuredCourseIds.length > 0 ? settings.featuredCourseIds.length : Math.min(availableCourses.length, 3);
        const featuredArticlesCount =
            (settings.featuredArticleLessonIds?.length || 0) > 0
                ? settings.featuredArticleLessonIds!.length
                : Math.min(availableArticleLessons.length, 3);

        return {
            featuredPathsCount,
            featuredCoursesCount,
            featuredArticlesCount,
            statsCount: settings.stats.filter((item) => item.label.trim().length > 0).length,
            testimonialsCount: settings.testimonials.filter((item) => item.name.trim().length > 0 && item.text.trim().length > 0).length,
        };
    }, [availableArticleLessons.length, availableCourses.length, availablePaths.length, settings.featuredArticleLessonIds, settings.featuredCourseIds, settings.featuredPathIds, settings.stats, settings.testimonials]);

    const updateHeroField = (field: keyof HomepageSettings['hero'], value: string) => {
        setSettings((prev) => ({
            ...prev,
            hero: {
                ...prev.hero,
                [field]: value,
            },
        }));
    };

    const updateSectionField = (field: keyof HomepageSettings['sections'], value: string) => {
        setSettings((prev) => ({
            ...prev,
            sections: {
                ...prev.sections,
                [field]: value,
            },
        }));
    };

    const updateStat = (index: number, updates: Partial<HomepageStat>) => {
        setSettings((prev) => ({
            ...prev,
            stats: prev.stats.map((stat, statIndex) => (statIndex === index ? { ...stat, ...updates } : stat)),
        }));
    };

    const updateTestimonial = (index: number, updates: Partial<HomepageTestimonial>) => {
        setSettings((prev) => ({
            ...prev,
            testimonials: prev.testimonials.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)),
        }));
    };

    const toggleId = (collection: string[], id: string) =>
        collection.includes(id) ? collection.filter((item) => item !== id) : [...collection, id];

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload: HomepageSettings = {
                ...settings,
                hero: { ...settings.hero },
                sections: { ...settings.sections },
                stats: settings.stats.filter((item) => item.label.trim().length > 0),
                testimonials: settings.testimonials.filter((item) => item.name.trim().length > 0 && item.text.trim().length > 0),
            };

            const response = await api.updateHomepageSettings(payload);
            setSettings(sanitizeHomepageSettings(response as HomepageSettings));
            setSuccess('تم حفظ إعدادات الصفحة الرئيسية بنجاح.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ إعدادات الصفحة الرئيسية.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
                جارٍ تحميل إعدادات الصفحة الرئيسية...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الصفحة الرئيسية</h1>
                    <p className="text-sm text-gray-500 mt-1">تحكم في الهيرو والعدادات والدورات والمسارات المميزة وآراء الطلاب بدون تغيير شكل الموقع.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="#/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-amber-100 bg-white text-amber-700 font-bold hover:bg-amber-50 transition-colors"
                    >
                        <ExternalLink size={18} />
                        معاينة الصفحة
                    </a>
                    <button
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-60"
                    >
                        <Save size={18} />
                        {isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>
            </div>

            {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}
            {success && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div>}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <ImageIcon size={18} />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900">قسم البداية (Hero)</h2>
                                <p className="text-sm text-gray-500">العنوان الرئيسي، الأزرار، الصورة، والبطاقة العائمة.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField label="الشارة الصغيرة" value={settings.hero.badgeText || ''} onChange={(value) => updateHeroField('badgeText', value)} />
                            <TextField label="الصورة الرئيسية" value={settings.hero.imageUrl || ''} onChange={(value) => updateHeroField('imageUrl', value)} />
                            <TextField label="مقدمة العنوان" value={settings.hero.titlePrefix || ''} onChange={(value) => updateHeroField('titlePrefix', value)} />
                            <TextField label="الكلمة المميزة" value={settings.hero.titleHighlight || ''} onChange={(value) => updateHeroField('titleHighlight', value)} />
                            <TextField label="نهاية العنوان" value={settings.hero.titleSuffix || ''} onChange={(value) => updateHeroField('titleSuffix', value)} />
                            <TextField label="عنوان البطاقة العائمة" value={settings.hero.floatingCardTitle || ''} onChange={(value) => updateHeroField('floatingCardTitle', value)} />
                            <TextField label="وصف البطاقة العائمة" value={settings.hero.floatingCardSubtitle || ''} onChange={(value) => updateHeroField('floatingCardSubtitle', value)} />
                            <TextField label="نص نسبة التقدم" value={settings.hero.floatingCardProgressValue || ''} onChange={(value) => updateHeroField('floatingCardProgressValue', value)} />
                            <TextField label="زر البداية" value={settings.hero.primaryCtaLabel || ''} onChange={(value) => updateHeroField('primaryCtaLabel', value)} />
                            <TextField label="رابط زر البداية" value={settings.hero.primaryCtaLink || ''} onChange={(value) => updateHeroField('primaryCtaLink', value)} />
                            <TextField label="زر ثانوي" value={settings.hero.secondaryCtaLabel || ''} onChange={(value) => updateHeroField('secondaryCtaLabel', value)} />
                            <TextField label="رابط الزر الثانوي" value={settings.hero.secondaryCtaLink || ''} onChange={(value) => updateHeroField('secondaryCtaLink', value)} />
                        </div>

                        <TextAreaField label="الوصف الرئيسي" value={settings.hero.description || ''} onChange={(value) => updateHeroField('description', value)} rows={4} />
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-900">العدادات العلوية</h2>
                                <p className="text-sm text-gray-500">يمكنك الاعتماد على البيانات الحقيقية أو إدخال رقم يدوي.</p>
                            </div>
                            <button
                                onClick={() => setSettings((prev) => ({ ...prev, stats: [...prev.stats, createEmptyStat()] }))}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                <Plus size={16} />
                                إضافة عداد
                            </button>
                        </div>

                        <div className="space-y-4">
                            {settings.stats.map((stat, index) => (
                                <div key={stat.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <TextField label="عنوان العداد" value={stat.label} onChange={(value) => updateStat(index, { label: value })} />
                                        <SelectField
                                            label="نوع القيمة"
                                            value={stat.mode}
                                            onChange={(value) => updateStat(index, { mode: value as HomepageStat['mode'] })}
                                            options={[
                                                { value: 'dynamic', label: 'ديناميكي' },
                                                { value: 'manual', label: 'يدوي' },
                                            ]}
                                        />
                                        <SelectField
                                            label="المصدر"
                                            value={stat.source}
                                            onChange={(value) => updateStat(index, { source: value as HomepageStat['source'] })}
                                            options={[
                                                { value: 'students', label: 'الطلاب' },
                                                { value: 'courses', label: 'الدورات' },
                                                { value: 'assets', label: 'المواد' },
                                                { value: 'rating', label: 'التقييم' },
                                            ]}
                                        />
                                        <TextField
                                            label="القيمة اليدوية"
                                            value={stat.manualValue || ''}
                                            onChange={(value) => updateStat(index, { manualValue: value })}
                                            disabled={stat.mode !== 'manual'}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setSettings((prev) => ({ ...prev, stats: prev.stats.filter((_, statIndex) => statIndex !== index) }))}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 size={15} />
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-900">آراء الطلاب</h2>
                                <p className="text-sm text-gray-500">ثلاث بطاقات بسيطة تكفي وتناسب الصفحة الرئيسية.</p>
                            </div>
                            <button
                                onClick={() => setSettings((prev) => ({ ...prev, testimonials: [...prev.testimonials, createEmptyTestimonial()] }))}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                <Plus size={16} />
                                إضافة رأي
                            </button>
                        </div>

                        <div className="space-y-4">
                            {settings.testimonials.map((testimonial, index) => (
                                <div key={testimonial.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <TextField label="اسم الطالب" value={testimonial.name} onChange={(value) => updateTestimonial(index, { name: value })} />
                                        <TextField label="النتيجة/الشارة" value={testimonial.degree || ''} onChange={(value) => updateTestimonial(index, { degree: value })} />
                                        <TextField label="الصورة" value={testimonial.image || ''} onChange={(value) => updateTestimonial(index, { image: value })} />
                                    </div>
                                    <TextAreaField label="النص" value={testimonial.text} onChange={(value) => updateTestimonial(index, { text: value })} rows={3} />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setSettings((prev) => ({ ...prev, testimonials: prev.testimonials.filter((_, itemIndex) => itemIndex !== index) }))}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 size={15} />
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">ملخص الواجهة الحالية</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <SummaryCard label="مسارات ظاهرة في الصفحة" value={homepageSummary.featuredPathsCount} tone="blue" />
                            <SummaryCard label="دورات مميزة" value={homepageSummary.featuredCoursesCount} tone="amber" />
                            <SummaryCard label="مقالات مميزة" value={homepageSummary.featuredArticlesCount} tone="emerald" />
                            <SummaryCard label="عدادات فعالة" value={homepageSummary.statsCount} tone="slate" />
                            <SummaryCard label="آراء طلاب جاهزة" value={homepageSummary.testimonialsCount} tone="violet" />
                        </div>
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-600">
                            ما تضبطه هنا يظهر للزائر فقط إذا كان المحتوى نفسه معتمدًا ومفتوحًا على المنصة. هذا يمنع ظهور عناصر ما زالت تحت التجهيز.
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">عناوين الأقسام</h2>
                        <TextField label="عنوان الدورات" value={settings.sections.featuredCoursesTitle || ''} onChange={(value) => updateSectionField('featuredCoursesTitle', value)} />
                        <TextAreaField label="وصف الدورات" value={settings.sections.featuredCoursesSubtitle || ''} onChange={(value) => updateSectionField('featuredCoursesSubtitle', value)} rows={2} />
                        <TextField label="عنوان المقالات" value={settings.sections.featuredArticlesTitle || ''} onChange={(value) => updateSectionField('featuredArticlesTitle', value)} />
                        <TextAreaField label="وصف المقالات" value={settings.sections.featuredArticlesSubtitle || ''} onChange={(value) => updateSectionField('featuredArticlesSubtitle', value)} rows={2} />
                        <TextField label="عنوان لماذا نحن" value={settings.sections.whyChooseTitle || ''} onChange={(value) => updateSectionField('whyChooseTitle', value)} />
                        <TextAreaField label="وصف لماذا نحن" value={settings.sections.whyChooseDescription || ''} onChange={(value) => updateSectionField('whyChooseDescription', value)} rows={4} />
                        <TextField label="عنوان الآراء" value={settings.sections.testimonialsTitle || ''} onChange={(value) => updateSectionField('testimonialsTitle', value)} />
                        <TextAreaField label="وصف الآراء" value={settings.sections.testimonialsSubtitle || ''} onChange={(value) => updateSectionField('testimonialsSubtitle', value)} rows={2} />
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">المسارات المميزة</h2>
                        <p className="text-sm text-gray-500">إذا لم تحدد شيئًا، ستظهر كل المسارات المفعلة في الصفحة الرئيسية.</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {availablePaths.map((path) => (
                                <label key={path.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.featuredPathIds.includes(path.id)}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                featuredPathIds: toggleId(prev.featuredPathIds, path.id),
                                            }))
                                        }
                                        className="accent-amber-500"
                                    />
                                    <span className="font-medium text-gray-800">{path.name}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">الدورات المميزة</h2>
                        <p className="text-sm text-gray-500">حدد الدورات التي تريد إبرازها أولًا في الواجهة العامة.</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {availableCourses.slice(0, 30).map((course) => (
                                <label key={course.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.featuredCourseIds.includes(course.id)}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                featuredCourseIds: toggleId(prev.featuredCourseIds, course.id),
                                            }))
                                        }
                                        className="accent-amber-500"
                                    />
                                    <span className="font-medium text-gray-800">{course.title}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">المقالات المميزة</h2>
                        <p className="text-sm text-gray-500">اختر المقالات أو الشروحات النصية التي تريد إبرازها للزائر في الصفحة الرئيسية.</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {availableArticleLessons.slice(0, 30).map((lesson) => {
                                const subjectName = subjects.find((subject) => subject.id === lesson.subjectId)?.name;
                                return (
                                    <label key={lesson.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(settings.featuredArticleLessonIds || []).includes(lesson.id)}
                                            onChange={() =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    featuredArticleLessonIds: toggleId(prev.featuredArticleLessonIds || [], lesson.id),
                                                }))
                                            }
                                            className="accent-amber-500 mt-1"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-800">{lesson.title}</div>
                                            <div className="text-xs text-gray-500 mt-1">{subjectName || 'شرح عام'}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const TextField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}> = ({ label, value, onChange, disabled }) => (
    <label className="block">
        <span className="block text-sm font-bold text-gray-700 mb-2">{label}</span>
        <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-gray-100 disabled:text-gray-400"
        />
    </label>
);

const TextAreaField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
}> = ({ label, value, onChange, rows = 3 }) => (
    <label className="block">
        <span className="block text-sm font-bold text-gray-700 mb-2">{label}</span>
        <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-y"
        />
    </label>
);

const SelectField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}> = ({ label, value, onChange, options }) => (
    <label className="block">
        <span className="block text-sm font-bold text-gray-700 mb-2">{label}</span>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </label>
);

const SummaryCard: React.FC<{
    label: string;
    value: number;
    tone?: 'blue' | 'amber' | 'emerald' | 'slate' | 'violet';
}> = ({ label, value, tone = 'slate' }) => {
    const tones = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-100',
    };

    return (
        <div className={`rounded-2xl border px-4 py-4 ${tones[tone]}`}>
            <div className="text-xs font-bold opacity-80">{label}</div>
            <div className="mt-2 text-2xl font-black">{value}</div>
        </div>
    );
};
