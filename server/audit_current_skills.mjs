import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is required. Database credentials must be supplied through the environment.');
}
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('almeaa');
  const coll = db.collection('questions');

  const total = await coll.countDocuments();
  const distinctSections = await coll.distinct('sectionId');
  const distinctSkills = await coll.distinct('skillIds');

  const emptyText = await coll.countDocuments({
    $or: [{ text: { $exists: false } }, { text: null }, { text: '' }]
  });

  const comparisonWithText = await coll.countDocuments({
    text: { $regex: 'قارن' }
  });

  const exponentsQuestions = await coll.countDocuments({
    sectionId: 'sec_sub_1777779748206_7'
  });

  const fractionsQuestions = await coll.countDocuments({
    sectionId: 'sec_sub_1777779748206_5'
  });

  console.log('=== AUDIT SUMMARY ===');
  console.log({
    totalQuestions: total,
    distinctSectionsCovered: distinctSections.length,
    distinctSkillsCovered: distinctSkills.length,
    emptyTextQuestions: emptyText,
    comparisonQuestionsWithText: comparisonWithText,
    exponentsQuestionsCount: exponentsQuestions,
    fractionsQuestionsCount: fractionsQuestions
  });

  await client.close();
}

run().catch(console.error);
