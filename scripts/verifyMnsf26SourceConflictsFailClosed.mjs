import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('docs/content/mnsf26');
const groups=[["MNSF26_QUESTION_MASTERING_RUN054_GEO_T01_V1.json",["MNSF26-GEO-T001-Q19"]],["MNSF26_QUESTION_MASTERING_RUN054_GEO_T03_V1.json",["MNSF26-GEO-T003-Q20"]],["MNSF26_QUESTION_MASTERING_RUN054_GEO_T05_V1.json",["MNSF26-GEO-T005-Q11"]],["MNSF26_QUESTION_MASTERING_RUN054_GEO_T07_V1.json",["MNSF26-GEO-T007-Q03","MNSF26-GEO-T007-Q17"]],["MNSF26_QUESTION_MASTERING_RUN054_GEO_T11_V1.json",["MNSF26-GEO-T011-Q10"]],["MNSF26_QUESTION_MASTERING_RUN049_AR_T37_RECONCILED_V1.json",["MNSF26-AR-T037-Q14"]],["MNSF26_QUESTION_MASTERING_RUN049_AR_T39_RECONCILED_V1.json",["MNSF26-AR-T039-Q03"]],["MNSF26_QUESTION_MASTERING_RUN049_AR_T40_RECONCILED_V1.json",["MNSF26-AR-T040-Q13"]]];
const failures=[];let checked=0;
for(const [file,keys] of groups){let doc;try{doc=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}catch{failures.push({file,reason:'UNREADABLE'});continue;}
const rows=doc.records;if(!Array.isArray(rows)){failures.push({file,reason:'MISSING_RECORDS'});continue;}
for(const key of keys){checked++;const matches=rows.filter(r=>r.sourceKey===key);if(matches.length!==1||matches[0].status!=='REVIEW'||matches[0].importEligible!==false)failures.push({sourceKey:key,reason:'NOT_EXCLUDED_IN_ORIGINAL_MASTER'});}
if(doc.masteredCount!==rows.filter(r=>r.status==='MASTERED').length||doc.holdCount!==rows.filter(r=>r.status==='HOLD').length||doc.reviewCount!==rows.filter(r=>r.status==='REVIEW').length)failures.push({file,reason:'COUNTER_MISMATCH'});
}
const ok=checked===9&&failures.length===0;console.log(JSON.stringify({bank:'MNSF26',ok,checked,failures},null,2));if(!ok)process.exitCode=1;
