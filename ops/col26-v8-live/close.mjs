import fs from "node:fs";

const API = "https://almeaacodax.vercel.app/api";
const V8_BATCH = "TAH-MATH-COL26-SEC1-V8";
const EXPECTED = 1012;
const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1777784609152";
const ADMIN_EMAIL = String(process.env.SMOKE_ADMIN_EMAIL || process.env.ROLE_ADMIN_EMAIL || "").trim();
const ADMIN_PASSWORD = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.ROLE_ADMIN_PASSWORD || "").trim();
const STUDENT_EMAIL = String(process.env.ROLE_STUDENT_EMAIL || "").trim();
const STUDENT_PASSWORD = String(process.env.ROLE_STUDENT_PASSWORD || "").trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const idOf = (x) => String(x?.id || x?._id || "").trim();
const unique = (values) => [...new Set(values.map(String).filter(Boolean))];

function cookieValue(headers, name) {
  return String(headers.get("set-cookie") || "").match(new RegExp(name + "=([^;]+)"))?.[1] || "";
}

async function freshCsrf() {
  const r = await fetch(API + "/auth/csrf-token", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("csrf HTTP " + r.status);
  const value = String(b?.csrfToken || "").trim();
  const cookie = cookieValue(r.headers, "almeaa_csrf_token");
  if (!value || !cookie) throw new Error("missing csrf context");
  return { token:value, cookie:"almeaa_csrf_token=" + cookie };
}

async function login(email, password) {
  if (!email || !password) throw new Error("missing login credentials");
  const csrf = await freshCsrf();
  const r = await fetch(API + "/auth/login", {
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-csrf-token":csrf.token,
      cookie:csrf.cookie,
    },
    body:JSON.stringify({ email, password }),
    signal:AbortSignal.timeout(20000),
  });
  const raw = await r.text();
  let body={}; try{body=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok) throw new Error("login HTTP " + r.status + " " + raw.slice(0,180));
  const access = String(body?.token || cookieValue(r.headers,"almeaa_access_token") || "").trim();
  if(!access || !body?.user) throw new Error("login succeeded without reusable session");
  return { bearer:access, user:body.user, csrf };
}

async function adminSession() {
  const envToken = String(process.env.SMOKE_ADMIN_TOKEN || "").trim();
  if (envToken) {
    const probe = await fetch(API + "/auth/me", { headers:{authorization:"Bearer " + envToken}, signal:AbortSignal.timeout(15000) });
    if (probe.ok) {
      const me = await probe.json().catch(()=>({}));
      return { bearer:envToken, user:me?.user || me, csrf:await freshCsrf() };
    }
  }
  return login(ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function request(session, method, pathname, body=undefined, attempt=1) {
  const unsafe = !["GET","HEAD","OPTIONS"].includes(method);
  const headers = { accept:"application/json", authorization:"Bearer " + session.bearer };
  if (body !== undefined) headers["content-type"]="application/json";
  if (unsafe) {
    if (!session.csrf?.token || !session.csrf?.cookie) session.csrf = await freshCsrf();
    headers["x-csrf-token"] = session.csrf.token;
    headers.cookie = session.csrf.cookie;
  }
  let r;
  try {
    r = await fetch(API + pathname, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal:AbortSignal.timeout(60000),
    });
  } catch (error) {
    if(attempt<3){ await sleep(attempt*1200); return request(session,method,pathname,body,attempt+1); }
    throw error;
  }
  const raw = await r.text();
  let payload=null; try{payload=raw?JSON.parse(raw):null}catch{payload={raw:raw.slice(0,500)}}
  if ((r.status===403 || r.status>=500) && attempt<3) {
    session.csrf = await freshCsrf();
    await sleep(attempt*1200);
    return request(session,method,pathname,body,attempt+1);
  }
  if(!r.ok) throw new Error(method+" "+pathname+" HTTP "+r.status+" "+JSON.stringify(payload).slice(0,700));
  return payload;
}

async function pool(items, worker, concurrency=6) {
  const out=new Array(items.length);
  let cursor=0, done=0;
  async function run(){
    while(true){
      const i=cursor++;
      if(i>=items.length) return;
      out[i]=await worker(items[i],i);
      done+=1;
      if(done%100===0 || done===items.length) console.log("COL26_LIVE_PROGRESS "+done+"/"+items.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,Math.max(items.length,1))},()=>run()));
  return out;
}

