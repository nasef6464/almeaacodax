import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { SkillModel } from "../models/Skill.js";

const BATCH_ID = "TAH-CHEM-CHEM26-FULL-V1";
const EXPECTED_COUNT = 1708;
const EXPECTED_MAIN = 27;
const EXPECTED_SUB = 99;
const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_1784980728386";
const APPROVER = "CHEM26_FULL_CLOSURE_2026_10_06";

const fail = (m:string):never=>{ throw new Error(m); };
const uniq=(v:unknown[])=>new Set(v.map(x=>String(x||"").trim()).filter(Boolean));

async function verify(expected:"draft"|"approved") {
 const qs=await QuestionModel.find({"sourceMeta.importBatchId":BATCH_ID}).lean() as any[];
 if(qs.length!==EXPECTED_COUNT) fail(`count expected=${EXPECTED_COUNT} got=${qs.length}`);
 if(uniq(qs.map(q=>q.questionCode)).size!==EXPECTED_COUNT||uniq(qs.map(q=>q?.sourceMeta?.sourceItemId)).size!==EXPECTED_COUNT||uniq(qs.map(q=>q?.sourceMeta?.imageHash)).size!==EXPECTED_COUNT) fail("identity uniqueness");
 const badStatus=qs.filter(q=>String(q.approvalStatus||"")!==expected); if(badStatus.length) fail(`status ${expected} mismatches=${badStatus.length}`);
 const main=new Set<string>(), sub=new Set<string>(); let scope=0,opt=0,img=0,ai=0,note=0;
 for(const q of qs){
  const code=String(q.questionCode||"").trim().toUpperCase(), skill=String(q.skillId||"").trim(), ss=String(q.subSkillId||"").trim(), sec=String(q.sectionId||"").trim(), m=skill.match(/^skill_tah_chem_(\d{2})$/);
  if(String(q.pathId||"")!==EXPECTED_PATH_ID||String(q.subject||"")!==EXPECTED_SUBJECT_ID||String(q.subjectId||"")!==EXPECTED_SUBJECT_ID||!m){scope++;continue;}
  if(sec!==`sec_sub_chemistry_${Number(m[1])}`||!ss.startsWith(`sub_tah_chem_${m[1]}_`)){scope++;continue;}
  const ids=Array.isArray(q.skillIds)?q.skillIds.map(String):[]; if(!ids.includes(skill)||!ids.includes(ss)) scope++;
  main.add(skill);sub.add(ss);
  const o=Array.isArray(q.options)?q.options:[]; if(o.length!==4||!Number.isInteger(q.correctOptionIndex)||q.correctOptionIndex<0||q.correctOptionIndex>3) opt++;
  const ot=Array.isArray(q?.aiContext?.optionTexts)?q.aiContext.optionTexts:[]; if(ot.length!==4||ot.some((x:unknown)=>!String(x||"").trim())||!String(q.explanation||"").trim()) ai++;
  const h=String(q?.sourceMeta?.imageHash||"").trim().toLowerCase(), u=String(q.imageUrl||"").trim(); if(!/^[a-f0-9]{64}$/.test(h)||!/^https:\/\//i.test(u)||!u.includes(code)||!u.toLowerCase().includes(h)) img++;
  if(expected==="approved"){const n=String(q.reviewerNotes||"");if(!(/verified\s+visually/i.test(n)||/تم\s+التحقق.*بصري/i.test(n)))note++;}
 }
 if(scope||opt||img||ai||note) fail(`integrity scope=${scope} options=${opt} images=${img} ai=${ai} notes=${note}`);
 const tax=await SkillModel.find({pathId:EXPECTED_PATH_ID,subjectId:EXPECTED_SUBJECT_ID}).select("id subSkills").lean() as any[];
 const tm=tax.map(x=>String(x.id||x._id||"")).filter(Boolean), ts=tax.flatMap(x=>(Array.isArray(x.subSkills)?x.subSkills:[]).map((s:any)=>String(s?.id||"")).filter(Boolean));
 if(tm.length!==EXPECTED_MAIN||ts.length!==EXPECTED_SUB||main.size!==EXPECTED_MAIN||sub.size!==EXPECTED_SUB) fail(`taxonomy prod=${tm.length}/${ts.length} coverage=${main.size}/${sub.size}`);
 const ids=qs.map(q=>String(q.id||q._id||"")).filter(Boolean); const linked=await QuizModel.countDocuments({$or:[{questionIds:{$in:ids}},{"mockExam.sections.questionIds":{$in:ids}}]});
 if(expected==="draft"&&linked!==0) fail(`draft linked quizzes=${linked}`);
 return {count:qs.length,main:main.size,sub:sub.size,linked};
}

export async function runChem26FinalClosureIfRequested(){
 if(process.env.CHEM26_FINAL_CLOSURE!=="APPROVE_1708") return;
 const ownsConnection = mongoose.connection.readyState !== 1;
 if(ownsConnection) await mongoose.connect(env.MONGODB_URI);
 try{
  const already=await QuestionModel.countDocuments({"sourceMeta.importBatchId":BATCH_ID,approvalStatus:"approved"});
  if(already===EXPECTED_COUNT){const p=await verify("approved");console.log("CHEM26_POST_APPROVAL_GATE_PASS",JSON.stringify(p));return;}
  const pre=await verify("draft"); console.log("CHEM26_POST_IMPORT_DRAFT_GATE_PASS",JSON.stringify(pre));
  const now=Date.now();
  const r=await QuestionModel.updateMany({"sourceMeta.importBatchId":BATCH_ID,approvalStatus:"draft"},{$set:{approvalStatus:"approved",approvedBy:APPROVER,approvedAt:now}});
  if(r.matchedCount!==EXPECTED_COUNT||r.modifiedCount!==EXPECTED_COUNT) fail(`approval write matched=${r.matchedCount} modified=${r.modifiedCount}`);
  const post=await verify("approved"); console.log("CHEM26_APPROVAL_WRITE_PASS",JSON.stringify({matched:r.matchedCount,modified:r.modifiedCount})); console.log("CHEM26_POST_APPROVAL_GATE_PASS",JSON.stringify(post));
 } finally { if(ownsConnection) await mongoose.disconnect(); }
}