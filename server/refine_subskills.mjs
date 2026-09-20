import { MongoClient } from 'mongodb';

const uri = 'mongodb://nasef64:Nn0508438250@ac-5fh0moi-shard-00-00.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-01.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-02.5y2fzx5.mongodb.net:27017/almeaa?ssl=true&replicaSet=atlas-915t4d-shard-0&authSource=admin&retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('almeaa');
  const coll = db.collection('questions');

  const all = await coll.find({}).toArray();
  const bulkOps = [];

  for (const q of all) {
    const text = `${q.text || ''} ${q.description || ''} ${(q.tags || []).join(' ')}`.toLowerCase();
    let newSec = q.sectionId;
    let newSkills = q.skillIds || [];

    // 1. Check for specific specialized topics across all questions:
    // المتتابعات والأنماط (Section 13)
    if (text.includes('متتابعة') || text.includes('متتال') || text.includes('أكمل النمط') || text.includes('الحد التالي')) {
      newSec = 'sec_sub_1777779748206_13';
      newSkills = ['sk_sub_1777779748206_13_1'];
    }
    // الأعمار (Section 16)
    else if (text.includes('عمر') || text.includes('أعمار') || text.includes('عمره') || text.includes('عمرها') || text.includes('سنوات')) {
      if (text.includes('عمر أحمد') || text.includes('عمر محمد') || text.includes('عمر الأب') || text.includes('عمر الابن') || text.includes('عمره الآن')) {
        newSec = 'sec_sub_1777779748206_16';
        newSkills = ['sk_sub_1777779748206_16_1'];
      }
    }
    // العمل والإنجاز والخزانات (Section 15)
    else if (text.includes('خزان') || text.includes('صنبور') || text.includes('ينجز') || text.includes('عاملان') || text.includes('حنفية')) {
      newSec = 'sec_sub_1777779748206_15';
      newSkills = text.includes('خزان') || text.includes('صنبور') ? ['sk_sub_1777779748206_15_3'] : ['sk_sub_1777779748206_15_2'];
    }
    // أساسيات الأعداد (Section 1)
    else if (text.includes('أولي') || text.includes('أولية') || text.includes('فردي') || text.includes('زوجي') || text.includes('إشارات') || text.includes('القيمة المكانية')) {
      if (newSec === 'sec_sub_1777779748206_2' || newSec === 'sec_sub_1777779748206_3') {
        if (text.includes('أولي') || text.includes('أولية')) {
          newSec = 'sec_sub_1777779748206_1';
          newSkills = ['sk_sub_1777779748206_1_4']; // الأعداد الأولية والمركبة
        } else if (text.includes('زوجي') || text.includes('فردي')) {
          newSec = 'sec_sub_1777779748206_1';
          newSkills = ['sk_sub_1777779748206_1_3']; // الزوجي والفردي
        } else if (text.includes('إشارات') || text.includes('إشارة')) {
          newSec = 'sec_sub_1777779748206_1';
          newSkills = ['sk_sub_1777779748206_1_1']; // الأعداد الصحيحة والإشارات
        }
      }
    }
    // المساحات والمحيطات (Section 21)
    else if (text.includes('مساحة المظلل') || text.includes('الجزء المظلل') || text.includes('المساحة المظللة')) {
      if (newSec === 'sec_sub_1777779748206_19' || newSec === 'sec_sub_1777779748206_18') {
        newSec = 'sec_sub_1777779748206_21';
        newSkills = ['sk_sub_1777779748206_21_4']; // المساحات المظللة
      }
    }

    // Refine Section 7: Exponents vs Roots
    if (newSec === 'sec_sub_1777779748206_7') {
      if (text.includes('جذر') || text.includes('جذور')) {
        newSkills = text.includes('إنطاق') || text.includes('مقام') ? ['sk_sub_1777779748206_7_4'] : ['sk_sub_1777779748206_7_3'];
      } else {
        newSkills = ['sk_sub_1777779748206_7_1'];
      }
    }

    // Refine Section 18: Pythagoras
    if (newSec === 'sec_sub_1777779748206_18') {
      if (text.includes('فيثاغورس') || text.includes('وتر') || text.includes('قائم')) {
        newSkills = ['sk_sub_1777779748206_18_4'];
      } else if (text.includes('زاوية') || text.includes('زوايا')) {
        newSkills = ['sk_sub_1777779748206_18_2'];
      } else {
        newSkills = ['sk_sub_1777779748206_18_1'];
      }
    }

    // Refine Section 11: Mean vs Mode vs Median
    if (newSec === 'sec_sub_1777779748206_11') {
      if (text.includes('وسيط') || text.includes('منوال')) {
        newSkills = ['sk_sub_1777779748206_11_3'];
      } else {
        newSkills = ['sk_sub_1777779748206_11_1'];
      }
    }

    if (newSec !== q.sectionId || JSON.stringify(newSkills) !== JSON.stringify(q.skillIds)) {
      bulkOps.push({
        updateOne: {
          filter: { _id: q._id },
          update: { $set: { sectionId: newSec, skillIds: newSkills } }
        }
      });
    }
  }

  console.log(`Refining ${bulkOps.length} questions...`);
  if (bulkOps.length > 0) {
    const res = await coll.bulkWrite(bulkOps);
    console.log(`Updated: ${res.modifiedCount}`);
  }

  const distinctSections = await coll.distinct('sectionId');
  const distinctSkills = await coll.distinct('skillIds');
  console.log(`\nDistinct Sections: ${distinctSections.length}`);
  console.log(`Distinct SubSkills: ${distinctSkills.length}`);

  const sectionCounts = await coll.aggregate([
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  console.log('\n--- Final Section Counts ---');
  for (const sc of sectionCounts) {
    console.log(`${sc._id}: ${sc.count} questions`);
  }

  await client.close();
}

run().catch(console.error);
