import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

const getSeoBaseUrl = () => {
  const configuredSiteUrl = String(
    import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL || '',
  ).trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};

const SEO_BASE_URL = getSeoBaseUrl();
const SEO_DEFAULT_IMAGE_PATH = '/images/homepage-hero-boy-platform.webp';

const SEO_PRIVATE_PREFIXES = [
  '/dashboard',
  '/admin-dashboard',
  '/instructor-dashboard',
  '/school-teacher-dashboard',
  '/school-director-dashboard',
  '/supervisor-dashboard',
  '/parent-dashboard',
  '/quiz',
  '/results',
  '/my-quizzes',
  '/reports',
  '/favorites',
  '/plan',
  '/qa',
  '/book-session',
  '/live-sessions',
  '/classroom',
  '/profile',
  '/admin',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

const upsertMeta = (selector: string, attribute: 'name' | 'property', name: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const ADMIN_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة الإدارة | نظرة عامة والنبض التشغيلي - منصة المئة',
    description: 'لوحة التحكم الإدارية ونظرة عامة على مؤشرات الأداء والتشغيل في منصة المئة.',
  },
  paths: {
    title: 'لوحة الإدارة | إدارة المسارات والمناهج - منصة المئة',
    description: 'إدارة وتعديل المسارات التعليمية والمناهج والأقسام داخل منصة المئة.',
  },
  courses: {
    title: 'لوحة الإدارة | إدارة المسارات والمناهج - منصة المئة',
    description: 'إدارة وتعديل المسارات التعليمية والمناهج والأقسام داخل منصة المئة.',
  },
  lessons: {
    title: 'لوحة الإدارة | مركز الدروس التعليمية - منصة المئة',
    description: 'إدارة ونشر وتنسيق الدروس والشروحات التعليمية داخل منصة المئة.',
  },
  library: {
    title: 'لوحة الإدارة | مركز المكتبة وملفات الدعم - منصة المئة',
    description: 'إدارة المذكرات والملفات والكتب الداعمة لمسارات القدرات والتحصيلي.',
  },
  quizzes: {
    title: 'لوحة الإدارة | مركز إدارة الاختبارات - منصة المئة',
    description: 'إنشاء وجدولة وإدارة الاختبارات التدريبية والمركزية داخل منصة المئة.',
  },
  'mock-exams': {
    title: 'لوحة الإدارة | مركز الاختبارات المحاكية - منصة المئة',
    description: 'إدارة نماذج المحاكاة الموزونة لاختبارات القدرات والتحصيلي.',
  },
  questions: {
    title: 'لوحة الإدارة | بنك الأسئلة المركزي - منصة المئة',
    description: 'إدارة وتصنيف بنك الأسئلة المركزي وربطه بالمهارات ومعايير قياس.',
  },
  skills: {
    title: 'لوحة الإدارة | مركز المهارات وشجرة التعلم - منصة المئة',
    description: 'هندسة المهارات ومعايير الإتقان وشجرة التعلم التراكمية في منصة المئة.',
  },
  users: {
    title: 'لوحة الإدارة | إدارة المستخدمين والصلاحيات - منصة المئة',
    description: 'إدارة حسابات الطلاب والمعلمين والمشرفين وتعيين الأدوار والصلاحيات.',
  },
  schools: {
    title: 'لوحة الإدارة | تشغيل وإدارة المدارس - منصة المئة',
    description: 'إدارة المدارس المشتركة وتخصيص الباقات وإسناد الفصول والمشرفين.',
  },
  groups: {
    title: 'لوحة الإدارة | تشغيل وإدارة المدارس - منصة المئة',
    description: 'إدارة المدارس المشتركة وتخصيص الباقات وإسناد الفصول والمشرفين.',
  },
  memberships: {
    title: 'لوحة الإدارة | إدارة العضويات والباقات - منصة المئة',
    description: 'إدارة خطط الاشتراكات والعضويات وباقات المدارس والطلاب.',
  },
  financial: {
    title: 'لوحة الإدارة | التقارير المالية والاشتراكات - منصة المئة',
    description: 'متابعة المدفوعات والاشتراكات والعمليات المالية داخل منصة المئة.',
  },
  notifications: {
    title: 'لوحة الإدارة | مركز الإشعارات والتنبيهات - منصة المئة',
    description: 'إرسال وجدولة التنبيهات والإشعارات العامة والموجهة للمستخدمين.',
  },
  monitoring: {
    title: 'لوحة الإدارة | مراقبة النظام والأداء التشغيلي - منصة المئة',
    description: 'متابعة استقرار الخدمات ومعدل الاستجابة والتشغيل التقني للمنصة.',
  },
  settings: {
    title: 'لوحة الإدارة | إعدادات المنصة والنظام - منصة المئة',
    description: 'ضبط الإعدادات العامة للمنصة وخيارات الذكاء الاصطناعي والأمان.',
  },
  homepage: {
    title: 'لوحة الإدارة | إدارة الصفحة الرئيسية - منصة المئة',
    description: 'تخصيص وإدارة أقسام ومحتوى الصفحة الرئيسية للمنصة.',
  },
  'announcement-ads': {
    title: 'لوحة الإدارة | إدارة الإعلانات الترويجية - منصة المئة',
    description: 'إدارة وإطلاق الإعلانات وشاشات العرض الترويجية للمستفيدين.',
  },
  'platform-fonts': {
    title: 'لوحة الإدارة | إدارة خطوط المنصة - منصة المئة',
    description: 'تخصيص الخطوط العربية والطباعة البصرية وهوية المنصة.',
  },
  'platform-integrations': {
    title: 'لوحة الإدارة | إدارة التكاملات والربط التقني - منصة المئة',
    description: 'إدارة الربط البرمجي وخدمات الرسائل والدفع والتكاملات الخارجية.',
  },
  backups: {
    title: 'لوحة الإدارة | النسخ الاحتياطي للنظام - منصة المئة',
    description: 'إدارة النسخ الاحتياطية واستعادة البيانات وضمان استمرارية الأعمال.',
  },
  'ai-assistant': {
    title: 'لوحة الإدارة | إدارة المساعد الذكي - منصة المئة',
    description: 'إعداد نماذج الذكاء الاصطناعي وتوليد الأسئلة والشروحات الآلية.',
  },
  'live-sessions': {
    title: 'لوحة الإدارة | إدارة الحصص المباشرة - منصة المئة',
    description: 'جدولة الحصص التفاعلية والغرف الصوتية والمرئية مع المعلمين.',
  },
  'barcode-tests': {
    title: 'لوحة الإدارة | إدارة اختبارات الباركود - منصة المئة',
    description: 'إنشاء وإدارة الاختبارات السريعة المرتبطة برموز الباركود QR.',
  },
};

