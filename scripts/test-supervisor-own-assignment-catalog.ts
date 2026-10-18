import assert from 'node:assert/strict';
import {ownPublishedSchoolAssessments} from '../dashboards/admin/supervisorTests/supervisorAssignmentCatalog.js';
const make=(id:string,patch={})=>({id,createdBy:'supervisor',ownerId:'supervisor',ownerType:'school',mode:'central',isPublished:true,...patch});
const quizzes=[make('mine'),make('other',{createdBy:'another-supervisor'}),make('assigned',{createdBy:'another-supervisor',assignedTeacherId:'supervisor'}),make('platform',{ownerType:'admin',mode:'practice'}),make('draft',{isPublished:false}),make('no-author',{createdBy:undefined}),make('public',{mode:'custom'})];
assert.deepEqual(ownPublishedSchoolAssessments(quizzes,'supervisor').map(q=>q.id),['mine']);
assert.deepEqual(ownPublishedSchoolAssessments(quizzes,'another-supervisor').map(q=>q.id),['other','assigned']);
assert.deepEqual(ownPublishedSchoolAssessments(quizzes,'').map(q=>q.id),[]);
assert.equal(ownPublishedSchoolAssessments(quizzes,'supervisor')[0],quizzes[0],'Use the original canonical quiz; no content duplication');
console.log('PASS supervisor assignment catalog: current creator only,published school definitions only,no ownership/assignment privilege widening,no copies.');
