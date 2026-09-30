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

/**
 * ALMEAA verbal foundation taxonomy V2.
 *
 * Canonical source order: Amer verbal foundation book.
 * Supplemental source: Anas verbal foundation book (unique questions only).
 * The first-generation skill IDs are retained where the semantic meaning matches
 * so existing learner evidence is not silently relabeled. Newly split domains use
 * skill_verbal_14..22. Subskills are V2-scoped because the old 76-topic tree is
 * intentionally replaced by the 95-topic tree.
 */
export const VERBAL_TAXONOMY_V2: VerbalMainSkillDefinition[] = [
  {
    "num": "1",
    "id": "skill_verbal_01",
    "sectionId": "sec_sub_1777779759038_1",
    "name": "التناظر اللفظي: الأجزاء والتركيب",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: الأجزاء والتركيب ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_01_01",
        "code": "1.1",
        "name": "الكل إلى الجزء",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_01_02",
        "code": "1.2",
        "name": "الجزء إلى الكل",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_01_03",
        "code": "1.3",
        "name": "الاحتواء والاشتمال",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_01_04",
        "code": "1.4",
        "name": "المادة وما يصنع منها",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_01_05",
        "code": "1.5",
        "name": "المجموعة وأفرادها",
        "order": 5
      }
    ]
  },
  {
    "num": "2",
    "id": "skill_verbal_02",
    "sectionId": "sec_sub_1777779759038_2",
    "name": "التناظر اللفظي: علاقات المعنى",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: علاقات المعنى ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_02_01",
        "code": "2.1",
        "name": "الترادف",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_02_02",
        "code": "2.2",
        "name": "التضاد",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_02_03",
        "code": "2.3",
        "name": "التدرج في المعنى",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_02_04",
        "code": "2.4",
        "name": "الصفة والموصوف",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_02_05",
        "code": "2.5",
        "name": "الشدة والضعف",
        "order": 5
      }
    ]
  },
  {
    "num": "3",
    "id": "skill_verbal_03",
    "sectionId": "sec_sub_1777779759038_3",
    "name": "التناظر اللفظي: المكان والزمان",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: المكان والزمان ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_03_01",
        "code": "3.1",
        "name": "المكان الثابت",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_03_02",
        "code": "3.2",
        "name": "المكان المتحرك",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_03_03",
        "code": "3.3",
        "name": "الشيء وما بداخله",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_03_04",
        "code": "3.4",
        "name": "العملية ومكانها",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_03_05",
        "code": "3.5",
        "name": "الزمان والتتابع",
        "order": 5
      }
    ]
  },
  {
    "num": "4",
    "id": "skill_verbal_05",
    "sectionId": "sec_sub_1777779759038_5",
    "name": "التناظر اللفظي: السبب والتحول",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: السبب والتحول ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_04_01",
        "code": "4.1",
        "name": "السبب إلى النتيجة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_04_02",
        "code": "4.2",
        "name": "النتيجة إلى السبب",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_04_03",
        "code": "4.3",
        "name": "الشرط والمشروط",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_04_04",
        "code": "4.4",
        "name": "تغير الحال",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_04_05",
        "code": "4.5",
        "name": "التحول والمراحل",
        "order": 5
      }
    ]
  },
  {
    "num": "5",
    "id": "skill_verbal_04",
    "sectionId": "sec_sub_1777779759038_4",
    "name": "التناظر اللفظي: الوظيفة والاستخدام",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: الوظيفة والاستخدام ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_05_01",
        "code": "5.1",
        "name": "صاحب المهنة ومهنته",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_05_02",
        "code": "5.2",
        "name": "العضو ووظيفته",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_05_03",
        "code": "5.3",
        "name": "الأداة واستخدامها",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_05_04",
        "code": "5.4",
        "name": "الشخص وأداته",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_05_05",
        "code": "5.5",
        "name": "المصدر وما يصدر عنه",
        "order": 5
      }
    ]
  },
  {
    "num": "6",
    "id": "skill_verbal_14",
    "sectionId": "sec_sub_1777779759038_14",
    "name": "التناظر اللفظي: الاحتياج والحماية",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: الاحتياج والحماية ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_06_01",
        "code": "6.1",
        "name": "الاحتياج",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_06_02",
        "code": "6.2",
        "name": "الضرورة",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_06_03",
        "code": "6.3",
        "name": "الحماية",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_06_04",
        "code": "6.4",
        "name": "التغطية والإحاطة",
        "order": 4
      }
    ]
  },
  {
    "num": "7",
    "id": "skill_verbal_06",
    "sectionId": "sec_sub_1777779759038_6",
    "name": "التناظر اللفظي: التصنيف والفئات",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: التصنيف والفئات ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_07_01",
        "code": "7.1",
        "name": "نفس الفئة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_07_02",
        "code": "7.2",
        "name": "الشيء ونوعه",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_07_03",
        "code": "7.3",
        "name": "النوع وأفراده",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_07_04",
        "code": "7.4",
        "name": "الأصل والفرع",
        "order": 4
      }
    ]
  },
  {
    "num": "8",
    "id": "skill_verbal_15",
    "sectionId": "sec_sub_1777779759038_15",
    "name": "التناظر اللفظي: المعارف اللفظية الخاصة",
    "description": "مسار تأسيسي دقيق في التناظر اللفظي: المعارف اللفظية الخاصة ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_08_01",
        "code": "8.1",
        "name": "الكائن وولده",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_08_02",
        "code": "8.2",
        "name": "المذكر والمؤنث",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_08_03",
        "code": "8.3",
        "name": "الكائن ومسكنه",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_08_04",
        "code": "8.4",
        "name": "الكائن وصوته",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_08_05",
        "code": "8.5",
        "name": "الكائن وفريسته",
        "order": 5
      }
    ]
  },
  {
    "num": "9",
    "id": "skill_verbal_09",
    "sectionId": "sec_sub_1777779759038_9",
    "name": "المفردة الشاذة: دلالي وتصنيفي",
    "description": "مسار تأسيسي دقيق في المفردة الشاذة: دلالي وتصنيفي ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_09_01",
        "code": "9.1",
        "name": "الفئة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_09_02",
        "code": "9.2",
        "name": "الترادف والتضاد",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_09_03",
        "code": "9.3",
        "name": "الأصل والفرع",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_09_04",
        "code": "9.4",
        "name": "الإيجابي والسلبي",
        "order": 4
      }
    ]
  },
  {
    "num": "10",
    "id": "skill_verbal_16",
    "sectionId": "sec_sub_1777779759038_16",
    "name": "المفردة الشاذة: مكاني وزماني ووظيفي",
    "description": "مسار تأسيسي دقيق في المفردة الشاذة: مكاني وزماني ووظيفي ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_10_01",
        "code": "10.1",
        "name": "الرابط المكاني",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_10_02",
        "code": "10.2",
        "name": "الرابط الزماني",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_10_03",
        "code": "10.3",
        "name": "الوظيفة والمصدر",
        "order": 3
      }
    ]
  },
  {
    "num": "11",
    "id": "skill_verbal_17",
    "sectionId": "sec_sub_1777779759038_17",
    "name": "المفردة الشاذة: معرفي ولغوي",
    "description": "مسار تأسيسي دقيق في المفردة الشاذة: معرفي ولغوي ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_11_01",
        "code": "11.1",
        "name": "الرابط العلمي",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_11_02",
        "code": "11.2",
        "name": "الرابط اللغوي والنحوي",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_11_03",
        "code": "11.3",
        "name": "القومية والهوية",
        "order": 3
      }
    ]
  },
  {
    "num": "12",
    "id": "skill_verbal_10",
    "sectionId": "sec_sub_1777779759038_10",
    "name": "الربط: اكتشاف العلاقة",
    "description": "مسار تأسيسي دقيق في الربط: اكتشاف العلاقة ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_12_01",
        "code": "12.1",
        "name": "الفئة المشتركة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_12_02",
        "code": "12.2",
        "name": "الاسم والمسمى",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_12_03",
        "code": "12.3",
        "name": "المهنة والمنتج",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_12_04",
        "code": "12.4",
        "name": "الارتباط المعرفي",
        "order": 4
      }
    ]
  },
  {
    "num": "13",
    "id": "skill_verbal_18",
    "sectionId": "sec_sub_1777779759038_18",
    "name": "الاختلاف والتمييز",
    "description": "مسار تأسيسي دقيق في الاختلاف والتمييز ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_13_01",
        "code": "13.1",
        "name": "المختلف دلاليًا",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_13_02",
        "code": "13.2",
        "name": "المختلف تصنيفيًا",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_13_03",
        "code": "13.3",
        "name": "المختلف في اتجاه العلاقة",
        "order": 3
      }
    ]
  },
  {
    "num": "14",
    "id": "skill_verbal_07",
    "sectionId": "sec_sub_1777779759038_7",
    "name": "إكمال الجمل: الاختيار المعجمي",
    "description": "مسار تأسيسي دقيق في إكمال الجمل: الاختيار المعجمي ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_14_01",
        "code": "14.1",
        "name": "فراغ واحد",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_14_02",
        "code": "14.2",
        "name": "فراغان",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_14_03",
        "code": "14.3",
        "name": "التلازم اللفظي",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_14_04",
        "code": "14.4",
        "name": "الكلمات المفتاحية",
        "order": 4
      }
    ]
  },
  {
    "num": "15",
    "id": "skill_verbal_19",
    "sectionId": "sec_sub_1777779759038_19",
    "name": "إكمال الجمل: التركيب اللغوي",
    "description": "مسار تأسيسي دقيق في إكمال الجمل: التركيب اللغوي ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_15_01",
        "code": "15.1",
        "name": "الضمير والمطابقة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_15_02",
        "code": "15.2",
        "name": "التذكير والتأنيث",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_15_03",
        "code": "15.3",
        "name": "حروف الجر",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_15_04",
        "code": "15.4",
        "name": "أدوات الشرط والربط",
        "order": 4
      }
    ]
  },
  {
    "num": "16",
    "id": "skill_verbal_08",
    "sectionId": "sec_sub_1777779759038_8",
    "name": "إكمال الجمل: ترابط المعنى",
    "description": "مسار تأسيسي دقيق في إكمال الجمل: ترابط المعنى ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_16_01",
        "code": "16.1",
        "name": "الإيجاب والسلب",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_16_02",
        "code": "16.2",
        "name": "السبب والنتيجة",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_16_03",
        "code": "16.3",
        "name": "المقابلة والاستدراك",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_16_04",
        "code": "16.4",
        "name": "التوازي بين أجزاء الجملة",
        "order": 4
      }
    ]
  },
  {
    "num": "17",
    "id": "skill_verbal_11",
    "sectionId": "sec_sub_1777779759038_11",
    "name": "الخطأ السياقي: المعنى",
    "description": "مسار تأسيسي دقيق في الخطأ السياقي: المعنى ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_17_01",
        "code": "17.1",
        "name": "المعنى العام",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_17_02",
        "code": "17.2",
        "name": "الإيجاب والسلب",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_17_03",
        "code": "17.3",
        "name": "السبب والنتيجة",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_17_04",
        "code": "17.4",
        "name": "المقابلة",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_17_05",
        "code": "17.5",
        "name": "التلازم اللفظي",
        "order": 5
      }
    ]
  },
  {
    "num": "18",
    "id": "skill_verbal_20",
    "sectionId": "sec_sub_1777779759038_20",
    "name": "الخطأ السياقي: اللغة والمعرفة",
    "description": "مسار تأسيسي دقيق في الخطأ السياقي: اللغة والمعرفة ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_18_01",
        "code": "18.1",
        "name": "الحروف والأدوات",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_18_02",
        "code": "18.2",
        "name": "التلاعب اللفظي",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_18_03",
        "code": "18.3",
        "name": "الخطأ العلمي والثقافي",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_18_04",
        "code": "18.4",
        "name": "الحكم والأمثال",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_18_05",
        "code": "18.5",
        "name": "الكلمة المفتاحية",
        "order": 5
      }
    ]
  },
  {
    "num": "19",
    "id": "skill_verbal_12",
    "sectionId": "sec_sub_1777779759038_12",
    "name": "استيعاب المقروء: المعلومات المباشرة",
    "description": "مسار تأسيسي دقيق في استيعاب المقروء: المعلومات المباشرة ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_19_01",
        "code": "19.1",
        "name": "المعلومة الصريحة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_19_02",
        "code": "19.2",
        "name": "من ومتى وأين ولماذا",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_19_03",
        "code": "19.3",
        "name": "الأعداد والتواريخ",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_19_04",
        "code": "19.4",
        "name": "العقود والقرون",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_19_05",
        "code": "19.5",
        "name": "تحديد الفقرة",
        "order": 5
      }
    ]
  },
  {
    "num": "20",
    "id": "skill_verbal_21",
    "sectionId": "sec_sub_1777779759038_21",
    "name": "استيعاب المقروء: المفردات والإحالة",
    "description": "مسار تأسيسي دقيق في استيعاب المقروء: المفردات والإحالة ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_20_01",
        "code": "20.1",
        "name": "معنى الكلمة من السياق",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_20_02",
        "code": "20.2",
        "name": "استبدال كلمة",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_20_03",
        "code": "20.3",
        "name": "عائد الضمير",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_20_04",
        "code": "20.4",
        "name": "الكلمة الزائدة والمضافة",
        "order": 4
      }
    ]
  },
  {
    "num": "21",
    "id": "skill_verbal_22",
    "sectionId": "sec_sub_1777779759038_22",
    "name": "استيعاب المقروء: علاقات النص",
    "description": "مسار تأسيسي دقيق في استيعاب المقروء: علاقات النص ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_21_01",
        "code": "21.1",
        "name": "السبب والنتيجة",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_21_02",
        "code": "21.2",
        "name": "التفسير",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_21_03",
        "code": "21.3",
        "name": "التأكيد",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_21_04",
        "code": "21.4",
        "name": "التوافق والتعارض",
        "order": 4
      },
      {
        "id": "sub_verbal_v2_21_05",
        "code": "21.5",
        "name": "الإجمال والتفصيل",
        "order": 5
      }
    ]
  },
  {
    "num": "22",
    "id": "skill_verbal_13",
    "sectionId": "sec_sub_1777779759038_13",
    "name": "استيعاب المقروء: التحليل والاستنتاج",
    "description": "مسار تأسيسي دقيق في استيعاب المقروء: التحليل والاستنتاج ضمن القدرات اللفظية.",
    "subSkills": [
      {
        "id": "sub_verbal_v2_22_01",
        "code": "22.1",
        "name": "الفكرة والعنوان",
        "order": 1
      },
      {
        "id": "sub_verbal_v2_22_02",
        "code": "22.2",
        "name": "الاستنتاج",
        "order": 2
      },
      {
        "id": "sub_verbal_v2_22_03",
        "code": "22.3",
        "name": "موقف وأسلوب الكاتب",
        "order": 3
      },
      {
        "id": "sub_verbal_v2_22_04",
        "code": "22.4",
        "name": "الغرض والنتيجة",
        "order": 4
      }
    ]
  }
];

export const VERBAL_TAXONOMY_V2_COUNTS = {
  mainSkills: VERBAL_TAXONOMY_V2.length,
  subSkills: VERBAL_TAXONOMY_V2.reduce((total, item) => total + item.subSkills.length, 0),
} as const;

if (VERBAL_TAXONOMY_V2_COUNTS.mainSkills !== 22 || VERBAL_TAXONOMY_V2_COUNTS.subSkills !== 95) {
  throw new Error(
    `Invalid verbal V2 taxonomy counts: ${VERBAL_TAXONOMY_V2_COUNTS.mainSkills}/${VERBAL_TAXONOMY_V2_COUNTS.subSkills}`,
  );
}
