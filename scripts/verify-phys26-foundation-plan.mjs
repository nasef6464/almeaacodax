import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const root='ops/phys26/';
const t=read(root+'PHYS26_TAXONOMY_CANDIDATE.json');
const p=read(root+'PHYS26_FOUNDATION_PLAN.json');
const s=read(root+'PHYS26_SECTION_PLAN.json');
assert.equal(p.importReady,false);
assert.equal(t.mainSkills.length,25);
assert.equal(p.topics.length,115);
assert.equal(s.sections.length,25);
const byId=new Map(p.topics.map(x=>[x.id,x]));
assert.equal(byId.size,115);
let sub=0;
for(const main of t.mainSkills){
 const parent=byId.get('PHYS26-TM'+String(main.order).padStart(2,'0'));
 assert.equal(parent.skillId,main.id);
 assert.deepEqual(parent.skillIds,[main.id]);
 for(const child of main.subSkills){
  const id='PHYS26-TS'+String(main.order).padStart(2,'0')+'-'+String(child.order).padStart(2,'0');
  const topic=byId.get(id);
  assert.equal(topic.parentId,parent.id);
  assert.equal(topic.skillId,child.id);
  assert.deepEqual(topic.skillIds,[child.id]);
  assert.equal(topic.plannedSectionId,parent.plannedSectionId);
  sub++;
 }
}
assert.equal(sub,90);
assert.ok(p.topics.every(x=>!x.showOnPlatform&&x.sectionId===null));
console.log('PHYS26_FOUNDATION_DESIGN_PASS');
