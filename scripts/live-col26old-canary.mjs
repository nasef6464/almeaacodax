import { chromium } from "playwright";

const BASE_URL = (process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE = (process.env.UI_AUDIT_API_BASE_URL || `${BASE_URL}/api`).replace(/\/$/, "");
const questionIds = [
  "q_6ac280051b7a519dec3928c6",
  "q_6ac280051b7a519dec3928c8",
  "q_6ac280051b7a519dec3928ca",
  "q_6ac280051b7a519dec3928cc",
  "q_6ac280051b7a519dec3928ce",
];
const questionCodes = [
  "TAH-MATH-COL26OLD-P007-Q19",
  "TAH-MATH-COL26OLD-P007-Q20",
  "TAH-MATH-COL26OLD-P007-Q21",
  "TAH-MATH-COL26OLD-P007-Q22",
  "TAH-MATH-COL26OLD-P007-Q23",
];
const expectedSkillIds = ["skill_tah_math_01","sub_tah_math_01_01"];
const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1777784609152";
const SECTION_ID = "sec_tah_math_01";
const adminCreds = { email: process.env.ROLE_ADMIN_EMAIL, password: process.env.ROLE_ADMIN_PASSWORD };
const studentCreds = { email: process.env.ROLE_STUDENT_EMAIL, password: process.env.ROLE_STUDENT_PASSWORD };
if (!adminCreds.email || !adminCreds.password || !studentCreds.email || !studentCreds.password) throw new Error("Missing ROLE admin/student credentials");

async function login(context, creds) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const result = await page.evaluate(async ({ apiBase, email, password }) => {
    const csrfRes = await fetch(`${apiBase}/auth/csrf-token`, { credentials: "include" });
    const csrf = await csrfRes.json();
    const res = await fetch(`${apiBase}/auth/login`, {
      method:"POST", credentials:"include",
      headers:{"content-type":"application/json","x-csrf-token":csrf.csrfToken||""},
      body:JSON.stringify({email,password}),
    });
    const body = await res.json().catch(()=>({}));
    if (!res.ok || !body.user) return {ok:false,status:res.status,body};
    sessionStorage.setItem("almeaa:csrf-token", csrf.csrfToken||"");
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
      id:String(body.user.id||body.user._id||body.user.email),email:body.user.email,displayName:body.user.name,
      role:body.user.role,groupIds:Array.isArray(body.user.groupIds)?body.user.groupIds.map(String):[],schoolId:body.user.schoolId||null
    }));
    return {ok:true,user:body.user};
  }, {apiBase:API_BASE,...creds});
  if (!result.ok) throw new Error(`Login failed ${result.status}: ${JSON.stringify(result.body)}`);
  await page.reload({waitUntil:"domcontentloaded",timeout:60000});
  return {page,user:result.user};
}

async function api(page, path, options={}) {
  return page.evaluate(async ({apiBase,path,options})=>{
    const csrf=sessionStorage.getItem("almeaa:csrf-token")||"";
    const method=String(options.method||"GET").toUpperCase();
    const res=await fetch(`${apiBase}${path}`,{
      credentials:"include",cache:"no-store",...options,
      headers:{accept:"application/json",...(options.body?{"content-type":"application/json"}:{}),...(!["GET","HEAD","OPTIONS"].includes(method)&&csrf?{"x-csrf-token":csrf}:{})}
    });
    return {ok:res.ok,status:res.status,payload:await res.json().catch(()=>({}))};
  },{apiBase:API_BASE,path,options});
}
const listOf=(p,k)=>Array.isArray(p?.[k])?p[k]:Array.isArray(p?.data)?p.data:Array.isArray(p)?p:[];

