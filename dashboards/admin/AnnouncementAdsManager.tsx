import React, { useMemo, useState } from 'react';
import { Copy, ExternalLink, Eye, ImagePlus, Megaphone, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AnnouncementAd, AnnouncementAudience, AnnouncementDisplayMode, AnnouncementFrequency, AnnouncementImageFit } from '../../types';
import { ANNOUNCEMENT_AD_PREVIEW_EVENT } from '../../components/AnnouncementAdsOverlay';

const MAX_AD_IMAGE_BYTES = 900 * 1024;

const audienceLabels: Record<AnnouncementAudience, string> = {
  all: 'كل الزوار', guest: 'غير المسجلين', student: 'الطلاب', parent: 'أولياء الأمور', staff: 'الإدارة والفريق',
};
const displayModeLabels: Record<AnnouncementDisplayMode, string> = {
  modal: 'نافذة وسط الشاشة', 'top-banner': 'شريط علوي خفيف',
};
const frequencyLabels: Record<AnnouncementFrequency, string> = {
  session: 'مرة في الجلسة', once: 'مرة واحدة فقط', always: 'كل زيارة',
};
const imageFitLabels: Record<AnnouncementImageFit, string> = {
  cover: 'ملء المساحة', contain: 'إظهار الصورة كاملة',
};

const toDateInput = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fromDateInput = (value: string, boundary: 'start' | 'end' = 'start') => {
  if (!value) return undefined;
  const suffix = boundary === 'end' ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).getTime();
};

const PLATFORM_PRESET_IMAGES = [
  // باقة استوديو المئة النهاري 3D
  {
    title: 'استوديو التابلت الذكي',
    subtitle: 'تدريب تفاعلي ومؤشرات حية',
    url: '/images/smart-learning-tablet.jpg',
  },
  {
    title: 'إتقان القدرات والكمي',
    subtitle: 'حلول ذكية للمسائل',
    url: '/images/daylight-qudrat-math.jpg',
  },
  {
    title: 'مختبر التحصيلي العلمي',
    subtitle: 'علوم ورياضيات',
    url: '/images/daylight-tahsili-science.jpg',
  },
  {
    title: 'محاكاة قياس بالوقت',
    subtitle: 'بيئة اختبارية مطابقة',
    url: '/images/daylight-mock-simulation.jpg',
  },
  {
    title: 'المعلم الآلي الذكي AI',
    subtitle: 'توجيه وتحليل فوري',
    url: '/images/daylight-ai-tutor.jpg',
  },
  {
    title: 'فرحة الـ 100% والتفوق',
    subtitle: 'الكأس الذهبي والقبول',
    url: '/images/daylight-celebration-100.jpg',
  },
  {
    title: 'حلبة التنافس المدرسي',
    subtitle: 'مسابقات الفصول والمدارس',
    url: '/images/daylight-school-arena.jpg',
  },

  // النمط السيبراني الليلي
  {
    title: 'بطل القدرات العامة',
    subtitle: 'كمي ولفظي',
    url: '/images/qudrat-champion.jpg',
  },
  {
    title: 'التميز التحصيلي',
    subtitle: 'علوم ورياضيات',
    url: '/images/tahsili-excellence.jpg',
  },
  {
    title: 'محاكاة اختبارات قياس',
    subtitle: 'بيئة اختبارية مطابقة',
    url: '/images/mock-exam-simulation.jpg',
  },
  {
    title: 'المعلم الذكي AI',
    subtitle: 'تحليل وتدريب موجه',
    url: '/images/ai-smart-tutor.jpg',
  },
  {
    title: 'فرحة التفوق 100%',
    subtitle: 'حقق المئة واستعد للجامعة',
    url: '/images/score-celebration.jpg',
  },
  {
    title: 'ميدان التنافس والفصول',
    subtitle: 'تحديات جماعية للمدارس',
    url: '/images/classroom-arena.jpg',
  },
];

