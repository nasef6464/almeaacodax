# School assessment evidence and 24-client classroom load — 2026-10-09

Baseline: published main `74fc8652206bb47e9d3fc104b86393ae80481bf9`; branch `codex/school-assessment-management-quality`. Owner explicitly requested school assessment analytics, preserving earlier outcomes, full-class concurrency and bandwidth measurements. Prior #493/#494 production journeys are reused, not repeated.

## Verified production load on baseline

- Separate owner-authorized trial class and 24 unique real student accounts; existing rosters and old results retained. Teacher joined all 24 through ordinary authenticated APIs, published three five-question batches, received 24/24 submissions for each, ended the class and read the persisted report: 24 students, 360 answers. Fresh teacher login returned an identical report.
- Persisted session `6ac91a6c19f10402090a4d21`; its report survived a fresh teacher login.
- Measurement window 16:45:08–16:49:47 UTC. 544 measured runtime HTTP requests; compressed response bodies **89,671 bytes**, request bodies **35,140 bytes**. These are application bodies only, excluding authentication/setup, the additional fresh-login report read, headers/TLS, Socket.IO fan-out, static site/assets and media. This is not complete browser traffic or billable origin egress.
- HTTP median 3,103 ms, p95 11,339 ms, maximum 33,724 ms. All asserted runtime requests succeeded. Successful persistence does **not** certify comfortable classroom latency.
- Render 30-second service samples in the actual run window: peak CPU 0.0870955 cores against reported 0.15-core limit; peak memory 188,493,820 bytes against 536,870,900-byte limit. Ten samples per metric; shared service traffic means these are observed service values, not exclusive attribution. Bandwidth and HTTP request metrics returned no points for this short window; absence is not zero consumption.
- A 24-context production browser attempt timed out before full joining, including blank student navigation. Separate browser processes and normal cookie seeding were attempted without certification. Cause remains unproven. This API test does not replace the mandatory 20-browser/physical-tablet human-flow gate. Existing one-student actual UI journey remains verified.
- Raw private evidence stays untracked: `scratch/classroom-full-api-bandwidth.json`, `scratch/classroom-full-api-render-after.json`; scripts include no published credentials. Trial accounts are retained; no cleanup or production data deletion performed.

## Proven school reporting gaps and bounded correction

- Before correction, live supervisor and teacher overview listed 12 students with zero assessment attempts under weakest students. Exclude students without saved results or answered questions from that ranking. Add a separate bounded first-12 diagnostic list. Skipped/unopened questions are not evidence of weakness; an answered incorrect option zero is evidence. Existing skill thresholds and scoring remain unchanged.
- Assessment report grouped skills by display name and averaged percentages equally. New pure `assessmentSkillEvidence.ts` uses path, subject, hierarchy, parent and skill identity; available question/correct counts weight mastery. Historical gaps without counts retain their previous equal-weight fallback. Main/sub skills stay distinct. Subject names and hierarchy are displayed when present in loaded taxonomy.
- New small `AssessmentClassComparison.tsx` compares already loaded scoped targets and latest assessment outcomes. Displays participation alongside average; an unassessed class has no fabricated zero score. This requires no additional request or polling. Existing lazy report reads and local scoped result hook remain unchanged.

## Remaining authorized school scope — not closed

- Individually targeted supervisor assessment `quiz_1791553976796_mmk8i` has a persisted result and skill taxonomy, but no school/class learning-context fields. The current resolver intentionally only assigns school context to verified school/class group targets. Its school aggregate read therefore returns zero rows, including correctly specified class drilldown. Per-assessment report works; universal school aggregation for individual school tests remains incomplete. Do not rewrite saved results or silently promote personal quizzes.
- Opens-at scheduling, precise closes-at UX, selective additional attempts, and teacher management/report actions still need a focused policy/permission/history slice. Existing due date and global maxAttempts are not proof of these capabilities. No API contract, scoring, authorization or persisted outcome was changed here.
- Full subject/mock classification, longitudinal progress and weak-skill/class interventions require live multi-subject evidence. Existing sections and subject filters are reused, but do not claim complete quantitative/verbal/Tahsili certification from a biology fixture.

## Validation / delivery

Behavioral tests extend the existing CI-wired report UI gate: taxonomy collision, question weighting, legacy fallback, skipped/wrong/result evidence, actual weakest-student builder with 13 unassessed students, actual report class comparison with an unassessed class, existing latest-attempt/audience/reminder/hook isolation checks. Typecheck/server build, exact-head CI and fresh production replay must pass before this correction is closed.

Status: **PARTIAL** for school management and classroom performance. Load persistence is VERIFIED for 24 authenticated API clients; 24-browser/device experience and complete bandwidth are NOT_PROVEN.
