# ALMEAA — Main Integration Checkpoint

- Date: 2026-09-05
- Project-owner integration policy: preserve completed delivery history with normal merges; do not squash the product delivery line.
- First completed integration: PR `#27` merged `codex/assessment-data-evolution` into `main` at merge commit `e93d649dbc007e5102fbb719f9ab5598dbb14633`.
- Product Gate 5 delivery branch: `codex/productconfig-gate5`.
- Product Gate 5 integration PR: `#28`.
- Gate 5 final verified runtime head before closure docs: `3e57e5ef418bbe1d9d65d6b707bb583472ac1a51`.

> This checkpoint version is part of PR `#28`. If this exact version is being read from `main`, then the Gate 5 integration has already landed in `main`; do not restart or reimplement Gate 5 from an older execution-state note.

## Closed product gates

The following product gates are CLOSED / VERIFIED and must not be reopened merely because branches or integration points changed:

- Product Gate 1 — Assessment Commercial Module: CLOSED / VERIFIED Strong MVP.
- Product Gate 2 — Subject Learning Space: CLOSED / VERIFIED.
- Product Gate 3 — Sellable School MVP: CLOSED / VERIFIED Strong MVP.
- Product Gate 4 — Results & Reports / Results Intelligence: CLOSED / VERIFIED Strong MVP.
- Product Gate 5 — ProductConfig / White-label Foundation: CLOSED / VERIFIED Strong MVP.

Reopen a closed gate only for a proved runtime defect, failing acceptance evidence, security/data-integrity risk, packaging/deployment defect, or an explicitly approved product change.

## Gate 5 integration carries

Gate 5 adds the reusable white-label single-deployment foundation without changing the product into SaaS multi-tenancy:

- public secret-safe `GET /api/product-config` read boundary;
- composition from existing HomepageSettings, PlatformFontSettings and PlatformIntegrationSettings ownership;
- explicit Admin ownership paths for sellable branding/auth/registration/SEO/contact/provider settings;
- two independent customer variants from configuration only;
- versioned `CustomerInstanceManifest`;
- guarded dry-run/apply customer bootstrap;
- deterministic non-secret deployment package with config digest, verification and rollback instructions;
- customer packaging proof without database writes or secret leakage;
- no global `tenantId`;
- no customer-specific core forks;
- no microservices or central SaaS tenant layer.

Exact runtime head `3e57e5ef418bbe1d9d65d6b707bb583472ac1a51` passed the applicable Gate 5 closure workflows: Phase + Handover, Recovery, Production Readiness, Safety and Dependency Audit.

A real buyer production cutover / live rollback drill remains an operational customer-delivery acceptance exercise. It is not a reason to treat the ProductConfig foundation as open unless it reveals a real defect.

## Known non-blocking staging note

Google OAuth on Staging remains a separate staging-only follow-up because the backend callback is still bound to the production `CLIENT_URL`. Production Google OAuth behavior is not changed by this checkpoint. Do not solve this by allowing arbitrary callback origins or disabling deployment protection.

## Continuation rule after Gate 5 integration

1. Start new product implementation from the latest `main`; do not continue on `codex/assessment-data-evolution` or `codex/productconfig-gate5` after their integration.
2. Create a fresh focused branch for the next bounded product goal.
3. Next formal product gate: **Product Gate 6 — Questions / Curriculum / Courses / Operations closure**.
4. UI polish remains a separate visual-only line. Preserve URLs, APIs, RBAC, scoring, targeting and business behavior when doing UI work.
5. Preserve the product model: reusable white-label single-deployment modular source platform; one deployment per buyer/customer, multiple schools allowed, no global `tenantId`, no SaaS multi-tenancy rewrite, no microservices, and no buyer-specific hardcoded branches.

## Agent handoff rule

At the start of any future Codex/agent goal, read this checkpoint and the relevant gate state before interpreting older execution-state notes. Current Git HEAD plus this checkpoint outrank stale documents that still name pre-integration branches or mark Gates 1–5 as active.
