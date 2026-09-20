import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is required. Database credentials must be supplied through the environment.');
}
const applyChanges = process.env.ALMEAA_APPLY_SKILL_MIGRATION === 'true';
const client = new MongoClient(uri);

// Helper to extract page and book
function extractPageAndBook(q) {
  let isTaasis = false;
  let isQudrat = false;
  let page = null;

  if (q.source === 'imported_taasis_2026') isTaasis = true;
  if (q.source === 'imported') isQudrat = true;

  const taasMatch = (q.id || '').match(/q_taas_p(\d+)_/);
  if (taasMatch) {
    isTaasis = true;
    page = parseInt(taasMatch[1], 10);
  }
  const tajMatch = (q.id || '').match(/q_taj_p(\d+)_/);
  if (tajMatch) {
    isQudrat = true;
    page = parseInt(tajMatch[1], 10);
  }
  if ((q.id || '').match(/^q_taj_\d+$/)) {
    isQudrat = true;
    if (!page) {
      const pTag = (q.tags || []).find(t => typeof t === 'string' && t.startsWith('صفحة_'));
      if (pTag) {
        page = parseInt(pTag.replace('صفحة_', ''), 10);
      } else {
        page = 5;
      }
    }
  }

  if (!page && Array.isArray(q.tags)) {
    for (const t of q.tags) {
      if (typeof t === 'string' && t.startsWith('صفحة_')) {
        page = parseInt(t.replace('صفحة_', ''), 10);
      }
      if (t === 'كتاب_تأسيس_2026') isTaasis = true;
      if (t === 'كتاب_تجميعات_2026') isQudrat = true;
    }
  }

  if (!page && q.imageUrl) {
    const urlMatch = q.imageUrl.match(/page(\d+)/i) || q.imageUrl.match(/p(\d+)_q_/i);
    if (urlMatch) {
      page = parseInt(urlMatch[1], 10);
    }
    if (q.imageUrl.includes('taasis')) isTaasis = true;
    if (q.imageUrl.includes('qudrat') || q.imageUrl.includes('tajmee_at')) isQudrat = true;
  }

  return { isTaasis, isQudrat, page };
}

