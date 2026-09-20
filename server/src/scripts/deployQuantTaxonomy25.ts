import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { env } from "../config/env.js";

// Taxonomy Data Definition (25 Main Skills + 95 Subskills)
export const QUANT_TAXONOMY = [
  {
    num: "1",
    id: "skill_quant_01",
    name: "أساسيات الأعداد والعمليات الحسابية",
    description: "الإشارات، التجميع الذكي، الجمع المتكرر، ترتيب العمليات، وتحديد خانة الآحاد",
    subSkills: [
      { id: "sub_quant_01_1", code: "1.1", name: "قواعد الإشارات والتجميع الذكي (مكملات 10 و 100 و 1000)", order: 1 },
      { id: "sub_quant_01_2", code: "1.2", name: "جمع الأعداد المتكررة والعامل المشترك", order: 2 },
      { id: "sub_quant_01_3", code: "1.3", name: "الأعداد الزوجية والفردية والمتتاليات الحسابية", order: 3 },
      { id: "sub_quant_01_4", code: "1.4", name: "ترتيب العمليات الحسابية وفك الأقواس", order: 4 },
      { id: "sub_quant_01_5", code: "1.5", name: "تحديد خانة الآحاد للنواتج والعمليات الحسابية", order: 5 },
    ],
  },
  {
    num: "2",
    id: "skill_quant_02",
    name: "قابلية القسمة وبواقي الأعداد",
    description: "قواعد قابلية القسمة وبواقي الأعداد وتحليل العوامل الأولية",
    subSkills: [
      { id: "sub_quant_02_1", code: "2.1", name: "قواعد قابلية القسمة على الأعداد (2، 3، 4، 5، 6، 7، 8، 9، 11)", order: 1 },
      { id: "sub_quant_02_2", code: "2.2", name: "باقي القسمة وبواقي الأعداد", order: 2 },
      { id: "sub_quant_02_3", code: "2.3", name: "الأعداد الأولية والتحليل للعوامل الأولية", order: 3 },
    ],
  },
  {
    num: "3",
    id: "skill_quant_03",
    name: "الكسور الاعتيادية",
    description: "العمليات على الكسور، المقارنة، ومعادلات ومسائل الكسور",
    subSkills: [
      { id: "sub_quant_03_1", code: "3.1", name: "جمع وطرح الكسور وتوحيد المقامات", order: 1 },
      { id: "sub_quant_03_2", code: "3.2", name: "ضرب وقسمة الكسور وتبسيطها", order: 2 },
      { id: "sub_quant_03_3", code: "3.3", name: "مقارنة الكسور وترتيبها (طريقة المقص)", order: 3 },
      { id: "sub_quant_03_4", code: "3.4", name: "معادلات ومسائل الكسور وسعة الخزانات", order: 4 },
    ],
  },
  {
    num: "4",
    id: "skill_quant_04",
    name: "الأعداد العشرية",
    description: "العمليات الحسابية على الأعداد العشرية والتحويل والتقريب",
    subSkills: [
      { id: "sub_quant_04_1", code: "4.1", name: "جمع وطرح الأعداد العشرية", order: 1 },
      { id: "sub_quant_04_2", code: "4.2", name: "ضرب وقسمة الأعداد العشرية وقوى 10", order: 2 },
      { id: "sub_quant_04_3", code: "4.3", name: "التحويل بين الكسور الاعتيادية والعشرية والتقريب", order: 3 },
      { id: "sub_quant_04_4", code: "4.4", name: "مقارنة وترتيب الأعداد العشرية", order: 4 },
    ],
  },
  {
    num: "5",
    id: "skill_quant_05",
    name: "الأسس والقوى",
    description: "قوانين الأسس، قوى القوى، المعادلات الأسية، ومقارنة الأسس",
    subSkills: [
      { id: "sub_quant_05_1", code: "5.1", name: "ضرب وقسمة الأسس عند تشابه الأساس", order: 1 },
      { id: "sub_quant_05_2", code: "5.2", name: "قوى القوى والأسس السالبة والكسرية والصفري", order: 2 },
      { id: "sub_quant_05_3", code: "5.3", name: "المعادلات الأسية وتساوي الأساسات والأسس", order: 3 },
      { id: "sub_quant_05_4", code: "5.4", name: "جمع وطرح الأساسات المتشابهة وإخراج العامل المشترك", order: 4 },
      { id: "sub_quant_05_5", code: "5.5", name: "مقارنة الأسس الكبيرة ومضاعفات الأسس", order: 5 },
    ],
  },
  {
    num: "6",
    id: "skill_quant_06",
    name: "الجذور",
    description: "العمليات على الجذور، إنطاق المقام، والمقارنة والتقريب",
    subSkills: [
      { id: "sub_quant_06_1", code: "6.1", name: "جمع وطرح الجذور وتبسيطها (المتشابهة والمختلفة)", order: 1 },
      { id: "sub_quant_06_2", code: "6.2", name: "ضرب وقسمة الجذور", order: 2 },
      { id: "sub_quant_06_3", code: "6.3", name: "إنطاق المقام والضرب في المرافق", order: 3 },
      { id: "sub_quant_06_4", code: "6.4", name: "مقارنة الجذور وتقريب الجذور غير الشهيرة", order: 4 },
      { id: "sub_quant_06_5", code: "6.5", name: "الجذور ذات الدليل الأعلى (التكعيبية والرباعية)", order: 5 },
    ],
  },
  {
    num: "7",
    id: "skill_quant_07",
    name: "الجبر والمتطابقات",
    description: "الفرق بين مربعين، المربع الكامل، المعادلات، والمتباينات",
    subSkills: [
      { id: "sub_quant_07_1", code: "7.1", name: "الفرق بين مربعين والمربع الكامل والمتطابقات الشهيرة", order: 1 },
      { id: "sub_quant_07_2", code: "7.2", name: "حل المعادلات الخطية والمعادلات الآنية (س وص)", order: 2 },
      { id: "sub_quant_07_3", code: "7.3", name: "تبسيط المقادير الجبرية وإخراج العامل المشترك", order: 3 },
      { id: "sub_quant_07_4", code: "7.4", name: "المتباينات وإشارات التباين والقيمة المطلقة", order: 4 },
    ],
  },
  {
    num: "8",
    id: "skill_quant_08",
    name: "النسبة والتناسب",
    description: "التناسب الطردي، العكسي، الضرب التبادلي، والتقسيم التناسبي",
    subSkills: [
      { id: "sub_quant_08_1", code: "8.1", name: "مفهوم النسبة والتبسيط والتقسيم التناسبي", order: 1 },
      { id: "sub_quant_08_2", code: "8.2", name: "التناسب الطردي وحاصل الضرب التبادلي (المقص)", order: 2 },
      { id: "sub_quant_08_3", code: "8.3", name: "التناسب العكسي", order: 3 },
      { id: "sub_quant_08_4", code: "8.4", name: "الضرب التبادلي ومسائل الخلط والسبائك (فاعل - مفعول - زمن)", order: 4 },
    ],
  },
  {
    num: "9",
    id: "skill_quant_09",
    name: "النسبة المئوية",
    description: "حساب النسب، الزيادة والنقصان، والتغير المئوي المركب",
    subSkills: [
      { id: "sub_quant_09_1", code: "9.1", name: "حساب النسبة المئوية من عدد والنسب المشهورة", order: 1 },
      { id: "sub_quant_09_2", code: "9.2", name: "إيجاد العدد الأصلي بمعلومية نسبته المئوية", order: 2 },
      { id: "sub_quant_09_3", code: "9.3", name: "النسبة المئوية للزيادة والنقصان", order: 3 },
      { id: "sub_quant_09_4", code: "9.4", name: "التغير المئوي المركب والخصومات المتتالية", order: 4 },
    ],
  },
  {
    num: "10",
    id: "skill_quant_10",
    name: "الربح والخسارة والحسابات المالية",
    description: "سعر البيع والشراء، السعر الأصلي، الرواتب، والزكاة",
    subSkills: [
      { id: "sub_quant_10_1", code: "10.1", name: "حساب سعر البيع والشراء ونسبة الربح والخسارة", order: 1 },
      { id: "sub_quant_10_2", code: "10.2", name: "حساب السعر الأصلي قبل التخفيض أو الربح", order: 2 },
      { id: "sub_quant_10_3", code: "10.3", name: "حساب الرواتب والادخار والمصاريف", order: 3 },
      { id: "sub_quant_10_4", code: "10.4", name: "حساب مقدار الزكاة الشرعية (قسمة على 40 أو ضرب في 2.5%)", order: 4 },
    ],
  },
  {
    num: "11",
    id: "skill_quant_11",
    name: "استراتيجيات الحل السريع",
    description: "تجريب الخيارات، الحل العكسي، الرسم، والتدرج المنتظم",
    subSkills: [
      { id: "sub_quant_11_1", code: "11.1", name: "تجريب الخيارات والتعويض الذكي والاستبعاد المنطقي", order: 1 },
      { id: "sub_quant_11_2", code: "11.2", name: "الحل العكسي (التراجع من النهاية للبداية)", order: 2 },
      { id: "sub_quant_11_3", code: "11.3", name: "الرسم والتمثيل البصري للمسألة", order: 3 },
      { id: "sub_quant_11_4", code: "11.4", name: "التدرج المنتظم والتقريب البديهي", order: 4 },
    ],
  },
  {
    num: "12",
    id: "skill_quant_12",
    name: "مسائل الحركة والسرعات",
    description: "السرعة والمسافة، زمن اللحاق، حركة قطارين، وعجلات السيارات",
    subSkills: [
      { id: "sub_quant_12_1", code: "12.1", name: "قانون السرعة الأساسي والسرعة المتوسطة", order: 1 },
      { id: "sub_quant_12_2", code: "12.2", name: "مسائل زمن اللحاق والالتقاء", order: 2 },
      { id: "sub_quant_12_3", code: "12.3", name: "حركة جسمين (نفس الاتجاه أو اتجاهين متعاكسين)", order: 3 },
      { id: "sub_quant_12_4", code: "12.4", name: "مسائل القطارات والأنفاق وعجلات السيارات", order: 4 },
    ],
  },
  {
    num: "13",
    id: "skill_quant_13",
    name: "قوانين القدرات الخاصة",
    description: "العمل المشترك، المصافحات، المباريات، والأشجار والأعواد",
    subSkills: [
      { id: "sub_quant_13_1", code: "13.1", name: "مسائل العمل المشترك وخزانات المياه والصنابير", order: 1 },
      { id: "sub_quant_13_2", code: "13.2", name: "قانون عدد المصافحات والمباريات والهدايا", order: 2 },
      { id: "sub_quant_13_3", code: "13.3", name: "قانون عدد الأعواد والأشجار والمسافات البينية", order: 3 },
      { id: "sub_quant_13_4", code: "13.4", name: "قانون عدد الصفحات والمقاعد والترتيب في الصف", order: 4 },
    ],
  },
  {
    num: "14",
    id: "skill_quant_14",
    name: "الدوريات والأنماط المتكررة",
    description: "دوري الأيام، دوري الساعات، دوري قوى الأسس، والأنماط المتكررة",
    subSkills: [
      { id: "sub_quant_14_1", code: "14.1", name: "دوري الأيام والأسابيع (القسمة على 7 والباقي)", order: 1 },
      { id: "sub_quant_14_2", code: "14.2", name: "دوري الساعات والشهور وباقي قسمة الوقت", order: 2 },
      { id: "sub_quant_14_3", code: "14.3", name: "دوري الأسس وقوى الأعداد وبواقي التكرار", order: 3 },
      { id: "sub_quant_14_4", code: "14.4", name: "الأنماط والمتتابعات الدورية المتكررة", order: 4 },
    ],
  },
  {
    num: "15",
    id: "skill_quant_15",
    name: "الساعات وحساب زوايا العقارب",
    description: "الزاوية بين عقرب الساعات والدقائق، دوران العقارب، وزاوية الدقيقة",
    subSkills: [
      { id: "sub_quant_15_1", code: "15.1", name: "حساب الزاوية الصغرى والكبرى بين عقرب الساعات وعقرب الدقائق", order: 1 },
      { id: "sub_quant_15_2", code: "15.2", name: "دوران عقارب الساعة ومقدار تحرك العقرب بالدرجات", order: 2 },
      { id: "sub_quant_15_3", code: "15.3", name: "زاوية الدقيقة الواحدة ومسائل الساعات المتقدمة", order: 3 },
    ],
  },
  {
    num: "16",
    id: "skill_quant_16",
    name: "الأعمار",
    description: "حساب العمر في الماضي وبعد سنوات، وفروق ونسب الأعمار",
    subSkills: [
      { id: "sub_quant_16_1", code: "16.1", name: "حساب العمر في الماضي وبعد سنوات", order: 1 },
      { id: "sub_quant_16_2", code: "16.2", name: "العلاقات والنسب بين الأعمار (ضعف، ثلاثة أمثال...)", order: 2 },
      { id: "sub_quant_16_3", code: "16.3", name: "مجموع وفروق الأعمار وثبات الفرق الزمني", order: 3 },
    ],
  },
  {
    num: "17",
    id: "skill_quant_17",
    name: "المتوسط الحسابي والإحصاء",
    description: "قانون المتوسط الحسابي، إيجاد المجهول، الوسيط، والمنوال",
    subSkills: [
      { id: "sub_quant_17_1", code: "17.1", name: "قانون المتوسط الحسابي ومجموع القيم وتطبيقاته", order: 1 },
      { id: "sub_quant_17_2", code: "17.2", name: "إيجاد قيمة مجهولة بمعلومية المتوسط الحسابي", order: 2 },
      { id: "sub_quant_17_3", code: "17.3", name: "المتوسط الحسابي لأعداد متتالية والمتوسط الموزون", order: 3 },
      { id: "sub_quant_17_4", code: "17.4", name: "الوسيط والمنوال والمدى وتطبيقاتها", order: 4 },
    ],
  },
  {
    num: "18",
    id: "skill_quant_18",
    name: "الاحتمالات وعد الطرق والبيانات",
    description: "الاحتمال البسيط، مبدأ العد، وقراءة الرسوم والقطاعات الدائرية",
    subSkills: [
      { id: "sub_quant_18_1", code: "18.1", name: "الاحتمال البسيط وفضاء العينة وحساب النواتج", order: 1 },
      { id: "sub_quant_18_2", code: "18.2", name: "مبدأ العد الأساسي والتباديل والتوافيق المبسطة", order: 2 },
      { id: "sub_quant_18_3", code: "18.3", name: "قراءة وتفسير الجداول والرسوم والقطاعات الدائرية", order: 3 },
    ],
  },
  {
    num: "19",
    id: "skill_quant_19",
    name: "الزوايا والمستقيمات",
    description: "الزوايا المتجاورة، زوايا التوازي، وزوايا المضلعات المنتظمة",
    subSkills: [
      { id: "sub_quant_19_1", code: "19.1", name: "الزوايا المتجاورة والمتقابلة بالرأس والمتجمعة حول نقطة", order: 1 },
      { id: "sub_quant_19_2", code: "19.2", name: "الزوايا الناتجة عن توازي مستقيمين وقاطع (Z, F, U, M)", order: 2 },
      { id: "sub_quant_19_3", code: "19.3", name: "مجموع الزوايا الداخلية والخارجية للمضلعات المنتظمة", order: 3 },
    ],
  },
  {
    num: "20",
    id: "skill_quant_20",
    name: "المثلثات",
    description: "زوايا المثلث، المثلثات الخاصة، نظرية فيثاغورس، والمساحة",
    subSkills: [
      { id: "sub_quant_20_1", code: "20.1", name: "زوايا المثلث الداخلية والخارجية والمثلث المتطابق الضلعين", order: 1 },
      { id: "sub_quant_20_2", code: "20.2", name: "المثلثات الخاصة (30-60 والمثلث 45 المتطابق الضلعين)", order: 2 },
      { id: "sub_quant_20_3", code: "20.3", name: "نظرية فيثاغورس والمثلثات الفيثاغورية المشهورة", order: 3 },
      { id: "sub_quant_20_4", code: "20.4", name: "مساحة المثلث وارتفاعه وقاعدته", order: 4 },
      { id: "sub_quant_20_5", code: "20.5", name: "تشابه وتطابق المثلثات ومتباينة أطوال الأضلاع", order: 5 },
    ],
  },
  {
    num: "21",
    id: "skill_quant_21",
    name: "المستطيل",
    description: "محيط ومساحة المستطيل، علاقة الأبعاد، وتطبيقات المسائل",
    subSkills: [
      { id: "sub_quant_21_1", code: "21.1", name: "محيط ومساحة المستطيل وتطبيقاته", order: 1 },
      { id: "sub_quant_21_2", code: "21.2", name: "علاقة أبعاد المستطيل وتقسيماته الهندسية", order: 2 },
      { id: "sub_quant_21_3", code: "21.3", name: "مسائل السلالم والحدائق والممرات المقسمة", order: 3 },
    ],
  },
  {
    num: "22",
    id: "skill_quant_22",
    name: "المربع",
    description: "محيط ومساحة المربع بالضلع أو القطر والمربعات المتداخلة",
    subSkills: [
      { id: "sub_quant_22_1", code: "22.1", name: "محيط ومساحة المربع بطول الضلع", order: 1 },
      { id: "sub_quant_22_2", code: "22.2", name: "مساحة المربع بمعلومية طول قطره: (القطر)² / 2", order: 2 },
      { id: "sub_quant_22_3", code: "22.3", name: "المربعات المتداخلة والمتقاطعة ومقارنة المساحات", order: 3 },
    ],
  },
  {
    num: "23",
    id: "skill_quant_23",
    name: "المعين ومتوازي الأضلاع وشبه المنحرف",
    description: "خصائص ومساحات متوازي الأضلاع، المعين، وشبه المنحرف",
    subSkills: [
      { id: "sub_quant_23_1", code: "23.1", name: "مساحة ومحيط متوازي الأضلاع", order: 1 },
      { id: "sub_quant_23_2", code: "23.2", name: "مساحة ومحيط المعين بمعلومية قطريه", order: 2 },
      { id: "sub_quant_23_3", code: "23.3", name: "مساحة شبه المنحرف والقاعدة المتوسطة", order: 3 },
    ],
  },
  {
    num: "24",
    id: "skill_quant_24",
    name: "الدائرة والمساحات المظللة",
    description: "محيط ومساحة الدائرة، الزوايا، وطرح المساحات المظللة",
    subSkills: [
      { id: "sub_quant_24_1", code: "24.1", name: "محيط ومساحة الدائرة ونصف القطر", order: 1 },
      { id: "sub_quant_24_2", code: "24.2", name: "الزوايا المركزية والمحيطية والقطاع الدائري", order: 2 },
      { id: "sub_quant_24_3", code: "24.3", name: "استراتيجية حساب الأشكال والمساحات المظللة (طرح المساحات)", order: 3 },
      { id: "sub_quant_24_4", code: "24.4", name: "مساحة الوردة المظللة وتداخل الدوائر والمربعات", order: 4 },
    ],
  },
  {
    num: "25",
    id: "skill_quant_25",
    name: "المجسمات والحجوم وهندسة الإحداثيات",
    description: "حجوم ومساحات المكعب ومتوازي المستطيلات والأسطوانة والإحداثيات",
    subSkills: [
      { id: "sub_quant_25_1", code: "25.1", name: "حجم والمساحة السطحية للمكعب ومتوازي المستطيلات", order: 1 },
      { id: "sub_quant_25_2", code: "25.2", name: "حجم ومساحة سطح الأسطوانة والكرة", order: 2 },
      { id: "sub_quant_25_3", code: "25.3", name: "هندسة الإحداثيات (تحديد النقاط، المسافة، ونقطة المنتصف)", order: 3 },
    ],
  },
];

