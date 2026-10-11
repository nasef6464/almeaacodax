# Classroom transport and notification lifecycle — 2026-10-11

Status: PARTIAL. PR #522 merged and published; live transport delivery passed, but the final UI assertion caught a separate post-end current-question HTTP404. A focused follow-up fixes that redundant read before final closure.

## Reused checkpoint and scope

Started from published main `77b9f8620110c1cf29145fc1d43ffc465068b396` (#521). Carried only its missing publication receipt. Previous review/assessment journeys are not repeated. Published evidence already recorded a classroom WebSocket upgrade returning HTTP400, plus older polling400/notification HTTP2 ping failures; these are distinct observations, not proof that every event failed.

`hooks/useClassroomRealtime.ts` keeps its single shared authenticated Socket.IO connection and authorized rooms. Relative API rewrites use HTTP long polling without WebSocket upgrade attempts; direct API configurations keep normal upgrades. Cookie forwarding, path slash normalization, events, authorization and unsubscribe remain unchanged. This removes the proven failing upgrade path without moving authentication across origins. Long polling waits for transport events; no recurring question/report database reads or new service was added.

`contexts/useNotificationStream.ts` owns each effect's EventSource, reconnect timer and cancellation flag. Old endpoint/disabled/unmounted callbacks cannot schedule a connection or overwrite current state. Offline closes the stream and cancels pending work; online resumes once. Existing credentialed SSE endpoint, event shape, initial unread count and ten retry limit remain. This fixes local lifecycle races; it does not establish the upstream cause of the historical HTTP2 ping failure or guarantee that network transport errors never recur.

No public API, auth/RBAC, scoring, result, persisted data, production service or paid tier change. No ownership relocation or schema migration; architecture/data maps need no ownership update. Email setup remains owner-deferred.

## Verification

- Actual React hook + real Socket.IO server through an HTTP-only proxy: shared connection for two subscribers, question/batch/end delivery, forced connection loss and room rejoin, zero attempted proxy WebSocket upgrades/browser errors, anonymous denial, disconnect cleanup, and direct API WebSocket upgrade.
- Actual React notification hook + controllable EventSource/Chromium clock: credentialed endpoint, connected/count/notification delivery, stale callback/timer rejection across endpoint changes, disable/offline cleanup, online recovery, ten retry exhaustion and unmount cleanup. This is client lifecycle evidence, not a real notification SSE delivery claim.
- Existing cookie-session contract retains protected SSE route, credentials and no URL bearer token.
- Typecheck, build, architecture and module-boundary gates PASS. #522 exact code `cb0c2ca5f57d4222a3e5978f5ecdaafbe09c10be`:19SUCCESS/3conditional skips; all three required checks PASS. Protected squash merge `263e16e58dfb638d033dfc289b76d10a819b78ea`; matched frontend/Render/canonical/direct publication and database/Redis checks PASS. No separate main workflow runs were returned for this commit; do not present the earlier main checks as current.
- Native trial student received discovery, original question, batch-end and session-end without navigation refresh. One authenticated polling handshake; requests showed no failing transport responses or WebSocket upgrade. SSE received connected/unread_count, zero stream errors; final session storage cleared and end message visible. Five trial business writes: teacher create/append/batch-end/session-end plus student join; zero answers/results. One current-question GET404 after session-end made the overall first journey FAIL. Preserve that evidence; no zero-console claim. The first CLI harness failed dynamic import before any business operation; repaired by private embedded configuration, not by exposing credentials.

## Post-end read follow-up

The shared hook invoked both `onSessionEnded` and `onChange` for student consumers. End state updates do not immediately replace the current callback closure, so `onChange` requested the question from an already closed session (HTTP404). An explicit end callback now consumes that event; subscribers without an end callback retain their normal end refresh (teacher/projector). The React proxy fixture tests both consumers together. API behavior and ended-session access guards stay unchanged.

Follow-up exact-head CI, publication and repeated bounded live journey remain pending. Preserve first-failure console/request evidence in `.playwright-cli/console-2026-10-11T02-32-11-739Z.log` and `scratch/realtime-live-{first-transport-failure,end-state}.txt`; matched publication `scratch/realtime-deploy-proof.json`, exact CI `scratch/realtime-ci-final.json`.

Official option reference: [Socket.IO client transports and upgrade](https://socket.io/docs/v4/client-options). Hosting arrangement: [Vercel external rewrites](https://vercel.com/docs/routing/rewrites). The specific HTTP400 upgrade is project runtime evidence; no general assertion about all Vercel WebSocket offerings is made.

Limits: no whole-class tablet/bandwidth certification, broad platform closure, AI live certification or mail-delivery closure from this slice.
