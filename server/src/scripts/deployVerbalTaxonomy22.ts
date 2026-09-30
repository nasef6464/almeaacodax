import mongoose from "mongoose";
import { env } from "../config/env.js";

export const VERBAL_PATH_ID = "p_1777779639431";
export const VERBAL_SUBJECT_ID = "sub_1777779759038";

/**
 * Verbal taxonomy V2
 * - 22 main skills for clearer student/reporting navigation.
 * - Keeps the existing 76 subskill IDs stable so historical mastery/results remain addressable.
 * - A subskill belongs to exactly one V2 main skill.
 */
export const VERBAL_TAXONOMY = [
  {
    num: "1", id: "skill_verbal_01", name: "التناظر اللفظي — الجزء والكل والتركيب",
    description: "علاقات الكل والجزء والأصل والفرع والمصدر والمشتق والمادة والمنتج",
    subSkills: [
      { id: "sub_verbal_01_1", code: "1.1", name: "الكل إلى الجزء", order: 1 },
      { id: "sub_verbal_01_2", code: "1.2", name: "الجزء إلى الكل", order: 2 },
      { id: "sub_verbal_01_3", code: "1.3", name: "الأصل والفرع", order: 3 },
      { id: "sub_verbal_01_4", code: "1.4", name: "المصدر والمشتق", order: 4 },
      { id: "sub_verbal_01_5", code: "1.5", name: "المادة والمنتج", order: 5 },
    ],
  },
  {
    num: "2", id: "skill_verbal_02", name: "التناظر اللفظي — الترادف والتشابه",
    description: "الترادف والتشابه الدلالي والعلاقات المعنوية المتقاربة",
    subSkills: [
      { id: "sub_verbal_02_1", code: "2.1", name: "الترادف", order: 1 },
      { id: "sub_verbal_02_3", code: "2.3", name: "التشابه الدلالي", order: 2 },
      { id: "sub_verbal_02_5", code: "2.5", name: "العلاقات المعنوية المتقاربة", order: 3 },
    ],
  },
  {
    num: "3", id: "skill_verbal_03", name: "التناظر اللفظي — التضاد ودرجات المعنى",
    description: "التضاد واختلاف الدرجة في المعنى",
    subSkills: [
      { id: "sub_verbal_02_2", code: "2.2", name: "التضاد", order: 1 },
      { id: "sub_verbal_02_4", code: "2.4", name: "اختلاف الدرجة في المعنى", order: 2 },
    ],
  },
  {
    num: "4", id: "skill_verbal_04", name: "التناظر اللفظي — المكان والزمان",
    description: "العلاقات المكانية والزمانية والشيء ومكانه أو زمن حدوثه",
    subSkills: [
      { id: "sub_verbal_03_1", code: "3.1", name: "المكان الثابت", order: 1 },
      { id: "sub_verbal_03_2", code: "3.2", name: "المكان المتحرك", order: 2 },
      { id: "sub_verbal_03_3", code: "3.3", name: "الشيء ومكان وجوده", order: 3 },
      { id: "sub_verbal_03_4", code: "3.4", name: "المكان وما يحتويه", order: 4 },
      { id: "sub_verbal_03_5", code: "3.5", name: "داخل الشيء", order: 5 },
      { id: "sub_verbal_03_6", code: "3.6", name: "العلاقة الزمانية", order: 6 },
      { id: "sub_verbal_03_7", code: "3.7", name: "الشيء وزمن حدوثه", order: 7 },
    ],
  },
  {
    num: "5", id: "skill_verbal_05", name: "التناظر اللفظي — السبب والنتيجة",
    description: "العلاقة السببية في الاتجاهين",
    subSkills: [
      { id: "sub_verbal_05_1", code: "5.1", name: "السبب والنتيجة", order: 1 },
      { id: "sub_verbal_05_2", code: "5.2", name: "النتيجة والسبب", order: 2 },
    ],
  },
  {
    num: "6", id: "skill_verbal_06", name: "التناظر اللفظي — الوظيفة والاستخدام",
    description: "الشيء واستخدامه والأداة ووظيفتها والعضو ووظيفته والمهنة وعملها",
    subSkills: [
      { id: "sub_verbal_04_1", code: "4.1", name: "الشيء واستخدامه", order: 1 },
      { id: "sub_verbal_04_2", code: "4.2", name: "الأداة ووظيفتها", order: 2 },
      { id: "sub_verbal_04_3", code: "4.3", name: "العضو ووظيفته", order: 3 },
      { id: "sub_verbal_04_4", code: "4.4", name: "الشخص ومهنته", order: 4 },
      { id: "sub_verbal_04_5", code: "4.5", name: "المهنة وعملها", order: 5 },
    ],
  },
  {
    num: "7", id: "skill_verbal_07", name: "التناظر اللفظي — الاحتياج والحماية والاحتواء",
    description: "الاحتياج والضرورة والحماية والتغطية والإحاطة والاحتواء",
    subSkills: [
      { id: "sub_verbal_05_3", code: "5.3", name: "الاحتياج والضرورة", order: 1 },
      { id: "sub_verbal_05_4", code: "5.4", name: "الحماية", order: 2 },
      { id: "sub_verbal_05_5", code: "5.5", name: "التغطية والإحاطة", order: 3 },
      { id: "sub_verbal_05_6", code: "5.6", name: "الاحتواء", order: 4 },
    ],
  },
  {
    num: "8", id: "skill_verbal_08", name: "التناظر اللفظي — التصنيف والفئة والتدرج",
    description: "الفئة والتصنيف والفرد والمجموعة والتدرج",
    subSkills: [
      { id: "sub_verbal_06_1", code: "6.1", name: "الفئة", order: 1 },
      { id: "sub_verbal_06_2", code: "6.2", name: "التصنيف", order: 2 },
      { id: "sub_verbal_06_3", code: "6.3", name: "الفرد والمجموعة", order: 3 },
      { id: "sub_verbal_06_4", code: "6.4", name: "التدرج", order: 4 },
    ],
  },
  {
    num: "9", id: "skill_verbal_09", name: "التناظر اللفظي — الأصوات والعلاقات الخاصة",
    description: "الأصوات والعلاقات اللفظية المتنوعة",
    subSkills: [
      { id: "sub_verbal_06_5", code: "6.5", name: "الأصوات", order: 1 },
      { id: "sub_verbal_06_6", code: "6.6", name: "العلاقات المتنوعة", order: 2 },
    ],
  },
  {
    num: "10", id: "skill_verbal_10", name: "إكمال الجمل — فهم السياق والكلمات المفتاحية",
    description: "فهم معنى الجملة وتحديد المطلوب والمفاتيح اللفظية واختيار الأنسب",
    subSkills: [
      { id: "sub_verbal_07_1", code: "7.1", name: "فهم معنى الجملة", order: 1 },
      { id: "sub_verbal_07_2", code: "7.2", name: "تحديد المطلوب", order: 2 },
      { id: "sub_verbal_07_3", code: "7.3", name: "الكلمة المفتاحية", order: 3 },
      { id: "sub_verbal_07_4", code: "7.4", name: "اختيار الكلمة المناسبة", order: 4 },
      { id: "sub_verbal_07_5", code: "7.5", name: "استبعاد الاختيارات الخاطئة", order: 5 },
    ],
  },
  {
    num: "11", id: "skill_verbal_11", name: "إكمال الجمل — الفراغ الواحد",
    description: "إكمال جمل الفراغ الواحد مع توظيف الترادف والسياق",
    subSkills: [
      { id: "sub_verbal_08_1", code: "8.1", name: "الفراغ الواحد", order: 1 },
      { id: "sub_verbal_08_4", code: "8.4", name: "الترادف", order: 2 },
    ],
  },
  {
    num: "12", id: "skill_verbal_12", name: "إكمال الجمل — الفراغان والعلاقات",
    description: "الفراغان وعلاقات التضاد والسبب والمقارنة والاستثناء",
    subSkills: [
      { id: "sub_verbal_08_2", code: "8.2", name: "الفراغان", order: 1 },
      { id: "sub_verbal_08_3", code: "8.3", name: "التضاد", order: 2 },
      { id: "sub_verbal_08_5", code: "8.5", name: "السبب والنتيجة", order: 3 },
      { id: "sub_verbal_08_6", code: "8.6", name: "المقارنة", order: 4 },
      { id: "sub_verbal_08_7", code: "8.7", name: "الاستثناء", order: 5 },
    ],
  },
  {
    num: "13", id: "skill_verbal_13", name: "المفردة الشاذة — المعنى والتصنيف",
    description: "تمييز المفردة الشاذة من حيث المعنى والتصنيف والفئة",
    subSkills: [
      { id: "sub_verbal_09_1", code: "9.1", name: "الشاذ من حيث المعنى", order: 1 },
      { id: "sub_verbal_09_2", code: "9.2", name: "الشاذ من حيث التصنيف", order: 2 },
      { id: "sub_verbal_09_5", code: "9.5", name: "الشاذ من حيث الفئة", order: 3 },
    ],
  },
  {
    num: "14", id: "skill_verbal_14", name: "المفردة الشاذة — العلاقة والاستخدام",
    description: "تمييز المفردة الشاذة من حيث العلاقة والاستخدام",
    subSkills: [
      { id: "sub_verbal_09_3", code: "9.3", name: "الشاذ من حيث العلاقة", order: 1 },
      { id: "sub_verbal_09_4", code: "9.4", name: "الشاذ من حيث الاستخدام", order: 2 },
    ],
  },
  {
    num: "15", id: "skill_verbal_15", name: "الربط والاختلاف — العلاقة المشتركة والتصنيف",
    description: "اكتشاف الرابط المشترك والتصنيف بين الألفاظ",
    subSkills: [
      { id: "sub_verbal_10_1", code: "10.1", name: "العلاقة المشتركة", order: 1 },
      { id: "sub_verbal_10_3", code: "10.3", name: "التصنيف", order: 2 },
    ],
  },
  {
    num: "16", id: "skill_verbal_16", name: "الربط والاختلاف — المقارنة والتجميع والاستبعاد",
    description: "تحديد المختلف والمقارنة والتجميع والاستبعاد",
    subSkills: [
      { id: "sub_verbal_10_2", code: "10.2", name: "تحديد المختلف", order: 1 },
      { id: "sub_verbal_10_4", code: "10.4", name: "المقارنة", order: 2 },
      { id: "sub_verbal_10_5", code: "10.5", name: "التجميع", order: 3 },
      { id: "sub_verbal_10_6", code: "10.6", name: "الاستبعاد", order: 4 },
    ],
  },
  {
    num: "17", id: "skill_verbal_17", name: "الخطأ السياقي — فهم السياق وتحديد الخطأ",
    description: "فهم السياق وتحديد الكلمة غير المناسبة",
    subSkills: [
      { id: "sub_verbal_11_1", code: "11.1", name: "فهم السياق", order: 1 },
      { id: "sub_verbal_11_2", code: "11.2", name: "تحديد الكلمة الخاطئة", order: 2 },
    ],
  },
  {
    num: "18", id: "skill_verbal_18", name: "الخطأ السياقي — التناقض والتضاد والكلمة الدخيلة",
    description: "التناقض والتضاد غير المناسب والكلمة الدخيلة والاستخدام الصحيح",
    subSkills: [
      { id: "sub_verbal_11_3", code: "11.3", name: "التناقض", order: 1 },
      { id: "sub_verbal_11_4", code: "11.4", name: "التضاد غير المناسب", order: 2 },
      { id: "sub_verbal_11_5", code: "11.5", name: "الكلمة الدخيلة", order: 3 },
      { id: "sub_verbal_11_6", code: "11.6", name: "الاستخدام الصحيح", order: 4 },
    ],
  },
  {
    num: "19", id: "skill_verbal_19", name: "استيعاب المقروء — الفكرة والعنوان وهدف الكاتب",
    description: "الفكرة الرئيسية والعنوان المناسب وهدف الكاتب",
    subSkills: [
      { id: "sub_verbal_12_1", code: "12.1", name: "الفكرة الرئيسية", order: 1 },
      { id: "sub_verbal_12_3", code: "12.3", name: "العنوان المناسب", order: 2 },
      { id: "sub_verbal_12_4", code: "12.4", name: "هدف الكاتب", order: 3 },
    ],
  },
  {
    num: "20", id: "skill_verbal_20", name: "استيعاب المقروء — التفاصيل وترتيب الأفكار",
    description: "الفكرة الفرعية وترتيب الأحداث والأفكار واستخراج المعلومات",
    subSkills: [
      { id: "sub_verbal_12_2", code: "12.2", name: "الفكرة الفرعية", order: 1 },
      { id: "sub_verbal_12_5", code: "12.5", name: "ترتيب الأحداث والأفكار", order: 2 },
      { id: "sub_verbal_12_6", code: "12.6", name: "استخراج المعلومات", order: 3 },
    ],
  },
  {
    num: "21", id: "skill_verbal_21", name: "استيعاب المقروء — علاقات الجمل والضمائر",
    description: "علاقات الجمل والتوافق والتعارض وعودة الضمير",
    subSkills: [
      { id: "sub_verbal_13_1", code: "13.1", name: "علاقات الجمل", order: 1 },
      { id: "sub_verbal_13_2", code: "13.2", name: "التوافق والتعارض", order: 2 },
      { id: "sub_verbal_13_3", code: "13.3", name: "عودة الضمير", order: 3 },
    ],
  },
  {
    num: "22", id: "skill_verbal_22", name: "استيعاب المقروء — الاستنتاج والحذف والإضافة والاستبدال",
    description: "الاستنتاج والكلمة الزائدة وإضافة كلمة مناسبة واستبدال كلمة",
    subSkills: [
      { id: "sub_verbal_13_4", code: "13.4", name: "الكلمة الزائدة", order: 1 },
      { id: "sub_verbal_13_5", code: "13.5", name: "إضافة كلمة مناسبة", order: 2 },
      { id: "sub_verbal_13_6", code: "13.6", name: "استبدال كلمة", order: 3 },
      { id: "sub_verbal_13_7", code: "13.7", name: "الاستنتاج", order: 4 },
    ],
  },
] as const;

