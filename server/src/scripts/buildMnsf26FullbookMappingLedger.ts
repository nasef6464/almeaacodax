import fs from "fs";
import path from "path";
type Any=Record<string,any>;
const docs=path.resolve(process.cwd(),"../docs/content/mnsf26");
const ar=JSON.parse(fs.readFileSync(path.join(docs,"MNSF26_FULLBOOK_CROP_INVENTORY_V1.json"),"utf8"));
const geo=JSON.parse(fs.readFileSync(path.join(docs,"MNSF26_GEOMETRY_CROP_MANIFEST_V1.json"),"utf8"));
const source=JSON.parse(fs.readFileSync(path.join(docs,"MNSF26_SOURCE_SKILL_INDEX_V1.json"),"utf8"));
const cmap=JSON.parse(fs.readFileSync(path.join(docs,"MNSF26_SOURCE_TO_CANONICAL_CANDIDATE_MAP_V1.json"),"utf8"));
const groups=new Map<string,Any>();
for(const g of source.sourceGroups) for(const t of g.tests) groups.set(`${g.sourcePart}|${t}`,g);
const candidates=new Map<string,Any>();
for(const g of cmap.sourceGroups) for(const t of g.tests) candidates.set(`${g.sourcePart}|${t}`,g);
const rows:Any[]=[];
for(const r of ar.records){const g=groups.get(`الحساب/الجبر|${r.testNumber}`);const c=candidates.get(`الحساب/الجبر|${r.testNumber}`);rows.push({sourceId:r.sourceKey,sourcePart:"الحساب/الجبر",testNumber:r.testNumber,questionNumber:r.printedQuestionNumber,pdfPage:r.pdfPage,sourceSkillLabel:r.sourceSkillLabel,sourceLessonLabel:g?.sourceSkillLabel??r.sourceSkillLabel,imageHash:r.cropSha256,cropFile:r.cropFile,cropStatus:"EXACT_CROP_STAGED",canonicalCandidateSubSkillIds:c?.candidates??[],mappingStatus:c?.candidates?.length===1?"PROVISIONAL_SINGLE_CANDIDATE_PENDING_MATH_CONFIRMATION":"PENDING_QUESTION_MATH",provisionalCanonicalSubSkillId:c?.candidates?.length===1?c.candidates[0]:null});}
for(const r of geo.records){const g=groups.get(`الهندسة|${r.testNumber}`);const c=candidates.get(`الهندسة|${r.testNumber}`);rows.push({sourceId:r.sourceId,sourcePart:"الهندسة",testNumber:r.testNumber,questionNumber:r.questionNumber,pdfPage:r.sourcePdfPage,sourceSkillLabel:g?.sourceSkillLabel??null,sourceLessonLabel:g?.sourceSkillLabel??null,lessonNumber:g?.lessonNumber??null,imageHash:r.imageSha256,cropStatus:r.cropStatus,canonicalCandidateSubSkillIds:c?.candidates??[],mappingStatus:c?.candidates?.length===1?"PROVISIONAL_SINGLE_CANDIDATE_PENDING_MATH_CONFIRMATION":"PENDING_QUESTION_MATH",provisionalCanonicalSubSkillId:c?.candidates?.length===1?c.candidates[0]:null});}
const hash=new Map<string,string[]>();for(const r of rows){if(!hash.has(r.imageHash))hash.set(r.imageHash,[]);hash.get(r.imageHash)!.push(r.sourceId)}
const duplicateImageGroups=[...hash.entries()].filter(([,v])=>v.length>1).map(([imageHash,sourceIds])=>({imageHash,sourceIds,count:sourceIds.length}));
const failClosed=[{sourcePart:"الحساب/الجبر",testNumber:33,reason:"SOURCE_ABSENT_UNRESOLVED"},{sourcePart:"الهندسة",testNumber:24,questionNumber:18,reason:"SOURCE_ABSENT"}];
const out={schemaVersion:1,bank:"MNSF26",purpose:"Reproducible full-book 2135-row provenance/mapping ledger. Mapping remains fail-closed until question-math confirmation.",counts:{total:rows.length,arithmetic:rows.filter(x=>x.sourcePart==="الحساب/الجبر").length,geometry:rows.filter(x=>x.sourcePart==="الهندسة").length,provisionalSingleCandidate:rows.filter(x=>x.provisionalCanonicalSubSkillId).length,duplicateImageGroups:duplicateImageGroups.length,duplicateExtraOccurrences:duplicateImageGroups.reduce((n,g)=>n+g.count-1,0)},failClosed,duplicateImageGroups,records:rows};
fs.writeFileSync(path.join(docs,"MNSF26_FULLBOOK_MAPPING_LEDGER_V2.json"),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out.counts,null,2));