const admin = await adminSession();
const student = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
if (String(student.user?.role || "") !== "student") throw new Error("ROLE_STUDENT credentials are not a student account");
const studentId=idOf(student.user);
if(!studentId) throw new Error("student id missing");

const before = await request(admin,"GET","/quizzes/questions/import-batch/"+encodeURIComponent(V8_BATCH));
if(Number(before?.count||0)!==EXPECTED) throw new Error("V8 count mismatch before approval: "+before?.count);
const rows = before.questions || [];
if(rows.length!==EXPECTED) throw new Error("V8 question list mismatch before approval");

const toApprove = rows.filter((q)=>String(q.approvalStatus||"")!=="approved");
console.log("COL26_APPROVAL_CHECKPOINT total=1012 pendingApproval="+toApprove.length);
await pool(toApprove, async(q)=>{
  const id=idOf(q);
  if(!id) throw new Error("missing question id for "+q.questionCode);
  const updated=await request(admin,"PATCH","/quizzes/questions/"+encodeURIComponent(id),{
    approvalStatus:"approved",
    reviewerNotes:"COL26 V8 final production closure — badge-free crop and integrity gates passed.",
  });
  if(String(updated?.approvalStatus||"")!=="approved") throw new Error("approval failed "+q.questionCode);
  return q.questionCode;
},8);

const approvedBatch = await request(admin,"GET","/quizzes/questions/import-batch/"+encodeURIComponent(V8_BATCH));
const approvedCount=(approvedBatch.questions||[]).filter(q=>String(q.approvalStatus||"")==="approved").length;
if(Number(approvedBatch?.count||0)!==EXPECTED || approvedCount!==EXPECTED) {
  throw new Error("final approval count mismatch total="+approvedBatch?.count+" approved="+approvedCount);
}
console.log("COL26_APPROVAL_PASS approved=1012");

const sourceRows=approvedBatch.questions||[];
const candidateIndices=unique(Array.from({length:60},(_,i)=>Math.floor(i*(sourceRows.length-1)/59)));
const candidateRows=candidateIndices.map(i=>sourceRows[i]).filter(Boolean);
const details=await pool(candidateRows,async(q)=>request(admin,"GET","/quizzes/questions/"+encodeURIComponent(idOf(q))),6);
const picked=[];
const seenSub=new Set();
for(const q of details){
  const sub=(q.skillIds||[]).map(String).find(id=>id.startsWith("sub_tah_math_")) || (q.skillIds||[]).map(String).at(-1) || "";
  if(!sub || seenSub.has(sub)) continue;
  seenSub.add(sub); picked.push(q);
  if(picked.length===5) break;
}
if(picked.length!==5) throw new Error("could not select 5 distinct COL26 subskills");
if(picked.some(q=>String(q.approvalStatus||"")!=="approved")) throw new Error("selected audit question is not approved");

const expectedQuestionIds=picked.map(idOf);
const expectedQuestionCodes=picked.map(q=>String(q.questionCode||""));
const expectedSkillIds=unique(picked.flatMap(q=>q.skillIds||[]));
const answerMap=Object.fromEntries(picked.map(q=>[idOf(q),Number(q.correctOptionIndex)]));
if(Object.values(answerMap).some(v=>!Number.isInteger(v)||v<0||v>3)) throw new Error("invalid audit answer index");

const quizId="quiz_col26_v8_closure_"+Date.now();
const created=await request(admin,"POST","/quizzes/",{
  id:quizId,
  title:"COL26 V8 Closure Audit",
  description:"Automated production closure audit for Tahsili Math COL26 V8.",
  pathId:PATH_ID,
  subjectId:SUBJECT_ID,
  type:"quiz",
  quizKind:"test",
  mode:"regular",
  questionIds:expectedQuestionIds,
  targetUserIds:[studentId],
  targetGroupIds:[],
  isPublished:true,
  showOnPlatform:false,
  approvalStatus:"approved",
  settings:{
    passingScore:60,
    maxAttempts:3,
    showResultsReport:true,
    showAnswers:true,
    returnToSourceOnFinish:false,
  },
});
const createdQuizId=idOf(created);
if(!createdQuizId) throw new Error("audit quiz creation missing id");

