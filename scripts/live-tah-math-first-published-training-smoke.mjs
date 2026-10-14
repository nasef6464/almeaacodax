// Read-only live verification: three free published TAH-MATH V2 foundation drills.
const base = String(process.env.TAH_MATH_PUBLIC_API_BASE || 'https://almeaacodax-k2ux.onrender.com/api').replace(/\/$/, '');
const subjectId = 'sub_1777784609152';
const pathId = 'p_1777779653351';
const expected = [
  { id: 'quiz_tahmath_v2_fnd_TAH-MATH-VIDEO-01-01', topicId: 'TAH-MATH-VIDEO-01-01', count: 12, minImageCount: 2 },
  { id: 'quiz_tahmath_v2_fnd_TAH-MATH-VIDEO-02-01', topicId: 'TAH-MATH-VIDEO-02-01', count: 10, minImageCount: 0 },
  { id: 'quiz_tahmath_v2_fnd_TAH-MATH-VIDEO-02-02', topicId: 'TAH-MATH-VIDEO-02-02', count: 10, minImageCount: 0 },
];
const results = [];
async function get(url) {
  const r = await fetch(url, { headers:{ Accept: 'application/json', 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(70000) });
  const contentType = r.headers.get('content-type') || '';
  const data = await r.text();
  if (!contentType.includes('json')) throw new Error('Expected JSON but got ' + contentType + ' HTTP ' + r.status);
  return { status: r.status, json: JSON.parse(data) };
}
let allPassed = true;
for (const entry of expected) {
  try {
    const r = await get(base+'/quizzes/'+encodeURIComponent(entry.id)+'?includeQuestions=true');
    const q=r.json.quiz || r.json;
    const questions = Array.isArray(q.questions) ? q.questions : [];
    const checks = {
      status200:r.status===200,
      sameId:String(q.id || q._id || '')===entry.id,
      correctScope:q.subjectId===subjectId && q.pathId===pathId,
      publicApproved:q.approvalStatus==='approved' && q.isPublished===true && q.showOnPlatform===true,
      free:q.access?.type==='free',
      foundationPlacement:(q.learningPlacements||[]).some(p=>p.slot==='foundation'&&p.topicId===entry.topicId&&p.isVisible===true&&p.accessType==='free'),
      questionCount:questions.length===entry.count,
      fourChoices:questions.every(item=>Array.isArray(item.options)&&item.options.length===4&&String(item.text||'').trim()),
      sourceImages:questions.filter(item=>String(item.imageUrl||'').startsWith('https://')).length>=entry.minImageCount,
    };
    if (Object.values(checks).some(v=>v!==true)) allPassed = false;
    results.push({ quizId:entry.id, checks, retrievedQuestions:questions.length });
  } catch(e) {
    allPassed=false;results.push({quizId:entry.id, error:e instanceof Error?e.message:String(e)});
  }
}
console.log(JSON.stringify({ status:allPassed?'PASS':'FAIL', checkedAt:new Date().toISOString(), base, results },null,2));
if(!allPassed) process.exitCode=1;
