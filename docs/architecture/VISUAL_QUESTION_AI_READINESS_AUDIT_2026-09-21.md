# Visual Question / AI Tutor Readiness Audit — 2026-09-21

## Live Atlas evidence
Read-only aggregation on production database `almeaa.questions`:
- image questions: **2,286**
- image questions with blank/missing written `explanation`: **0**
- observed image-question scope: `p_1777779639431 / sub_1777779748206`

This is a point-in-time production baseline, not a claim that future imports will stay compliant automatically.

## Permanent contract
- New taxonomy is data-driven: new paths, subjects, sections and skills must work without hard-coded IDs in adaptive/report/navigation code.
- A visual question may remain a draft while its explanation is incomplete.
- Before an image question becomes `pending_review` or `approved`, it must have a non-empty trusted written explanation.
- AI Question Assistant remains explicit-click only.
- Tutor context should prefer question text/options + skill + trusted written explanation. Image bytes must not be proxied through the API or sent to an AI provider by default.
- Visual input may be used later only when the student's explicit question genuinely requires inspecting the image and within Phase 9 gateway budgets/policy.

## Guard added
`questionSchema` now rejects publishable/review-ready image questions without a written explanation. Question creation validates the final workflow status after role workflow defaults are applied, so an admin-default-approved image question cannot bypass the rule.

## Resource baseline
Atlas Performance Advisor at the time of this audit returned:
- suggested indexes: 0
- slow query logs: 0

No speculative index was added for the new evidence type.