export const VERBAL_SUBSKILL_TO_MAIN = Object.fromEntries(
  VERBAL_TAXONOMY.flatMap((main) => main.subSkills.map((sub) => [sub.id, main.id])),
) as Record<string, string>;

export const VERBAL_SUBSKILL_TO_SECTION = Object.fromEntries(
  VERBAL_TAXONOMY.flatMap((main, index) =>
    main.subSkills.map((sub) => [sub.id, `sec_${VERBAL_SUBJECT_ID}_${index + 1}`]),
  ),
) as Record<string, string>;

export function validateVerbalTaxonomyV2() {
  if (VERBAL_TAXONOMY.length !== 22) throw new Error(`Expected 22 main skills, got ${VERBAL_TAXONOMY.length}`);
  const allSubskills = VERBAL_TAXONOMY.flatMap((main) => main.subSkills.map((sub) => sub.id));
  if (allSubskills.length !== 76) throw new Error(`Expected 76 subskills, got ${allSubskills.length}`);
  const unique = new Set(allSubskills);
  if (unique.size !== 76) throw new Error(`Duplicate subskill IDs detected: expected 76 unique, got ${unique.size}`);
  return true;
}

export async function deploy() {
  validateVerbalTaxonomyV2();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const skills = db.collection("skills");
  const sections = db.collection("sections");
  const topics = db.collection("topics");
  const now = new Date();

  await sections.deleteMany({ subjectId: VERBAL_SUBJECT_ID });
  for (let index = 0; index < VERBAL_TAXONOMY.length; index++) {
    const main = VERBAL_TAXONOMY[index];
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${index + 1}`;
    await sections.insertOne({
      _id: sectionId as any, id: sectionId, pathId: VERBAL_PATH_ID, subjectId: VERBAL_SUBJECT_ID,
      name: main.name, order: index + 1, createdAt: now, updatedAt: now,
    });
  }

  await skills.deleteMany({ subjectId: VERBAL_SUBJECT_ID });
  await skills.insertMany(VERBAL_TAXONOMY.map((main, index) => {
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${index + 1}`;
    return {
      _id: main.id as any,
      id: main.id,
      pathId: VERBAL_PATH_ID,
      subjectId: VERBAL_SUBJECT_ID,
      sectionId,
      name: main.name,
      description: main.description,
      order: index + 1,
      lessonIds: [],
      questionIds: [],
      subSkills: main.subSkills.map((sub) => ({ ...sub })),
      createdAt: now,
      updatedAt: now,
    };
  }));

  const parentIds = VERBAL_TAXONOMY.map((main) => `top_verbal_main_${main.num.padStart(2, "0")}`);
  await topics.deleteMany({ subjectId: VERBAL_SUBJECT_ID, parentId: null, id: { $nin: parentIds } });

  for (let index = 0; index < VERBAL_TAXONOMY.length; index++) {
    const main = VERBAL_TAXONOMY[index];
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${index + 1}`;
    const parentTopicId = `top_verbal_main_${main.num.padStart(2, "0")}`;
    await topics.updateOne(
      { _id: parentTopicId as any },
      { $set: {
        id: parentTopicId, title: main.name, description: main.description,
        pathId: VERBAL_PATH_ID, subjectId: VERBAL_SUBJECT_ID, sectionId,
        parentId: null, order: index + 1, isPublished: true, updatedAt: now,
      }, $setOnInsert: { createdAt: now, quizIds: [], lessonIds: [] } },
      { upsert: true },
    );
    for (const sub of main.subSkills) {
      const childTopicId = `top_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      await topics.updateOne(
        { _id: childTopicId as any },
        { $set: {
          id: childTopicId, title: sub.name, description: `شرح وتدريبات مركزة على ${sub.name}`,
          pathId: VERBAL_PATH_ID, subjectId: VERBAL_SUBJECT_ID, sectionId,
          parentId: parentTopicId, order: sub.order, skillId: sub.id, isPublished: true, updatedAt: now,
        }, $setOnInsert: { createdAt: now, quizIds: [], lessonIds: [] } },
        { upsert: true },
      );
    }
  }

  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith("deployVerbalTaxonomy22.ts") || process.argv[1]?.endsWith("deployVerbalTaxonomy22.js")) {
  deploy().catch((error) => {
    console.error("Verbal taxonomy V2 deployment failed:", error);
    process.exit(1);
  });
}
