# Classroom request efficiency and runtime recovery — 2026-10-09

Status: PARTIAL. Baseline main `7e3043346bd0`; branch `codex/classroom-server-efficiency`.

## Proven request waste and bounded repair

- Projector answer events each fetched the full aggregate plus challenge state. Teacher answer events were debounced but could overlap when a read took longer than the debounce interval.
- Both surfaces now use `utils/coalescedAsyncRefresh.ts`: a 250ms event window, one answer refresh in flight, and one trailing refresh if more answers arrive during that read. Disposal cancels queued/trailing work; it does not abort an already-running request.
- Question publication, competition changes, batch/session end and reconnect retain their existing immediate refresh behavior. Projector payload/reveal logic and teacher active-question live payload are unchanged. No API, authorization, scoring or persisted-data contract changed.
- Controlled 25-event burst produces one refresh; 25 more events during that pending refresh produce one trailing refresh. This is deterministic test evidence, not a measured production reduction or classroom capacity certificate.

## Local verification

- Refresh budget: five reported scenarios PASS (burst/in-flight/trailing, cleanup, failure retry, disposal during a pending read, both surface wiring).
- Classroom live journey contract: 58/58 PASS; projector reveal/privacy contract PASS.
- Frontend typecheck and production build PASS. Exact-head required CI remains a delivery gate.

## Production observations, 2026-10-09 UTC

- Render web service `srv-dalrk9oae00c73cd74t0` is resumed on the Free plan; live deployment reports commit `7e3043346bd0`. Database is connected.
- Short quiet samples around 07:43–07:50: CPU 0.0047–0.0091 against observed limit 0.15 CPU (about 3–6%); memory about 140–150 MiB against 512 MiB. These samples do not prove peak load capacity. HTTP-request metrics had no usable samples.
- Existing Key Value `almeaacodax-redis` (`red-dapchhbm8hqs739aikhg`) remains `suspended`, Free plan, persistence off. Both enabled rate-limit and notification-queue dependencies fail the canonical `/api/health/scale-ready` check (503, `redis_health_timeout`). Logs show refused/timed-out Redis connections across rate limits, sockets and notification clients, including duplicate-client missing error-handler warnings.
- Two scoped attempts to resume that existing resource via Render's documented API returned HTTP 500 `internal server error`; subsequent resource status remained suspended. No plan upgrade, replacement datastore, limiter bypass, queue deletion or production educational write was performed.
- Production role probe: teacher/student/supervisor login all timed out; production post-deploy role smoke also failed. These are FAIL/BLOCKED, not successful journeys. Restore the existing Redis resource through its Dashboard/support path, then repeat dependency readiness and owned pilot journeys.
- Dashboard: https://dashboard.render.com/r/red-dapchhbm8hqs739aikhg

## Local files and safe ordering

- Original checkout contains 10,831 untracked local files in the read-only inventory: scratch 6,636; public 1,174; scripts 1,088; server 349; two old deep-test artifact roots 173 each; remaining roots 1,238.
- These are local inventory counts, not deployed runtime or server-memory counts. Git deployment and runtime metrics must be evaluated separately.
- Suggested later ordering: consolidate owned test artifacts under dated scratch folders; identify imported public content and its provenance before moving it; separate reusable scripts from one-off import/audit tools. Preserve originals, backups and unrelated working changes. No cleanup or content migration is included here.

## Remaining gates

Required CI on exact code head; restore Redis and prove health; complete real teacher/student/supervisor and classroom/assessment journeys. Twenty independent browser contexts and physical-device voice coverage remain NOT PROVEN.
