/**
 * COL26 Tahsely 2026 controlled importer.
 * Modes: prepare | dry-run | canary | full | verify
 * - prepare: local identity/hash validation only.
 * - dry-run: presign + API validation in <=100-item chunks; no R2/DB writes.
 * - canary: first 5 only; requires explicit write authorization.
 * - full: remaining items after canary, in <=100-item chunks.
 * - verify: read-only batch verification.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const mode = String(process.env.COL26_MODE || "prepare").trim().toLowerCase();
if (!["prepare", "dry-run", "canary", "full", "verify"].includes(mode)) throw new Error("COL26_MODE must be prepare, dry-run, canary, full or verify");
const payloadFile = required("COL26_PAYLOAD_FILE");
const imageDir = required("COL26_IMAGE_DIR");
const outputFile = required("COL26_OUTPUT_FILE");
const raw = JSON.parse(await readFile(payloadFile,"utf8"));
const items = Array.isArray(raw) ? raw : raw.items;
const batchId = String(raw.batchId || process.env.COL26_BATCH_ID || "TAH-MATH-COL26-SEC1-V7").trim().toUpperCase();
const expected = Number.parseInt(process.env.COL26_EXPECTED_COUNT || "1012",10);
if (!Array.isArray(items) || items.length !== expected) throw new Error(`COL26 payload must contain exactly ${expected} items`);
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const verified=[];
for (let i=0;i<items.length;i+=1) {
  const item=items[i]; const code=String(item.questionCode||"").trim().toUpperCase();
  const fileName=path.basename(String(item.imageFileName||"").trim());
  if (!/^TAH-MATH-COL26-P\d{3}-Q\d{2,}$/.test(code)) throw new Error(`Invalid COL26 code at ${i}: ${code}`);
  if (!/\.webp$/i.test(fileName)) throw new Error(`Invalid image filename for ${code}`);
  const bytes=await readFile(path.join(imageDir,fileName)); const hash=sha256(bytes);
  const expectedHash=String(item?.sourceMeta?.imageHash||item.sha256||"").toLowerCase();
  if (hash!==expectedHash) throw new Error(`Image hash mismatch for ${code}`);
  verified.push({item,code,fileName,bytes,hash});
}
const unique=(xs)=>new Set(xs).size===xs.length;
if (!unique(verified.map(x=>x.code))) throw new Error("Duplicate questionCode in COL26 payload");
if (!unique(items.map(x=>String(x?.sourceMeta?.sourceItemId||"").toUpperCase()))) throw new Error("Duplicate sourceItemId in COL26 payload");
const report={status:"PASS",mode,batchId,totalItems:verified.length,selected:0,presigned:0,uploaded:0,dryRunChunks:[],writeChunks:[],verification:null};
if (mode==="prepare") {
  report.selected=verified.length; await writeFile(outputFile,JSON.stringify(report,null,2)+"\n"); console.log(JSON.stringify(report,null,2)); process.exit(0);
}
const apiBase=required("PILOT_API_BASE").replace(/\/$/,"");
const adminToken=(process.env.PILOT_ADMIN_TOKEN||process.env.SMOKE_ADMIN_TOKEN||"").trim();
if (!adminToken) throw new Error("PILOT_ADMIN_TOKEN or SMOKE_ADMIN_TOKEN is required");
if (process.env.PILOT_ALLOW_EXTERNAL_RUN!=="YES") throw new Error("External calls are fail-closed; set PILOT_ALLOW_EXTERNAL_RUN=YES after owner authorization");
if (["canary","full"].includes(mode) && process.env.PILOT_WRITE_AUTHORIZATION!=="YES") throw new Error("Writes are fail-closed; set PILOT_WRITE_AUTHORIZATION=YES after owner authorization");
let csrfToken="",csrfCookie="";
const ensureCsrf=async()=>{if(csrfToken&&csrfCookie)return; const r=await fetch(`${apiBase}/auth/csrf-token`,{signal:AbortSignal.timeout(10000)}); if(r.ok){const d=await r.json();csrfToken=d?.csrfToken||"";const sc=r.headers.get("set-cookie")||"";const m=sc.match(/almeaa_csrf_token=([^;]+)/);csrfCookie=m?`almeaa_csrf_token=${m[1]}`:sc.split(";")[0];}};
const request=async(p,opts={})=>{const method=String(opts.method||"GET").toUpperCase(); if(!["GET","HEAD","OPTIONS"].includes(method))await ensureCsrf(); const headers={accept:"application/json",authorization:`Bearer ${adminToken}`,...(csrfToken?{"x-csrf-token":csrfToken}:{}),...(csrfCookie?{cookie:csrfCookie}:{}),...(opts.body?{"content-type":"application/json"}:{})}; const r=await fetch(`${apiBase}${p}`,{...opts,headers,body:opts.body?JSON.stringify(opts.body):undefined,signal:AbortSignal.timeout(60000)}); const tx=await r.text(); let b;try{b=tx?JSON.parse(tx):null;}catch{b={raw:tx.slice(0,500)}} if(!r.ok)throw new Error(`HTTP ${r.status} ${p}: ${JSON.stringify(b)}`); return b;};
if(mode==="verify") {report.verification=await request(`/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`);await writeFile(outputFile,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({status:"PASS",mode,batchId,verification:report.verification},null,2));process.exit(0);}
const selected=mode==="canary"?verified.slice(0,5):mode==="full"?verified.slice(5):verified;
report.selected=selected.length;
const prepared=[]; const uploads=[];
for (const e of selected) {const intent=await request("/media/question-import-images/presign",{method:"POST",body:{questionCode:e.code,imageHash:e.hash,sizeBytes:e.bytes.length}});report.presigned+=1;uploads.push({e,intent});const {imageFileName:_f,sha256:_s,...payload}=e.item;prepared.push({...payload,questionCode:e.code,imageUrl:intent.publicUrl,sourceMeta:{...(payload.sourceMeta||{}),imageHash:e.hash,importBatchId:batchId}});}
const chunks=(a,n=100)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));
for (const [i,chunk] of chunks(prepared).entries()) {const r=await request("/quizzes/questions/import-batch",{method:"POST",body:{batchId,dryRun:true,items:chunk}});if(r?.status!=="PASS"||Number(r?.prepared||0)!==chunk.length)throw new Error(`Dry-run chunk ${i+1} failed: ${JSON.stringify(r)}`);report.dryRunChunks.push({chunk:i+1,requested:chunk.length,prepared:r.prepared,status:r.status});}
if (["canary","full"].includes(mode)) {
  for (const {e,intent} of uploads) {const r=await fetch(intent.uploadUrl,{method:"PUT",headers:intent.headers,body:e.bytes,signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`R2 upload failed ${e.code}: HTTP ${r.status}`);report.uploaded+=1;}
  for (const [i,chunk] of chunks(prepared).entries()) {const r=await request("/quizzes/questions/import-batch",{method:"POST",body:{batchId,dryRun:false,items:chunk}});if(r?.status!=="IMPORTED"||Number(r?.inserted||0)!==chunk.length)throw new Error(`Write chunk ${i+1} failed: ${JSON.stringify(r)}`);report.writeChunks.push({chunk:i+1,requested:chunk.length,inserted:r.inserted,status:r.status});}
  report.verification=await request(`/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`);
}
await writeFile(outputFile,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:"PASS",mode,batchId,totalItems:report.totalItems,selected:report.selected,presigned:report.presigned,uploaded:report.uploaded,dryRunChunks:report.dryRunChunks.length,writeChunks:report.writeChunks.length,verification:report.verification?{status:report.verification.status,count:report.verification.count,drafts:report.verification.drafts,linkedQuizCount:report.verification.linkedQuizCount}:null},null,2));
