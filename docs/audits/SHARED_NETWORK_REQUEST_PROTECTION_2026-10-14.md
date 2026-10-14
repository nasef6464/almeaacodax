# Shared-network request protection — 2026-10-14

Baseline main40c87b8fb9ff09b84ad8f71587a0a2e00d0fbcfe; focused branch codex/shared-network-request-protection. Owner-authorized continuation of the known shared-school-IP limiter gap. Local verification complete; exact-head CI and publication remain pending at this source checkpoint.

## Problem and bounded repair

App-level global/sensitive limiters ran before route authentication and cookie parsing. Their intended per-user fallback therefore charged all signed classmates to one IP. The isolated test with50signed accounts/two private reads each and deliberately lowered sensitive10/global50limits passed only10of100requests. The repaired app passes all100without raising the original per-account600global/60sensitive default limits.

The request pipeline now applies a cheap network-wide ceiling before cookie/access-token verification, then reads the existing bearer-or-cookie access token with the same signature/expiry verifier and precedence as authentication. Only its bounded string ID partitions budgets in a request-local WeakMap. This layer does not set authUser, look up users, cache principals or authorize any route. Existing fresh role/disabled/password checks continue in their original middleware. Cookie parsing moves before budgeting; body limits, CSRF, CORS, Mongo input filtering and proxy trust stay intact.

Default budgets, all configurable through server environment:

| Layer | Key | Default/window |
| --- | --- | --- |
| Coarse network | source IP/subnet |5000/global window, default60seconds |
| Global | signed account, otherwise source | existing600/global window |
| Sensitive network | source IP/subnet |600/sensitive window, default60seconds |
| Sensitive | signed account, otherwise source | existing60/sensitive window |

Sensitive source+account guards are composed inside the existing exported middleware, so both app-level consumers and classroom PIN/join routes retain both layers. The sensitive-source default retains the old global source ceiling for these operations; the broader5000network allowance does not become5000heavy operations. Anonymous global/sensitive allowances remain600/60. Login bursts, registration/recovery limits, failure budgets and login-account counters remain explicitly source/account-bound even if a caller rotates valid JWTs. Existing availability fail-open and sensitive/auth fail-closed Redis policies remain.

Anonymous actor-fallback keys use source: and signed keys use user:, preventing an adversarial source string from spending an account's allowance. Explicit auth/login source keys retain their old format. Changed anonymous global/sensitive transient keys expire naturally; no Redis key deletion or migration. The new counter stores reuse the existing Redis client; there is no new service, Mongo identity read, model/index change, provider call or paid infrastructure. Redis counters and ordinary authentication activity are operational side effects; no production learning/payment/result records are written by this work.

The exact existing public GET exemption predicate is shared with the budget identity layer. Exempt health/root/bootstrap reads add zero budget-only JWT verification. Existing route-owned optional authentication remains responsible for any actual private projection. Proxy/IP derivation is unchanged; this repair does not certify the deployment's entire forwarding topology.

## Verification and limitations

Four observed RED→GREEN boundaries: shared10/100reads→100/100; missing heavy-source ceiling (request121returned200instead429 with test120limit); raw source/user key collision (ninth anonymous request got429after spending the target account's previous2requests); budget verification on exempt GET/ (1instead0). The latter two are defenses introduced before publication, not claims of an observed production attack.

- Full real Express/JWT/Mongo suite:700requests with asserted expected200/201/401/403/404/429statuses. Fifty signed accounts share one test source,100private reads succeed; actor/global/coarse/heavy source thresholds, IP/JWT rotation, cookies, real signature tampering, expiry, claimed headers, adversarial source strings, IPv6/56, health after source block, authentication aliases, login burst/account limits, disabled accounts and refreshed role decisions PASS.
- Four real quiz submissions by two isolated learners preserve score100and frozen persisted analysis;4results stored. The fixture's missing required Section was corrected with an actual isolated Section and links, without weakening model validation.
- No-Mongo identity suite:6exempt GETs add0verifications,2private calls verify once each, invalid bearer overrides a valid cookie,0authUser mutations/0Mongo connections PASS.
- Server build/type compilation PASS;70static checks PASS (production5, security/RBAC7, login10, API security6, CSRF5, classroom37). Fresh whole-branch reviewer independently confirmed22static checks and approved without an actionable blocker. Tests run against completed compiled artifacts; one premature stale-artifact attempt was excluded and rerun after build completion.

Full HTTP suite intentionally lowers budgets to actor50global/10sensitive, source300coarse/120heavy; login thresholds are test-only configurations. It proves keying/control-flow/grade integrity, not production throughput. Memory-store behavior is executed locally; Redis fail-closed semantics were retained/inspected, not newly runtime-certified. Multi-instance deployment requires the existing distributed store configuration; in-memory counters are process-local. Fixed-window budgets do not certify concurrency capacity or arbitrary large-school admission. No production limit-exhaustion or load test is authorized/performed.

Broader relationships/retention review, production CPU/RAM/bandwidth/billing/capacity, concurrent command HTTP replay and the previously documented legacy Saher smoke remain separate. Bounded post-publication checks will use ordinary read-only requests from existing authorized accounts, not mass fixtures or intentional production throttling.

Initial CI on81927fec passed the focused behavior job, but three architecture checks rejected the two new environment keys because their extension registry entries were missing. Register exactly RATE_LIMIT_SHARED_SOURCE_LIMIT and RATE_LIMIT_SENSITIVE_SOURCE_LIMIT in APPROVED_CONTRACT_EXTENSIONS.json, consistent with this owner-authorized bounded guard configuration. Immutable baseline, gate algorithm/budgets and unrelated contracts remain untouched; no gate skip or wildcard allowance. Local generated audit files are unowned and were not regenerated/overwritten; clean exact-head CI supplies the full architecture proof.

## Bounded publication verified

PR546 head a7bdcd0a98e7c53faf0f695e31e5eaedc53e7a67, merge 8d9dbd1c2d3d9e44a8d299ee22b1bad07ca937e4; 18 successful checks, 4 expected conditional skips, all three required checks PASS. Automatic Render live (dep-db7gsku7bikc73d0nojg) and Vercel READY (dpl_CasQ3sTdkYev3gsxAUSFhzHzRzy4) match this merge. Two distinct existing authorized accounts pass 10 ordinary scripted GETs including live/ready health: each account's global and sensitive counter decreases only for its own interleaved read. Actual global/sensitive limits global:600, sensitive:60. Authentication-helper reads/login are excluded from scripted count. Zero domain-record writes, no production budget exhaustion, no bulk fixture replay or load test. This closes the shared-network account-keying repair within these limits; full Redis-failure, multi-instance, forwarding topology and capacity remain NOT PROVEN.

The two approved environment contract extensions were independently reviewed; final architecture CI passed without baseline, budget or gate changes. Earlier pending statements describe the source checkpoint only.
`nPublication setup: the generic STUDENT alias had no saved session/credentials. Reused the existing authorized INDEPENDENT student session instead; no account was reactivated or created. Two client connection timeouts were resolved by forcing IPv4 in the local proof runner only, matching the separate health probe. The successful proof has10scriptedGETs, excluding helper/session-validation attempts; an additional separate2public health GETs also passed. No product networking setting changed.