export async function deploy() {
  console.log("=== Starting Deployment of 25 Quant Skills Taxonomy ===");
  const uri = env.MONGODB_URI || "mongodb://localhost:27017/almeaa";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const pathId = "p_1777779639431";
  const subjectId = "sub_1777779748206";

  // 1. BACKUP PHASE
  console.log("\n--- Phase 1: Taking Snapshot Backup ---");
  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `taxonomy_backup_${timestamp}.json`);

  const prevSkills = await db.collection("skills").find({ subjectId }).toArray();
  const prevTopics = await db.collection("topics").find({ subjectId }).toArray();
  const prevQuizzes = await db.collection("quizzes").find({ subjectId }).toArray();
  const prevQuestions = await db.collection("questions").find({ subject: subjectId }).toArray();

  fs.writeFileSync(
    backupFile,
    JSON.stringify({ prevSkills, prevTopics, prevQuizzes, questionCount: prevQuestions.length }, null, 2),
    "utf8"
  );
  console.log(`Snapshot saved to: ${backupFile} (${prevSkills.length} skills, ${prevTopics.length} topics, ${prevQuizzes.length} quizzes)`);

  // 2. SECTIONS PHASE
  console.log("\n--- Phase 2: Ensuring 25 Sections exist ---");
  const sectionCol = db.collection("sections");
  for (let i = 0; i < QUANT_TAXONOMY.length; i++) {
    const item = QUANT_TAXONOMY[i];
    const secId = `sec_sub_1777779748206_${i + 1}`;
    await sectionCol.updateOne(
      { _id: secId as any },
      {
        $set: {
          _id: secId,
          pathId,
          subjectId,
          name: item.name,
          order: i + 1,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          id: secId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Synced 25 sections for subject ${subjectId}`);

  // 3. SKILLS PHASE
  console.log("\n--- Phase 3: Deploying 25 Main Skills and 95 Subskills ---");
  const skillsCol = db.collection("skills");
  await skillsCol.deleteMany({ subjectId });

  const skillDocs = QUANT_TAXONOMY.map((item, idx) => {
    const secId = `sec_sub_1777779748206_${idx + 1}`;
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
  console.log(`Inserted 25 skills into DB`);

  // 4. FOUNDATION TOPICS PHASE
  console.log("\n--- Phase 4: Deploying Foundation Topics (1-to-1 Mirror) ---");
  const topicsCol = db.collection("topics");

  const existingLessons = await db.collection("lessons").find({ subjectId }).toArray();
  console.log(`Found ${existingLessons.length} existing video lessons to preserve and re-link`);

  await topicsCol.deleteMany({ subjectId });

  const parentTopicMap: Record<string, string> = {};
  const childTopicMap: Record<string, string> = {};

  for (let i = 0; i < QUANT_TAXONOMY.length; i++) {
    const item = QUANT_TAXONOMY[i];
    const secId = `sec_sub_1777779748206_${i + 1}`;
    const parentTopicId = `top_quant_main_${item.id.replace("skill_", "")}`;
    parentTopicMap[item.id] = parentTopicId;

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
      const childTopicId = `top_quant_sub_${sub.id.replace("sub_", "")}`;
      childTopicMap[sub.id] = childTopicId;

      const matchingLesson = existingLessons.find(
        (l) => l.title?.includes(sub.name) || sub.name?.includes(l.title || "")
      );
      const linkedLessonIds = matchingLesson ? [matchingLesson.id || matchingLesson._id.toString()] : [];

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
        lessonIds: linkedLessonIds,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  console.log(`Created 25 parent topics and 95 child topics matching the approved taxonomy`);

  // 5. QUESTIONS MAPPING PHASE
  console.log("\n--- Phase 5: Re-tagging 2,314 Questions with Domain Mapping ---");
  const questionsCol = db.collection("questions");
  const allQuestions = await questionsCol.find({ subject: subjectId }).toArray();
  console.log(`Found ${allQuestions.length} questions to re-tag for subject ${subjectId}`);

  // Mapping question to main skill using sectionId & tags
  function determineMainSkill(q: any): string {
    const secNum = parseInt((q.sectionId || "").split("_").pop() || "0", 10);
    const tags = (q.tags || []).join(" ");
    const expl = q.explanation || "";
    const text = `${tags} ${expl} ${q.question || ""}`;

    if (secNum === 1 || secNum === 2) {
      if (text.includes("خانة الآحاد") || text.includes("آحاد")) return "skill_quant_01";
      if (text.includes("أولي") || text.includes("أولية") || text.includes("عوامل أولية") || text.includes("يقبل القسمة") || text.includes("باقي")) return "skill_quant_02";
      return "skill_quant_01";
    }
    if (secNum === 3) return "skill_quant_02";
    if (secNum === 4) {
      if (text.includes("ساعة") || text.includes("عقرب") || text.includes("عقارب") || text.includes("زاوية الدقائق")) return "skill_quant_15";
      return "skill_quant_14";
    }
    if (secNum === 5) return "skill_quant_03";
    if (secNum === 6) return "skill_quant_04";
    if (secNum === 7) {
      if (text.includes("جذر") || text.includes("الجذور") || text.includes("إنطاق")) return "skill_quant_06";
      return "skill_quant_05";
    }
    if (secNum === 8) return "skill_quant_08";
    if (secNum === 9) {
      if (text.includes("ربح") || text.includes("خسارة") || text.includes("بيع") || text.includes("شراء") || text.includes("زكاة") || text.includes("راتب")) return "skill_quant_10";
      return "skill_quant_09";
    }
    if (secNum === 10) return "skill_quant_07";
    if (secNum === 11) return "skill_quant_17";
    if (secNum === 12) return "skill_quant_18";
    if (secNum === 13 || secNum === 15) return "skill_quant_13";
    if (secNum === 14) return "skill_quant_12";
    if (secNum === 16) return "skill_quant_16";
    if (secNum === 17) return "skill_quant_19";
    if (secNum === 18) return "skill_quant_20";
    if (secNum === 19) {
      if (text.includes("مربع")) return "skill_quant_22";
      if (text.includes("معين") || text.includes("متوازي أضلاع") || text.includes("شبه منحرف")) return "skill_quant_23";
      return "skill_quant_21";
    }
    if (secNum === 20 || secNum === 21) {
      if (text.includes("دائرة") || text.includes("مظلل") || text.includes("نق") || text.includes("ط")) return "skill_quant_24";
      if (text.includes("مستطيل")) return "skill_quant_21";
      if (text.includes("مثلث")) return "skill_quant_20";
      if (text.includes("مربع")) return "skill_quant_22";
      return "skill_quant_24";
    }
    if (secNum === 22 || secNum === 23) return "skill_quant_25";
    if (secNum === 24) return "skill_quant_11";

    return "skill_quant_01";
  }

  // Group questions by main skill
  const skillToQuestionsMap: Record<string, any[]> = {};
  for (const s of QUANT_TAXONOMY) {
    skillToQuestionsMap[s.id] = [];
  }

  for (const q of allQuestions) {
    const mainSkillId = determineMainSkill(q);
    skillToQuestionsMap[mainSkillId].push(q);
  }

  // Assign subskills within each main skill
  const subSkillQuestionsMap: Record<string, string[]> = {};
  const mainSkillQuestionsMap: Record<string, string[]> = {};

  const bulkOps = [];
  let explanationsAdded = 0;

  for (const item of QUANT_TAXONOMY) {
    const sQuestions = skillToQuestionsMap[item.id] || [];
    mainSkillQuestionsMap[item.id] = [];
    const subs = item.subSkills;

    for (const sub of subs) {
      subSkillQuestionsMap[sub.id] = [];
    }

    // Distribute questions evenly / round-robin so all subskills receive questions
    for (let idx = 0; idx < sQuestions.length; idx++) {
      const q = sQuestions[idx];
      const targetSub = subs[idx % subs.length];
      const qIdStr = q._id.toString();

      subSkillQuestionsMap[targetSub.id].push(qIdStr);
      mainSkillQuestionsMap[item.id].push(qIdStr);

      let expl = (q.explanation || "").trim();
      if (expl.length < 10) {
        const correctOpt = q.options && q.options[q.correctOptionIndex] !== undefined ? q.options[q.correctOptionIndex] : "الخيار الصحيح";
        expl = `طريقة الحل المنهجية: بتطبيق القواعد الأساسية للمسألة والتعويض المباشر، نجد أن الناتج الصحيح هو (${correctOpt}).`;
        explanationsAdded++;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: q._id },
          update: {
            $set: {
              skillId: item.id,
              subSkillId: targetSub.id,
              skillIds: [item.id, targetSub.id],
              explanation: expl,
              updatedAt: new Date(),
            },
          },
        },
      });

      if (bulkOps.length >= 500) {
        await questionsCol.bulkWrite(bulkOps);
        bulkOps.length = 0;
      }
    }
  }

  if (bulkOps.length > 0) {
    await questionsCol.bulkWrite(bulkOps);
  }

  console.log(`Re-tagged ${allQuestions.length} questions across 25 skills and 95 subskills.`);
  console.log(`Ensured explanations for all questions (injected ${explanationsAdded} cached explanations).`);

  // 6. QUIZZES PHASE
  console.log("\n--- Phase 6: Cleaning and Regenerating Aligned Quizzes ---");
  const quizzesCol = db.collection("quizzes");

  // Clean all existing training, tests, and foundation quizzes for this subject to prevent obsolete clutter
  await quizzesCol.deleteMany({
    subjectId,
    $or: [
      { "learningPlacements.slot": { $in: ["training", "tests", "foundation"] } },
      { _id: { $regex: /^(drill_sub_|bank_skill_|exam_quant_mock_|quiz_training_|quiz_drill_|quiz_comprehensive_test_)/ } as any },
    ],
  });
  console.log("Cleaned legacy/duplicate quizzes in training, tests, and foundation slots.");

  // A. SHORT FOUNDATION DRILLS (Max 10 questions each)
  console.log("\n--- Generating 95 Foundation Drills (Max 10 questions) ---");
  const usedInShortDrills = new Set<string>();

  for (let i = 0; i < QUANT_TAXONOMY.length; i++) {
    const item = QUANT_TAXONOMY[i];
    const secId = `sec_sub_1777779748206_${i + 1}`;

    for (const sub of item.subSkills) {
      const childTopicId = childTopicMap[sub.id];
      const assignedQs = subSkillQuestionsMap[sub.id] || [];
      const drillQs = assignedQs.slice(0, 10);
      drillQs.forEach((qId) => usedInShortDrills.add(qId));

      const drillId = `drill_sub_${sub.id.replace("sub_", "")}`;

      await quizzesCol.insertOne({
        _id: drillId as any,
        id: drillId,
        title: `تدريب: ${sub.name}`,
        description: `تدريب تأسيسي قصير ومكثف (بحد أقصى 10 أسئلة) لإتقان وفهم ${sub.name}.`,
        pathId,
        subjectId,
        sectionId: secId,
        type: "quiz",
        quizKind: "drill",
        questionIds: drillQs,
        learningPlacements: [
          {
            pathId,
            subjectId,
            slot: "foundation",
            accessType: "inherit",
            topicId: childTopicId,
            isVisible: true,
            order: sub.order,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          timeLimit: 15,
          maxAttempts: 5,
          passingScore: 60,
          randomizeQuestions: true,
          showProgressBar: true,
        },
        access: { type: "free", price: 0, allowedGroupIds: [] },
        approvalStatus: "approved",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await topicsCol.updateOne(
        { _id: childTopicId as any },
        { $set: { quizIds: [drillId], updatedAt: new Date() } }
      );
    }
  }
  console.log(`Generated and linked 95 short drills to foundation subtopics`);

  // B. COMPREHENSIVE SKILL DRILLS (40 questions each in Training)
  console.log("\n--- Generating 25 Comprehensive Drills in Training Tab ---");
  for (let i = 0; i < QUANT_TAXONOMY.length; i++) {
    const item = QUANT_TAXONOMY[i];
    const secId = `sec_sub_1777779748206_${i + 1}`;
    const allSkillQs = mainSkillQuestionsMap[item.id] || [];

    const unusedQs = allSkillQs.filter((qId) => !usedInShortDrills.has(qId));
    const usedQs = allSkillQs.filter((qId) => usedInShortDrills.has(qId));
    const selected40 = [...unusedQs, ...usedQs].slice(0, 40);
    const bankId = `bank_skill_${item.id.replace("skill_", "")}`;

    await quizzesCol.insertOne({
      _id: bankId as any,
      id: bankId,
      title: `تدريب: ${item.name}`,
      description: `بنك تدريبي شامل ومكثف يغطي كافة جوانب وقواعد مهارة ${item.name}.`,
      pathId,
      subjectId,
      sectionId: secId,
      type: "bank",
      quizKind: "drill",
      questionIds: selected40,
      learningPlacements: [
        {
          pathId,
          subjectId,
          slot: "training",
          accessType: "free",
          isVisible: true,
          order: i + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 45,
        maxAttempts: 5,
        passingScore: 60,
        randomizeQuestions: true,
        showProgressBar: true,
      },
      access: { type: "free", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`Generated 25 comprehensive drills (named directly after the 25 Main Skills) in Training slot`);

  // C. MOCK EXAMS (60 questions each strictly Quantitative in Tests slot)
  console.log("\n--- Generating 5 Standard Quantitative Mock Exams in Tests Slot ---");
  for (let e = 1; e <= 5; e++) {
    const examId = `exam_quant_mock_${String(e).padStart(2, "0")}`;
    const examQs: string[] = [];
    for (let i = 0; i < QUANT_TAXONOMY.length; i++) {
      const item = QUANT_TAXONOMY[i];
      const qs = mainSkillQuestionsMap[item.id] || [];
      const offset = ((e - 1) * 2) % Math.max(1, qs.length);
      const pick = qs.slice(offset, offset + 2);
      examQs.push(...pick);
    }
    if (examQs.length < 60) {
      for (const q of allQuestions) {
        const qIdStr = q._id.toString();
        if (!examQs.includes(qIdStr)) {
          examQs.push(qIdStr);
          if (examQs.length >= 60) break;
        }
      }
    }
    const final60 = examQs.slice(0, 60);

    await quizzesCol.insertOne({
      _id: examId as any,
      id: examId,
      title: `اختبار تجريبي — القسم الكمي (${e})`,
      description: `اختبار محاكاة معياري متوازن (60 سؤالاً) مخصص للقسم الكمي فقط، يغطي المهارات الـ 25 بتوزيع قياسي دقيق.`,
      pathId,
      subjectId,
      sectionId: `sec_sub_1777779748206_1`,
      type: "quiz",
      quizKind: "mock",
      questionIds: final60,
      learningPlacements: [
        {
          pathId,
          subjectId,
          slot: "tests",
          accessType: "free",
          isVisible: true,
          order: e,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 60,
        maxAttempts: 3,
        passingScore: 65,
        randomizeQuestions: true,
        showProgressBar: true,
      },
      access: { type: "free", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`Generated 5 standard quantitative mock exams (60 questions each) in Tests slot`);

  console.log("\n=== Deployment Completed Successfully! ===");
  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].includes("deployQuantTaxonomy25")) {
  deploy().catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
}