const learnerQuiz=await request(student,"GET","/quizzes/"+encodeURIComponent(createdQuizId));
const learnerQuestions=learnerQuiz?.questions||[];
if(learnerQuestions.length!==5) throw new Error("student quiz did not resolve 5 questions: "+learnerQuestions.length);
for(const q of learnerQuestions){
  if(q.correctOptionIndex!==undefined && q.correctOptionIndex!==null) throw new Error("answer key leaked to learner for "+idOf(q));
  if(!q.imageUrl) throw new Error("learner question missing image "+idOf(q));
  const ir=await fetch(q.imageUrl,{signal:AbortSignal.timeout(30000)});
  if(!ir.ok) throw new Error("learner image failed "+idOf(q)+" HTTP "+ir.status);
}
console.log("COL26_STUDENT_RENDER_PASS questions=5 images=5 answerLeak=0");

const submitted=await request(student,"POST","/quizzes/"+encodeURIComponent(createdQuizId)+"/submit",{
  answers:answerMap,
  timeSpentSeconds:75,
  source:"tests",
});
if(Number(submitted?.totalQuestions||0)!==5 || Number(submitted?.correctAnswers||0)!==5 || Number(submitted?.score||0)!==100) {
  throw new Error("unexpected audit score "+JSON.stringify({total:submitted?.totalQuestions,correct:submitted?.correctAnswers,score:submitted?.score}));
}
const reviewIds=unique((submitted?.questionReview||[]).map(x=>x.questionId));
for(const qid of expectedQuestionIds) if(!reviewIds.includes(qid)) throw new Error("result questionReview missing "+qid);
const resultSkills=unique((submitted?.skillsAnalysis||[]).map(x=>x.skillId));
for(const skillId of expectedSkillIds) if(!resultSkills.includes(skillId)) throw new Error("result skillsAnalysis missing "+skillId);
console.log("COL26_SUBMIT_PASS score=100 reviewQuestions="+reviewIds.length+" skills="+resultSkills.length);

const studentReport=await request(student,"GET","/quizzes/results?quizId="+encodeURIComponent(createdQuizId)+"&limit=10&includeReview=true");
const studentResult=(studentReport?.results||[]).find(r=>String(r.quizId||"")===createdQuizId);
if(!studentResult) throw new Error("student report missing COL26 audit result");
const reportSkills=unique((studentResult.skillsAnalysis||[]).map(x=>x.skillId));
for(const skillId of expectedSkillIds) if(!reportSkills.includes(skillId)) throw new Error("student report missing skill "+skillId);

const adminReport=await request(admin,"GET","/quizzes/results/scoped?quizId="+encodeURIComponent(createdQuizId)+"&studentId="+encodeURIComponent(studentId)+"&limit=10&includeReview=true");
const adminResult=(adminReport?.results||[]).find(r=>String(r.quizId||"")===createdQuizId);
if(!adminResult) throw new Error("admin scoped report missing COL26 audit result");
const adminSkills=unique((adminResult.skillsAnalysis||[]).map(x=>x.skillId));
for(const skillId of expectedSkillIds) if(!adminSkills.includes(skillId)) throw new Error("admin report missing skill "+skillId);

const report={
  status:"PASS",
  batchId:V8_BATCH,
  approved:EXPECTED,
  studentId,
  quizId:createdQuizId,
  questionIds:expectedQuestionIds,
  questionCodes:expectedQuestionCodes,
  expectedSkillIds,
  resultSkillIds:resultSkills,
  score:Number(submitted.score),
  studentReport:true,
  adminScopedReport:true,
  learnerImages:5,
  answerLeak:0,
  generatedAt:new Date().toISOString(),
};
fs.mkdirSync("audit-artifacts/col26-v8-live",{recursive:true});
fs.writeFileSync("audit-artifacts/col26-v8-live/closure.json",JSON.stringify(report,null,2));
console.log("COL26_V8_LIVE_CLOSURE_PASS approved=1012 quizQuestions=5 score=100 reports=student+admin");
