// MNSF26 full-book gate: fail closed until QA, DEDUPE and remote SHA are certified.
// Never use legacy 130-question verification as production authorization.
import fs from 'node:fs';
const root='docs/content/mnsf26/';
const read=(name)=>{try{return JSON.parse(fs.readFileSync(root+name,'utf8'));}catch{return null;}};
const state=read('MNSF26_EXECUTION_STATE_V1.json');
const qa=read('MNSF26_QA_LOCK_CERTIFICATION_V1.json');
const dedupe=read('MNSF26_DEDUPE_LOCK_CERTIFICATION_V1.json');
const r2=read('MNSF26_R2_REMOTE_SHA_CERTIFICATION_V1.json');
const manifest=read('MNSF26_IMPORT_MANIFEST_READY_V1.json');
const checks={
  mastering:state?.questionMasteringLockRun063?.active===2129&&state?.questionMasteringLockRun063?.excluded===6,
  qa:state?.activeStage?.qaFullBookPass===true&&state?.activeStage?.remaining===0&&qa?.status==='PASS_LOCKED'&&qa?.sourceKeys?.length===2129,
  taxonomy:state?.activeStage?.canonicalTaxonomyGate==='PASS_LOCKED'&&qa?.semanticTaxonomyApproved===true,
  dedupe:dedupe?.status==='PASS_LOCKED'&&dedupe?.mnsfScanned===2129&&dedupe?.fnd26Scanned===858&&dedupe?.col2627Scanned===946&&['imageHash','contentFingerprint','ideaFingerprint'].every(k=>dedupe?.methods?.includes(k)),
  r2:r2?.status==='PASS_LOCKED'&&Array.isArray(r2?.verifiedImages),
  manifest:manifest?.bank==='MNSF26'&&manifest?.records?.length===2129
};
const failures=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(JSON.stringify({bank:'MNSF26',ok:failures.length===0,failures},null,2));
if(failures.length)process.exitCode=1;
