# ALMEAA — Authentication Session Lifecycle Hardening

Status: Batch 3 implementation contract for PR #154.

## Purpose

ALMEAA keeps short-lived JWT authentication but now has a durable server-side revocation boundary without introducing a per-session database or Redis session store.

## Canonical mechanism

- Every newly issued JWT receives a millisecond-precision `sessionIssuedAt` claim.
- `User.sessionInvalidBefore` is the durable revocation cutoff and is never serialized to clients.
- `requireAuth` verifies the JWT, refreshes the active user from MongoDB, and rejects a token whose issuance time predates the user's cutoff.
- Tokens created before this hardening do not have `sessionIssuedAt`; they fall back to the standard JWT `iat` claim so rollout does not force a platform-wide logout.

## Automatic invalidation events

The User schema advances `sessionInvalidBefore` when an existing account changes a security-sensitive field:

- password hash;
- active/disabled state;
- platform role;
- email identity.

The same rule applies to document saves and query updates (`findOneAndUpdate`, `updateOne`, `updateMany`). This covers password reset and admin-driven disable/reactivation/role/password changes without relying on every route remembering to revoke sessions manually.

## Explicit user actions

- `POST /api/auth/logout-all` advances the cutoff and clears the auth cookie, revoking all previously issued JWTs for the account.
- `POST /api/auth/me/password` verifies the current password, applies the shared password-strength policy, changes the password, revokes prior sessions through the model invariant, and issues a fresh cookie for the current browser.
- Existing `POST /api/auth/logout` remains a local-device logout that clears the cookie only. Global revocation is explicit through `logout-all`; implementing single-token revocation would require a per-session identifier/store and is intentionally not added without a product need.

## Security properties

- Password reset invalidates previously stolen JWTs once the reset is completed.
- Disabled accounts are rejected on every authenticated request, including routes that previously used plain `requireAuth` without a fresh DB principal.
- Reactivating an account does not resurrect pre-disable JWTs because status changes advance the cutoff.
- Role/email changes invalidate stale identity/authorization claims.
- Revocation state is durable in MongoDB and therefore works across API instances without Redis affinity.

## Operational cost

Durable stateless-token revocation requires an active-user lookup before accepting authenticated requests. Role middleware reuses the same refreshed principal through `res.locals.activeAuthRefreshed`, avoiding a second lookup in the same request. If production measurements later justify caching this check, the cache must preserve immediate security-event invalidation semantics.
