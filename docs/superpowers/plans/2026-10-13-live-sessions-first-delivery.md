> Final checkpoint2026-10-13: approved manual first delivery VERIFIED. PR536/sourceheadb1938c42 all21 CI/all3required PASS; mergeccf2160c published on Vercel/Render;11 runtime groups PASS. Evidence docs/audits/LIVE_SESSIONS_MANUAL_PUBLISHED_2026-10-13.json. Historical RED checkboxes below are not retrospective claims; exact RED/GREEN evidence is recorded in the audit. Automatic provider scope remains subsequent.

# Flexible live sessions — first delivery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after owner review. Steps use checkbox syntax for tracking.

**Goal:** Deliver truthful private bookings, guarded live-course/session access, and all four manual providers with flexible hosting choices and safe scheduling.

**Architecture:** Extend the existing modular monolith. Activity remains the request; a LiveSession references the existing lesson/course/booking. Shared application policies own audience, timing, links and reservations; React surfaces consume one protected view. Provider adapters/authorization are a subsequent execution plan, not a pretend connected state in this delivery.

**Tech Stack:** Existing TypeScript, React, Express, Zod, Mongoose/Mongo, Redis; no new dependencies or services.

**Spec:** `docs/superpowers/specs/2026-10-13-live-sessions-flexible-hosting-design.md` (owner approved 2026-10-13: «توكل»).

## Global Constraints

- The owner wants teacher account / platform account / manual link available together; four provider keys remain zoom / google_meet / teams / live_youtube.
- The default recommendation is teacher account; automatic creation stays awaiting_connection until actual authorization and verified provider support exist. Manual entry remains usable.
- No video server, media uploads, recording processing, new service, broad rewrite, or continuous per-student polling.
- Asia/Riyadh display; UTC and IANA persistence for new bookings; 15-minute early / 30-minute late default join window, admin range 0–60 each.
- Private audience is exact student + assigned teacher + admin. Course audience reuses existing course entitlement; path display settings never grant access.
- No historical backfill/deletion, scoring/progress change, financial write, paid grant or gateway integration. Keep old endpoints/fields backward compatible.
- Preserve primary workspace changes and all unowned work. Exact-file staging and PR to protected main, exact-head required CI, no manual preview.

## Review Focus

1. Premium student B requests student A's private meeting through bootstrap/direct course/session reads: never reveal URL/recording/instructions.
2. Two simultaneous confirmations/conversions or lost responses: one canonical session, no overlapping teacher/host reservations.
3. Legacy empty or ambiguous date, stage-free/new path: show needs-confirmation without inventing a stage/date or rewriting history.
4. Disabled provider, teacher selecting another teacher's host, failed automatic connection: reject creation/choice without exposing secrets; permit authorized manual fallback.
5. Cancel/reschedule at join-window boundary, user switch and reused client state: deny stale entry, preserve canonical request ID and current server status.

## Shared interfaces

Create `server/src/modules/content/liveSessions/contracts.ts`:
- `Provider = 'zoom' | 'google_meet' | 'teams' | 'live_youtube'`.
- `HostingMode = 'teacher_account' | 'platform_account' | 'manual_link'`.
- `SessionAudience = { kind: 'private'; studentId: string } | { kind: 'course'; courseId: string } | { kind: 'group'; groupIds: string[]; pathId?: string; stageId?: string } | { kind: 'public' }`.
- `SessionActor = { id: string; role: string }`; `SessionState = 'confirmed' | 'cancelled' | 'completed'`.
- `SessionSource = { bookingId?: string; courseId?: string; lessonId?: string }`; validate exactly one source kind; courseId+lessonId form one source.
- `SessionView`: id, source, audience.kind, provider, hostingMode, teacherId, startAt, endAt, timeZone, state, meetingReadiness, canJoin, no host URL/secrets. Return participant URL only from guarded join.
- Domain operations use existing auth actor, Mongo models and entitlement readers; no trusting student-supplied role/owner/status.

### Task 1: Truthful requests and canonical IDs

**Files:** Activity model/routes, `types.ts`, `services/api.ts`, `pages/BookSession.tsx`, `pages/MyRequests.tsx`, `store/slices/learningProgressSlice.ts`; create `server/src/modules/content/liveSessions/bookingRequests.ts`; tests `scripts/test-session-booking-requests.ts`, update existing booking smoke contract.

**Produces:** `serializeBooking(activity): BookingView`; `createBookingRequest(actor, input): Promise<BookingView>`. Add optional structured pathId/stageId/subjectId/skillIds/courseId, teacherId, requestKey, sessionId; status pending/confirmed/rejected/cancelled. Preserve legacy request fields. Index new idempotency keys partially so old documents remain valid.

