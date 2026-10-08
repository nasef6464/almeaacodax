import assert from "node:assert/strict";

const base = new URL(process.env.ISOLATED_API_BASE || "http://127.0.0.1:4010/api");
assert.equal(base.hostname, "127.0.0.1", "Never run against hosted or production API");
assert.equal(base.protocol, "http:");

async function exercise(route) {
  const endpoint = new URL(base.href.replace(/\/$/, "") + route);
  const concurrent = 32;
  const responses = await Promise.all(Array.from({ length: concurrent }, async (_, index) => {
    const res = await fetch(endpoint, { headers: { "accept": "application/json" }, signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => null);
    return { index, status: res.status, key: data?.key, id: data?._id };
  }));
  assert.ok(responses.every((x) => x.status === 200), route + " concurrent failures: " + JSON.stringify(responses.filter(x => x.status !== 200)));
  assert.ok(responses.every((x) => x.key === "default" && x.id), route + " invalid default document");
  const ids = new Set(responses.map(x => x.id));
  assert.equal(ids.size, 1, route + " generated more than one canonical default document");
  const after = await fetch(endpoint);
  assert.equal(after.status, 200, route + " repeat GET");
  const again = await after.json();
  assert.equal(again._id, responses[0].id, route + " replaced a previous valid document");
  console.log("PASS " + route + ": " + concurrent + " parallel requests, single stable default.");
}

await Promise.all([
  exercise("/content/homepage-settings"),
  exercise("/content/platform-font-settings"),
]);