const SUPERVISOR_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة المشرف | نظرة عامة ونبض الأداء - منصة المئة',
    description: 'ملخص شامل لنطاق الإشراف وأداء المدارس والفصول والطلاب المتعثرين.',
  },
  students: {
    title: 'لوحة المشرف | متابعة الطلاب وإحصائيات الإنجاز - منصة المئة',
    description: 'متابعة تفصيلية لدرجات الطلاب ومستويات الإنجاز والمهارات المحتاجة للدعم.',
  },
  tests: {
    title: 'لوحة المشرف | بنك واختبارات النطاق - منصة المئة',
    description: 'إدارة وتوجيه الاختبارات التشخيصية والمركزية على مستوى النطاق الإشرافي.',
  },
  skills: {
    title: 'لوحة المشرف | تحليل المهارات ونقاط التحسين - منصة المئة',
    description: 'خريطة المهارات وتحليل الفجوات ونقاط الضعف الجماعية والفردية.',
  },
  reports: {
    title: 'لوحة المشرف | التقارير التفصيلية والتحليل التراكمي - منصة المئة',
    description: 'تقارير أداء تراكمية ورسوم بيانية لتوزيع الدرجات ونسب التحسن.',
  },
  'live-sessions': {
    title: 'لوحة المشرف | الحصص المباشرة والجدول - منصة المئة',
    description: 'جدول ومتابعة الحصص التفاعلية وجلسات الدعم المباشرة في النطاق.',
  },
  'live-monitoring': {
    title: 'لوحة المشرف | المراقبة الحية للغرف والنشاط - منصة المئة',
    description: 'متابعة لحظية ومراقبة حية للنشاط التدريبي وغرف التعلم الفعالة.',
  },
};