- [ ] RED: saved response ID appears once; pending/confirmed/rejected/cancelled survive reload; forged student status/owner rejected; repeated requestKey returns same request; stage-free path allows no stage. Use isolated HTTP/Mongo fixtures and compare old result/progress counts before/after.
- [ ] Run `server/node_modules/.bin/tsx scripts/test-session-booking-requests.ts`; verify the new behavioral assertions fail before implementation.
- [ ] Implement request serialization/application extraction; authenticated teacher only reads/actions assigned requests, admin can assign, student reads own. API response must feed local store with persisted ID. Replace success text with «تم إرسال طلبك، بانتظار التأكيد»; never label proposed time confirmed.
- [ ] GREEN: rerun behavioral test plus `node scripts/smoke-student-session-booking-contract.mjs`; update obsolete source assertions to preserve meaningful behavior, not weaken the gate.
- [ ] Commit exact affected files: `fix: persist truthful private session requests`.

### Task 2: Canonical session and private audience enforcement

**Files:** create `server/src/models/LiveSession.ts`, `server/src/modules/content/liveSessions/sessionPolicy.ts`, `sessionRepository.ts`; modify Activity/Lesson, contentPayloadAccess, contentBootstrapRoutes, contentLearningRoutes, learningContentSchemas, activity conversion route and existing course payload readers identified by imports. Test `scripts/test-live-session-access.ts`.

**Consumes:** Task 1 BookingView / SessionSource. **Produces:** `upsertBookingSession(actor, bookingId, input): Promise<SessionView>`; `canAccessSession(actor, session, entitlement): boolean`; `projectSessionPayload(actor, payload): Promise<unknown>`.

- [ ] RED: parallel conversion returns same session/lesson IDs; rejected/cancelled booking cannot convert; student B/guest/unrelated premium gets no private URL or recording from bootstrap, lesson/course reads or join; only exact student/assigned teacher/admin allowed. A course session reuses its original embedded lesson ID.
- [ ] Run `server/node_modules/.bin/tsx scripts/test-live-session-access.ts` and verify failures represent missing audience/idempotency behavior.
- [ ] Add partial unique source-key indexes and additive lesson sessionId/bookingId/privateStudentId. Conversion uses stable booking-derived lesson identity and upsert; no Date.now duplication. Legacy converted lessons without proven ownership are not silently assigned to a guessed student; record a needs-review condition without backfill.
- [ ] Enforce audience before entitlement fallback and sanitize all actual content projections; creator/teacher lesson edits cannot clear/change private audience or make converted bookings public. Return no host URL to any student.
- [ ] GREEN: run access behavioral tests and related existing course/package entitlement tests; confirm historical fields unchanged.
- [ ] Commit: `fix: guard private live sessions with canonical references`.

### Task 3: Atomic scheduling and guarded join

**Files:** create `server/src/models/LiveHost.ts`, `LiveReservation.ts`, `server/src/modules/content/liveSessions/scheduling.ts`, `meetingLinkPolicy.ts`, `http/liveSessionRoutes.ts`; mount in existing route registrar. Tests `scripts/test-live-session-scheduling.ts`, `scripts/test-live-session-http.ts`.

**Consumes:** Task 2 session identity/policy. **Produces:** `reserveSession(actor, sessionId, input): Promise<SessionView>`; `cancelSession(actor, sessionId): Promise<SessionView>`; `rescheduleSession(actor, sessionId, input): Promise<SessionView>`; `validateMeetingLink(provider, url): string`; `getJoinView(actor, sessionId, now): Promise<{participantUrl: string}>`.

- [ ] RED: parallel overlapping teacher/host confirmations have one winner; adjacent [start,end) slots both succeed; host capacity respected; cancel releases capacity; reschedule failure preserves old reservation; invalid legacy date cannot confirm; same request retry is stable.
- [ ] RED HTTP: student cannot assign/change host/another student's reservation; malicious/HTTP/provider-mismatched URL denied; disabled/cancelled/past/no-link session cannot join; join thresholds match 15/30 minutes; teacherAccount and platformAccount reject unowned/unauthorized host IDs.
- [ ] Run both test commands with server's tsx; verify RED.
- [ ] Implement Mongo transactional reservation using per-resource revision writes to serialize competing overlapping reservations; acquire teacher/host resource writes in stable order, retry transient conflicts boundedly. Persist reservations/session updates in one transaction. Standalone test DB must support transactions. Do not substitute read-then-insert or lease-only protection. Teacher and host capacity are separate.
- [ ] Add bounded authenticated GET /live-sessions/me, GET /live-sessions/manage, POST/PATCH scheduling and GET /live-sessions/:id/join. Existing activity endpoints delegate policy. Source references always resolve actual course entitlement/booking ownership. Manual link without host enforces teacher conflict and marks host capacity unverified.
- [ ] GREEN: both behavior/HTTP suites; verify old endpoints remain accepted and no completion/progress is written on join.
- [ ] Commit: `feat: schedule and guard live sessions atomically`.

