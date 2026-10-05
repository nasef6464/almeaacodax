# Entitlement / Free vs Paid / Package Access Fix

## Root cause

The student foundation views derived a child topic's paid state from a locked
parent. As a result, a child explicitly saved by an administrator as `isLocked:
false` could be shown as package-only. The same decision was duplicated in two
frontend entry points, and the foundation tab notice could imply that all
foundation content was locked.

There was also a client/server compatibility mismatch for legacy public
packages without `packageContentTypes`: the client interpreted them as `all`,
while the payment route treats them as `courses`.

## Access precedence

`resolveFoundationTopicAccess(topic, context)` is the single topic resolver:

1. Staff has access.
2. A hidden topic is unavailable to a learner.
3. The explicit subject-wide `lockSkillsForNonSubscribers` commercial switch
   requires a matching foundation package.
4. A visible topic with `isLocked !== true` is free, including a free child of
   a paid parent.
5. A visible locked topic requires a matching scoped foundation package.

The parent relationship is only navigation structure. It does not grant or
remove entitlement from a child. The subject-wide hard-lock is the explicit
commercial-policy exception.

## Scope boundary

- A package must match content type, path, and subject before it unlocks paid
  content.
- Foundation access never unlocks banks, tests, library, or unrelated subjects.
- Multiple purchased packages form a union of their own scopes only.
- A legacy package with no explicit type defaults to `courses`, not `all`.
- Paid payment approval persists the trusted package scope in `AccessGrant` and
  does not promote a scoped package purchase to the global premium plan.

## Changed files

- `utils/foundationTopicAccess.ts`
- `pages/SubjectLearningPage.tsx`
- `components/LearningSection.tsx`
- `components/SkillDetailsModal.tsx`
- `store/slices/accessEnrollmentSlice.ts`
- `server/src/services/accessGrantService.ts`
- `scripts/smoke-entitlement-topic-access-contract.ts`
- `scripts/smoke-foundation-course-details-contract.mjs`
- `docs/FINAL_ACCEPTANCE/ENTITLEMENT_PAYMENT_FIX.md`

## Automated evidence

- `npm run smoke:entitlement-topic-access`
- `node scripts/smoke-foundation-course-details-contract.mjs`
- `node scripts/smoke-payment-package-contract.mjs`
- `node scripts/smoke-quiz-access-contract.mjs`
- `npm run typecheck`
- `npm --prefix server run check`
- `npm run build`

The topic-access contract proves: free child under a paid parent, locked topic
without a package, matching package access, different-subject denial, free
before/after purchase, foundation-only scope, and the scoped union of multiple
packages. The runner reports the acceptance marker
`PACKAGE_UNLOCKS_ONLY_ITS_SCOPE = PASS`.

## Browser verification

Browser verification used the local student account, backend at port 4001,
frontend at port 5175, and the isolated Mongo instance at port 27028. The package
was granted locally through `accessGrantService`; no payment provider was
called.

| Case | Before matching grant | After matching foundation grant |
| --- | --- | --- |
| A — free child under locked parent | OPEN | OPEN |
| B — paid child inside matching foundation package | LOCKED | OPEN |
| C — paid topic outside package path/subject | LOCKED | LOCKED |

Browser checks passed for the mixed-access badge, package CTA, lock behavior,
free child opening, B direct URL, B after reload, B after logout/login, and C
remaining locked before and after logout/login. Acceptance result:
`BROWSER_RETEST=PASS`. Temporary screenshots and UAT fixtures are intentionally
excluded from the delivery branch. No production payment, `SkillProgress`, or
student result was modified by this fix.

## Local UAT isolation record

- Approximate incident time: 2026-10-04 23:29--23:31 Asia/Riyadh.
- An earlier discarded local startup inherited an untrusted, non-local MongoDB
  environment value. Its log reported `Created admin account for
  admin-entitlement-uat@example.test` and `admin account maintenance completed`.
- External database host: **masked; not reconnected or inspected**. No attempt
  was made to delete, query, or otherwise alter that external database after
  the process was stopped.
- The temporary UAT runner replaced inherited values at process level and
  exited before Node could start unless the exact local URI was
  `mongodb://127.0.0.1:27028/almeaa_codex_entitlement_uat`. It printed only the
  host, port, database name, API port, and `NODE_ENV` before startup. The runner
  and local fixture scripts are intentionally excluded from the delivery branch.