const INSTRUCTOR_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة مدرب المنصة | نظرة عامة - منصة المئة',
    description: 'لوحة مدرب المنصة لمتابعة المساهمات والمحتوى التعليمي داخل نطاقه.',
  },
  lessons: {
    title: 'لوحة مدرب المنصة | مركز الدروس التعليمية - منصة المئة',
    description: 'إدارة الدروس والشروحات التفاعلية ومتابعة الاعتماد.',
  },
  quizzes: {
    title: 'لوحة مدرب المنصة | الاختبارات والتدريبات - منصة المئة',
    description: 'إنشاء وإدارة الاختبارات الموجهة للطلاب وتقييم المحتوى.',
  },
  'mock-exams': {
    title: 'لوحة مدرب المنصة | الاختبارات المحاكية - منصة المئة',
    description: 'إعداد نماذج المحاكاة والمراجعات لاختبارات قياس.',
  },
  questions: {
    title: 'لوحة مدرب المنصة | بنك الأسئلة - منصة المئة',
    description: 'إضافة ومراجعة بنك الأسئلة والخيارات والحلول النموذجية.',
  },
  library: {
    title: 'لوحة مدرب المنصة | المكتبة وملفات الدعم - منصة المئة',
    description: 'رفع وإدارة الملفات والمذكرات الداعمة للطلاب.',
  },
  skills: {
    title: 'لوحة مدرب المنصة | شجرة المهارات - منصة المئة',
    description: 'استعراض وربط المهارات ونقاط القوة والتحسين.',
  },
};

const PARENT_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة ولي الأمر | متابعة الأبناء - منصة المئة',
    description: 'ملخص أسبوعي بسيط لمتابعة نتائج الأبناء ونقاط التقدم والدعم المطلوبة.',
  },
  'parent-results': {
    title: 'لوحة ولي الأمر | نتائج واختبارات الأبناء - منصة المئة',
    description: 'سجل شامل لنتائج ودرجات جميع الاختبارات التي أداها الأبناء.',
  },
  'parent-skills': {
    title: 'لوحة ولي الأمر | المهارات ونقاط المتابعة - منصة المئة',
    description: 'تحليل المهارات التي تحتاج إلى دعم وتوجيه إضافي في المنزل.',
  },
  'parent-link': {
    title: 'لوحة ولي الأمر | ربط وإضافة طالب - منصة المئة',
    description: 'ربط حساب ابن جديد عبر الكود الخاص لمتابعة درجاته ونشاطه.',
  },
  'parent-followup': {
    title: 'لوحة ولي الأمر | خطة المتابعة الأسبوعية - منصة المئة',
    description: 'خطة علاجية ميسرة لمدة 3 أيام لدعم الأبناء بدون ضغط.',
  },
  reports: {
    title: 'لوحة ولي الأمر | تقرير مستوى الأبناء - منصة المئة',
    description: 'تقرير بياني لمستوى الأبناء والمهارات المكتسبة.',
  },
  requests: {
    title: 'لوحة ولي الأمر | طلبات الدفع والاشتراك - منصة المئة',
    description: 'إدارة طلبات باقات واشتراكات الأبناء في منصة المئة.',
  },
  qa: {
    title: 'لوحة ولي الأمر | الأسئلة والاستفسارات - منصة المئة',
    description: 'التواصل مع المعلمين وإدارة المنصة بخصوص مستوى الأبناء.',
  },
};

