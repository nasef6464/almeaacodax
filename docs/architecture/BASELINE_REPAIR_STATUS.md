# Refactor V2 — Baseline Repair Status

Safe branch: `refactor/repository-v2-safe`
Original main baseline: `f1e8a35950e3c952ab3609235ef8c2ed85584267`

## Repairs completed before structural migration

The following problems existed in the baseline before any repository file movement:

- frontend TypeScript regressions in quiz/admin/dashboard code;
- shadowed duplicate notification API facade keys;
- runtime-source smoke test coupled to removed historical Markdown reports;
- quiz publish integrity guard allowed the explicit `isPublished=true` + zero-question case to bypass `validateQuizQuestionIntegrity` because the guard was `willBePublished && hasQuestions`.

The quiz publish guard is now restored to validate **every** publish attempt. An empty quiz therefore reaches the existing integrity validator, which already returns `Cannot publish a quiz without valid questions`.

## Safety rule

No structural move begins until the Refactor V2 Safety Gate is green across frontend/API typecheck and build plus the selected route/runtime/security/integrity contracts.

No change in this baseline-repair stage has been merged into `main`.
