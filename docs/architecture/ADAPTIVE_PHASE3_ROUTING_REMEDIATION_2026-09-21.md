# ALMEAA Adaptive Phase 3 — Unified Foundation Routing and Remediation Actions

Date: 2026-09-21 (Asia/Riyadh)

## Objective

One skill must resolve to one deterministic remediation target across Results, Reports, and future Smart Learning Path surfaces.

The four standard actions are:

1. شرح / فيديو
2. تدريب
3. ملف الدعم
4. قياس

## Canonical navigation

`utils/foundationSkillNavigation.ts` now owns foundation topic identity and URL construction.

Resolution order:

1. explicit `Topic.skillId === skillId`;
2. deterministic historical topic id compatibility (`topic_sub_${skillId}`);
3. historical drill id compatibility (`quiz_drill_${skillId}`);
4. scoped title fallback only when path + subject + section make it unambiguous.

There are no hard-coded abilities path/quant subject fallbacks in this resolver.

## Standard routes

Foundation actions preserve:

`pathId + subjectId + skillId + resolved topic`

and open:
- `content=lessons`
- `content=quizzes`
- `content=support`

Recheck uses a bounded self-quiz route scoped to exactly one skill and includes `evidenceType=recheck` for the next full-stack treatment-loop phase.

## Shared recommendation contract

`pages/Reports/recommendationViewModel.ts` consumes the navigation resolver and now returns:

- `lessonLink`
- `quizLink`
- `supportLink`
- `recheckLink`
- optional direct content metadata

`pages/Results.tsx` no longer owns a second foundation-topic resolver. It calls the same `buildSkillRecommendation` contract as Reports.

## Student surfaces

Reports and Results both expose the same remediation sequence.

A direct support file URL remains a compatibility fallback if the topic support surface is unavailable.

## Important remaining boundary

The recheck URL is now explicit, but the current self-quiz page still stores its result through the client learning-progress store. Phase 4 MUST carry `evidenceType=recheck` through a server-authoritative result/evidence path before recheck evidence is used for long-term mastery decisions.

This phase therefore completes routing truth, not the final server evidence treatment loop.

## Resource impact

- no AI calls;
- no new API request;
- no media bytes;
- no DB migration;
- fewer duplicated topic scans/route builders in presentation code.

## Exit criteria

- Results and Reports use the same recommendation contract;
- explicit Topic.skillId is preferred;
- compatibility fallbacks remain scoped;
- four remediation actions are exposed;
- no hard-coded path/subject fallback;
- routing/result/report contracts green;
- frontend/API typecheck and build green on exact-head validation.
