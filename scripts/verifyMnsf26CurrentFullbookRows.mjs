// MNSF26 current 2129-row manifest integrity and remote SHA verification.
// No production calls. Fail closed on any missing certificate or conflicting source record.
import fs from 'node:fs';
const dir='docs/content/mnsf26/';
const read=n=>{try{return JSON.parse(fs.readFileSync(dir+n,'utf8'));}catch{return null;}};
const qa=read('MNSF26_QA_LOCK_CERTIFICATION_V1.json');
const manifest=read('MNSF26_IMPORT_MANIFEST_READY_V1.json');
const r2=read('MNSF26_R2_REMOTE_SHA_CERTIFICATION_V1.json');
const overrides=['MNSF26_RUN108_FAILCLOSED_QA_OVERRIDES_V1.json','MNSF26_RUN109_NEW_SOURCE_CONFLICTS_V1.json','MNSF26_RUN110_SOURCE_CONFLICTS_V1.json'].flatMap(n=>{const x=read(n);return x?.overrides||x?.sourceConflicts||x?.conflicts||[];});
const bad=[];const fail=(gate,key)=>{if(bad.length<100)bad.push({gate,key});};
const keys=qa?.sourceKeys||[];const rows=manifest?.records||[];
if(keys.length!==2129||new Set(keys).size!==2129)fail('qa-coverage','2129 distinct keys required');
if(rows.length!==2129||new Set(rows.map(r=>r.sourceKey)).size!==2129)fail('manifest-coverage','2129 distinct keys required');
const qaSet=new Set(keys),blocked=new Set(overrides.filter(x=>x.status==='REVIEW'&&x.importEligible===false).map(x=>x.sourceKey));
const remote=new Map((r2?.verifiedImages||[]).map(x=>[x.sourceKey,x]));
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
let importable=0;
for(const r of rows){
 if(!qaSet.has(r.sourceKey))fail('not-in-qa',r.sourceKey);
 if(!sha(r.imageHash)||r.sourceProvenance?.cropSha256!==r.imageHash)fail('source-sha',r.sourceKey);
 if(r.status==='MASTERED'){
  importable++;
  const m=/^skill_quant_(\d{2})$/.exec(r.canonicalMainSkill||'')?.[1];
  const s=/^sub_quant_(\d{2})_\d+$/.exec(r.canonicalSubskill||'')?.[1];
  if(!m||m!==s||Number(m)>25)fail('canonical-taxonomy',r.sourceKey);
  if(!r.sourceProvenance?.cropFile||!r.sourceProvenance?.sourceBook)fail('provenance',r.sourceKey);
  for(const k of ['correctAnswer','stepByStepSolution','educationalExplanation','difficultyReason'])if(!String(r[k]||'').trim())fail('required-'+k,r.sourceKey);
  if(!['Easy','Medium','Hard'].includes(r.difficulty)||!sha(r.contentFingerprint)||!sha(r.ideaFingerprint))fail('difficulty-or-fingerprints',r.sourceKey);
  if(r.importEligible!==true||blocked.has(r.sourceKey))fail('source-conflict-or-ineligible',r.sourceKey);
  const v=remote.get(r.sourceKey);
  if(!v||v.sha256!==r.imageHash||v.remoteSHAverified!==true||v.cropStatus!=='VERIFIED'||!String(v.imageUrl||'').startsWith('https://'))fail('remote-sha',r.sourceKey);
 }else if(r.status==='HOLD'||r.status==='REVIEW'){
  if(r.importEligible!==false)fail('fail-closed',r.sourceKey);
 }else fail('invalid-status',r.sourceKey);
}
if(!importable)fail('zero-importable','no MASTERED eligible questions');
console.log(JSON.stringify({bank:'MNSF26',ok:bad.length===0,expected:2129,importable,failures:bad},null,2));
if(bad.length)process.exitCode=1;
