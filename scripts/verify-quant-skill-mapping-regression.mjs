import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required for the live Quant regression gate.');

const client = new MongoClient(uri);
const DB = 'almeaa';
const SUBJECT_ID = 'sub_1777779748206';
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const uniqueStrings = (values) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

function fail(message, details = undefined) {
  console.error('QUANT_SKILL_REGRESSION_FAIL:', message, details ?? '');
  process.exitCode = 1;
}

async function run() {
  await client.connect();
  const db = client.db(DB);
  const questions = db.collection('questions');
  const skills = db.collection('skills');
  const topics = db.collection('topics');
  const quizzes = db.collection('quizzes');
  const lessons = db.collection('lessons');

  const scope = { 'sourceMeta.documentCode': { $in: ['FND26', 'COL2627'] } };
  const [total, fnd, col] = await Promise.all([
    questions.countDocuments(scope),
    questions.countDocuments({ 'sourceMeta.documentCode': 'FND26' }),
    questions.countDocuments({ 'sourceMeta.documentCode': 'COL2627' }),
  ]);
  if (total !== 1804) fail('total must stay 1804', { total });
  if (fnd !== 858) fail('FND26 must stay 858', { fnd });
  if (col !== 946) fail('COL2627 must stay 946', { col });

  const quantSkills = await skills.find(
    { subjectId: SUBJECT_ID },
    { projection: { _id: 0, id: 1, sectionId: 1, subSkills: 1 } },
  ).toArray();
  if (quantSkills.length !== 25) fail('Quant main skill count must stay 25', { count: quantSkills.length });

  const mainById = new Map(quantSkills.map((skill) => [skill.id, skill]));
  const subToParent = new Map();
  for (const skill of quantSkills) {
    for (const sub of skill.subSkills ?? []) subToParent.set(sub.id, skill.id);
  }
  if (subToParent.size !== 95) fail('Quant subskill count must stay 95', { count: subToParent.size });

  const sourceQuestions = await questions.find(scope, {
    projection: {
      _id: 0,
      id: 1,
      questionCode: 1,
      skillId: 1,
      subSkillId: 1,
      subSkillIds: 1,
      skillIds: 1,
      sectionId: 1,
      difficulty: 1,
    },
  }).toArray();

  for (const q of sourceQuestions) {
    if (!q.skillId || !q.subSkillId || !VALID_DIFFICULTIES.has(q.difficulty)) {
      fail('missing/invalid skill or difficulty fields', q);
      continue;
    }
    const main = mainById.get(q.skillId);
    if (!main) {
      fail('question main skill does not exist', q);
      continue;
    }
    const linkedSubs = uniqueStrings([q.subSkillId, ...(Array.isArray(q.subSkillIds) ? q.subSkillIds : [])]);
    for (const subSkillId of linkedSubs) {
      if (subToParent.get(subSkillId) !== q.skillId) {
        fail('linked subskill parent does not match skillId', { questionCode: q.questionCode, skillId: q.skillId, subSkillId });
      }
    }
    if (q.sectionId !== main.sectionId) {
      fail('sectionId does not match current main skill', {
        questionCode: q.questionCode,
        sectionId: q.sectionId,
        expected: main.sectionId,
      });
    }
    const expectedSkillIds = uniqueStrings([q.skillId, ...linkedSubs]);
    if (JSON.stringify(q.skillIds || []) !== JSON.stringify(expectedSkillIds)) {
      fail('skillIds must equal canonical main + linked subskills', {
        questionCode: q.questionCode,
        actual: q.skillIds,
        expected: expectedSkillIds,
      });
    }
  }

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
    });
    if (count !== expected) fail('source-precedence strategy lock changed', { documentCode, page, subSkillId, expected, count });
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

  const quantTopics = await topics.find(
    { subjectId: SUBJECT_ID },
    { projection: { _id: 0, id: 1, parentId: 1, skillId: 1, skillIds: 1, quizIds: 1, lessonIds: 1, isLocked: 1 } },
  ).toArray();
  const mainTopics = quantTopics.filter((topic) => topic.parentId == null);
  const subTopics = quantTopics.filter((topic) => topic.parentId != null);
  if (mainTopics.length !== 25) fail('Quant main topic count must stay 25', { count: mainTopics.length });
  if (subTopics.length !== 95) fail('Quant subtopic count must stay 95', { count: subTopics.length });

  const topicById = new Map(quantTopics.map((topic) => [topic.id, topic]));
  for (const topic of subTopics) {
    if (!subToParent.has(topic.skillId)) fail('subtopic skillId is not a canonical Quant subskill', topic);
    if (!(topic.skillIds || []).includes(topic.skillId)) fail('subtopic skillIds lost own subskill', topic);
    const expectedQuizId = `drill_${topic.skillId}`;
    if (!(topic.quizIds || []).includes(expectedQuizId)) fail('subtopic lost its foundation drill', { topic: topic.id, expectedQuizId });
    const expectedParentSkill = subToParent.get(topic.skillId);
    const parentTopic = topicById.get(topic.parentId);
    if (!parentTopic || parentTopic.skillId !== expectedParentSkill) {
      fail('subtopic parent does not match subskill parent', { topic: topic.id, expectedParentSkill, parentTopic });
    }
  }

  const lessonIds = uniqueStrings(subTopics.flatMap((topic) => topic.lessonIds || []));
  if (lessonIds.length) {
    const lessonDocs = await lessons.find({ id: { $in: lessonIds } }, { projection: { _id: 0, id: 1 } }).toArray();
    if (lessonDocs.length !== lessonIds.length) {
      const resolved = new Set(lessonDocs.map((lesson) => lesson.id));
      fail('topic has dangling lessonIds', lessonIds.filter((id) => !resolved.has(id)));
    }
  }

  const quantQuizDocs = await quizzes.find(
    { subjectId: SUBJECT_ID, id: { $regex: /^(drill_sub_quant_|bank_skill_quant_)/ } },
    { projection: { _id: 0, id: 1, skillIds: 1, questionIds: 1, learningPlacements: 1, access: 1 } },
  ).toArray();
  const drills = quantQuizDocs.filter((quiz) => /^drill_sub_quant_/.test(quiz.id));
  const banks = quantQuizDocs.filter((quiz) => /^bank_skill_quant_/.test(quiz.id));
  if (drills.length !== 95) fail('Quant subskill drill count must stay 95', { count: drills.length });
  if (banks.length !== 39) fail('Quant main-skill training card count must stay 39', { count: banks.length });

  const allTrainingQuestionIds = uniqueStrings(quantQuizDocs.flatMap((quiz) => quiz.questionIds || []));
  const trainingQuestions = await questions.find(
    { id: { $in: allTrainingQuestionIds } },
    { projection: { _id: 0, id: 1, skillIds: 1 } },
  ).toArray();
  const trainingQuestionById = new Map(trainingQuestions.map((q) => [q.id, q]));

  for (const drill of drills) {
    const intendedSub = drill.id.replace(/^drill_/, '');
    const qids = drill.questionIds || [];
    if (qids.length < 9 || qids.length > 15) fail('subskill drill size outside approved 9-15 envelope', { id: drill.id, size: qids.length });
    if (new Set(qids).size !== qids.length) fail('duplicate question id inside subskill drill', { id: drill.id });
    if (!(drill.skillIds || []).includes(intendedSub)) fail('subskill drill lost intended skill link', { id: drill.id, intendedSub });
    const expectedTopic = `top_quant_${intendedSub}`;
    const placement = (drill.learningPlacements || []).find((p) => p.slot === 'foundation' && p.topicId === expectedTopic);
    if (!placement) fail('subskill drill lost foundation topic placement', { id: drill.id, expectedTopic });
    const topic = topicById.get(expectedTopic);
    const parent = topic ? topicById.get(topic.parentId) : null;
    const expectedAccess = parent?.isLocked === false ? 'free' : 'paid';
    if (drill.access?.type !== expectedAccess || placement?.accessType !== expectedAccess) {
      fail('subskill drill access no longer matches parent topic', { id: drill.id, expectedAccess, access: drill.access?.type, placement: placement?.accessType });
    }
    for (const qid of qids) {
      const q = trainingQuestionById.get(qid);
      if (!q) fail('subskill drill has missing question ref', { id: drill.id, qid });
      else if (!(q.skillIds || []).includes(intendedSub)) fail('subskill drill question no longer matches subskill', { id: drill.id, qid, intendedSub, skillIds: q.skillIds });
    }
  }

  for (const bank of banks) {
    const match = bank.id.match(/^bank_(skill_quant_\d{2})_g\d+$/);
    const intendedMain = match?.[1];
    if (!intendedMain) {
      fail('main-skill training id is malformed', { id: bank.id });
      continue;
    }
    const qids = bank.questionIds || [];
    if (qids.length < 29 || qids.length > 40) fail('main-skill training size outside approved 29-40 envelope', { id: bank.id, size: qids.length });
    if (new Set(qids).size !== qids.length) fail('duplicate question id inside main-skill training', { id: bank.id });
    if (!(bank.skillIds || []).includes(intendedMain)) fail('main-skill training lost intended skill link', { id: bank.id, intendedMain });
    if (bank.access?.type !== 'paid') fail('all Quant main-skill training must remain paid', { id: bank.id, access: bank.access?.type });
    if (!(bank.learningPlacements || []).some((p) => p.slot === 'training' && p.accessType === 'paid')) {
      fail('main-skill training placement must remain paid', { id: bank.id });
    }
    for (const qid of qids) {
      const q = trainingQuestionById.get(qid);
      if (!q) fail('main-skill training has missing question ref', { id: bank.id, qid });
      else if (!(q.skillIds || []).includes(intendedMain)) fail('main-skill training question no longer matches main skill', { id: bank.id, qid, intendedMain, skillIds: q.skillIds });
    }
  }

  if (!process.exitCode) {
    console.log('QUANT_SKILL_REGRESSION_OK', {
      total,
      FND26: fnd,
      COL2627: col,
      mainSkills: quantSkills.length,
      subSkills: subToParent.size,
      mainTopics: mainTopics.length,
      subTopics: subTopics.length,
      drills: drills.length,
      mainTrainingCards: banks.length,
      topicLessonRefs: lessonIds.length,
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
