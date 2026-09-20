import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { env } from "../config/env.js";

export const VERBAL_TAXONOMY = [
  {
    num: "1",
    id: "skill_verbal_01",
    name: "التناظر اللفظي 1: علاقات الأجزاء والتركيب",
    description: "علاقات الكل والجزء، الأصل والفرع، المصدر والمشتق، والمادة والمنتج",
    subSkills: [
      { id: "sub_verbal_01_1", code: "1.1", name: "الكل إلى الجزء", order: 1 },
      { id: "sub_verbal_01_2", code: "1.2", name: "الجزء إلى الكل", order: 2 },
      { id: "sub_verbal_01_3", code: "1.3", name: "الأصل والفرع", order: 3 },
      { id: "sub_verbal_01_4", code: "1.4", name: "المصدر والمشتق", order: 4 },
      { id: "sub_verbal_01_5", code: "1.5", name: "المادة والمنتج", order: 5 },
    ],
  },
  {
    num: "2",
    id: "skill_verbal_02",
    name: "التناظر اللفظي 2: علاقات المعنى",
    description: "علاقات الترادف، التضاد، التشابه الدلالي، واختلاف الدرجة في المعنى",
    subSkills: [
      { id: "sub_verbal_02_1", code: "2.1", name: "الترادف", order: 1 },
      { id: "sub_verbal_02_2", code: "2.2", name: "التضاد", order: 2 },
      { id: "sub_verbal_02_3", code: "2.3", name: "التشابه الدلالي", order: 3 },
      { id: "sub_verbal_02_4", code: "2.4", name: "اختلاف الدرجة في المعنى", order: 4 },
      { id: "sub_verbal_02_5", code: "2.5", name: "العلاقات المعنوية المتقاربة", order: 5 },
    ],
  },
  {
    num: "3",
    id: "skill_verbal_03",
    name: "التناظر اللفظي 3: علاقات المكان والزمان",
    description: "المكان الثابت والمتحرك، الشيء ومكانه، والمكان وما يحويه، والعلاقات الزمانية",
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
    num: "4",
    id: "skill_verbal_04",
    name: "التناظر اللفظي 4: علاقات الوظيفة والاستخدام",
    description: "الشيء واستخدامه، الأداة ووظيفتها، العضو ووظيفته، والشخص ومهنته",
    subSkills: [
      { id: "sub_verbal_04_1", code: "4.1", name: "الشيء واستخدامه", order: 1 },
      { id: "sub_verbal_04_2", code: "4.2", name: "الأداة ووظيفتها", order: 2 },
      { id: "sub_verbal_04_3", code: "4.3", name: "العضو ووظيفته", order: 3 },
      { id: "sub_verbal_04_4", code: "4.4", name: "الشخص ومهنته", order: 4 },
      { id: "sub_verbal_04_5", code: "4.5", name: "المهنة وعملها", order: 5 },
    ],
  },
  {
    num: "5",
    id: "skill_verbal_05",
    name: "التناظر اللفظي 5: علاقات السبب والاحتياج",
    description: "السبب والنتيجة، الاحتياج والضرورة، الحماية، والتغطية والإحاطة والاحتواء",
    subSkills: [
      { id: "sub_verbal_05_1", code: "5.1", name: "السبب والنتيجة", order: 1 },
      { id: "sub_verbal_05_2", code: "5.2", name: "النتيجة والسبب", order: 2 },
      { id: "sub_verbal_05_3", code: "5.3", name: "الاحتياج والضرورة", order: 3 },
      { id: "sub_verbal_05_4", code: "5.4", name: "الحماية", order: 4 },
      { id: "sub_verbal_05_5", code: "5.5", name: "التغطية والإحاطة", order: 5 },
      { id: "sub_verbal_05_6", code: "5.6", name: "الاحتواء", order: 6 },
    ],
  },
  {
    num: "6",
    id: "skill_verbal_06",
    name: "التناظر اللفظي 6: علاقات التصنيف والمجالات الخاصة",
    description: "الفئة، التصنيف، الفرد والمجموعة، التدرج، الأصوات، والعلاقات المتنوعة",
    subSkills: [
      { id: "sub_verbal_06_1", code: "6.1", name: "الفئة", order: 1 },
      { id: "sub_verbal_06_2", code: "6.2", name: "التصنيف", order: 2 },
      { id: "sub_verbal_06_3", code: "6.3", name: "الفرد والمجموعة", order: 3 },
      { id: "sub_verbal_06_4", code: "6.4", name: "التدرج", order: 4 },
      { id: "sub_verbal_06_5", code: "6.5", name: "الأصوات", order: 5 },
      { id: "sub_verbal_06_6", code: "6.6", name: "العلاقات المتنوعة", order: 6 },
    ],
  },
  {
    num: "7",
    id: "skill_verbal_07",
    name: "إكمال الجمل 1: أساسيات الحل",
    description: "فهم سياق ومعنى الجملة، تحديد المطلوب، المفاتيح اللفظية واستبعاد الخاطئ",
    subSkills: [
      { id: "sub_verbal_07_1", code: "7.1", name: "فهم معنى الجملة", order: 1 },
      { id: "sub_verbal_07_2", code: "7.2", name: "تحديد المطلوب", order: 2 },
      { id: "sub_verbal_07_3", code: "7.3", name: "الكلمة المفتاحية", order: 3 },
      { id: "sub_verbal_07_4", code: "7.4", name: "اختيار الكلمة المناسبة", order: 4 },
      { id: "sub_verbal_07_5", code: "7.5", name: "استبعاد الاختيارات الخاطئة", order: 5 },
    ],
  },
  {
    num: "8",
    id: "skill_verbal_08",
    name: "إكمال الجمل 2: علاقات الجمل",
    description: "جمل الفراغ الواحد والفراغين، علاقات التضاد، الترادف، السببية، والمقارنة والاستثناء",
    subSkills: [
      { id: "sub_verbal_08_1", code: "8.1", name: "الفراغ الواحد", order: 1 },
      { id: "sub_verbal_08_2", code: "8.2", name: "الفراغان", order: 2 },
      { id: "sub_verbal_08_3", code: "8.3", name: "التضاد", order: 3 },
      { id: "sub_verbal_08_4", code: "8.4", name: "الترادف", order: 4 },
      { id: "sub_verbal_08_5", code: "8.5", name: "السبب والنتيجة", order: 5 },
      { id: "sub_verbal_08_6", code: "8.6", name: "المقارنة", order: 6 },
      { id: "sub_verbal_08_7", code: "8.7", name: "الاستثناء", order: 7 },
    ],
  },
  {
    num: "9",
    id: "skill_verbal_09",
    name: "المفردة الشاذة",
    description: "تحديد الكلمة الشاذة من حيث المعنى، التصنيف، العلاقة، الاستخدام، والفئة",
    subSkills: [
      { id: "sub_verbal_09_1", code: "9.1", name: "الشاذ من حيث المعنى", order: 1 },
      { id: "sub_verbal_09_2", code: "9.2", name: "الشاذ من حيث التصنيف", order: 2 },
      { id: "sub_verbal_09_3", code: "9.3", name: "الشاذ من حيث العلاقة", order: 3 },
      { id: "sub_verbal_09_4", code: "9.4", name: "الشاذ من حيث الاستخدام", order: 4 },
      { id: "sub_verbal_09_5", code: "9.5", name: "الشاذ من حيث الفئة", order: 5 },
    ],
  },
  {
    num: "10",
    id: "skill_verbal_10",
    name: "الربط والاختلاف",
    description: "العلاقة المشتركة بين الألفاظ، تحديد المختلف، المقارنة، التجميع، والاستبعاد",
    subSkills: [
      { id: "sub_verbal_10_1", code: "10.1", name: "العلاقة المشتركة", order: 1 },
      { id: "sub_verbal_10_2", code: "10.2", name: "تحديد المختلف", order: 2 },
      { id: "sub_verbal_10_3", code: "10.3", name: "التصنيف", order: 3 },
      { id: "sub_verbal_10_4", code: "10.4", name: "المقارنة", order: 4 },
      { id: "sub_verbal_10_5", code: "10.5", name: "التجميع", order: 5 },
      { id: "sub_verbal_10_6", code: "10.6", name: "الاستبعاد", order: 6 },
    ],
  },
  {
    num: "11",
    id: "skill_verbal_11",
    name: "الخطأ السياقي",
    description: "اكتشاف الكلمة الخاطئة في السياق، كشف التناقض، التضاد غير المناسب، والكلمة الدخيلة",
    subSkills: [
      { id: "sub_verbal_11_1", code: "11.1", name: "فهم السياق", order: 1 },
      { id: "sub_verbal_11_2", code: "11.2", name: "تحديد الكلمة الخاطئة", order: 2 },
      { id: "sub_verbal_11_3", code: "11.3", name: "التناقض", order: 3 },
      { id: "sub_verbal_11_4", code: "11.4", name: "التضاد غير المناسب", order: 4 },
      { id: "sub_verbal_11_5", code: "11.5", name: "الكلمة الدخيلة", order: 5 },
      { id: "sub_verbal_11_6", code: "11.6", name: "الاستخدام الصحيح", order: 6 },
    ],
  },
  {
    num: "12",
    id: "skill_verbal_12",
    name: "استيعاب المقروء 1: فهم النص",
    description: "الفكرة الرئيسية، الفكرة الفرعية، العنوان المناسب، هدف الكاتب، واستخراج المعلومات",
    subSkills: [
      { id: "sub_verbal_12_1", code: "12.1", name: "الفكرة الرئيسية", order: 1 },
      { id: "sub_verbal_12_2", code: "12.2", name: "الفكرة الفرعية", order: 2 },
      { id: "sub_verbal_12_3", code: "12.3", name: "العنوان المناسب", order: 3 },
      { id: "sub_verbal_12_4", code: "12.4", name: "هدف الكاتب", order: 4 },
      { id: "sub_verbal_12_5", code: "12.5", name: "ترتيب الأحداث والأفكار", order: 5 },
      { id: "sub_verbal_12_6", code: "12.6", name: "استخراج المعلومات", order: 6 },
    ],
  },
  {
    num: "13",
    id: "skill_verbal_13",
    name: "استيعاب المقروء 2: تحليل النص",
    description: "علاقات الجمل، التوافق والتعارض، عودة الضمير، الكلمة الزائدة، الاستبدال، والاستنتاج",
    subSkills: [
      { id: "sub_verbal_13_1", code: "13.1", name: "علاقات الجمل", order: 1 },
      { id: "sub_verbal_13_2", code: "13.2", name: "التوافق والتعارض", order: 2 },
      { id: "sub_verbal_13_3", code: "13.3", name: "عودة الضمير", order: 3 },
      { id: "sub_verbal_13_4", code: "13.4", name: "الكلمة الزائدة", order: 4 },
      { id: "sub_verbal_13_5", code: "13.5", name: "إضافة كلمة مناسبة", order: 5 },
      { id: "sub_verbal_13_6", code: "13.6", name: "استبدال كلمة", order: 6 },
      { id: "sub_verbal_13_7", code: "13.7", name: "الاستنتاج", order: 7 },
    ],
  },
];

