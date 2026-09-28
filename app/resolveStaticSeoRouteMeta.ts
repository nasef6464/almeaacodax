export type SeoRouteMetaValue = { title: string; description: string; isPrivate: boolean; canonicalPath: string };

export const resolveStaticSeoRouteMeta = (
  effectivePath: string,
  isPrivate: boolean,
): SeoRouteMetaValue => {
  // Independent and static route metadata.
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
