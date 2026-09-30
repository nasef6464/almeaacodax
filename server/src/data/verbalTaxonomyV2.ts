export interface VerbalSubSkillDefinition {
  id: string;
  code: string;
  name: string;
  order: number;
}

export interface VerbalMainSkillDefinition {
  num: string;
  id: string;
  sectionId: string;
  name: string;
  description: string;
  subSkills: VerbalSubSkillDefinition[];
}

type VerbalSkillSeed = readonly [
  id: string,
  sectionId: string,
  name: string,
  subSkills: readonly string[],
];

const seeds: readonly VerbalSkillSeed[] = [
  ["skill_verbal_01", "sec_sub_1777779759038_1", "التناظر اللفظي: الأجزاء والتركيب", ["الكل إلى الجزء", "الجزء إلى الكل", "الاحتواء والاشتمال", "المادة وما يصنع منها", "المجموعة وأفرادها"]],
  ["skill_verbal_02", "sec_sub_1777779759038_2", "التناظر اللفظي: علاقات المعنى", ["الترادف", "التضاد", "التدرج في المعنى", "الصفة والموصوف", "الشدة والضعف"]],
  ["skill_verbal_03", "sec_sub_1777779759038_3", "التناظر اللفظي: المكان والزمان", ["المكان الثابت", "المكان المتحرك", "الشيء وما بداخله", "العملية ومكانها", "الزمان والتتابع"]],
  ["skill_verbal_05", "sec_sub_1777779759038_5", "التناظر اللفظي: السبب والتحول", ["السبب إلى النتيجة", "النتيجة إلى السبب", "الشرط والمشروط", "تغير الحال", "التحول والمراحل"]],
  ["skill_verbal_04", "sec_sub_1777779759038_4", "التناظر اللفظي: الوظيفة والاستخدام", ["صاحب المهنة ومهنته", "العضو ووظيفته", "الأداة واستخدامها", "الشخص وأداته", "المصدر وما يصدر عنه"]],
  ["skill_verbal_14", "sec_sub_1777779759038_14", "التناظر اللفظي: الاحتياج والحماية", ["الاحتياج", "الضرورة", "الحماية", "التغطية والإحاطة"]],
  ["skill_verbal_06", "sec_sub_1777779759038_6", "التناظر اللفظي: التصنيف والفئات", ["نفس الفئة", "الشيء ونوعه", "النوع وأفراده", "الأصل والفرع"]],
  ["skill_verbal_15", "sec_sub_1777779759038_15", "التناظر اللفظي: المعارف اللفظية الخاصة", ["الكائن وولده", "المذكر والمؤنث", "الكائن ومسكنه", "الكائن وصوته", "الكائن وفريسته"]],
  ["skill_verbal_09", "sec_sub_1777779759038_9", "المفردة الشاذة: دلالي وتصنيفي", ["الفئة", "الترادف والتضاد", "الأصل والفرع", "الإيجابي والسلبي"]],
  ["skill_verbal_16", "sec_sub_1777779759038_16", "المفردة الشاذة: مكاني وزماني ووظيفي", ["الرابط المكاني", "الرابط الزماني", "الوظيفة والمصدر"]],
  ["skill_verbal_17", "sec_sub_1777779759038_17", "المفردة الشاذة: معرفي ولغوي", ["الرابط العلمي", "الرابط اللغوي والنحوي", "القومية والهوية"]],
  ["skill_verbal_10", "sec_sub_1777779759038_10", "الربط: اكتشاف العلاقة", ["الفئة المشتركة", "الاسم والمسمى", "المهنة والمنتج", "الارتباط المعرفي"]],
  ["skill_verbal_18", "sec_sub_1777779759038_18", "الاختلاف والتمييز", ["المختلف دلاليًا", "المختلف تصنيفيًا", "المختلف في اتجاه العلاقة"]],
  ["skill_verbal_07", "sec_sub_1777779759038_7", "إكمال الجمل: الاختيار المعجمي", ["فراغ واحد", "فراغان", "التلازم اللفظي", "الكلمات المفتاحية"]],
  ["skill_verbal_19", "sec_sub_1777779759038_19", "إكمال الجمل: التركيب اللغوي", ["الضمير والمطابقة", "التذكير والتأنيث", "حروف الجر", "أدوات الشرط والربط"]],
  ["skill_verbal_08", "sec_sub_1777779759038_8", "إكمال الجمل: ترابط المعنى", ["الإيجاب والسلب", "السبب والنتيجة", "المقابلة والاستدراك", "التوازي بين أجزاء الجملة"]],
  ["skill_verbal_11", "sec_sub_1777779759038_11", "الخطأ السياقي: المعنى", ["المعنى العام", "الإيجاب والسلب", "السبب والنتيجة", "المقابلة", "التلازم اللفظي"]],
  ["skill_verbal_20", "sec_sub_1777779759038_20", "الخطأ السياقي: اللغة والمعرفة", ["الحروف والأدوات", "التلاعب اللفظي", "الخطأ العلمي والثقافي", "الحكم والأمثال", "الكلمة المفتاحية"]],
  ["skill_verbal_12", "sec_sub_1777779759038_12", "استيعاب المقروء: المعلومات المباشرة", ["المعلومة الصريحة", "من ومتى وأين ولماذا", "الأعداد والتواريخ", "العقود والقرون", "تحديد الفقرة"]],
  ["skill_verbal_21", "sec_sub_1777779759038_21", "استيعاب المقروء: المفردات والإحالة", ["معنى الكلمة من السياق", "استبدال كلمة", "عائد الضمير", "الكلمة الزائدة والمضافة"]],
  ["skill_verbal_22", "sec_sub_1777779759038_22", "استيعاب المقروء: علاقات النص", ["السبب والنتيجة", "التفسير", "التأكيد", "التوافق والتعارض", "الإجمال والتفصيل"]],
  ["skill_verbal_13", "sec_sub_1777779759038_13", "استيعاب المقروء: التحليل والاستنتاج", ["الفكرة والعنوان", "الاستنتاج", "موقف وأسلوب الكاتب", "الغرض والنتيجة"]],
] as const;

