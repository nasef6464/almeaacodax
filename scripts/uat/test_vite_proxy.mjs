const res = await fetch("http://127.0.0.1:3000/api/health");
console.log("Status:", res.status);
const data = await res.json();
console.log("Data:", data);