### Task 4: Hosting settings and unified UI

**Files:** PlatformIntegrationSettings/schema/defaults/runtime, `dashboards/admin/PlatformIntegrationsManager.tsx`, LiveSessionsManager, LiveSessions/Lobby, BookSession/MyRequests, CoursePlayer and both lesson builders, services API/types. Create `components/liveSessions/LiveSessionCard.tsx`, `LiveLessonPanel.tsx`, `HostingChoice.tsx`, `useLiveSessions.ts` and admin booking-panel extraction. Reuse LiveSessionsManager in teacher context; find its actual current mounts with `rg` rather than invent a TeacherDashboard. Tests `scripts/test-live-session-ui.tsx`.

**Produces:** `useLiveSessions(scope: 'me' | 'manage')`; shared session cards and hosting choices consume SessionView. API groups expose list/join/reschedule/cancel; actor identity participates in request key and stale response protection.

- [ ] RED: actual component/render tests show pending truth, server status, one ID, course live renderer, different actor fresh data, RTL mobile cards, all four providers and three hosting modes. Account modes without real connection display «الحساب يحتاج ربطًا»; manual provider options work. YouTube cannot create a private session.
- [ ] RED settings: optional new liveSessionPolicy preserves legacy integration fields; admin-disabled choices are absent and rejected server-side; teacher cannot select another teacher's account. Providers are not labeled connected from saved client IDs.
- [ ] Run `server/node_modules/.bin/tsx scripts/test-live-session-ui.tsx` and verify failures before components change.
- [ ] Add policy defaults and 0–60 join-window bounds, validated link controls and scoped schedule. Split substantial booking panels to avoid adding to oversized manager/player files. CoursePlayer renders live join panel without changing video/quiz completion logic. Don't copy media/recordings locally.
- [ ] GREEN: behavioral UI/settings suites plus root/server typecheck and production build. Read and apply React review checklist after editing multiple TSX components.
- [ ] Commit: `feat: expose flexible hosting and live lessons to learners`.

### Task 5: Focused delivery and published proof

**Files:** audit receipt, Master Control current status, execution state; affected DATA_ACCESS_MAP/MIGRATION_REGISTRY/module maps only for actual ownership/schema evolution.

- [ ] Run all four new behavioral suite groups, existing affected contract gates, `npm run typecheck`, `npm --prefix server run check`, `npm run build`, `git diff --check` once on final code. Fix actual failures, never weaken architecture/RBAC gates.
- [ ] Review diff for every spec acceptance item, hostUrl/secret exposure, transactional race cases, historical compatibility and abandoned reservations. Native execution is recommended to honor owner's low-token preference; use code-review tool for independent final review without spawning agents.
- [ ] Exact-file commit/push; create focused PR, attach to chat, wait required CI on exact head before merge. No manual preview. Follow existing repository merge authorization/checks.
- [ ] After both published services match merged code, run bounded UI/API journeys with isolated owned fixtures: private student A/B/admin/teacher, one course live lesson, manual links for all providers, cancellation/reschedule and fresh login. Save exact created/written counts and preserve prior histories; don't create vendor meetings without authorized accounts.
- [ ] Update checkpoint and report VERIFIED/PARTIAL. Automatic account connection/creation remains NOT PROVEN until next provider plan and authorized live tests, so overall external integration is not CLOSED.

## Subsequent provider delivery

This plan intentionally stops at the usable, protected manual workflow and explicit account readiness. Next plan implements owner-approved automatic hosting with adapters under `server/src/modules/content/liveSessions/providers/`, per-owner encrypted connections reusing `integrationSecretsCrypto.ts`, bound OAuth state/callbacks, single-flight refresh/retry, create/update/cancel and genuine setup-test receipts. Zoom first, then Meet/Teams, then YouTube public broadcast. Consult current primary vendor docs before implementing exact scopes/endpoints. Provider accounts and app registrations may be external blockers; continue independent work without inventing connected status.

## Checkpoint / handoff

Design commit 10f2b6eb; branch codex/live-sessions-flexible-hosting, baseline main7f1165b9. No product changes, vendor creation or production writes. Plan self-review: source ownership, concurrency, access, stale responses and legacy time acceptance mapped to tests. Owner plan review is the next gate; recommended execution is native in this chat to minimize tokens.
