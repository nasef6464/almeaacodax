const res = await fetch("http://localhost:4000/api/taxonomy/bootstrap");
const data = await res.json();
console.log("Paths count:", data?.paths?.length || 0);
for (const p of (data?.paths || []).slice(0, 3)) {
  console.log(`- Path: [${p.id || p._id}] ${p.name}`);
}

console.log("Subjects count:", data?.subjects?.length || 0);
for (const s of (data?.subjects || []).slice(0, 3)) {
  console.log(`- Subject: [${s.id || s._id}] ${s.name} (Path: ${s.pathId})`);
}

console.log("Skills count:", data?.skills?.length || 0);
for (const sk of (data?.skills || []).slice(0, 3)) {
  console.log(`- Skill: [${sk.id || sk._id}] ${sk.name} (Subject: ${sk.subjectId})`);
}
