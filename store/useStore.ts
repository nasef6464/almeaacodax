import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { api } from '../services/api';
import { User, Activity, QuestionAttempt, QuizResult, Question, Role, Group, Skill, CategoryPath, CategorySubject, CategorySection, B2BPackage, AccessCode, Course, NestedSkill, LibraryItem, Quiz, Lesson } from '../types';
import { currentUser, courses as mockCourses } from '../services/mockData';

// Initial mock questions
const initialQuestions: Question[] = [
    {
        id: 'q1',
        text: "الشركة (أ) نسبة الموظفين غير السعوديين فيها 30%، والشركة (ب) عدد موظفيها نصف عدد موظفين الشركة (أ). وكانت نسبة الموظفين الغير سعوديين فيها 40%. فما نسبة الموظفين الغير سعوديين في الشركتين معاً؟",
        options: ["33.3%", "30%", "25%", "66.6%"],
        correctOptionIndex: 0,
        videoUrl: "https://www.youtube.com/embed/M5QGkOGZubQ",
        skillIds: ['sk1'],
        subject: 'qudrat_kammi',
        difficulty: 'Medium',
        type: 'mcq'
    },
    {
        id: 'q2',
        text: "إذا كان س = ٨ × ٧ ... (١٠) فما قيمة س؟",
        options: ["٥٦", "٤٢", "١٥", "٤٨"],
        correctOptionIndex: 0,
        videoUrl: "https://www.youtube.com/embed/e6rglsLy1Ys",
        skillIds: ['sk2'],
        subject: 'qudrat_kammi',
        difficulty: 'Easy',
        type: 'mcq'
    }
];

const initialLibraryItems: LibraryItem[] = [
  { id: '1', title: 'تجميعات 1445 - كمي', size: '5.1 MB', downloads: 3400, type: 'pdf', subjectId: 'qudrat_kammi' },
  { id: '2', title: 'ملخص قوانين الهندسة', size: '2.5 MB', downloads: 1250, type: 'pdf', subjectId: 'qudrat_kammi' },
  { id: '3', title: 'أهم 100 سؤال في الجبر', size: '3.2 MB', downloads: 2100, type: 'pdf', subjectId: 'qudrat_kammi' },
];