export async function deploy() {
  console.log("=== Starting Deployment of 13 Verbal Skills Taxonomy ===");
  const uri = env.MONGODB_URI || "mongodb://localhost:27017/almeaa";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const pathId = "p_1777779639431";
  const subjectId = "sub_1777779759038"; // القسم اللفظي

  // 1. BACKUP PHASE
  console.log("\n--- Phase 1: Taking Snapshot Backup ---");
  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `verbal_taxonomy_backup_${timestamp}.json`);

  const prevSkills = await db.collection("skills").find({ subjectId }).toArray();
  const prevTopics = await db.collection("topics").find({ subjectId }).toArray();
  const prevQuizzes = await db.collection("quizzes").find({ subjectId }).toArray();
  const prevSections = await db.collection("sections").find({ subjectId }).toArray();

  fs.writeFileSync(
    backupFile,
    JSON.stringify({ prevSkills, prevTopics, prevQuizzes, prevSections }, null, 2),
    "utf8"
  );
  console.log(`Snapshot saved to: ${backupFile} (${prevSkills.length} skills, ${prevTopics.length} topics, ${prevSections.length} sections)`);

  // 2. SECTIONS PHASE (Clean legacy and ensure exactly 13 sections)
  console.log("\n--- Phase 2: Ensuring 13 Sections exist ---");
  const sectionCol = db.collection("sections");
  await sectionCol.deleteMany({ subjectId });

  for (let i = 0; i < VERBAL_TAXONOMY.length; i++) {
    const item = VERBAL_TAXONOMY[i];
    const secId = `sec_sub_1777779759038_${i + 1}`;
    await sectionCol.insertOne({
      _id: secId as any,
      id: secId,
      pathId,
      subjectId,
      name: item.name,
      order: i + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`Synced 13 sections for subject ${subjectId}`);

  // 3. SKILLS PHASE (13 Main Skills and 76 Subskills)
  console.log("\n--- Phase 3: Deploying 13 Main Skills and 76 Subskills ---");
  const skillsCol = db.collection("skills");
  await skillsCol.deleteMany({ subjectId });

  const skillDocs = VERBAL_TAXONOMY.map((item, idx) => {
    const secId = `sec_sub_1777779759038_${idx + 1}`;
    return {
      _id: item.id as any,
      id: item.id,
      pathId,
      subjectId,
      sectionId: secId,
      name: item.name,
      description: item.description,
      order: idx + 1,
      lessonIds: [],
      questionIds: [],
      subSkills: item.subSkills.map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        order: sub.order,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  await skillsCol.insertMany(skillDocs);
  console.log(`Inserted 13 skills into DB with ${skillDocs.reduce((acc, s) => acc + s.subSkills.length, 0)} subskills`);

  // 4. FOUNDATION TOPICS PHASE (1-to-1 Mirror)
  console.log("\n--- Phase 4: Deploying Foundation Topics (1-to-1 Mirror) ---");
  const topicsCol = db.collection("topics");
  await topicsCol.deleteMany({ subjectId });

  for (let i = 0; i < VERBAL_TAXONOMY.length; i++) {
    const item = VERBAL_TAXONOMY[i];
    const secId = `sec_sub_1777779759038_${i + 1}`;
    const parentTopicId = `top_verbal_main_${item.id.replace("skill_verbal_", "")}`;

    await topicsCol.insertOne({
      _id: parentTopicId as any,
      id: parentTopicId,
      title: item.name,
      description: item.description,
      pathId,
      subjectId,
      sectionId: secId,
      parentId: null,
      order: i + 1,
      quizIds: [],
      lessonIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const sub of item.subSkills) {
      const childTopicId = `top_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;

      await topicsCol.insertOne({
        _id: childTopicId as any,
        id: childTopicId,
        title: sub.name,
        description: `شرح وتدريبات مركزة على ${sub.name}`,
        pathId,
        subjectId,
        sectionId: secId,
        parentId: parentTopicId,
        order: sub.order,
        quizIds: [],
        lessonIds: [],
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const deployedParents = await topicsCol.countDocuments({ subjectId, parentId: null });
  const deployedChildren = await topicsCol.countDocuments({ subjectId, parentId: { $ne: null } });
  console.log(`Deployed Foundation Topics: ${deployedParents} Parents, ${deployedChildren} Children.`);

  console.log("=== Verbal Taxonomy Deployment Complete Successfully ===");
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith("deployVerbalTaxonomy13.ts") || process.argv[1]?.endsWith("deployVerbalTaxonomy13.js")) {
  deploy().catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
}