/**
 * Canonical ALMEAA verbal foundation taxonomy V2.
 *
 * Source order: Amer verbal foundation book.
 * Supplement: unique Anas questions after exact-source verification and de-duplication.
 *
 * Legacy main-skill IDs are deliberately retained where the semantic meaning matches
 * so existing learner evidence is not silently relabeled. The old 76 subskills are
 * replaced by a V2-scoped 95-subskill tree.
 */
export const VERBAL_TAXONOMY_V2: VerbalMainSkillDefinition[] = seeds.map(
  ([id, sectionId, name, subSkillNames], mainIndex) => ({
    num: String(mainIndex + 1),
    id,
    sectionId,
    name,
    description: `مسار تأسيسي دقيق في ${name} ضمن القدرات اللفظية.`,
    subSkills: subSkillNames.map((subSkillName, subIndex) => ({
      id: `sub_verbal_v2_${String(mainIndex + 1).padStart(2, "0")}_${String(subIndex + 1).padStart(2, "0")}`,
      code: `${mainIndex + 1}.${subIndex + 1}`,
      name: subSkillName,
      order: subIndex + 1,
    })),
  }),
);

export const VERBAL_TAXONOMY_V2_COUNTS = {
  mainSkills: VERBAL_TAXONOMY_V2.length,
  subSkills: VERBAL_TAXONOMY_V2.reduce((total, item) => total + item.subSkills.length, 0),
} as const;

if (VERBAL_TAXONOMY_V2_COUNTS.mainSkills !== 22 || VERBAL_TAXONOMY_V2_COUNTS.subSkills !== 95) {
  throw new Error(
    `Invalid verbal V2 taxonomy counts: ${VERBAL_TAXONOMY_V2_COUNTS.mainSkills}/${VERBAL_TAXONOMY_V2_COUNTS.subSkills}`,
  );
}
