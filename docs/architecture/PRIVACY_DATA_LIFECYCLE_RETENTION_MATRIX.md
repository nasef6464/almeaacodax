# ALMEAA — Privacy & Data Lifecycle Retention Matrix

Status: Batch 10 policy baseline — implementation must follow this matrix and preserve legal/audit evidence.
Baseline: `main @ b726f7ecd50c5472cfcabed630e7e8e8ea495890`.

## Operating principles

1. User deletion is an orchestrated lifecycle operation, not a blanket cascade.
2. Authentication/profile PII should be deleted or anonymized when the account is erased, except where a documented legal/business retention duty requires preservation.
3. Academic history that must remain for integrity should be de-identified rather than silently destroyed.
4. Financial, security, and administrative audit evidence must retain transaction/event integrity while minimizing direct personal identifiers.
5. Canonical relationship records and compatibility mirrors must be handled together; deletion must never re-enable stale legacy authority.
6. No TTL is added to a collection merely because it contains personal data. TTL is only appropriate for data whose expiry semantics are explicit.
7. Every destructive implementation requires focused negative/regression tests and dry-run/reporting where bulk scope is possible.

## Collection-level policy

| Data area | Representative models / records | Default lifecycle action on account erasure | Retention rationale / implementation constraint |
|---|---|---|---|
| Identity/authentication | `User`, sessions/security tokens | Delete credentials/tokens; remove or anonymize profile identifiers | No stale login/session authority may survive |
| School membership/authority | `SchoolMembership`, `TeachingAssignment`, parent/student relationships | Revoke/end authority first; retain only de-identified historical relation where history is required | Canonical rows must tombstone legacy fallback; compatibility fields are not independent authority |
| Legacy relationship mirrors | `User.schoolId`, `groupIds`, `linkedStudentIds`; `Group.studentIds/supervisorIds` | Remove references as part of the same orchestration | Must not leave a fail-open compatibility path |
| Quiz/learning results | `QuizResult`, `QuestionAttempt`, progress/study records | De-identify durable academic evidence where required; delete ephemeral/private drafts where safe | Preserve scoring/report integrity and aggregate analytics without unnecessary PII |
| Assessment lifecycle | version/assignment/attempt/response records | Preserve immutable assessment evidence with subject identity pseudonymized/de-identified when policy requires | Do not break attempt limits, historical reports, or migration authority |
| Smart Classroom | sessions/participants/responses/report snapshots | Preserve session/report integrity; de-identify erased learner identity in durable history | Never mutate historical correct-answer/question snapshots merely for identity erasure |
| Payments/entitlements | `PaymentRequest`, `AccessGrant`, payment event guards | Retain legally/business-required transaction evidence; revoke live access; minimize/anonymize user-facing PII where separable | Never delete evidence needed for reconciliation, refunds, fraud/audit, or entitlement history |
| AI interactions | `AiInteraction` | Delete or anonymize user-linked prompts/context according to explicit retention window; no indefinite default retention without policy | High privacy sensitivity; avoid preserving unnecessary free-text PII |
| Client telemetry | `ClientEvent` | Short bounded retention; delete/anonymize user linkage after operational window | Operational diagnostics should not become permanent user history |
| Admin/security audit | `AdminAuditLog` | Retain security/admin event evidence for the approved audit window; pseudonymize erased subject where compatible with audit integrity | Actor/action/time integrity must remain trustworthy |
| Notifications | `NotificationDelivery` | Bounded retention; remove message/user PII when no longer operationally needed | Delivery idempotency and campaign evidence may require short-lived identifiers |
| Activity | `Activity` and similar event history | Bounded or de-identified retention based on product/reporting need | Avoid indefinite behavioral history by default |
| Certificates | `Certificate` | Preserve issued credential evidence where required; minimize account/profile linkage | Certificate verification must not silently break |
| Public-test submissions | public/barcode submissions | Preserve assessment integrity while minimizing direct identity after required window | Public-test anti-abuse/attempt invariants must remain intact |

## Implementation phases

### B10.1 — Inventory and policy contract
- enumerate every model containing direct user IDs, emails, phone/name/profile data, free-text content, IP/device metadata, or legacy authority references;
- classify each field as DELETE, ANONYMIZE/PSEUDONYMIZE, RETAIN, or REVOKE;
- identify existing indexes/uniqueness constraints that affect anonymization;
- add tests proving revoked canonical authority cannot fail open through legacy mirrors.

### B10.2 — Lifecycle application service
Introduce one application-owned lifecycle orchestrator. HTTP/admin transport must call this service rather than issuing scattered model deletions. The service must:
- validate target and actor authorization;
- revoke live authority/access first;
- apply model-specific handlers;
- be idempotent;
- return a structured per-domain result;
- audit the lifecycle command without copying unnecessary PII into the audit record.

### B10.3 — Compatibility migration safety
- clear/revoke legacy relationship mirrors together with canonical authority;
- never delete `QuizResult` or payment/audit evidence merely to make deletion code simple;
- keep compatibility adapters until all readers/writers are proven migrated.

### B10.4 — Retention automation
Only after approved durations are explicit:
- add TTL indexes for truly ephemeral operational data where safe;
- use scheduled/batched cleanup for records needing anonymization rather than TTL deletion;
- record cleanup metrics/errors without logging sensitive payloads.

## Decisions that require owner/legal/business input before destructive enforcement

Exact retention durations for financial records, admin/security audit, academic records/certificates, AI free-text interactions, client telemetry, notification delivery, and activity history are policy decisions. Until those durations are approved, Batch 10 implementation must prefer safe revocation + minimization/anonymization boundaries and must not invent destructive expiry periods.

## Exit evidence

Batch 10 is not DONE until:
- complete user-linked model/field inventory is checked against the current repository;
- lifecycle orchestrator replaces ad-hoc account deletion paths;
- canonical + legacy authority revocation is tested;
- financial/audit/academic evidence is not blanket-cascaded;
- AI/client-event/notification handling has explicit bounded-policy hooks;
- focused tests, server/frontend typecheck/build as affected, and exact-head required CI are green;
- `CODEX_EXECUTION_STATE.md`, system/module maps, and deep audit are updated with exact SHA/PR/CI evidence.
