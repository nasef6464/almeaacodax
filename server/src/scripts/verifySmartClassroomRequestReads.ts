import assert from "node:assert/strict";
import type { Request } from "express";
import { createClassroomRequestReads } from "../middleware/classroomRequestReads.js";

const actor = { id: "student-a", role: "student" as const, email: "a@example.com", name: "A", schoolId: "school-a", groupIds: ["class-a"] };
const request = () => ({ authUser: { ...actor } }) as Request;
const counts = { student: 0, contexts: 0, enabled: 0 };
let active = true;
let enabled = true;
let fail = false;
const reads = createClassroomRequestReads({
  student: async (id) => { counts.student++; return { ...actor, id, groupIds: ["fresh-class"] }; },
  contexts: async (user) => {
    counts.contexts++;
    if (fail) throw new Error("database unavailable");
    return active ? [{ schoolId: user.schoolId!, role: user.role, source: "membership" as const }] : [];
  },
  enabled: async () => { counts.enabled++; return enabled; },
});

const first = request();
assert.equal(await reads.student(first, true), first.authUser);
assert.equal(counts.student, 0, "fresh active-auth principal avoids a second user query");
const fallback = await reads.student(first, false) as typeof actor;
assert.deepEqual(fallback.groupIds, ["fresh-class"], "a JWT without fresh active auth must read the database");
await reads.student(first, false);
assert.equal(counts.student, 1);
await Promise.all(Array.from({ length: 8 }, () => reads.contexts(first, actor)));
await Promise.all(Array.from({ length: 8 }, () => reads.enabled(first, actor.schoolId)));
assert.equal(counts.contexts, 1, "concurrent reads share one promise within the request");
assert.equal(counts.enabled, 1);
await reads.contexts(first, { ...actor, id: "student-b" });
await reads.contexts(first, { ...actor, role: "teacher" });
await reads.contexts(first, { ...actor, schoolId: "school-b" });
await reads.enabled(first, "school-b");
assert.equal(counts.contexts, 4, "user, role and school must each be isolated");
assert.equal(counts.enabled, 2, "entitlements must be isolated by school");

active = false; enabled = false;
const next = request();
assert.deepEqual(await reads.contexts(next, actor), [], "membership revocation is visible on the next request");
assert.equal(await reads.enabled(next, actor.schoolId), false, "module revocation is visible on the next request");
assert.equal(counts.contexts, 5); assert.equal(counts.enabled, 3);
fail = true;
const failed = request();
await assert.rejects(reads.contexts(failed, actor), /database unavailable/);
await assert.rejects(reads.contexts(failed, actor), /database unavailable/);
assert.equal(counts.contexts, 6, "failed reads remain fail-closed within the request");
fail = false; active = true;
assert.equal((await reads.contexts(request(), actor)).length, 1, "new request retries a failed read");
console.log("Smart Classroom request read isolation, query reuse, JWT fallback and next-request revocation: PASS");
