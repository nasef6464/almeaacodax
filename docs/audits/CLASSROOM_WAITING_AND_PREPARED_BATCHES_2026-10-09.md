# Waiting class and prepared assessment batches — 2026-10-09

Status PARTIAL: core production API cycle PASS; final frontend/CI/deployment matching replay pending.
Baseline main076f442d06fd (#486 merged/live), previous exact codea2f514c7:18SUCCESS3SKIPPED/allrequiredPASS. Redis/runtime/main post-deploy and paced role authentication PASS.

## Owner journey
Teacher teaches on the physical classroom board. Start a live session without questions, students join and wait; send a prepared five-question skill batch, collect/finalize and end the batch, return to waiting while teaching continues, then send further batches inside the same session. End class and retain student, skill and batch evidence. The owner expressly authorized using an existing class for testing; existing records are preserved.

## Reuse and changes
Existing live empty sessions, templates, approved IDs, append/publication, final submission, batch end, events and immutable reports are retained. No API/auth/scoring/schema changes.
- Start defaults to empty waiting even if initial questions are selected. Explicit secondary start/send keeps the previous immediate-publication path. Save selected IDs as an existing template before starting to retain that preparation across devices.
- ClassroomSavedBatchesPanel lazily reads existing personal school templates once on expansion, caches by school, drops stale reads, sends the whole chosen normal assessment batch, blocks overlap/reuse/over20 questions and locks other push controls until reload completes. It creates no content copies or new queue.
- ClassroomStudentWaitingPanel owns quiet connected-session waiting instructions. Optional static guidance replaces the rotating tip timer. Student current/load/join/submission/realtime logic is unchanged; post-submit copy tells students to follow the physical teacher and await the next batch.
- Relevant modules remain bounded: teacher console373, active panel388, student page257 lines at this checkpoint. New presentation/dispatch modules are separate.

## Evidence
- Controlled real teacher component: selected prepared IDs do not auto-publish on default start; explicit send choice retained; loading/retry and scoped resume/create guards PASS. Saved-batch component: zero initial reads, cached template list, exact IDs/publication body, pending/reload lock, active batch gate, duplicate/oversized prevention and next-batch readiness PASS. Tests run in required isolated full-stack workflow. Classroom58/58, hardening35/35 and student-report contracts PASS.
- Production baseline API cycle uses one teacher/one student in the authorized existing class: new empty session, automatic join,3 prepared batches of5 questions sharing a skill, final submit, current submission1/1, student aggregate denial403, each batch end returns zero published questions, final session end.
- Saved report session6ac8d3e4700f08c147a826b7:24 student rows,1 joined,15 answered,3 batches,5 correct, complete cumulative history, skill answered15. Fresh teacher login returns identical immutable snapshot; student saved-report access403. Three test templates and one ended test session are labelled as an assessment test on2026-10-09. No prior records deleted or rewritten.
- Harness initially used login user.id; production login identifies by _id. Corrected only read-only assertions and reopened existing report; no duplicate classroom writes.
- Initial CSRF request timed out before any educational write; after runtime readiness200 the controlled cycle passed. No auth/timeout gate weakened.
- This is one-student live API evidence, not20 independent browser contexts or physical-tablet certification. Next: exact-head CI/PR delivery and matching teacher/student browser replay.

## Matching deployment / transport recovery
- #487 merged as2a8db59b64c20ba4f9f6ca6f4d86ae4afecec5b8 after18SUCCESS3SKIPPED/all required PASS on d9356428609203f4cdee01b91bdeec6e70035050. Final local build/typecheck PASS. Matching frontend asset and Render live commit confirmed; canonical/direct readiness200 and PostDeploySmoke37928397503/RoleGate37928397563 PASS.
- Matching browser cycle created one idle session6ac8dab326397ed2055e74f2 and joined one student;390px waiting had no horizontal overflow and saved-template reopening caused no extra read. First five-question dispatch succeeded, but automatic student publication timed out. The owned test session was ended; no old records deleted. No successful live browser cycle claimed.
- Root evidence: canonical /socket.io/?EIO=4&transport=polling returns404/non-handshake; direct Render returns200/Engine.IO handshake. vercel.json routed /api and SPA but omitted the existing Socket.IO path. Existing shared classroom socket already uses credentials and server verifies JWT/current role before scoped room joins; no auth change needed.
- Focused fix forwards /socket.io/:path* to the same API server before SPA fallback, with no-store. No new interval, REST polling, service, library or room authority. External HTTP proxying is documented by https://vercel.com/docs/routing/rewrites and Socket.IO transports by https://socket.io/docs/v4/how-it-works . WebSocket upgrade remains optional with existing fallback.
- Real hook/proxy browser regression PASS: credential forwarding, two subscribers share one connection, publish/batch/end events arrive, anonymous denied, final subscriber cleanup disconnects. Added to the existing required isolated full-stack gate. Next exact-head CI, matching deployment and repeat authorized3×5 browser cycle.