// Map Taasis by exact Table of Contents
function getTaasisMapping(page, q) {
  const isComparison = (q.tags || []).includes('مقارنات') ||
                       (q.text || '').includes('قارن') ||
                       (q.description || '').includes('قارن');

  if (page >= 5 && page <= 9) {
    return {
      sectionId: 'sec_sub_1777779748206_2',
      skillIds: ['sk_sub_1777779748206_2_1']
    };
  }
  if (page >= 10 && page <= 14) {
    return {
      sectionId: 'sec_sub_1777779748206_3',
      skillIds: ['sk_sub_1777779748206_3_4']
    };
  }
  if (page >= 15 && page <= 22) {
    return {
      sectionId: 'sec_sub_1777779748206_5',
      skillIds: [isComparison ? 'sk_sub_1777779748206_5_2' : 'sk_sub_1777779748206_5_1']
    };
  }
  if (page >= 23 && page <= 27) {
    return {
      sectionId: 'sec_sub_1777779748206_6',
      skillIds: ['sk_sub_1777779748206_6_1']
    };
  }
  if (page >= 28 && page <= 37) {
    // الأسس!
    return {
      sectionId: 'sec_sub_1777779748206_7',
      skillIds: ['sk_sub_1777779748206_7_1']
    };
  }
  if (page >= 38 && page <= 46) {
    // العمليات على الجذور!
    return {
      sectionId: 'sec_sub_1777779748206_7',
      skillIds: ['sk_sub_1777779748206_7_3']
    };
  }
  if (page >= 47 && page <= 53) {
    // الفرق بين مربعين والمتطابقات الجبرية!
    return {
      sectionId: 'sec_sub_1777779748206_10',
      skillIds: ['sk_sub_1777779748206_10_4']
    };
  }
  if (page >= 54 && page <= 60) {
    // النسبة والتناسب
    return {
      sectionId: 'sec_sub_1777779748206_8',
      skillIds: ['sk_sub_1777779748206_8_1']
    };
  }
  if (page >= 61 && page <= 64) {
    // النسبة المئوية
    return {
      sectionId: 'sec_sub_1777779748206_9',
      skillIds: ['sk_sub_1777779748206_9_1']
    };
  }
  if (page >= 65 && page <= 69) {
    // الربح والخسارة
    return {
      sectionId: 'sec_sub_1777779748206_9',
      skillIds: ['sk_sub_1777779748206_9_4']
    };
  }
  if (page >= 70 && page <= 75) {
    // استراتيجيات القدرات
    return {
      sectionId: 'sec_sub_1777779748206_24',
      skillIds: ['sk_sub_1777779748206_24_1']
    };
  }
  if (page >= 76 && page <= 80) {
    // الحركة
    return {
      sectionId: 'sec_sub_1777779748206_14',
      skillIds: ['sk_sub_1777779748206_14_1']
    };
  }
  if (page >= 81 && page <= 85) {
    // قوانين هامة (العد والمصافحات)
    return {
      sectionId: 'sec_sub_1777779748206_12',
      skillIds: ['sk_sub_1777779748206_12_2']
    };
  }
  if (page >= 86 && page <= 93) {
    // الزاوية بين العقربين والساعة
    return {
      sectionId: 'sec_sub_1777779748206_4',
      skillIds: ['sk_sub_1777779748206_4_3']
    };
  }
  if (page >= 94 && page <= 98) {
    // المتوسط الحسابي
    return {
      sectionId: 'sec_sub_1777779748206_11',
      skillIds: ['sk_sub_1777779748206_11_1']
    };
  }
  if (page >= 99 && page <= 102) {
    // الاحتمالات والإحصاء
    return {
      sectionId: 'sec_sub_1777779748206_12',
      skillIds: ['sk_sub_1777779748206_12_1']
    };
  }
  if (page >= 103 && page <= 106) {
    // الزوايا والمستقيمات
    return {
      sectionId: 'sec_sub_1777779748206_17',
      skillIds: ['sk_sub_1777779748206_17_1']
    };
  }
  if (page >= 107 && page <= 118) {
    // المثلثات
    return {
      sectionId: 'sec_sub_1777779748206_18',
      skillIds: ['sk_sub_1777779748206_18_1']
    };
  }
  if (page >= 119 && page <= 122) {
    // الأشكال الرباعية
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_1']
    };
  }
  if (page >= 123 && page <= 126) {
    // المربع
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_1']
    };
  }
  if (page >= 127 && page <= 130) {
    // المعين ومتوازي المستطيلات
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_2']
    };
  }
  if (page >= 131 && page <= 141) {
    // الدائرة
    return {
      sectionId: 'sec_sub_1777779748206_20',
      skillIds: ['sk_sub_1777779748206_20_2']
    };
  }
  if (page >= 142 && page <= 144) {
    // المجسمات والحجوم
    return {
      sectionId: 'sec_sub_1777779748206_22',
      skillIds: ['sk_sub_1777779748206_22_1']
    };
  }
  if (page >= 145 && page <= 146) {
    // هندسة الإحداثيات
    return {
      sectionId: 'sec_sub_1777779748206_23',
      skillIds: ['sk_sub_1777779748206_23_1']
    };
  }
  return null;
}

