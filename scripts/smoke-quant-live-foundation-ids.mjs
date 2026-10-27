import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const snapshot = JSON.parse(readFileSync("ops/quant-skill-redesign/LIVE_25_95_SKILL_TOPIC_ID_SNAPSHOT_20261014.json", "utf8"));
const skills = snapshot.skills ?? [];
const topics = snapshot.topic_skill_links ?? [];
const mains = new Set(skills.map((x) => String(x.id)));
const subs = new Set(skills.flatMap((x) => (x.subSkills ?? []).map((s) => String(s.id))));
const valid = new Set([...mains, ...subs]);
const mainTopics = new Set(topics.filter((x) => !x.parentId).map((x) => String(x.id)));
assert.equal(skills.length, 25);
assert.equal(mains.size, 25);
assert.equal(subs.size, 95);
assert.equal(topics.length, 120);
assert.equal(topics.filter((x) => !x.parentId).length, 25);
assert.equal(topics.filter((x) => Boolean(x.parentId)).length, 95);
assert.equal(new Set(topics.map((x) => String(x.id))).size, topics.length);
for (const topic of topics) {
  if (topic.parentId) assert.ok(mainTopics.has(String(topic.parentId)), "orphan topic: " + topic.id);
  for (const id of [topic.skillId, ...(topic.skillIds || [])].filter(Boolean)) {
    assert.ok(valid.has(String(id)), "missing skill for topic: " + topic.id + " → " + id);
  }
}
assert.deepEqual(snapshot.unknown_topic_skill_refs, []);
assert.deepEqual(snapshot.orphan_subtopic_parents, []);
console.log("PASS: read-only Quant 25/95 ID snapshot has 25/95 foundation topics, no orphan, and no missing skill reference.");
