import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';
 import {renderToStaticMarkup} from 'react-dom/server';
 import {SchoolAssessmentReportView} from './dashboards/admin/supervisorTests/SchoolAssessmentReportView';
 const report={coverage:{complete:false,missingEvidence:['started_attempts']},audience:{targeted:1005},participation:{completed:1004,notCompleted:1,started:null},scores:{average:75,passRate:80,highest:100,lowest:0},subjects:[],skills:[{id:'fraction',label:'الكسور',learners:1004,questions:2008,correct:1004,average:50}],sections:[{id:'s1',label:'القسم الأول',learners:1004,questions:2008,correct:1004,average:50}]};
 export const full=renderToStaticMarkup(<SchoolAssessmentReportView report={report}/>);
 export const empty=renderToStaticMarkup(<SchoolAssessmentReportView report={{...report,participation:{completed:0,notCompleted:1005,started:null},scores:{average:null,passRate:null,highest:null,lowest:null},skills:[],sections:[]}}/>);
`},bundle:true,format:'esm',platform:'node',write:false,packages:'external'});
// Keep package resolution rooted in this repository.
const fs=await import('node:fs/promises');
const file=new URL('../scratch/school-assessment-report-ui.bundle.mjs',import.meta.url);
await fs.writeFile(file,bundled.outputFiles[0].text);
const {full,empty}=await import(file.href+'?t='+Date.now());
assert.ok(full.includes('1005'));
assert.ok(full.includes('الكسور'));
assert.ok(full.includes('القسم الأول'));
assert.ok(full.includes('آخر محاولة مدرسية'));
assert.ok(full.includes('غير متاح'));
assert.ok(empty.includes('لا توجد نتائج'));
assert.ok(!empty.includes('NaN'));
console.log('PASS complete assessment report UI: full denominator,skills,sections,missing evidence and empty grades');
