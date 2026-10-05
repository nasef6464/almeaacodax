import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is required for the live quant regression gate.');
}

const client = new MongoClient(uri);
const DB = 'almeaa';
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function fail(message, details = undefined) {
  console.error('QUANT_SKILL_REGRESSION_FAIL:', message, details ?? '');
  process.exitCode = 1;
}

async function run() {
  await client.connect();
  const db = client.db(DB);
  const questions = db.collection('questions');
  const skills = db.collection('skills');

  const scope = { 'sourceMeta.documentCode': { $in: ['FND26', 'COL2627'] } };

  const [total, fnd, col] = await Promise.all([
    questions.countDocuments(scope),
    questions.countDocuments({ 'sourceMeta.documentCode': 'FND26' }),
    questions.countDocuments({ 'sourceMeta.documentCode': 'COL2627' }),
  ]);

  if (total !== 1804) fail('total must stay 1804', { total });
  if (fnd !== 858) fail('FND26 must stay 858', { fnd });
  if (col !== 946) fail('COL2627 must stay 946', { col });

  const malformed = await questions.find({
    ...scope,
    $or: [
      { skillId: { $exists: false } },
      { skillId: null },
      { skillId: '' },
      { subSkillId: { $exists: false } },
      { subSkillId: null },
      { subSkillId: '' },
      { difficulty: { $nin: VALID_DIFFICULTIES } },
    ],
  }, { projection: { questionCode: 1, skillId: 1, subSkillId: 1, difficulty: 1 } }).toArray();

  if (malformed.length) fail('missing/invalid skill or difficulty fields', malformed.slice(0, 20));

  const arrayMismatch = await questions.aggregate([
    { $match: scope },
    { $match: { $expr: { $ne: ['$skillIds', ['$skillId', '$subSkillId']] } } },
    { $project: { _id: 0, questionCode: 1, skillId: 1, subSkillId: 1, skillIds: 1 } },
    { $limit: 20 },
  ]).toArray();

  if (arrayMismatch.length) fail('skillIds must exactly equal [skillId, subSkillId]', arrayMismatch);

  const quantSkills = await skills.find(
    { id: /^skill_quant_/ },
    { projection: { _id: 0, id: 1, subSkills: 1 } },
  ).toArray();

  const subToParent = new Map();
  for (const skill of quantSkills) {
    for (const sub of skill.subSkills ?? []) subToParent.set(sub.id, skill.id);
  }

  const minimal = await questions.find(scope, {
    projection: { _id: 0, questionCode: 1, skillId: 1, subSkillId: 1 },
  }).toArray();

  const parentMismatch = minimal.filter((q) => subToParent.get(q.subSkillId) !== q.skillId);
  if (parentMismatch.length) fail('subSkillId parent does not match skillId', parentMismatch.slice(0, 20));

  // Source precedence locks: these questions are explicitly under strategy rules in the books.
  const strategyExpected = [
    ['COL2627', 44, 'sub_quant_11_1', 10],
    ['COL2627', 44, 'sub_quant_11_2', 7],
    ['COL2627', 45, 'sub_quant_11_1', 15],
    ['COL2627', 46, 'sub_quant_11_1', 8],
    ['COL2627', 46, 'sub_quant_11_3', 2],
    ['FND26', 70, 'sub_quant_11_1', 3],
    ['FND26', 70, 'sub_quant_11_2', 3],
    ['FND26', 71, 'sub_quant_11_1', 8],
    ['FND26', 72, 'sub_quant_11_1', 8],
    ['FND26', 73, 'sub_quant_11_1', 8],
    ['FND26', 74, 'sub_quant_11_3', 6],
  ];

  for (const [documentCode, page, subSkillId, expected] of strategyExpected) {
    const pageField = documentCode === 'COL2627' ? 'sourceMeta.printedPageNumber' : 'sourceMeta.page';
    const count = await questions.countDocuments({
      'sourceMeta.documentCode': documentCode,
      [pageField]: page,
      skillId: 'skill_quant_11',
      subSkillId,
      skillIds: ['skill_quant_11', subSkillId],
    });
    if (count !== expected) {
      fail('source-precedence strategy lock changed', { documentCode, page, subSkillId, expected, count });
    }
  }

  const anchors = new Map([
    ['QDR-QNT-COL2627-P017-Q01', ['skill_quant_04', 'sub_quant_04_2']],
    ['QDR-QNT-COL2627-P017-Q02', ['skill_quant_04', 'sub_quant_04_1']],
    ['QDR-QNT-COL2627-P079-Q11', ['skill_quant_23', 'sub_quant_23_3']],
    ['QDR-QNT-FND26-P088-Q17', ['skill_quant_07', 'sub_quant_07_2']],
    ['QDR-QNT-FND26-P088-Q18', ['skill_quant_07', 'sub_quant_07_2']],
    ['QDR-QNT-FND26-P088-Q19', ['skill_quant_08', 'sub_quant_08_1']],
    ['QDR-QNT-FND26-P088-Q20', ['skill_quant_08', 'sub_quant_08_1']],
  ]);

  const anchorDocs = await questions.find(
    { questionCode: { $in: [...anchors.keys()] } },
    { projection: { _id: 0, questionCode: 1, skillId: 1, subSkillId: 1 } },
  ).toArray();

  const byCode = new Map(anchorDocs.map((q) => [q.questionCode, q]));
  for (const [code, [skillId, subSkillId]] of anchors) {
    const q = byCode.get(code);
    if (!q || q.skillId !== skillId || q.subSkillId !== subSkillId) {
      fail('high-risk mapping anchor changed', { code, expected: { skillId, subSkillId }, actual: q });
    }
  }

  if (!process.exitCode) {
    console.log('QUANT_SKILL_REGRESSION_OK', {
      total,
      FND26: fnd,
      COL2627: col,
      strategyLocks: strategyExpected.length,
      anchors: anchors.size,
    });
  }

  await client.close();
}

run().catch(async (error) => {
  console.error(error);
  try { await client.close(); } catch {}
  process.exit(1);
});