const AD_TEMPLATES = [
  {
    title: 'مفاجأة سارة - خصم خاص على الاشتراكات',
    body: 'استفد من العرض الحصري لمنصة المئة واشترك الآن للوصول الكامل إلى بنك الأسئلة والشروحات التفاعلية.',
    ctaLabel: 'استفد من العرض الآن',
    ctaUrl: '/pricing',
    imageUrl: '/images/score-celebration.jpg',
    audience: 'all' as AnnouncementAudience,
    displayMode: 'modal' as AnnouncementDisplayMode,
    frequency: 'session' as AnnouncementFrequency,
    priority: 5,
  },
  {
    title: 'انطلاق تدريب مسار القدرات العامة',
    body: 'ابدأ خطتك المكثفة مع شروحات الكمي واللفظي واختبارات المحاكاة الذكية المقاسة بالوقت.',
    ctaLabel: 'ابدأ التدريب فوراً',
    ctaUrl: '/category/p_qudrat',
    imageUrl: '/images/qudrat-champion.jpg',
    audience: 'student' as AnnouncementAudience,
    displayMode: 'modal' as AnnouncementDisplayMode,
    frequency: 'session' as AnnouncementFrequency,
    priority: 10,
  },
  {
    title: 'اختبارات نافس الوطنية المحاكية',
    body: 'قيّم مهاراتك في اختبارات نافس الوزارية مع تصحيح فوري ورصد للمفاهيم التي تحتاج تقوية.',
    ctaLabel: 'خُض الاختبار التجريبي',
    ctaUrl: '/category/p_nafes',
    imageUrl: '/images/mock-exam-simulation.jpg',
    audience: 'student' as AnnouncementAudience,
    displayMode: 'top-banner' as AnnouncementDisplayMode,
    frequency: 'always' as AnnouncementFrequency,
    priority: 15,
  },
  {
    title: 'بوابة المدارس والفصول الذكية',
    body: 'اربط مدرستك وفصولك الذكية بمنصة المئة لتحصل على تقارير تفصيلية ومتابعة مستمرة لطلابك.',
    ctaLabel: 'استكشف بوابة المدارس',
    ctaUrl: '/admin-dashboard?tab=schools',
    imageUrl: '/images/classroom-arena.jpg',
    audience: 'staff' as AnnouncementAudience,
    displayMode: 'modal' as AnnouncementDisplayMode,
    frequency: 'session' as AnnouncementFrequency,
    priority: 20,
  },
];

const QUICK_DESTINATIONS = [
  { label: 'مسار القدرات', url: '/category/p_qudrat', cta: 'ابدأ التدريب' },
  { label: 'مسار التحصيلي', url: '/category/p_tahsili', cta: 'استكشف التحصيلي' },
  { label: 'اختبارات نافس', url: '/category/p_nafes', cta: 'خُض الاختبار' },
  { label: 'باقات المنصة', url: '/pricing', cta: 'اشترك الآن' },
  { label: 'إدارة المدارس', url: '/admin-dashboard?tab=schools', cta: 'إدارة المدارس' },
  { label: 'الرئيسية', url: '/', cta: 'الرئيسية' },
];