// Map Qudrat Compilation by exact Table of Contents
function getQudratMapping(page, q) {
  const isComparison = (q.tags || []).includes('مقارنات') ||
                       (q.text || '').includes('قارن') ||
                       (q.description || '').includes('قارن');

  if (page >= 5 && page <= 6) {
    return {
      sectionId: 'sec_sub_1777779748206_2',
      skillIds: ['sk_sub_1777779748206_2_1']
    };
  }
  if (page >= 7 && page <= 8) {
    return {
      sectionId: 'sec_sub_1777779748206_3',
      skillIds: ['sk_sub_1777779748206_3_4']
    };
  }
  if (page >= 9 && page <= 16) {
    return {
      sectionId: 'sec_sub_1777779748206_5',
      skillIds: [isComparison ? 'sk_sub_1777779748206_5_2' : 'sk_sub_1777779748206_5_1']
    };
  }
  if (page >= 17 && page <= 19) {
    return {
      sectionId: 'sec_sub_1777779748206_6',
      skillIds: ['sk_sub_1777779748206_6_1']
    };
  }
  if (page >= 20 && page <= 23) {
    // الأسس!
    return {
      sectionId: 'sec_sub_1777779748206_7',
      skillIds: ['sk_sub_1777779748206_7_1']
    };
  }
  if (page >= 24 && page <= 30) {
    // العمليات على الجذور!
    return {
      sectionId: 'sec_sub_1777779748206_7',
      skillIds: ['sk_sub_1777779748206_7_3']
    };
  }
  if (page >= 31 && page <= 35) {
    // الفرق بين مربعين!
    return {
      sectionId: 'sec_sub_1777779748206_10',
      skillIds: ['sk_sub_1777779748206_10_4']
    };
  }
  if (page >= 36 && page <= 38) {
    // النسبة والتناسب
    return {
      sectionId: 'sec_sub_1777779748206_8',
      skillIds: ['sk_sub_1777779748206_8_1']
    };
  }
  if (page >= 39 && page <= 41) {
    // النسبة المئوية
    return {
      sectionId: 'sec_sub_1777779748206_9',
      skillIds: ['sk_sub_1777779748206_9_1']
    };
  }
  if (page >= 42 && page <= 43) {
    // الربح والخسارة
    return {
      sectionId: 'sec_sub_1777779748206_9',
      skillIds: ['sk_sub_1777779748206_9_4']
    };
  }
  if (page >= 44 && page <= 47) {
    // استراتيجيات القدرات
    return {
      sectionId: 'sec_sub_1777779748206_24',
      skillIds: ['sk_sub_1777779748206_24_1']
    };
  }
  if (page >= 48 && page <= 50) {
    // الحركة
    return {
      sectionId: 'sec_sub_1777779748206_14',
      skillIds: ['sk_sub_1777779748206_14_1']
    };
  }
  if (page >= 51 && page <= 52) {
    // قوانين هامة
    return {
      sectionId: 'sec_sub_1777779748206_12',
      skillIds: ['sk_sub_1777779748206_12_2']
    };
  }
  if (page >= 53 && page <= 57) {
    // الزاوية بين العقربين والساعة
    return {
      sectionId: 'sec_sub_1777779748206_4',
      skillIds: ['sk_sub_1777779748206_4_3']
    };
  }
  if (page >= 58 && page <= 59) {
    // المتوسط الحسابي
    return {
      sectionId: 'sec_sub_1777779748206_11',
      skillIds: ['sk_sub_1777779748206_11_1']
    };
  }
  if (page === 60) {
    // الاحتمالات والإحصاء
    return {
      sectionId: 'sec_sub_1777779748206_12',
      skillIds: ['sk_sub_1777779748206_12_1']
    };
  }
  if (page >= 61 && page <= 66) {
    // الزوايا والمضلعات والمستقيمات
    return {
      sectionId: 'sec_sub_1777779748206_17',
      skillIds: ['sk_sub_1777779748206_17_1']
    };
  }
  if (page >= 67 && page <= 73) {
    // المثلثات
    return {
      sectionId: 'sec_sub_1777779748206_18',
      skillIds: ['sk_sub_1777779748206_18_1']
    };
  }
  if (page >= 74 && page <= 75) {
    // الأشكال الرباعية
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_1']
    };
  }
  if (page >= 76 && page <= 77) {
    // المربع
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_1']
    };
  }
  if (page >= 78 && page <= 79) {
    // المعين ومتوازي المستطيلات
    return {
      sectionId: 'sec_sub_1777779748206_19',
      skillIds: ['sk_sub_1777779748206_19_2']
    };
  }
  if (page >= 80 && page <= 83) {
    // الدائرة
    return {
      sectionId: 'sec_sub_1777779748206_20',
      skillIds: ['sk_sub_1777779748206_20_2']
    };
  }
  if (page === 84) {
    // المجسمات والحجوم
    return {
      sectionId: 'sec_sub_1777779748206_22',
      skillIds: ['sk_sub_1777779748206_22_1']
    };
  }
  return null;
}

