import { MongoClient } from 'mongodb';

const uri = 'mongodb://nasef64:Nn0508438250@ac-5fh0moi-shard-00-00.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-01.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-02.5y2fzx5.mongodb.net:27017/almeaa?ssl=true&replicaSet=atlas-915t4d-shard-0&authSource=admin&retryWrites=true&w=majority';
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