const STUDENT_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'مساحة الطالب | لوحة التعلم ونظرة عامة - منصة المئة',
    description: 'نظرة عامة على إنجازاتك اليومية ومساراتك واختباراتك الموجهة.',
  },
  paths: {
    title: 'مساحة الطالب | مساراتي التعليمية - منصة المئة',
    description: 'استعراض المسارات المشترك بها والتقدم في كل مسار.',
  },
  'my-courses': {
    title: 'مساحة الطالب | دوراتي المسجلة - منصة المئة',
    description: 'الدورات التدريبية والشروحات التأسيسية الخاصة بك.',
  },
  'smart-path': {
    title: 'مساحة الطالب | مسار التعلم الذكي - منصة المئة',
    description: 'مسار تعلم مخصص يعالج نقاط ضعفك تلقائيًا بالذكاء الاصطناعي.',
  },
  sessions: {
    title: 'مساحة الطالب | جلساتي التعليمية - منصة المئة',
    description: 'مواعيد الجلسات الخاصة والحصص المباشرة القادمة.',
  },
  quizzes: {
    title: 'مساحة الطالب | سجل اختباراتي السابقة - منصة المئة',
    description: 'سجل كامل للاختبارات التي تم حلها مع درجاتها وتفاصيلها.',
  },
  'mock-exams': {
    title: 'مساحة الطالب | الاختبارات المحاكية لقياس - منصة المئة',
    description: 'نماذج اختبارات محاكية كاملة لنظام واختبارات قياس الحقيقية.',
  },
  'school-tests': {
    title: 'مساحة الطالب | الاختبارات المدرسية الموجهة - منصة المئة',
    description: 'الاختبارات الموجهة لك من معلميك ومدرستك لمتابعة التحصيل.',
  },
  exams: {
    title: 'مساحة الطالب | مركز الاختبارات والتقييمات - منصة المئة',
    description: 'مركز موحد لجميع الاختبارات المحاكية والمدرسية والسابقة.',
  },
  saher: {
    title: 'مساحة الطالب | اختبار ساهر السريع - منصة المئة',
    description: 'اختبار سريع وذكي يحدد مستواك ويوصي بما تحتاجه فورًا.',
  },
  reports: {
    title: 'مساحة الطالب | تقارير الأداء والمستوى - منصة المئة',
    description: 'تحليل دقيق لأدائك ومدى جاهزيتك للاختبار الفعلي.',
  },
  plan: {
    title: 'مساحة الطالب | خطتي الدراسية - منصة المئة',
    description: 'جدولك الدراسي المخصص للوصول إلى النسبة المستهدفة.',
  },
  favorites: {
    title: 'مساحة الطالب | أسئلتي للمراجعة - منصة المئة',
    description: 'الأسئلة التي قمت بحفظها للمراجعة والتدريب المركز.',
  },
  flashcards: {
    title: 'مساحة الطالب | بطاقات التذكر الذكية - منصة المئة',
    description: 'بطاقات مراجعة سريعة للمفاهيم والقوانين الرياضية واللفظية.',
  },
  qa: {
    title: 'مساحة الطالب | بنك الأسئلة والاستفسارات - منصة المئة',
    description: 'مجتمع النقاش وطرح الأسئلة مع المعلمين والزملاء.',
  },
  requests: {
    title: 'مساحة الطالب | طلباتي واشتراكاتي - منصة المئة',
    description: 'متابعة حجوزات الجلسات الخاصة وطلبات الاشتراكات.',
  },
};