const createDefaultAd = (): AnnouncementAd => ({
  id: `ad_${Date.now()}`,
  title: 'إعلان جديد',
  body: '',
  imageUrl: '',
  ctaLabel: 'افتح الآن',
  ctaUrl: '/',
  audience: 'all',
  displayMode: 'modal',
  frequency: 'session',
  imageFit: 'cover',
  delaySeconds: 0,
  isActive: true,
  priority: 10,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const AnnouncementAdsManager: React.FC = () => {
  const { announcementAds, createAnnouncementAd, updateAnnouncementAd, deleteAnnouncementAd } = useStore();
  const [selectedId, setSelectedId] = useState(announcementAds[0]?.id || '');
  const [feedback, setFeedback] = useState('');
  const [previewTab, setPreviewTab] = useState<'modal' | 'banner'>('modal');

  const sortedAds = useMemo(
    () => [...announcementAds].sort((a, b) => a.priority - b.priority || b.createdAt - a.createdAt),
    [announcementAds],
  );

  const selectedAd = sortedAds.find((ad) => ad.id === selectedId) || sortedAds[0];
  const activeCount = sortedAds.filter((ad) => ad.isActive).length;

  const addAd = () => {
    const nextAd = createDefaultAd();
    createAnnouncementAd(nextAd);
    setSelectedId(nextAd.id);
    setFeedback('تم إنشاء إعلان جديد.');
  };

  const applyTemplate = (template: typeof AD_TEMPLATES[number]) => {
    const nextAd: AnnouncementAd = {
      ...createDefaultAd(),
      ...template,
      id: `ad_${Date.now()}`,
    };
    createAnnouncementAd(nextAd);
    setSelectedId(nextAd.id);
    setFeedback(`تم إنشاء إعلان جديد من قالب "${template.title}".`);
  };

  const duplicateSelected = () => {
    if (!selectedAd) return;
    const duplicated: AnnouncementAd = {
      ...selectedAd,
      id: `ad_${Date.now()}`,
      title: `[نسخة] ${selectedAd.title}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    createAnnouncementAd(duplicated);
    setSelectedId(duplicated.id);
    setFeedback('تم تكرار الإعلان بنجاح.');
  };

  const updateSelected = (data: Partial<AnnouncementAd>) => {
    if (!selectedAd) return;
    updateAnnouncementAd(selectedAd.id, data);
    setFeedback('تم حفظ التعديل.');
  };

  const previewSelected = () => {
    if (!selectedAd) return;
    window.dispatchEvent(new CustomEvent(ANNOUNCEMENT_AD_PREVIEW_EVENT, { detail: { id: selectedAd.id } }));
    setFeedback('تم فتح معاينة الإعلان على الموقع.');
  };

  const handleImageUpload = (file?: File) => {
    if (!file || !selectedAd) return;
    if (file.size > MAX_AD_IMAGE_BYTES) {
      setFeedback('الصورة كبيرة. يفضل WebP/JPG أقل من 900KB وبأبعاد 1200x675.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSelected({ imageUrl: String(reader.result || '') });
      setFeedback('تم رفع صورة الإعلان.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── رأس لوحة إدارة الإعلانات مع إحصائيات سريعة ── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 border border-amber-200/60">
                <Megaphone size={14} /> إدارة الإعلانات
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
                {activeCount} نشط من {sortedAds.length}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">الإعلانات العائمة عند فتح الموقع</h2>
            <p className="mt-1 text-xs font-medium text-slate-500 leading-6">
              أنشئ إعلانًا بصورة أو رسالة مختصرة، وحدد الجمهور وزر الانتقال داخل المنصة بدون التأثير على سرعة فتح الصفحة.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button type="button" onClick={addAd} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer">
              <Plus size={16} /> إعلان جديد
            </button>
          </div>
        </div>

        {/* ── قوالب جاهزة سريعة للإعلانات ── */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2.5 text-xs font-black text-slate-700">
            <Sparkles size={14} className="text-amber-500" />
            <span>قوالب إعلانية مقترحة للمنصة (انقر للإنشاء الفوري):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {AD_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                type="button"
                onClick={() => applyTemplate(tmpl)}
                className="flex flex-col text-right p-3 rounded-xl border border-slate-200/70 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <span className="text-xs font-black text-slate-900 group-hover:text-indigo-700 line-clamp-1">{tmpl.title}</span>
                <span className="mt-1 text-[11px] text-slate-500 line-clamp-1">{tmpl.body}</span>
                <span className="mt-2 text-[10px] font-bold text-indigo-600 bg-white/80 self-start px-2 py-0.5 rounded border border-slate-200/60">
                  + استخدام القالب
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
        {/* ── القائمة الجانبية للإعلانات ── */}
        <div className="space-y-2.5">
          <div className="text-xs font-black text-slate-500 px-1">قائمة الإعلانات المسجلة ({sortedAds.length})</div>
          {sortedAds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs font-bold text-slate-400">
              لا توجد إعلانات بعد. اضغط "إعلان جديد" للبدء.
            </div>
          ) : (
            sortedAds.map((ad) => (
              <div
                key={ad.id}
                onClick={() => setSelectedId(ad.id)}
                className={`rounded-2xl border p-3.5 text-right shadow-2xs transition-all cursor-pointer ${
                  selectedAd?.id === ad.id ? 'border-indigo-400 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-200' : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 leading-snug line-clamp-1">{ad.title}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateAnnouncementAd(ad.id, { isActive: !ad.isActive }); }}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black transition-colors ${
                      ad.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {ad.isActive ? 'نشط' : 'متوقف'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>{audienceLabels[ad.audience]}</span>
                  <span className="text-[10px] text-slate-400">{displayModeLabels[ad.displayMode || 'modal']}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── نموذج التعديل والمعاينة ── */}
        {selectedAd ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700">عنوان الإعلان</span>
                  <input aria-label="عنوان الإعلان" title="عنوان الإعلان" value={selectedAd.title} onChange={(event) => updateSelected({ title: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700">النص المختصر</span>
                  <textarea aria-label="النص المختصر" title="النص المختصر" value={selectedAd.body || ''} onChange={(event) => updateSelected({ body: event.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">الجمهور</span>
                  <select value={selectedAd.audience} onChange={(event) => updateSelected({ audience: event.target.value as AnnouncementAudience })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400">
                    {Object.entries(audienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">طريقة العرض</span>
                  <select value={selectedAd.displayMode || 'modal'} onChange={(event) => updateSelected({ displayMode: event.target.value as AnnouncementDisplayMode })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400">
                    {Object.entries(displayModeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">تكرار الظهور</span>
                  <select value={selectedAd.frequency || 'session'} onChange={(event) => updateSelected({ frequency: event.target.value as AnnouncementFrequency })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400">
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">الترتيب</span>
                  <input aria-label="ترتيب الإعلان" title="ترتيب الإعلان" type="number" value={selectedAd.priority} onChange={(event) => updateSelected({ priority: Number(event.target.value || 0) })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">تأخير الظهور بالثواني</span>
                  <input aria-label="تأخير ظهور الإعلان بالثواني" title="تأخير ظهور الإعلان بالثواني" type="number" min={0} max={30} value={selectedAd.delaySeconds ?? 0} onChange={(event) => updateSelected({ delaySeconds: Math.max(0, Math.min(30, Number(event.target.value || 0))) })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">عرض الصورة</span>
                  <select value={selectedAd.imageFit || 'cover'} onChange={(event) => updateSelected({ imageFit: event.target.value as AnnouncementImageFit })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400">
                    {Object.entries(imageFitLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">من تاريخ</span>
                  <input aria-label="تاريخ بداية الإعلان" title="تاريخ بداية الإعلان" type="date" value={toDateInput(selectedAd.startsAt)} onChange={(event) => updateSelected({ startsAt: fromDateInput(event.target.value, 'start') })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">حتى تاريخ</span>
                  <input aria-label="تاريخ نهاية الإعلان" title="تاريخ نهاية الإعلان" type="date" value={toDateInput(selectedAd.endsAt)} onChange={(event) => updateSelected({ endsAt: fromDateInput(event.target.value, 'end') })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">نص الزر</span>
                  <input aria-label="نص زر الإعلان" title="نص زر الإعلان" value={selectedAd.ctaLabel || ''} onChange={(event) => updateSelected({ ctaLabel: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">رابط الزر</span>
                  <input aria-label="رابط زر الإعلان" title="رابط زر الإعلان" value={selectedAd.ctaUrl || ''} placeholder="/category/p_xxx أو https://" onChange={(event) => updateSelected({ ctaUrl: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                  {/* ── وجهات سريعة لروابط المنصة ── */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-bold">اختيار سريع:</span>
                    {QUICK_DESTINATIONS.map((dest) => (
                      <button key={dest.label} type="button" onClick={() => updateSelected({ ctaUrl: dest.url, ctaLabel: selectedAd.ctaLabel || dest.cta })} className="text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer">
                        {dest.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700">رابط الصورة أو رفع صورة</span>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_auto]">
                    <input aria-label="رابط صورة الإعلان" title="رابط صورة الإعلان" value={selectedAd.imageUrl || ''} onChange={(event) => updateSelected({ imageUrl: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-400" />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-indigo-200 px-4 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs">
                      <ImagePlus size={16} /> تحميل
                      <input type="file" accept="image/*" className="hidden" aria-label="رفع صورة الإعلان" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                    </label>
                  </div>
                  <span className="block text-[11px] font-medium leading-5 text-slate-400">
                    الأبعاد المناسبة: 1200x675، ويفضل WebP/JPG أقل من 900KB حتى لا يبطئ الإعلان فتح الموقع.
                  </span>

                  {/* ── مكتبة صور المنصة الرسمية ── */}
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600">صور المنصة الموصى بها (قدرات، تحصيلي، محاكاة):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {PLATFORM_PRESET_IMAGES.map((preset) => {
                        const isSelected = selectedAd.imageUrl === preset.url;
                        return (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => updateSelected({ imageUrl: preset.url })}
                            className={`group relative flex flex-col items-start rounded-xl border p-1.5 text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="h-12 w-full rounded-lg object-cover shadow-2xs group-hover:scale-[1.02] transition-transform"
                            />
                            <span className="mt-1 line-clamp-1 text-[10px] font-black text-slate-700">
                              {preset.title}
                            </span>
                            <span className="line-clamp-1 text-[9px] text-slate-400">
                              {preset.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => updateSelected({ isActive: !selectedAd.isActive })} className={`rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${selectedAd.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                  {selectedAd.isActive ? 'نشط ويظهر' : 'متوقف'}
                </button>
                <button type="button" onClick={previewSelected} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 px-4 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer">
                  <Eye size={15} /> معاينة على الموقع الآن
                </button>
                <button type="button" onClick={duplicateSelected} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer" title="تكرار هذا الإعلان">
                  <Copy size={14} /> تكرار
                </button>
                <button type="button" onClick={() => { if (!window.confirm('هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.')) return; deleteAnnouncementAd(selectedAd.id); setSelectedId(sortedAds.find((ad) => ad.id !== selectedAd.id)?.id || ''); }} className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200/80 px-3.5 py-2 text-xs font-black text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                  <Trash2 size={14} /> حذف
                </button>
                {feedback && <span className="text-xs font-bold text-emerald-600 mr-auto">{feedback}</span>}
              </div>
            </div>

            {/* ── لوحة المعاينة المباشرة ── */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">معاينة مباشرة</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                  <button type="button" onClick={() => setPreviewTab('modal')} className={`px-2 py-0.5 rounded ${previewTab === 'modal' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-500'}`}>نافذة</button>
                  <button type="button" onClick={() => setPreviewTab('banner')} className={`px-2 py-0.5 rounded ${previewTab === 'banner' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-500'}`}>شريط</button>
                </div>
              </div>

              {previewTab === 'modal' ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                  {selectedAd.imageUrl ? (
                    <img src={selectedAd.imageUrl} alt="" className={`h-36 w-full ${selectedAd.imageFit === 'contain' ? 'object-contain bg-slate-50' : 'object-cover'}`} />
                  ) : (
                    <div className="h-24 bg-gradient-to-l from-indigo-600 to-blue-500 flex items-center justify-center text-white/50 text-2xl">📢</div>
                  )}
                  <div className="space-y-2 p-3.5">
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">إعلان المنصة</span>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">{selectedAd.title}</h4>
                    {selectedAd.body && <p className="text-[11px] leading-5 text-slate-500">{selectedAd.body}</p>}
                    {selectedAd.ctaLabel && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-black text-white shadow-2xs">
                        {selectedAd.ctaLabel} <ExternalLink size={12} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-800">شريط علوي للموقع</span>
                    <span className="text-[10px] text-slate-400">يثبت في أعلى الموقع</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 line-clamp-1">{selectedAd.title}</p>
                  {selectedAd.ctaLabel && (
                    <div className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black text-white">
                      {selectedAd.ctaLabel} <ExternalLink size={11} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
