// Read-only production smoke; never submits a student attempt, mutates a quiz, or requests answer keys.
const base = String(process.env.TAH_MATH_PUBLIC_API_BASE || 'https://almeaacodax-k2ux.onrender.com/api').replace(/\/$/, '');
const id = 'quiz_tahmath_v2_fnd_TAH-MATH-VIDEO-01-01';
const subjectId = 'sub_1777784609152';
const pathId = 'p_1777779653351';
const evidence = { base, quizId: id, checkedAt: new Date().toISOString(), checks: [] };
const assert = (condition, label, details) => {
  evidence.checks.push({ check: label, passed: Boolean(condition), ...details });
  if (!condition) throw new Error(label);
};
const request = async path => {
  const response = await fetch(base + path, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(55000),
  });
  const type = response.headers.get('content-type') || '';
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Unexpected non-JSON response at ' + path + ', HTTP ' + response.status + ', content-type ' + type); }
  return { status: response.status, data };
};
try {
  const details = await request('/quizzes/' + encodeURIComponent(id) + '?includeQuestions=true');
  assert(details.status === 200, 'public_free_training_details_HTTP_200', { status: details.status });
  const q = details.data?.quiz || details.data;
  assert(String(q.id || q._id || '') === id, 'correct_training_id');
  assert(q.subjectId === subjectId && q.pathId === pathId, 'subject_path_scope');
  assert(q.isPublished === true && q.showOnPlatform !== false && q.approvalStatus === 'approved', 'published_and_approved');
  assert(q.access?.type === 'free', 'training_free');
  const placements = Array.isArray(q.learningPlacements) ? q.learningPlacements : [];
  assert(placements.some(p => p.slot === 'foundation' && p.topicId === 'TAH-MATH-VIDEO-01-01' && p.isVisible === true && p.accessType === 'free'), 'placement_visible_in_foundation_topic');
  const questions = Array.isArray(q.questions) ? q.questions : [];
  assert(questions.length === 10, 'ten_playable_questions', { count: questions.length });
  assert(questions.every(x => Array.isArray(x.options) && x.options.length === 4 && String(x.text || '').trim()), 'all_questions_have_text_and_four_options');
  console.log(JSON.stringify({ status: 'PASS', ...evidence }, null, 2));
} catch(error) {
  console.log(JSON.stringify({ status: 'FAIL', ...evidence, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
}