const resolvePageMeta = (
  pathname = '/',
  search = '',
  hash = '',
  userRole = '',
): { title: string; description: string; isPrivate: boolean; canonicalPath: string } => {
  let effectivePath = pathname || '/';
  let effectiveSearch = search || '';

  if ((effectivePath === '/' || !effectivePath) && hash.startsWith('#/')) {
    const hashContent = hash.slice(1);
    const [hPath, hQuery] = hashContent.split('?');
    effectivePath = hPath || '/';
    if (!effectiveSearch && hQuery) {
      effectiveSearch = `?${hQuery}`;
    }
  }

  const isPrivate = SEO_PRIVATE_PREFIXES.some((prefix) => effectivePath === prefix || effectivePath.startsWith(`${prefix}/`));
  const searchParams = new URLSearchParams(effectiveSearch);
  const tab = searchParams.get('tab') || '';

  // 1. Admin Dashboard
  if (effectivePath === '/admin-dashboard' || effectivePath.startsWith('/admin-dashboard/')) {
    const builder = searchParams.get('builder');
    if (builder === 'create') {
      return {
        title: 'إنشاء اختبار جديد | لوحة الإدارة - منصة المئة',
        description: 'إنشاء اختبار جديد داخل مساحة إدارية خاصة في منصة المئة.',
        isPrivate: true,
        canonicalPath: '/admin-dashboard',
      };
    }
    if (builder === 'edit') {
      return {
        title: 'تعديل اختبار | لوحة الإدارة - منصة المئة',
        description: 'تعديل اختبار موجود داخل مساحة إدارية خاصة في منصة المئة.',
        isPrivate: true,
        canonicalPath: '/admin-dashboard',
      };
    }
    const tabMeta = ADMIN_TAB_METAS[tab] || (tab ? null : ADMIN_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة الإدارة - منصة المئة` : 'لوحة الإدارة | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة الإدارة والتحكم الكامل بمنصة المئة التعليمية.',
      isPrivate: true,
      canonicalPath: '/admin-dashboard',
    };
  }

  // 2. Supervisor Dashboard
  if (effectivePath === '/supervisor-dashboard' || effectivePath.startsWith('/supervisor-dashboard/')) {
    const tabMeta = SUPERVISOR_TAB_METAS[tab] || (tab ? null : SUPERVISOR_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة المشرف - منصة المئة` : 'لوحة المشرف التربوي | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة المشرف التربوي لمتابعة الطلاب والتقارير والاختبارات الموجهة داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/supervisor-dashboard',
    };
  }

  // 3. Instructor Dashboard
  if (effectivePath === '/instructor-dashboard' || effectivePath.startsWith('/instructor-dashboard/')) {
    const tabMeta = INSTRUCTOR_TAB_METAS[tab] || (tab ? null : INSTRUCTOR_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة مدرب المنصة - منصة المئة` : 'لوحة مدرب المنصة | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة مدرب المنصة لإدارة المحتوى والدروس والأسئلة والاختبارات داخل نطاقه.',
      isPrivate: true,
      canonicalPath: '/instructor-dashboard',
    };
  }

  if (effectivePath === '/school-teacher-dashboard' || effectivePath.startsWith('/school-teacher-dashboard/')) {
    return {
      title: 'لوحة معلم المدرسة | منصة المئة',
      description: 'مساحة معلم المدرسة للفصول المسندة والاختبارات المدرسية والفصل الذكي.',
      isPrivate: true,
      canonicalPath: '/school-teacher-dashboard',
    };
  }

  if (effectivePath === '/school-director-dashboard' || effectivePath.startsWith('/school-director-dashboard/')) {
    return {
      title: 'لوحة مدير المدرسة | منصة المئة',
      description: 'مساحة مدير المدرسة للمؤشرات التنفيذية وعمليات الطلاب داخل المدارس المفوضة.',
      isPrivate: true,
      canonicalPath: '/school-director-dashboard',
    };
  }

  // 4. Parent Dashboard
  if (effectivePath === '/parent-dashboard' || (effectivePath === '/dashboard' && userRole === 'parent')) {
    const tabMeta = PARENT_TAB_METAS[tab] || (tab ? null : PARENT_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة ولي الأمر - منصة المئة` : 'لوحة ولي الأمر | متابعة الأبناء - منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة ولي الأمر لمتابعة تقدم الأبناء ونتائج الاختبارات والخطط العلاجية داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/parent-dashboard',
    };
  }

  // 5. Student Dashboard
  if (effectivePath === '/dashboard' || effectivePath.startsWith('/dashboard/')) {
    const tabMeta = STUDENT_TAB_METAS[tab] || (tab ? null : STUDENT_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | مساحة الطالب - منصة المئة` : 'مساحة الطالب | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'مساحة الطالب داخل منصة المئة لمتابعة المسارات والدروس والاختبارات المحاكية والتقارير الذكية.',
      isPrivate: true,
      canonicalPath: '/dashboard',
    };
  }

  // 6. Independent & Static Routes
  if (effectivePath === '/classroom' || effectivePath.startsWith('/classroom/')) {
    return {
      title: 'الحصة الذكية المباشرة | منصة المئة',
      description: 'حصة تفاعلية مباشرة خاصة بالمستخدم المسجل داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/classroom',
    };
  }

  if (effectivePath === '/quiz' || effectivePath.startsWith('/quiz/')) {
    return {
      title: 'جلسة الاختبار | منصة المئة',
      description: 'أداء وتدريب على اختبارات القدرات والتحصيلي مع تصحيح ذكي فوري داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/quiz',
    };
  }

  if (effectivePath === '/results') {
    return {
      title: 'نتيجة الاختبار وتحليل الأداء | منصة المئة',
      description: 'تقرير تفصيلي لنتيجة الاختبار وتحليل المهارات ونقاط القوة والضعف داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/results',
    };
  }

  if (effectivePath === '/review') {
    return {
      title: 'مراجعة الإجابات والتحليل | منصة المئة',
      description: 'مراجعة تفصيلية لإجابات الاختبار والشروحات التعليمية داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/review',
    };
  }

  if (effectivePath === '/my-quizzes') {
    return {
      title: 'سجل اختباراتي | مساحة الطالب - منصة المئة',
      description: 'سجل كامل لجميع الاختبارات والتدريبات السابقة ومتابعة التطور الزمني.',
      isPrivate: true,
      canonicalPath: '/my-quizzes',
    };
  }

  if (effectivePath === '/my-requests') {
    return {
      title: 'طلباتي ومتابعة الحجوزات | منصة المئة',
      description: 'متابعة طلبات الجلسات الخاصة والاشتراكات داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/my-requests',
    };
  }

  if (effectivePath === '/reports') {
    return {
      title: 'التقارير والتحليلات التعليمية | منصة المئة',
      description: 'تقارير تفصيلية ورسوم بيانية لقياس مدى جاهزية الطالب لاختبارات قياس.',
      isPrivate: true,
      canonicalPath: '/reports',
    };
  }

  if (effectivePath === '/favorites') {
    return {
      title: 'أسئلتي للمراجعة | منصة المئة',
      description: 'قائمتك الخاصة من الأسئلة المحفوظة للمراجعة والتدريب المركز.',
      isPrivate: true,
      canonicalPath: '/favorites',
    };
  }

  if (effectivePath === '/plan') {
    return {
      title: 'الخطة الدراسية المخصصة | منصة المئة',
      description: 'خطة مذاكرة وجدول زمني ذكي مبني على مستواك وهدفك في قياس.',
      isPrivate: true,
      canonicalPath: '/plan',
    };
  }

  if (effectivePath === '/qa') {
    return {
      title: 'مجتمع الأسئلة والأجوبة | منصة المئة',
      description: 'اطرح أسئلتك وتفاعل مع المعلمين والزملاء في تدريبات القدرات والتحصيلي.',
      isPrivate: true,
      canonicalPath: '/qa',
    };
  }

  if (effectivePath === '/book-session') {
    return {
      title: 'حجز جلسة خاصة مع معلّم | منصة المئة',
      description: 'احجز جلسة تدريب فردية مباشرة مع نخبة من المعلمين المعتمدين.',
      isPrivate: true,
      canonicalPath: '/book-session',
    };
  }

  if (effectivePath === '/live-sessions' || effectivePath.startsWith('/live-sessions/')) {
    return {
      title: 'جدول الحصص واللقاءات المباشرة | منصة المئة',
      description: 'حصص تفاعلية مباشرة مع أفضل معلمي القدرات والتحصيلي.',
      isPrivate: true,
      canonicalPath: '/live-sessions',
    };
  }

  if (effectivePath === '/profile') {
    return {
      title: 'الملف الشخصي وإعدادات الحساب | منصة المئة',
      description: 'إدارة الحساب والبيانات الشخصية وكلمة المرور في منصة المئة.',
      isPrivate: true,
      canonicalPath: '/profile',
    };
  }

  if (effectivePath === '/admin/quiz-gen') {
    return {
      title: 'لوحة الإدارة | منشئ الاختبارات بالذكاء الاصطناعي - منصة المئة',
      description: 'أداة إنشاء الاختبارات والأسئلة تلقائيًا بالذكاء الاصطناعي.',
      isPrivate: true,
      canonicalPath: '/admin/quiz-gen',
    };
  }

  if (effectivePath === '/quizzes') {
    return {
      title: 'بنك الاختبارات والتدريبات | منصة المئة',
      description: 'مئات الاختبارات والتدريبات المتدرجة في القدرات والتحصيلي لرفع جاهزيتك.',
      isPrivate: false,
      canonicalPath: '/quizzes',
    };
  }

  if (effectivePath === '/mock-exams') {
    return {
      title: 'الاختبارات المحاكية لقياس | منصة المئة',
      description: 'اختبارات تحاكي تمامًا بيئة وتوقيت وأقسام اختبار القدرات والتحصيلي الحقيقي.',
      isPrivate: false,
      canonicalPath: '/mock-exams',
    };
  }

  if (effectivePath === '/courses' || effectivePath.startsWith('/course/')) {
    return {
      title: 'دورات القدرات والتحصيلي | منصة المئة',
      description: 'دورات تعليمية منظمة للقدرات والتحصيلي داخل منصة المئة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath.startsWith('/category/')) {
    return {
      title: 'مسارات القدرات والتحصيلي | منصة المئة',
      description: 'استكشف مسارات القدرات والتحصيلي والتأسيس والتدريب والاختبارات داخل منصة المئة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath === '/achievements') {
    return {
      title: 'لوحة الإنجازات والأوسمة | منصة المئة',
      description: 'استعرض أوسمتك وإنجازاتك في مسيرتك التعليمية على منصة المئة.',
      isPrivate: false,
      canonicalPath: '/achievements',
    };
  }

  if (effectivePath === '/blog') {
    return {
      title: 'مدونة منصة المئة',
      description: 'مقالات وإرشادات تعليمية من منصة المئة لطلاب القدرات والتحصيلي.',
      isPrivate: false,
      canonicalPath: '/blog',
    };
  }

  if (effectivePath === '/pricing') {
    return {
      title: 'عضويات المنصة | منصة المئة',
      description: 'تعرف على باقات منصة المئة للقدرات والتحصيلي واختر الخطة الأنسب لك.',
      isPrivate: false,
      canonicalPath: '/pricing',
    };
  }

  if (effectivePath === '/cart' || effectivePath === '/checkout') {
    return {
      title: 'سلة المشتريات وإتمام الطلب | منصة المئة',
      description: 'مراجعة طلبك وإتمام الاشتراك في باقات ودورات منصة المئة بأمان.',
      isPrivate: false,
      canonicalPath: '/cart',
    };
  }

  if (effectivePath.startsWith('/barcode-test') || effectivePath.startsWith('/b/')) {
    return {
      title: 'اختبار الباركود السريع | منصة المئة',
      description: 'خض تجربة حل الاختبار السريع عبر مسح رمز الاستجابة السريعة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath.startsWith('/certificate/')) {
    return {
      title: 'شهادة إتمام معتمدة | منصة المئة',
      description: 'التحقق من صحة شهادة الإتمام الصادرة من منصة المئة التعليمية.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath === '/about') {
    return {
      title: 'من نحن | منصة المئة للقدرات والتحصيلي',
      description: 'تعرف على رؤية ورسالة منصة المئة وأهدافها في تمكين الطلاب من التفوق.',
      isPrivate: false,
      canonicalPath: '/about',
    };
  }

  if (effectivePath === '/contact') {
    return {
      title: 'اتصل بنا | الدعم الفني لمنصة المئة',
      description: 'تواصل مع فريق الدعم الفني وخدمة المستفيدين لمنصة المئة.',
      isPrivate: false,
      canonicalPath: '/contact',
    };
  }

  if (effectivePath === '/faq') {
    return {
      title: 'الأسئلة الشائعة | منصة المئة',
      description: 'إجابات على الأسئلة الأكثر شيوعًا حول التسجيل والدورات والاختبارات في المنصة.',
      isPrivate: false,
      canonicalPath: '/faq',
    };
  }

  if (effectivePath === '/privacy') {
    return {
      title: 'سياسة الخصوصية | منصة المئة',
      description: 'سياسة الخصوصية وحماية بيانات المستخدمين في منصة المئة.',
      isPrivate: false,
      canonicalPath: '/privacy',
    };
  }

  if (effectivePath === '/terms') {
    return {
      title: 'الشروط والأحكام | منصة المئة',
      description: 'الشروط والأحكام الخاصة باستخدام خدمات ومنتجات منصة المئة.',
      isPrivate: false,
      canonicalPath: '/terms',
    };
  }

  if (effectivePath === '/forgot-password') {
    return {
      title: 'استعادة كلمة المرور | منصة المئة',
      description: 'استعادة الوصول إلى حسابك على منصة المئة بخطوات بسيطة.',
      isPrivate: true,
      canonicalPath: '/forgot-password',
    };
  }

  if (effectivePath === '/reset-password') {
    return {
      title: 'تعيين كلمة المرور الجديدة | منصة المئة',
      description: 'تعيين كلمة مرور جديدة لحسابك على منصة المئة.',
      isPrivate: true,
      canonicalPath: '/reset-password',
    };
  }

  if (effectivePath === '/verify-email') {
    return {
      title: 'تأكيد البريد الإلكتروني | منصة المئة',
      description: 'تأكيد وتفعيل بريدك الإلكتروني في منصة المئة.',
      isPrivate: true,
      canonicalPath: '/verify-email',
    };
  }

  return {
    title: isPrivate ? 'منصة المئة | مساحة خاصة' : 'منصة المئة | قدرات وتحصيلي',
    description: isPrivate
      ? 'مساحة خاصة داخل منصة المئة للطالب أو الإدارة.'
      : 'منصة تعليمية عربية للقدرات والتحصيلي، تجمع المسارات التعليمية والدروس والاختبارات والتحليل الذكي في مكان واحد.',
    isPrivate,
    canonicalPath: isPrivate ? '/' : effectivePath,
  };
};

export const SeoRouteMeta: React.FC = () => {
  const location = useLocation();
  const user = useStore((state) => state.user);
  const [urlTick, setUrlTick] = useState(0);

  useEffect(() => {
    const handleUrlChange = () => setUrlTick((prev) => prev + 1);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('app:url-change', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('app:url-change', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    const rawPath = (typeof window !== 'undefined' ? window.location.pathname : '') || location.pathname || '/';
    const rawSearch = (typeof window !== 'undefined' ? window.location.search : '') || location.search || '';
    const rawHash = (typeof window !== 'undefined' ? window.location.hash : '') || '';

    const meta = resolvePageMeta(rawPath, rawSearch, rawHash, user?.role);
    const canonicalPath = meta.isPrivate ? '/' : meta.canonicalPath;
    const canonicalUrl = `${SEO_BASE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;
    const imageUrl = `${SEO_BASE_URL}${SEO_DEFAULT_IMAGE_PATH}`;
    const robots = meta.isPrivate ? 'noindex, nofollow' : 'index, follow';

    document.title = meta.title;
    upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'منصة المئة للقدرات والتحصيلي');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [location.pathname, location.search, urlTick, user?.role]);

  return null;
};

