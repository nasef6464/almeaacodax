export const getMasteryClasses = (mastery: number) => {
  if (mastery >= 80) {
    return { badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', label: 'ممتاز' };
  }

  if (mastery >= 60) {
    return { badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', label: 'يحتاج بعض المراجعة' };
  }

  return { badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500', label: 'يحتاج تركيزًا أكبر' };
};

export const getSkillPriorityLabel = (mastery: number) => {
  if (mastery >= 80) {
    return { label: 'مطمئنة', className: 'bg-emerald-50 text-emerald-700' };
  }

  if (mastery >= 60) {
    return { label: 'راجعها اليوم', className: 'bg-amber-50 text-amber-700' };
  }

  return { label: 'ابدأ هنا', className: 'bg-rose-50 text-rose-700' };
};

export const getFriendlyResultMessage = (score: number) => {
  if (score >= 85) {
    return {
      title: 'ممتاز جدًا',
      message: 'نتيجة قوية. راجع الأخطاء فقط ثم أكمل.',
      chipClassName: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (score >= 60) {
    return {
      title: 'أداء جيد',
      message: 'أداؤك جيد. ركز على أضعف مهارة ثم أعد التدريب.',
      chipClassName: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    title: 'يحتاج مراجعة',
    message: 'ابدأ بأضعف مهارة، ثم حل تدريبًا قصيرًا.',
    chipClassName: 'bg-rose-50 text-rose-700',
  };
};

export const getScoreVisualTone = (score: number) => {
  if (score >= 85) {
    return {
      text: 'text-emerald-600',
      ring: '#10b981',
      soft: 'from-emerald-50 to-white',
    };
  }

  if (score >= 60) {
    return {
      text: 'text-amber-600',
      ring: '#f59e0b',
      soft: 'from-amber-50 to-white',
    };
  }

  return {
    text: 'text-rose-600',
    ring: '#f43f5e',
    soft: 'from-rose-50 to-white',
  };
};

export const getStudentFriendlyChecklist = (score: number) => {
  if (score >= 85) {
    return [
      { title: 'حافظ على مستواك', body: 'راجع الأخطاء الصغيرة فقط ولا تطيل المراجعة.' },
      { title: 'تدريب قصير', body: 'حل 5 أسئلة من نفس النوع لتثبيت المهارة.' },
      { title: 'اختبار سريع', body: 'أعد القياس لاحقًا حتى تتأكد أن المستوى ثابت.' },
    ];
  }

  if (score >= 60) {
    return [
      { title: 'راجع مهارة واحدة', body: 'ابدأ بالمهارة الأضعف الظاهرة أمامك.' },
      { title: 'شاهد شرحًا قصيرًا', body: 'لا تبدأ بأسئلة كثيرة قبل فهم الفكرة.' },
      { title: 'تدرب ثم قِس', body: 'حل تدريبًا بسيطًا ثم أعد اختبارًا قصيرًا.' },
    ];
  }

  return [
    { title: 'ابدأ من الأضعف', body: 'راجع مهارة واحدة فقط الآن.' },
    { title: 'شرح قصير', body: 'افهم الفكرة قبل إعادة الحل.' },
    { title: '5 أسئلة فقط', body: 'تدريب قصير يكفي كبداية.' },
  ];
};
