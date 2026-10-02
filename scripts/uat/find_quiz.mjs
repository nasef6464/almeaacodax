const res = await fetch("http://localhost:4000/api/quizzes?limit=5");
const data = await res.json();
console.log("Total quizzes:", data?.total || data?.data?.length || 0);
if (data?.data) {
  for (const q of data.data.slice(0, 5)) {
    console.log(`- [${q.id || q._id}] ${q.title} (Questions: ${q.questions?.length || 0}, Skills: ${q.skillIds?.length || 0})`);
  }
}