const browser=await chromium.launch({headless:true});
const adminContext=await browser.newContext({locale:"ar-SA",timezoneId:"Asia/Riyadh"});
const studentContext=await browser.newContext({locale:"ar-SA",timezoneId:"Asia/Riyadh"});
let quizId="";
try {
  const admin=await login(adminContext,adminCreds);
  const student=await login(studentContext,studentCreds);
  const studentId=String(student.user.id||student.user._id||"");
  if(!studentId) throw new Error("Student id missing after login");

  const marker=`COL26OLD-LIVE-${Date.now()}`;
  const create=await api(admin.page,"/quizzes",{
    method:"POST",
    body:JSON.stringify({
      title:marker,
      description:"COL26OLD final live canary",
      pathId:PATH_ID,subjectId:SUBJECT_ID,sectionId:SECTION_ID,
      type:"quiz",quizKind:"test",mode:"central",
      questionIds,targetUserIds:[studentId],targetGroupIds:[],
      settings:{timeLimit:15,maxAttempts:1,showResultsReport:true,returnToSourceOnFinish:false},
      isPublished:true,showOnPlatform:true,approvalStatus:"approved"
    })
  });
  if(!create.ok) throw new Error(`Create quiz failed ${create.status}: ${JSON.stringify(create.payload)}`);
  quizId=String(create.payload?.id||create.payload?._id||"");
  if(!quizId || create.payload?.isPublished!==true) throw new Error("Quiz was not published");

  const catalog=await api(student.page,"/quizzes?limit=300");
  const visible=listOf(catalog.payload,"quizzes").some(q=>String(q.id||q._id)===quizId);
  if(!catalog.ok || !visible) throw new Error("Directed COL26OLD canary quiz is not visible to student");

  const questionPayload=await api(student.page,`/quizzes/questions?ids=${encodeURIComponent(questionIds.join(","))}&limit=10`);
  const learnerQuestions=listOf(questionPayload.payload,"questions");
  if(!questionPayload.ok || learnerQuestions.length!==5) throw new Error(`Learner question fetch mismatch: ${learnerQuestions.length}`);
  const exposed=learnerQuestions.filter(q=>q.correctOptionIndex!==undefined || q.correctAnswer!==undefined);
  if(exposed.length) throw new Error(`Answer exposure before submit: ${exposed.map(q=>q.questionCode||q.id).join(",")}`);
  const learnerCodes=new Set(learnerQuestions.map(q=>String(q.questionCode||"")));
  for(const code of questionCodes) if(!learnerCodes.has(code)) throw new Error(`Missing learner code ${code}`);

  await student.page.goto(`${BASE_URL}/quiz/${quizId}`,{waitUntil:"domcontentloaded",timeout:60000});
  await student.page.getByTestId("quiz-title").waitFor({timeout:30000});
  for(let i=0;i<5;i++){
    await student.page.getByTestId("quiz-answer-option-0").click();
    if(i<4){
      await student.page.getByTestId("quiz-next-button").click();
      await student.page.waitForTimeout(150);
    }
  }
  await student.page.getByTestId("quiz-finish-button").click();
  await student.page.getByTestId("quiz-finish-confirm").click();
  await student.page.waitForTimeout(1500);

  const results=await api(student.page,"/quiz-results/my?limit=50");
  const result=listOf(results.payload,"results").find(r=>String(r.quizId||"")===quizId);
  if(!results.ok || !result) throw new Error("Submitted COL26OLD result not found");
  const review=Array.isArray(result.questionReview)?result.questionReview:[];
  const reviewIds=new Set(review.map(x=>String(x.questionId||"")));
  for(const id of questionIds) if(!reviewIds.has(id)) throw new Error(`Result review missing question ${id}`);
  const resultText=JSON.stringify(result);
  for(const skillId of expectedSkillIds) if(!resultText.includes(skillId)) throw new Error(`Result lacks expected skill ${skillId}`);

  const resultPageDate=String(result.date||"");
  if(resultPageDate){
    await student.page.goto(`${BASE_URL}/results?attempt=${encodeURIComponent(resultPageDate)}`,{waitUntil:"domcontentloaded",timeout:60000});
    await student.page.getByRole("button",{name:/مراجعة الأسئلة/}).waitFor({timeout:30000});
  }

  console.log(JSON.stringify({
    status:"PASS",
    quizId,
    questionCount:5,
    learnerVisible:true,
    answerExposureBeforeSubmit:0,
    resultFound:true,
    questionReviewMatched:5,
    expectedSkills:expectedSkillIds
  },null,2));
} finally {
  if(quizId){
    try {
      const admin=await login(adminContext,adminCreds);
      await api(admin.page,`/quizzes/${encodeURIComponent(quizId)}`,{method:"DELETE"});
    } catch {}
  }
  await browser.close();
}
