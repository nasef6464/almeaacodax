import assert from 'node:assert/strict';
import {assessmentSectionSummaries} from '../dashboards/admin/supervisorTests/assessmentSectionEvidence.js';
const rows=assessmentSectionSummaries([{sectionResults:[
 {sectionId:'same',subjectId:'math',subjectName:'رياضيات',sectionName:'القسم الأول',score:20},
 {sectionId:'same',subjectId:'science',subjectName:'علوم',sectionName:'القسم الأول',score:80},
]}] as any);
assert.equal(rows.length,2);assert.notEqual(rows[0].key,rows[1].key);
assert.deepEqual(rows.map(row=>row.avgScore),[20,80]);
assert.deepEqual(rows.map(row=>row.sectionId),['same','same'],'Drilldown retains the original section identity');
assert.ok(rows[0].sectionName.includes('رياضيات'));assert.ok(rows[1].sectionName.includes('علوم'));
console.log('PASS detailed section evidence: repeated IDs in different materials never merge, frozen labels and original IDs retained');