// Fallback topic keyword matcher for questions without page
function getKeywordMapping(q) {
  const text = `${q.text || ''} ${q.description || ''} ${(q.tags || []).join(' ')}`.toLowerCase();

  if (text.includes('أسس') || text.includes('قوى') || text.includes('جذر') || text.includes('جذور')) {
    return { sectionId: 'sec_sub_1777779748206_7', skillIds: ['sk_sub_1777779748206_7_1'] };
  }
  if (text.includes('كسر') || text.includes('كسور') || text.includes('مقام')) {
    return { sectionId: 'sec_sub_1777779748206_5', skillIds: ['sk_sub_1777779748206_5_1'] };
  }
  if (text.includes('عشري') || text.includes('فاصلة')) {
    return { sectionId: 'sec_sub_1777779748206_6', skillIds: ['sk_sub_1777779748206_6_1'] };
  }
  if (text.includes('مثلث') || text.includes('فيثاغورس')) {
    return { sectionId: 'sec_sub_1777779748206_18', skillIds: ['sk_sub_1777779748206_18_1'] };
  }
  if (text.includes('دائرة') || text.includes('محيط الدائرة') || text.includes('ط نق')) {
    return { sectionId: 'sec_sub_1777779748206_20', skillIds: ['sk_sub_1777779748206_20_2'] };
  }
  if (text.includes('مربع') || text.includes('مستطيل') || text.includes('معين') || text.includes('رباعي')) {
    return { sectionId: 'sec_sub_1777779748206_19', skillIds: ['sk_sub_1777779748206_19_1'] };
  }
  if (text.includes('سرعة') || text.includes('مسافة') || text.includes('قطار') || text.includes('سيارة')) {
    return { sectionId: 'sec_sub_1777779748206_14', skillIds: ['sk_sub_1777779748206_14_1'] };
  }
  if (text.includes('نسبة') || text.includes('تناسب')) {
    return { sectionId: 'sec_sub_1777779748206_8', skillIds: ['sk_sub_1777779748206_8_1'] };
  }
  if (text.includes('مئوية') || text.includes('%') || text.includes('ربح') || text.includes('خسارة')) {
    return { sectionId: 'sec_sub_1777779748206_9', skillIds: ['sk_sub_1777779748206_9_1'] };
  }
  if (text.includes('متوسط') || text.includes('حسابي') || text.includes('وسيط')) {
    return { sectionId: 'sec_sub_1777779748206_11', skillIds: ['sk_sub_1777779748206_11_1'] };
  }
  if (text.includes('احتمال') || text.includes('مصافحة') || text.includes('تباديل')) {
    return { sectionId: 'sec_sub_1777779748206_12', skillIds: ['sk_sub_1777779748206_12_1'] };
  }
  if (text.includes('ساعة') || text.includes('عقرب') || text.includes('يوم') || text.includes('أسبوع')) {
    return { sectionId: 'sec_sub_1777779748206_4', skillIds: ['sk_sub_1777779748206_4_3'] };
  }
  if (text.includes('قسمة') || text.includes('يقبل') || text.includes('مضاعف') || text.includes('عامل')) {
    return { sectionId: 'sec_sub_1777779748206_3', skillIds: ['sk_sub_1777779748206_3_4'] };
  }

  // Default to arithmetic
  return { sectionId: 'sec_sub_1777779748206_2', skillIds: ['sk_sub_1777779748206_2_1'] };
}

async function run() {
  await client.connect();
  const db = client.db('almeaa');
  const coll = db.collection('questions');

  const allQuestions = await coll.find({}).toArray();
  console.log(`Starting realignment for ${allQuestions.length} questions...`);

  let updatedCount = 0;
  let textFilledCount = 0;

  const bulkOps = [];

  for (const q of allQuestions) {
    const { isTaasis, isQudrat, page } = extractPageAndBook(q);
    let mapping = null;

    if (isTaasis && page) {
      mapping = getTaasisMapping(page, q);
    } else if (isQudrat && page) {
      mapping = getQudratMapping(page, q);
    }

    if (!mapping) {
      mapping = getKeywordMapping(q);
    }

    const setFields = {
      sectionId: mapping.sectionId,
      skillIds: mapping.skillIds,
      pathId: 'p_1777779639431', // القدرات
      subject: 'sub_1777779748206', // الكمي
      updatedAt: new Date()
    };

    // If text is empty or missing, fill it from description
    const isComparison = (q.tags || []).includes('مقارنات') ||
                         (q.text || '').includes('قارن') ||
                         (q.description || '').includes('قارن');

    if (!q.text || q.text.trim() === '') {
      if (q.description && q.description.trim() !== '') {
        setFields.text = q.description.trim();
        textFilledCount++;
      }
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: q._id },
        update: { $set: setFields }
      }
    });
  }

  if (bulkOps.length > 0 && applyChanges) {
    const res = await coll.bulkWrite(bulkOps);
    updatedCount = res.modifiedCount;
  } else if (bulkOps.length > 0) {
    console.log('Dry run only: no question documents were changed. Set ALMEAA_APPLY_SKILL_MIGRATION=true to apply after review.');
  }

  console.log(`\nRealignment completed!`);
  console.log(`- Total questions processed: ${bulkOps.length}`);
  console.log(`- Modified in DB: ${updatedCount}`);
  console.log(`- Text field populated from description: ${textFilledCount}`);

  // Summary by section
  const sectionCounts = await coll.aggregate([
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  console.log('\n--- Section Distribution After Realignment ---');
  for (const sc of sectionCounts) {
    console.log(`${sc._id}: ${sc.count} questions`);
  }

  const distinctSections = await coll.distinct('sectionId');
  const distinctSkills = await coll.distinct('skillIds');
  console.log(`\nDistinct Sections: ${distinctSections.length}`);
  console.log(`Distinct SubSkills: ${distinctSkills.length}`);

  await client.close();
}

run().catch(console.error);