const initialNestedSkills: NestedSkill[] = [
  {
    id: 'skill_quant_1',
    name: 'العمليات الحسابية الأساسية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_1_1', name: 'جمع', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_1_2', name: 'طرح', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_1_3', name: 'ضرب', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_1_4', name: 'قسمة مطولة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_2',
    name: 'الأعداد الصحيحة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_2_1', name: 'الأولية', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_2_2', name: 'القواسم', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_2_3', name: 'المضاعفات', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_2_4', name: 'وقابلية القسمة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_3',
    name: 'الكسور',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_3_1', name: 'الاعتيادية', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_3_2', name: 'العشرية', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_3_3', name: 'المقارنة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_3_4', name: 'والعمليات عليها', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_4',
    name: 'النسبة المئوية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_4_1', name: 'الربح', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_4_2', name: 'الخسارة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_4_3', name: 'الزيادة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_4_4', name: 'والنقصان', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_5',
    name: 'التناسب',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_5_1', name: 'الطردي', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_5_2', name: 'العكسي', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_5_3', name: 'والضرب التبادلي "المقص"', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_6',
    name: 'المعدلات الزمنية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_6_1', name: 'السرعة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_6_2', name: 'المسافة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_6_3', name: 'الزمن', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_6_4', name: 'ومسائل اللحاق', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_7',
    name: 'المعادلات والمتباينات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_7_1', name: 'الدرجة الأولى والثانية', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_8',
    name: 'القوى والأسس',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_8_1', name: 'قوانين الضرب والقسمة والأسس السالبة والكسرية', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_9',
    name: 'الجذور',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_9_1', name: 'التبسيط', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_9_2', name: 'العمليات', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_9_3', name: 'ونطق المقام', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_10',
    name: 'المقادير الجبرية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_10_1', name: 'فك الأقواس', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_10_2', name: 'التحليل', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_10_3', name: 'والفرق بين مربعين', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_11',
    name: 'المتتابعات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_11_1', name: 'اكتشاف الأنماط الحسابية والهندسية والعددية', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_12',
    name: 'الزوايا',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_12_1', name: 'المتجاورة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_12_2', name: 'المتقابلة بالرأس', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_12_3', name: 'وزوايا التوازي', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_13',
    name: 'المثلثات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_13_1', name: 'المساحة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_13_2', name: 'المحيط', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_13_3', name: 'فيثاغورس', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_13_4', name: 'والمثلثات المشهورة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_14',
    name: 'الأشكال الرباعية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_14_1', name: 'المربع', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_14_2', name: 'المستطيل', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_14_3', name: 'المعين', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_14_4', name: 'وشبه المنحرف', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_15',
    name: 'الدائرة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_15_1', name: 'المساحة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_15_2', name: 'المحيط', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_15_3', name: 'ونصف القطر', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_16',
    name: 'المجسمات (الهندسة الفراغية)',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_16_1', name: 'المكعب', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_16_2', name: 'الأسطوانة', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_16_3', name: 'ومتوازي المستطيلات', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_17',
    name: 'المستوى الإحداثي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_17_1', name: 'المسافة بين نقطتين', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_17_2', name: 'المنتصف', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_17_3', name: 'والميل', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_18',
    name: 'مقاييس النزعة المركزية',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_18_1', name: 'المتوسط', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_18_2', name: 'الوسيط', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_18_3', name: 'المنوال', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_18_4', name: 'والمدى', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_19',
    name: 'تفسير البيانات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_19_1', name: 'الجداول', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_19_2', name: 'الرسوم البيانية', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_19_3', name: 'والقطاعات الدائرية', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_20',
    name: 'الاحتمالات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_20_1', name: 'مبدأ العد', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_20_2', name: 'التباديل والتوافيق البسيطة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_21',
    name: 'مسائل الأعمار',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_21_1', name: 'حساب العمر في الماضي والمستقبل', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_22',
    name: 'المصافحات والجوائز',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_22_1', name: 'قوانين عدد المصافحات والهدايا', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_23',
    name: 'مسائل الساعات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_23_1', name: 'الزاوية بين العقارب وتحويلات الوقت', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_24',
    name: 'الأيام والشهور (الدورية)',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_24_1', name: 'باقي القسمة على 7', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_25',
    name: 'العمل المشترك',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_25_1', name: 'مسائل الصنابير', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_25_2', name: 'الخزانات', description: '', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_quant_25_3', name: 'والعمال', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_26',
    name: 'المساحات المظللة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_26_1', name: 'طرح مساحات الأشكال المتداخلة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_27',
    name: 'تشابه المثلثات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_27_1', name: 'استخدام التناسب لإيجاد الأضلاع', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_28',
    name: 'تطبيقات الدائرة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_28_1', name: 'المسافة وعدد دورات العجلات', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_29',
    name: 'النماذج المدمجة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_29_1', name: 'تركيب أكثر من شكل هندسي معاً', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_30',
    name: 'استراتيجية تجريب الخيارات',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_30_1', name: 'استخدام الحلول للوصول للمطلوب', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_31',
    name: 'الاستبعاد المنطقي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_31_1', name: 'حذف الإجابات المستحيلة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_32',
    name: 'التعويض بالأرقام',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_32_1', name: 'استخدام 1، 0، -1 لتبسيط الجبر', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_33',
    name: 'التقريب والتقدير',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_33_1', name: 'تبسيط الأرقام العشرية الصعبة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_34',
    name: 'الرسم التوضيحي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_34_1', name: 'تحويل المسألة اللفظية لرسمة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_quant_35',
    name: 'استراتيجيات المقارنة',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    subSkills: [
      { id: 'subskill_quant_35_1', name: 'تبسيط القيمتين قبل المقارنة', description: '', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_1',
    name: 'التناظر اللفظي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_1_1', name: 'تحديد نوع العلاقة', description: 'القدرة على استخراج الرابط المنطقي بين الكلمتين', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_1_2', name: 'تحديد اتجاه العلاقة', description: 'ضبط البداية والنهاية من اليمين لليسار أو العكس', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_1_3', name: 'بناء جملة الربط', description: 'صياغة جملة تربط بين الكلمتين لاختبار صحة الخيارات', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_1_4', name: 'المفاضلة بين العلاقات', description: 'التمييز بين الخيارات عند تشابه نوع العلاقة', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_2',
    name: 'إكمال الجمل',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_2_1', name: 'تحليل السياق العام', description: 'تحديد ما إذا كان سياق الجملة إيجابياً أم سلبياً', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_2_2', name: 'الروابط والكلمات المفتاحية', description: 'التعامل مع أدوات الربط مثل: لكن، بلف، رغم، بالرغم', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_2_3', name: 'استراتيجية الفراغ الأسهل', description: 'البدء بالفراغ الأكثر وضوحاً لاستبعاد الخيارات الخاطئة', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_2_4', name: 'التوافق الدلالي والنحوي', description: 'مطابقة الكلمات المختارة مع المعنى اللغوي للجملة', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_3',
    name: 'الخطأ السياقي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_3_1', name: 'فهم المعنى الإجمالي', description: 'إدراك الحكمة أو المبدأ الذي تقوم عليه الجملة', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_3_2', name: 'تحديد الكلمة الشاذة', description: 'تمييز الكلمة التي أفسدت منطق الجملة ولا تتناسب مع سياقها', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_3_3', name: 'المقارنة بين أطراف الجملة', description: 'الربط بين صدر الجملة وعجزها لاكتشاف التناقض', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_3_4', name: 'استراتيجية تجربة العكس', description: 'تبديل الكلمة المشكوك فيها بضدها لاختبار استقامة المعنى', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_4',
    name: 'استيعاب المقروء',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_4_1', name: 'الاستخراج المباشر', description: 'إيجاد المعلومات المنصوص عليها صراحة في النص', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_2', name: 'الاستنتاج والتحليل', description: 'فهم المعلومات الضمنية وما وراء السطور', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_3', name: 'تحديد العنوان والأفكار الرئيسية', description: 'اختيار العنوان الأشمل أو الفكرة المركزية لكل فقرة', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_4', name: 'علاقات الجمل والفقرات', description: 'تحديد العلاقات: تعليل، نتيجة، تفصيل، تفسير، تضاد', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_5', name: 'عودة الضمائر', description: 'تحديد الكلمة التي يعود عليها الضمير في النص', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_6', name: 'الحسابات الزمنية والعددية', description: 'تحويل السنوات إلى قرون وعقود، وحساب النسب الواردة', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_4_7', name: 'تحديد أسلوب ونبرة الكاتب', description: 'تمييز موقف الكاتب: حيادي، مؤيد، معارض، نقدي', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_5',
    name: 'المفردة الشاذة / الارتباط والاختلاف',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_5_1', name: 'التصنيف الدلالي', description: 'تحديد الحقل اللغوي الذي تنتمي إليه الكلمات', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_5_2', name: 'تحديد الرابط المشترك', description: 'إيجاد العلاقة التي تجمع ثلاث كلمات دون الرابعة', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_5_3', name: 'الارتباط والاختلاف', description: 'تمييز قوة العلاقة بين زوج من الكلمات مقارنة بالآخرين', isLocked: false, lessons: [], quizzes: [] }
    ]
  },
  {
    id: 'skill_verbal_6',
    name: 'استراتيجيات الحل اللفظي',
    description: '',
    isLocked: false,
    pathId: 'p_qudrat',
    subjectId: 'sub_verbal',
    subSkills: [
      { id: 'subskill_verbal_6_1', name: 'الاستبعاد المنطقي', description: 'حذف الخيارات المستحيلة لتقليل احتمالية الخطأ', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_6_2', name: 'تجزئة الجمل الطويلة', description: 'تقسيم الجمل والقطع المعقدة لتسهيل الفهم', isLocked: false, lessons: [], quizzes: [] },
      { id: 'subskill_verbal_6_3', name: 'إدارة الوقت', description: 'الالتزام بالزمن المحدد لكل سؤال في الأقسام اللفظية', isLocked: false, lessons: [], quizzes: [] }
    ]
  }
];

interface AppState {
    user: User;
    users: User[];
    groups: Group[];
    b2bPackages: B2BPackage[];
    accessCodes: AccessCode[];
    
    // Core Content
    courses: Course[];
    questions: Question[];
    quizzes: Quiz[];
    lessons: Lesson[];
    topics: import('../types').Topic[];
    
    // Taxonomy & Skills
    paths: CategoryPath[];
    levels: import('../types').CategoryLevel[];
    subjects: CategorySubject[];
    sections: CategorySection[];
    skills: Skill[];
    nestedSkills: NestedSkill[];
    libraryItems: LibraryItem[];
    addLibraryItem: (item: LibraryItem) => void;
    updateLibraryItem: (id: string, item: Partial<LibraryItem>) => void;
    deleteLibraryItem: (id: string) => void;
    
    enrolledCourses: string[];
    enrolledPaths: string[];
    completedLessons: string[];
    examResults: QuizResult[];
    questionAttempts: QuestionAttempt[];
    favorites: string[];
    reviewLater: string[];
    recentActivity: Activity[];
    
    // Actions
    hydrateCourses: (courses: Course[]) => void;
    hydrateQuestions: (questions: Question[]) => void;
    hydrateQuizzes: (quizzes: Quiz[]) => void;
    hydrateTaxonomy: (payload: {
        paths?: CategoryPath[];
        levels?: import('../types').CategoryLevel[];
        subjects?: CategorySubject[];
    }) => void;
    hydrateContentBootstrap: (payload: {
        topics?: import('../types').Topic[];
        lessons?: Lesson[];
        libraryItems?: LibraryItem[];
        groups?: Group[];
    }) => void;
    hydrateExamResults: (results: QuizResult[]) => void;
    enrollCourse: (courseId: string) => void;
    enrollPath: (pathId: string) => void;
    unenrollPath: (pathId: string) => void;
    markLessonComplete: (lessonId: string, courseId: string, lessonTitle: string) => void;
    saveExamResult: (result: QuizResult) => void;
    recordQuestionAttempt: (attempt: QuestionAttempt) => void;
    toggleFavorite: (questionId: string) => void;
    toggleReviewLater: (questionId: string) => void;
    addActivity: (activity: Omit<Activity, 'id' | 'date'>) => void;
    checkAccess: (contentId: string, isPremiumContent: boolean) => boolean;
    changeRole: (role: Role) => void;

    // Admin Actions
    addUser: (user: User) => void;
    updateUser: (userId: string, data: Partial<User>) => void;
    toggleUserStatus: (userId: string) => void;
    
    // Course Actions
    addCourse: (course: Course) => void;
    updateCourse: (courseId: string, data: Partial<Course>) => void;
    deleteCourse: (courseId: string) => void;

    // Question Actions
    addQuestion: (question: Question) => void;
    updateQuestion: (questionId: string, data: Partial<Question>) => void;
    deleteQuestion: (questionId: string) => void;

    // Quiz Actions
    addQuiz: (quiz: Quiz) => void;
    updateQuiz: (quizId: string, data: Partial<Quiz>) => void;
    deleteQuiz: (quizId: string) => void;

    // Lesson Actions
    addLesson: (lesson: Lesson) => void;
    updateLesson: (lessonId: string, data: Partial<Lesson>) => void;
    deleteLesson: (lessonId: string) => void;

    // Topic Actions
    addTopic: (topic: import('../types').Topic) => void;
    updateTopic: (topicId: string, data: Partial<import('../types').Topic>) => void;
    deleteTopic: (topicId: string) => void;
    
    // Group Actions
    createGroup: (group: Group) => void;
    updateGroup: (groupId: string, data: Partial<Group>) => void;
    deleteGroup: (groupId: string) => void;
    assignStudentToGroup: (userId: string, groupId: string) => void;
    removeStudentFromGroup: (userId: string, groupId: string) => void;
    assignSupervisorToGroup: (userId: string, groupId: string) => void;
    removeSupervisorFromGroup: (userId: string, groupId: string) => void;
    assignCourseToGroup: (courseId: string, groupId: string) => void;
    removeCourseFromGroup: (courseId: string, groupId: string) => void;

    // B2B Actions
    createB2BPackage: (pkg: B2BPackage) => void;
    updateB2BPackage: (id: string, data: Partial<B2BPackage>) => void;
    deleteB2BPackage: (id: string) => void;
    createAccessCode: (code: AccessCode) => void;
    deleteAccessCode: (id: string) => void;

    // Taxonomy Actions
    addPath: (path: CategoryPath) => void;
    updatePath: (pathId: string, data: Partial<CategoryPath>) => void;
    deletePath: (pathId: string) => void;
    addLevel: (level: import('../types').CategoryLevel) => void;
    updateLevel: (levelId: string, data: Partial<import('../types').CategoryLevel>) => void;
    deleteLevel: (levelId: string) => void;
    addSubject: (subject: CategorySubject) => void;
    updateSubject: (subjectId: string, data: Partial<CategorySubject>) => void;
    deleteSubject: (subjectId: string) => void;
    addSection: (section: CategorySection) => void;

    // Skill Actions
    createSkill: (skill: Skill) => void;
    updateSkill: (skillId: string, data: Partial<Skill>) => void;
    deleteSkill: (skillId: string) => void;
    linkSkillToLesson: (skillId: string, lessonId: string) => void;
    unlinkSkillFromLesson: (skillId: string, lessonId: string) => void;
    
    // Nested Skill Actions
    updateNestedSkills: (skills: NestedSkill[]) => void;

    // Library Actions
}

// Initial user with subscription
const initialUser: User = {
    ...currentUser,
    subscription: {
        plan: 'free',
        purchasedCourses: ['c1', 'c3', 'c5'], // Initial purchased from mockData
        purchasedPackages: []
    }
};

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            user: { ...initialUser, groupIds: ['g1'] },
            users: [
                { ...initialUser, email: 'student@example.com', isActive: true, groupIds: ['g1'] },
                { id: 'u2', name: 'أحمد المشرف', email: 'supervisor@example.com', avatar: 'https://i.pravatar.cc/150?u=u2', role: Role.SUPERVISOR, points: 0, badges: [], subscription: { plan: 'free', purchasedCourses: [], purchasedPackages: [] }, isActive: true, groupIds: ['g1'] },
                { id: 'u3', name: 'سارة المعلمة', email: 'teacher@example.com', avatar: 'https://i.pravatar.cc/150?u=u3', role: Role.TEACHER, points: 0, badges: [], subscription: { plan: 'free', purchasedCourses: [], purchasedPackages: [] }, isActive: true },
                { id: 'u4', name: 'خالد (ولي أمر)', email: 'parent@example.com', avatar: 'https://i.pravatar.cc/150?u=u4', role: Role.PARENT, points: 0, badges: [], subscription: { plan: 'free', purchasedCourses: [], purchasedPackages: [] }, isActive: true },
                { id: 'u5', name: 'المدير العام', email: 'admin@example.com', avatar: 'https://i.pravatar.cc/150?u=u5', role: Role.ADMIN, points: 0, badges: [], subscription: { plan: 'free', purchasedCourses: [], purchasedPackages: [] }, isActive: true },
            ],
            groups: [
                { 
                    id: 'g1', 
                    name: 'مجموعة القدرات - أ', 
                    type: 'CLASS',
                    ownerId: 'u5',
                    supervisorIds: ['u2'], 
                    studentIds: ['user1'], 
                    courseIds: ['c1'],
                    createdAt: Date.now(),
                    totalStudents: 1,
                    totalSupervisors: 1,
                    totalCourses: 1
                },
                { 
                    id: 's1', 
                    name: 'مدرسة المبدعين', 
                    type: 'SCHOOL',
                    ownerId: 'u5',
                    supervisorIds: ['u2'], 
                    studentIds: ['user1'], 
                    courseIds: ['c1', 'c3'],
                    createdAt: Date.now() - 86400000,
                    totalStudents: 1,
                    totalSupervisors: 1,
                    totalCourses: 2
                }
            ],
            b2bPackages: [
                {
                    id: 'pkg1',
                    schoolId: 's1',
                    name: 'باقة القدرات الشاملة',
                    courseIds: ['c1', 'c2'],
                    type: 'free_access',
                    maxStudents: 200,
                    status: 'active',
                    createdAt: Date.now()
                }
            ],
            accessCodes: [
                {
                    id: 'code1',
                    code: 'ALNOOR-2026',
                    schoolId: 's1',
                    packageId: 'pkg1',
                    maxUses: 200,
                    currentUses: 150,
                    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                    createdAt: Date.now()
                }
            ],
            courses: mockCourses as Course[],
            questions: initialQuestions,
            quizzes: [],
            lessons: [],
            topics: [],
            paths: [
                { id: 'p_qudrat', name: 'مسار القدرات' },
                { id: 'p_tahsili', name: 'مسار التحصيلي' },
                { id: 'p_nafes', name: 'مسار نافس' }
            ],
            levels: [
                { id: 'l_primary3', name: 'الصف الثالث الابتدائي', pathId: 'p_nafes' },
                { id: 'l_primary6', name: 'الصف السادس الابتدائي', pathId: 'p_nafes' },
                { id: 'l_middle3', name: 'الصف الثالث المتوسط', pathId: 'p_nafes' }
            ],
            subjects: [
                { id: 'sub_quant', pathId: 'p_qudrat', name: 'الكمي' },
                { id: 'sub_verbal', pathId: 'p_qudrat', name: 'اللفظي' },
                { id: 'sub_math', pathId: 'p_tahsili', name: 'رياضيات' },
                { id: 'sub_physics', pathId: 'p_tahsili', name: 'فيزياء' },
                { id: 'sub_chemistry', pathId: 'p_tahsili', name: 'كيمياء' },
                { id: 'sub_biology', pathId: 'p_tahsili', name: 'أحياء' },
                { id: 'sub_step_english', pathId: 'p_step', name: 'اللغة الإنجليزية' },
                // Nafes Subjects
                { id: 'sub_nafes_math_p3', pathId: 'p_nafes', levelId: 'l_primary3', name: 'الرياضيات' },
                { id: 'sub_nafes_science_p3', pathId: 'p_nafes', levelId: 'l_primary3', name: 'العلوم' },
                { id: 'sub_nafes_reading_p3', pathId: 'p_nafes', levelId: 'l_primary3', name: 'القراءة' },
                { id: 'sub_nafes_math_p6', pathId: 'p_nafes', levelId: 'l_primary6', name: 'الرياضيات' },
                { id: 'sub_nafes_science_p6', pathId: 'p_nafes', levelId: 'l_primary6', name: 'العلوم' },
                { id: 'sub_nafes_reading_p6', pathId: 'p_nafes', levelId: 'l_primary6', name: 'القراءة' },
                { id: 'sub_nafes_math_m3', pathId: 'p_nafes', levelId: 'l_middle3', name: 'الرياضيات' },
                { id: 'sub_nafes_science_m3', pathId: 'p_nafes', levelId: 'l_middle3', name: 'العلوم' },
                { id: 'sub_nafes_reading_m3', pathId: 'p_nafes', levelId: 'l_middle3', name: 'القراءة' }
            ],
            sections: [
                { id: 'sec_arithmetic', subjectId: 'sub_quant', name: 'الحساب' },
                { id: 'sec_algebra', subjectId: 'sub_quant', name: 'الجبر' },
                { id: 'sec_geometry', subjectId: 'sub_quant', name: 'الهندسة' },
                { id: 'sec_reading', subjectId: 'sub_verbal', name: 'استيعاب المقروء' },
                { id: 'sec_nafes_math_1', subjectId: 'sub_nafes_math', name: 'الأعداد والعمليات' },
                { id: 'sec_nafes_science_1', subjectId: 'sub_nafes_science', name: 'علوم الحياة' }
            ],
            skills: [
                { id: 'sk1', name: 'الكسور العشرية', pathId: 'p_qudrat', subjectId: 'sub_quant', sectionId: 'sec_arithmetic', description: 'العمليات الحسابية على الكسور العشرية', lessonIds: ['l1'], questionIds: ['q1', 'q5'], createdAt: Date.now() },
                { id: 'sk2', name: 'المعادلات التربيعية', pathId: 'p_qudrat', subjectId: 'sub_quant', sectionId: 'sec_algebra', description: 'حل المعادلات من الدرجة الثانية', lessonIds: ['l1'], questionIds: ['q2', 'q4'], createdAt: Date.now() },
                { id: 'sk3', name: 'استيعاب المقروء', pathId: 'p_qudrat', subjectId: 'sub_verbal', sectionId: 'sec_reading', description: 'فهم النصوص واستنتاج المعاني', lessonIds: ['l3'], questionIds: [], createdAt: Date.now() },
            ],
            nestedSkills: initialNestedSkills,
            libraryItems: initialLibraryItems,
            addLibraryItem: (item) => {
                api.createLibraryItem(item).catch(console.error);
                set((state) => ({ libraryItems: [item, ...state.libraryItems] }));
            },
            updateLibraryItem: (id, item) => {
                api.updateLibraryItem(id, item).catch(console.error);
                set((state) => ({
                    libraryItems: state.libraryItems.map(i => i.id === id ? { ...i, ...item } : i)
                }));
            },
            deleteLibraryItem: (id) => {
                api.deleteLibraryItem(id).catch(console.error);
                set((state) => ({
                    libraryItems: state.libraryItems.filter(i => i.id !== id)
                }));
            },
            enrolledCourses: ['c1', 'c3', 'c5'],
            enrolledPaths: ['p_qudrat'], // Default enrolled path
            completedLessons: ['l1', 'l2'], // Some initial progress
            examResults: [],
            questionAttempts: [
                { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true, timeSpentSeconds: 45, date: new Date().toISOString() },
                { questionId: 'q1', selectedOptionIndex: 1, isCorrect: false, timeSpentSeconds: 30, date: new Date().toISOString() },
                { questionId: 'q1', selectedOptionIndex: 0, isCorrect: true, timeSpentSeconds: 60, date: new Date().toISOString() },
                { questionId: 'q2', selectedOptionIndex: 2, isCorrect: false, timeSpentSeconds: 20, date: new Date().toISOString() },
                { questionId: 'q2', selectedOptionIndex: 1, isCorrect: false, timeSpentSeconds: 25, date: new Date().toISOString() },
                { questionId: 'q5', selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 15, date: new Date().toISOString() },
                { questionId: 'q5', selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 10, date: new Date().toISOString() },
                { questionId: 'q5', selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 12, date: new Date().toISOString() },
                { questionId: 'q5', selectedOptionIndex: 0, isCorrect: false, timeSpentSeconds: 40, date: new Date().toISOString() },
            ],
            favorites: [],
            reviewLater: [],
            recentActivity: [],

            hydrateCourses: (courses) => set((state) => ({
                courses: courses.length > 0 ? courses : state.courses
            })),

            hydrateQuestions: (questions) => set((state) => ({
                questions: questions.length > 0 ? questions : state.questions
            })),

            hydrateQuizzes: (quizzes) => set((state) => ({
                quizzes: quizzes.length > 0 ? quizzes : state.quizzes
            })),

            hydrateTaxonomy: (payload) => set((state) => ({
                paths: payload.paths && payload.paths.length > 0
                  ? payload.paths
                      .map((path: any) => ({
                        ...path,
                        id: String(path?.id || path?._id || ''),
                      }))
                      .filter((path: any) => path.id && path.name)
                  : state.paths,
                levels: payload.levels && payload.levels.length > 0
                  ? payload.levels
                      .map((level: any) => ({
                        ...level,
                        id: String(level?.id || level?._id || ''),
                        pathId: String(level?.pathId || ''),
                      }))
                      .filter((level: any) => level.id && level.pathId)
                  : state.levels,
                subjects: payload.subjects && payload.subjects.length > 0
                  ? payload.subjects
                      .map((subject: any) => ({
                        ...subject,
                        id: String(subject?.id || subject?._id || ''),
                        pathId: String(subject?.pathId || ''),
                      }))
                      .filter((subject: any) => subject.id && subject.pathId && subject.name)
                  : state.subjects,
            })),

            hydrateContentBootstrap: (payload) => set((state) => ({
                topics: payload.topics && payload.topics.length > 0
                  ? payload.topics
                      .map((topic: any) => ({
                        ...topic,
                        id: String(topic?.id || topic?._id || ''),
                      }))
                      .filter((topic: any) => topic.id && topic.subjectId && topic.title)
                  : state.topics,
                lessons: payload.lessons && payload.lessons.length > 0
                  ? payload.lessons
                      .map((lesson: any) => ({
                        ...lesson,
                        id: String(lesson?.id || lesson?._id || ''),
                        skillIds: Array.isArray(lesson?.skillIds) ? lesson.skillIds.map(String) : [],
                      }))
                      .filter((lesson: any) => lesson.id && lesson.title)
                  : state.lessons,
                libraryItems: payload.libraryItems && payload.libraryItems.length > 0
                  ? payload.libraryItems
                      .map((item: any) => ({
                        ...item,
                        id: String(item?.id || item?._id || ''),
                        pathId: item?.pathId ? String(item.pathId) : undefined,
                        sectionId: item?.sectionId ? String(item.sectionId) : undefined,
                        skillIds: Array.isArray(item?.skillIds) ? item.skillIds.map(String) : [],
                      }))
                      .filter((item: any) => item.id && item.title)
                  : state.libraryItems,
                groups: payload.groups && payload.groups.length > 0
                  ? payload.groups
                      .map((group: any) => ({
                        ...group,
                        id: String(group?.id || group?._id || ''),
                      }))
                      .filter((group: any) => group.id && group.name)
                  : state.groups,
            })),

            hydrateExamResults: (results) => set(() => ({
                examResults: results
            })),

            enrollCourse: (courseId) => set((state) => {
                if (state.enrolledCourses.includes(courseId)) return state;
                return {
                    enrolledCourses: [...state.enrolledCourses, courseId],
                    user: {
                        ...state.user,
                        subscription: {
                            ...state.user.subscription!,
                            purchasedCourses: [...(state.user.subscription?.purchasedCourses || []), courseId]
                        }
                    }
                };
            }),

            enrollPath: (pathId) => set((state) => {
                if (state.enrolledPaths?.includes(pathId)) return state;
                return {
                    enrolledPaths: [...(state.enrolledPaths || []), pathId]
                };
            }),

            unenrollPath: (pathId) => set((state) => {
                return {
                    enrolledPaths: (state.enrolledPaths || []).filter(id => id !== pathId)
                };
            }),

            markLessonComplete: (lessonId, courseId, lessonTitle) => {
                const state = get();
                if (state.completedLessons.includes(lessonId)) return;
                
                const newActivity: Activity = {
                    id: Date.now().toString(),
                    type: 'lesson_complete',
                    title: `أكملت درس: ${lessonTitle}`,
                    date: new Date().toISOString(),
                    link: `/course/${courseId}`
                };

                // Write to Firebase
                if (state.user?.id) {
                    setDoc(doc(db, 'activities', newActivity.id), { ...newActivity, userId: state.user.id }).catch(console.error);
                    setDoc(doc(db, 'users', state.user.id), { completedLessons: [...state.completedLessons, lessonId] }, { merge: true }).catch(console.error);
                }

                set((state) => ({
                    completedLessons: [...state.completedLessons, lessonId],
                    recentActivity: [newActivity, ...state.recentActivity].slice(0, 10) // Keep last 10
                }));
            },

            saveExamResult: (result) => {
                const newActivity: Activity = {
                    id: Date.now().toString(),
                    type: 'quiz_complete',
                    title: `أنهيت اختبار: ${result.quizTitle} بنتيجة ${result.score}%`,
                    date: new Date().toISOString(),
                    link: `/results`
                };

                api.createQuizResult(result).catch(console.error);

                set((state) => ({
                    examResults: [result, ...state.examResults],
                    recentActivity: [newActivity, ...state.recentActivity].slice(0, 10)
                }));
            },

            recordQuestionAttempt: (attempt) => {
                const state = get();
                const attemptId = Date.now().toString();
                if (state.user?.id) {
                    setDoc(doc(db, 'questionAttempts', attemptId), { ...attempt, userId: state.user.id }).catch(console.error);
                }
                set((state) => ({
                    questionAttempts: [...state.questionAttempts, attempt]
                }));
            },

            toggleFavorite: (questionId) => set((state) => ({
                favorites: (() => {
                    const nextFavorites = state.favorites.includes(questionId)
                        ? state.favorites.filter(id => id !== questionId)
                        : [...state.favorites, questionId];

                    if (state.user?.email) {
                        api.updateMyPreferences({
                            favorites: nextFavorites,
                            reviewLater: state.reviewLater,
                        }).catch(console.error);
                    }

                    return nextFavorites;
                })()
            })),

            toggleReviewLater: (questionId) => set((state) => ({
                reviewLater: (() => {
                    const nextReviewLater = state.reviewLater.includes(questionId)
                        ? state.reviewLater.filter(id => id !== questionId)
                        : [...state.reviewLater, questionId];

                    if (state.user?.email) {
                        api.updateMyPreferences({
                            favorites: state.favorites,
                            reviewLater: nextReviewLater,
                        }).catch(console.error);
                    }

                    return nextReviewLater;
                })()
            })),

            addActivity: (activity) => {
                const state = get();
                const newActivity = { ...activity, id: Date.now().toString(), date: new Date().toISOString() };
                
                if (state.user?.id) {
                    setDoc(doc(db, 'activities', newActivity.id), { ...newActivity, userId: state.user.id }).catch(console.error);
                }

                set((state) => ({
                    recentActivity: [
                        newActivity,
                        ...state.recentActivity
                    ].slice(0, 10)
                }));
            },

            checkAccess: (contentId, isPremiumContent) => {
                const state = get();
                if (!isPremiumContent) return true;
                if (state.user.subscription.plan === 'premium') return true;
                if (state.user.subscription.purchasedCourses.includes(contentId)) return true;
                if (state.user.subscription.purchasedPackages.includes(contentId)) return true;
                return false;
            },

            changeRole: (role) => set((state) => ({
                user: { ...state.user, role }
            })),

            addUser: (user) => set((state) => ({
                users: [...state.users, user]
            })),

            updateUser: (userId, data) => set((state) => ({
                users: state.users.map(u => u.id === userId ? { ...u, ...data } : u),
                // Also update current user if it's the same
                user: state.user.id === userId ? { ...state.user, ...data } : state.user
            })),

            toggleUserStatus: (userId) => set((state) => ({
                users: state.users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u)
            })),

            // Course Actions
            addCourse: (course) => {
                api.createCourse(course).catch(console.error);
                set((state) => ({
                    courses: [course, ...state.courses]
                }));
            },
            updateCourse: (courseId, data) => {
                api.updateCourse(courseId, data).catch(console.error);
                set((state) => ({
                    courses: state.courses.map(c => c.id === courseId ? { ...c, ...data } : c)
                }));
            },
            deleteCourse: (courseId) => {
                api.deleteCourse(courseId).catch(console.error);
                set((state) => ({
                    courses: state.courses.filter(c => c.id !== courseId)
                }));
            },

            // Question Actions
            addQuestion: (question) => {
                api.createQuestion(question).catch(console.error);
                set((state) => ({
                    questions: [question, ...state.questions]
                }));
            },
            updateQuestion: (questionId, data) => {
                api.updateQuestion(questionId, data).catch(console.error);
                set((state) => ({
                    questions: state.questions.map(q => q.id === questionId ? { ...q, ...data } : q)
                }));
            },
            deleteQuestion: (questionId) => {
                api.deleteQuestion(questionId).catch(console.error);
                set((state) => ({
                    questions: state.questions.filter(q => q.id !== questionId)
                }));
            },

            // Quiz Actions
            addQuiz: (quiz) => {
                api.createQuiz(quiz).catch(console.error);
                set((state) => ({
                    quizzes: [quiz, ...state.quizzes]
                }));
            },
            updateQuiz: (quizId, data) => {
                api.updateQuiz(quizId, data).catch(console.error);
                set((state) => ({
                    quizzes: state.quizzes.map(q => q.id === quizId ? { ...q, ...data } : q)
                }));
            },
            deleteQuiz: (quizId) => {
                api.deleteQuiz(quizId).catch(console.error);
                set((state) => ({
                    quizzes: state.quizzes.filter(q => q.id !== quizId)
                }));
            },

            // Lesson Actions
            addLesson: (lesson) => {
                api.createLesson(lesson).catch(console.error);
                set((state) => ({
                    lessons: [lesson, ...state.lessons]
                }));
            },
            updateLesson: (lessonId, data) => {
                api.updateLesson(lessonId, data).catch(console.error);
                set((state) => ({
                    lessons: state.lessons.map(l => l.id === lessonId ? { ...l, ...data } : l)
                }));
            },
            deleteLesson: (lessonId) => {
                api.deleteLesson(lessonId).catch(console.error);
                set((state) => ({
                    lessons: state.lessons.filter(l => l.id !== lessonId)
                }));
            },

            // Topic Actions
            addTopic: (topic) => {
                api.createTopic(topic).catch(console.error);
                set((state) => ({
                    topics: [...state.topics, topic]
                }));
            },
            updateTopic: (topicId, data) => {
                api.updateTopic(topicId, data).catch(console.error);
                set((state) => ({
                    topics: state.topics.map(t => t.id === topicId ? { ...t, ...data } : t)
                }));
            },
            deleteTopic: (topicId) => {
                api.deleteTopic(topicId).catch(console.error);
                set((state) => ({
                    topics: state.topics.filter(t => t.id !== topicId)
                }));
            },

            // Group Actions
            createGroup: (group) => set((state) => ({
                groups: [...state.groups, group]
            })),

            updateGroup: (groupId, data) => set((state) => ({
                groups: state.groups.map(g => g.id === groupId ? { ...g, ...data } : g)
            })),

            deleteGroup: (groupId) => set((state) => {
                const newGroups = state.groups.filter(g => g.id !== groupId);
                const newUsers = state.users.map(u => ({
                    ...u,
                    schoolId: u.schoolId === groupId ? undefined : u.schoolId,
                    groupIds: u.groupIds?.filter(id => id !== groupId) || []
                }));
                
                const currentUser = newUsers.find(u => u.id === state.user.id) || state.user;

                return {
                    groups: newGroups,
                    users: newUsers,
                    user: currentUser
                };
            }),

            assignStudentToGroup: (userId, groupId) => set((state) => {
                const group = state.groups.find(g => g.id === groupId);
                if (!group) return state;

                let newGroups = [...state.groups];
                let newUsers = [...state.users];

                // If SCHOOL, remove from other schools first
                if (group.type === 'SCHOOL') {
                    const currentSchoolId = newUsers.find(u => u.id === userId)?.schoolId;
                    if (currentSchoolId && currentSchoolId !== groupId) {
                        newGroups = newGroups.map(g => 
                            g.id === currentSchoolId 
                            ? { ...g, studentIds: g.studentIds.filter(id => id !== userId), totalStudents: Math.max(0, (g.totalStudents || 1) - 1) } 
                            : g
                        );
                    }
                }

                // Add to group
                newGroups = newGroups.map(g => {
                    if (g.id === groupId && !g.studentIds.includes(userId)) {
                        return { ...g, studentIds: [...g.studentIds, userId], totalStudents: (g.totalStudents || 0) + 1 };
                    }
                    return g;
                });

                // Add to user
                newUsers = newUsers.map(u => {
                    if (u.id === userId) {
                        return {
                            ...u,
                            schoolId: group.type === 'SCHOOL' ? groupId : u.schoolId,
                            groupIds: group.type !== 'SCHOOL' && !u.groupIds?.includes(groupId) 
                                ? [...(u.groupIds || []), groupId] 
                                : u.groupIds
                        };
                    }
                    return u;
                });

                return {
                    groups: newGroups,
                    users: newUsers,
                    user: newUsers.find(u => u.id === state.user.id) || state.user
                };
            }),

            removeStudentFromGroup: (userId, groupId) => set((state) => {
                const newGroups = state.groups.map(g => {
                    if (g.id === groupId) {
                        return { ...g, studentIds: g.studentIds.filter(id => id !== userId), totalStudents: Math.max(0, (g.totalStudents || 1) - 1) };
                    }
                    return g;
                });

                const newUsers = state.users.map(u => {
                    if (u.id === userId) {
                        return {
                            ...u,
                            schoolId: u.schoolId === groupId ? undefined : u.schoolId,
                            groupIds: u.groupIds?.filter(id => id !== groupId) || []
                        };
                    }
                    return u;
                });

                return {
                    groups: newGroups,
                    users: newUsers,
                    user: newUsers.find(u => u.id === state.user.id) || state.user
                };
            }),

            assignSupervisorToGroup: (userId, groupId) => set((state) => {
                const newGroups = state.groups.map(g => {
                    if (g.id === groupId && !g.supervisorIds.includes(userId)) {
                        return { ...g, supervisorIds: [...g.supervisorIds, userId], totalSupervisors: (g.totalSupervisors || 0) + 1 };
                    }
                    return g;
                });
                return { groups: newGroups };
            }),

            removeSupervisorFromGroup: (userId, groupId) => set((state) => {
                const newGroups = state.groups.map(g => {
                    if (g.id === groupId) {
                        return { ...g, supervisorIds: g.supervisorIds.filter(id => id !== userId), totalSupervisors: Math.max(0, (g.totalSupervisors || 1) - 1) };
                    }
                    return g;
                });
                return { groups: newGroups };
            }),

            assignCourseToGroup: (courseId, groupId) => set((state) => {
                const newGroups = state.groups.map(g => {
                    if (g.id === groupId && !g.courseIds.includes(courseId)) {
                        return { ...g, courseIds: [...g.courseIds, courseId], totalCourses: (g.totalCourses || 0) + 1 };
                    }
                    return g;
                });
                return { groups: newGroups };
            }),

            removeCourseFromGroup: (courseId, groupId) => set((state) => {
                const newGroups = state.groups.map(g => {
                    if (g.id === groupId) {
                        return { ...g, courseIds: g.courseIds.filter(id => id !== courseId), totalCourses: Math.max(0, (g.totalCourses || 1) - 1) };
                    }
                    return g;
                });
                return { groups: newGroups };
            }),

            // B2B Actions
            createB2BPackage: (pkg) => set((state) => ({
                b2bPackages: [...state.b2bPackages, pkg]
            })),
            updateB2BPackage: (id, data) => set((state) => ({
                b2bPackages: state.b2bPackages.map(p => p.id === id ? { ...p, ...data } : p)
            })),
            deleteB2BPackage: (id) => set((state) => ({
                b2bPackages: state.b2bPackages.filter(p => p.id !== id)
            })),
            createAccessCode: (code) => set((state) => ({
                accessCodes: [...state.accessCodes, code]
            })),
            deleteAccessCode: (id) => set((state) => ({
                accessCodes: state.accessCodes.filter(c => c.id !== id)
            })),

            // Taxonomy Actions
            addPath: (path) => {
                api.createPath(path).catch(console.error);
                set((state) => ({
                    paths: [...state.paths, path]
                }));
            },
            updatePath: (pathId, data) => {
                api.updatePath(pathId, data).catch(console.error);
                set((state) => ({
                    paths: state.paths.map(p => p.id === pathId ? { ...p, ...data } : p)
                }));
            },
            deletePath: (pathId) => {
                api.deletePath(pathId).catch(console.error);
                set((state) => ({
                    paths: state.paths.filter(p => p.id !== pathId),
                    subjects: state.subjects.filter(s => s.pathId !== pathId),
                    levels: state.levels.filter(l => l.pathId !== pathId)
                }));
            },
            addLevel: (level) => {
                api.createLevel(level).catch(console.error);
                set((state) => ({
                    levels: [...state.levels, level]
                }));
            },
            updateLevel: (levelId, data) => {
                api.updateLevel(levelId, data).catch(console.error);
                set((state) => ({
                    levels: state.levels.map(l => l.id === levelId ? { ...l, ...data } : l)
                }));
            },
            deleteLevel: (levelId) => {
                api.deleteLevel(levelId).catch(console.error);
                set((state) => ({
                    levels: state.levels.filter(l => l.id !== levelId),
                    subjects: state.subjects.filter(s => s.levelId !== levelId)
                }));
            },
            addSubject: (subject) => {
                api.createSubject(subject).catch(console.error);
                set((state) => ({
                    subjects: [...state.subjects, subject]
                }));
            },
            updateSubject: (subjectId, data) => {
                api.updateSubject(subjectId, data).catch(console.error);
                set((state) => ({
                    subjects: state.subjects.map(s => s.id === subjectId ? { ...s, ...data } : s)
                }));
            },
            deleteSubject: (subjectId) => {
                api.deleteSubject(subjectId).catch(console.error);
                set((state) => ({
                    subjects: state.subjects.filter(s => s.id !== subjectId),
                    sections: state.sections.filter(sec => sec.subjectId !== subjectId)
                }));
            },
            addSection: (section) => {
                setDoc(doc(db, 'sections', section.id), section).catch(console.error);
                set((state) => ({
                    sections: [...state.sections, section]
                }));
            },

            // Skill Actions
            createSkill: (skill) => set((state) => ({
                skills: [...state.skills, skill]
            })),

            updateSkill: (skillId, data) => set((state) => ({
                skills: state.skills.map(s => s.id === skillId ? { ...s, ...data } : s)
            })),

            deleteSkill: (skillId) => set((state) => ({
                skills: state.skills.filter(s => s.id !== skillId)
            })),

            linkSkillToLesson: (skillId, lessonId) => set((state) => ({
                skills: state.skills.map(s => {
                    if (s.id === skillId && !s.lessonIds.includes(lessonId)) {
                        return { ...s, lessonIds: [...s.lessonIds, lessonId] };
                    }
                    return s;
                })
            })),

            unlinkSkillFromLesson: (skillId, lessonId) => set((state) => ({
                skills: state.skills.map(s => {
                    if (s.id === skillId) {
                        return { ...s, lessonIds: s.lessonIds.filter(id => id !== lessonId) };
                    }
                    return s;
                })
            })),
            
            // Nested Skill Actions
            updateNestedSkills: (skills) => set(() => ({
                nestedSkills: skills
            }))
        }),
        {
            name: 'learning-platform-storage', // unique name
            version: 1,
            partialize: (state) => Object.fromEntries(
                Object.entries(state).filter(([key]) => !['paths', 'levels', 'subjects', 'sections', 'skills', 'nestedSkills', 'libraryItems', 'questions', 'users', 'courses', 'topics', 'lessons', 'quizzes'].includes(key))
            ),
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    persistedState.nestedSkills = initialNestedSkills;
                    // Ensure new fields and topics are initialized
                    if (!persistedState.topics) persistedState.topics = [];
                }
                return persistedState;
            }
        }
    )
);
