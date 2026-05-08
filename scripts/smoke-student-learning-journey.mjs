const API_URL = (process.env.SMOKE_API_URL || 'https://almeaacodax-k2ux.onrender.com/api').replace(/\/$/, '');
const TARGET_PATH_ID = process.env.SMOKE_STUDENT_JOURNEY_PATH_ID || 'p_1777779639431';
const TARGET_SUBJECT_ID = process.env.SMOKE_STUDENT_JOURNEY_SUBJECT_ID || 'sub_1777779748206';
const TARGET_TOPIC_ID = process.env.SMOKE_STUDENT_JOURNEY_TOPIC_ID || 'topic_1778140269883';

const checks = [];

async function check(name, fn) {
  try {
    const details = await fn();
    checks.push({ name, status: 'PASS', details });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status} ${response.statusText}`);
  }

  return response.json();
}

const idOf = (item) => String(item?.id || item?._id || '').trim();
const stripCopySuffix = (value) => String(value || '').replace(/_copy(?:_\d+)?$/i, '');
const visibleToLearner = (item) =>
  item?.showOnPlatform !== false &&
  item?.isPublished !== false &&
  (!item?.approvalStatus || item.approvalStatus === 'approved');
const isSafeInternalRoute = (target) => Boolean(target && target.startsWith('/') && !target.startsWith('//'));

function sanitizeVideoUrl(rawUrl) {
  if (!rawUrl) return '';

  let trimmedUrl = String(rawUrl).trim().replace(/^['"]|['"]$/g, '');
  if (!trimmedUrl) return '';

  trimmedUrl = trimmedUrl
    .replace(/^https?:\/\/https?:\/\//i, 'https://')
    .replace(/^https?:\/\/:\/\//i, 'https://')
    .replace(/^:\/\//, 'https://')
    .replace(/^\/\//, 'https://');

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

function hasPlayableLessonMedia(lesson) {
  return Boolean(
    sanitizeVideoUrl(lesson?.videoUrl) ||
      String(lesson?.fileUrl || '').trim() ||
      String(lesson?.content || '').trim() ||
      String(lesson?.recordingUrl || '').trim(),
  );
}

function buildTopicReturnPath(pathId, subjectId, topicId, contentTab = 'quizzes') {
  const params = new URLSearchParams();
  if (subjectId) params.set('subject', subjectId);
  params.set('tab', 'skills');
  params.set('topic', topicId);
  params.set('content', contentTab);
  return `/category/${pathId}?${params.toString()}`;
}

function buildQuizRouteWithContext(quizId, context = {}) {
  const params = new URLSearchParams();
  if (isSafeInternalRoute(context.returnTo)) params.set('returnTo', context.returnTo);
  if (context.source) params.set('source', context.source);
  if (context.returnOnFinish) params.set('returnOnFinish', '1');
  return `/quiz/${quizId}${params.toString() ? `?${params.toString()}` : ''}`;
}

function matchesEntityId(item, value) {
  const expected = String(value || '').trim();
  const actual = idOf(item);
  if (!expected || !actual) return false;
  return actual === expected || actual === stripCopySuffix(expected) || stripCopySuffix(actual) === expected;
}

const [taxonomy, content, quizzes, questions] = await Promise.all([
  fetchJson('/taxonomy/bootstrap'),
  fetchJson('/content/bootstrap'),
  fetchJson('/quizzes'),
  fetchJson('/quizzes/questions'),
]);

const path = (taxonomy.paths || []).find((item) => idOf(item) === TARGET_PATH_ID);
const subject = (taxonomy.subjects || []).find((item) => idOf(item) === TARGET_SUBJECT_ID);
const topic = (content.topics || []).find((item) => idOf(item) === TARGET_TOPIC_ID);
const subTopics = (content.topics || [])
  .filter((item) => item.parentId === TARGET_TOPIC_ID && visibleToLearner(item))
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
const journeyTopics = [topic, ...subTopics].filter(Boolean);
const journeyLessonIds = new Set(journeyTopics.flatMap((item) => item.lessonIds || []).map(String));
const journeyQuizIds = new Set(journeyTopics.flatMap((item) => item.quizIds || []).map(String));
const questionById = new Map(
  (questions || []).flatMap((question) => {
    const questionId = idOf(question);
    return questionId ? [[questionId, question], [stripCopySuffix(questionId), question]] : [];
  }),
);
const journeyLessons = (content.lessons || []).filter((lesson) => journeyLessonIds.has(idOf(lesson)) && visibleToLearner(lesson));
const journeyQuizzes = (quizzes || []).filter((quiz) => {
  const linkedToTopic = [...journeyQuizIds].some((quizId) => matchesEntityId(quiz, quizId));
  const hasTrainingPlacement = (quiz.learningPlacements || []).some(
    (placement) =>
      placement.pathId === TARGET_PATH_ID &&
      placement.subjectId === TARGET_SUBJECT_ID &&
      placement.slot === 'training' &&
      placement.isVisible !== false,
  );
  return visibleToLearner(quiz) && (linkedToTopic || hasTrainingPlacement);
});
const supportFiles = (content.libraryItems || []).filter(
  (item) =>
    item.pathId === TARGET_PATH_ID &&
    item.subjectId === TARGET_SUBJECT_ID &&
    visibleToLearner(item) &&
    Boolean(String(item.url || '').trim()),
);

await check('journey starts from an active path and subject', async () => {
  if (!path || path.isActive === false) throw new Error(`path is missing or inactive: ${TARGET_PATH_ID}`);
  if (!subject || subject.pathId !== TARGET_PATH_ID) throw new Error(`subject is missing or outside path: ${TARGET_SUBJECT_ID}`);
  return `${path.name || TARGET_PATH_ID} / ${subject.name || TARGET_SUBJECT_ID}`;
});

await check('foundation topic is visible and scoped to the selected subject', async () => {
  if (!topic) throw new Error(`topic not found: ${TARGET_TOPIC_ID}`);
  if (!visibleToLearner(topic)) throw new Error(`topic is not visible to learners: ${TARGET_TOPIC_ID}`);
  if (topic.pathId !== TARGET_PATH_ID || topic.subjectId !== TARGET_SUBJECT_ID) {
    throw new Error(`topic scope mismatch: path=${topic.pathId}, subject=${topic.subjectId}`);
  }
  return `${topic.title || TARGET_TOPIC_ID}, subTopics=${subTopics.length}`;
});

await check('foundation journey has at least one playable lesson', async () => {
  const playableLessons = journeyLessons.filter(hasPlayableLessonMedia);
  if (playableLessons.length === 0) {
    throw new Error(`no playable lesson found for topic ${TARGET_TOPIC_ID}`);
  }
  return `${playableLessons.length}/${journeyLessons.length} playable lessons`;
});

await check('foundation journey has a training quiz with resolvable questions', async () => {
  if (journeyQuizzes.length === 0) throw new Error(`no visible training quiz found for topic ${TARGET_TOPIC_ID}`);

  const quiz = journeyQuizzes.find((item) => (item.questionIds || []).length > 0) || journeyQuizzes[0];
  const refs = (quiz.questionIds || []).map(String).filter(Boolean);
  if (refs.length < 1) throw new Error(`quiz has no question refs: ${idOf(quiz)}`);

  const missingRefs = refs.filter((questionId) => !questionById.get(questionId) && !questionById.get(stripCopySuffix(questionId)));
  if (missingRefs.length > 0) {
    throw new Error(`quiz ${idOf(quiz)} has unresolved refs: ${missingRefs.join(', ')}`);
  }

  return `${quiz.title || idOf(quiz)}: ${refs.length} resolved questions`;
});

await check('support files are available without noisy learner details', async () => {
  if (supportFiles.length === 0) throw new Error(`no visible support file found for ${TARGET_PATH_ID}/${TARGET_SUBJECT_ID}`);
  const skillLinkedFiles = supportFiles.filter((item) => item.sectionId || (item.skillIds || []).length > 0);
  if (skillLinkedFiles.length === 0) throw new Error('support files exist but are not linked to skills or sections');
  return `${skillLinkedFiles.length}/${supportFiles.length} skill-aware support files`;
});

await check('quiz retry and finish routes keep the learner inside the same topic', async () => {
  const quiz = journeyQuizzes.find((item) => (item.questionIds || []).length > 0) || journeyQuizzes[0];
  const returnTo = buildTopicReturnPath(TARGET_PATH_ID, TARGET_SUBJECT_ID, TARGET_TOPIC_ID, 'quizzes');
  const route = buildQuizRouteWithContext(idOf(quiz), {
    returnTo,
    source: 'foundation',
    returnOnFinish: quiz.settings?.returnToSourceOnFinish === true || quiz.settings?.showResultsReport === false,
  });
  const parsed = new URL(`https://smoke.local${route}`);
  if (parsed.pathname !== `/quiz/${idOf(quiz)}`) throw new Error(`wrong quiz route: ${parsed.pathname}`);
  if (parsed.searchParams.get('returnTo') !== returnTo) {
    throw new Error(`returnTo does not keep topic context: ${parsed.searchParams.get('returnTo')}`);
  }
  if (parsed.searchParams.get('source') !== 'foundation') {
    throw new Error(`source should be foundation, found ${parsed.searchParams.get('source')}`);
  }
  return route;
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} student learning journey smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} student learning journey smoke checks passed.`);
