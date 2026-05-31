# Live Role Pages Audit

- Generated: 2026-05-31T14:10:07.468Z
- Base URL: https://almeaacodax.vercel.app
- Total: 20
- PASS: 20
- FAIL: 0
- BLOCKED: 0

## Login
- PASS guest
- PASS student
- PASS parent
- PASS teacher
- PASS supervisor

## Pages
- [PASS] guest /: expect=public, controls=20, console=0, network4xx=0, network5xx=0
- [PASS] guest /pricing: expect=public, controls=16, console=0, network4xx=0, network5xx=0
- [PASS] guest /blog: expect=public, controls=18, console=0, network4xx=0, network5xx=0
- [PASS] guest /reports: expect=guarded, controls=29, console=0, network4xx=0, network5xx=0
- [PASS] guest /my-requests: expect=guarded, controls=29, console=0, network4xx=0, network5xx=0
- [PASS] student /dashboard: expect=private, controls=37, console=0, network4xx=0, network5xx=0
- [PASS] student /my-quizzes: expect=private, controls=57, console=0, network4xx=0, network5xx=0
- [PASS] student /reports: expect=private, controls=24, console=0, network4xx=0, network5xx=0
- [PASS] student /plan: expect=private, controls=55, console=0, network4xx=0, network5xx=0
- [PASS] student /profile: expect=private, controls=24, console=0, network4xx=0, network5xx=0
- [PASS] student /pricing: expect=public, controls=16, console=0, network4xx=0, network5xx=0
- [PASS] parent /parent-dashboard: expect=private, controls=10, console=0, network4xx=0, network5xx=0
- [PASS] parent /reports: expect=private, controls=21, console=0, network4xx=0, network5xx=0
- [PASS] parent /profile: expect=private, controls=24, console=0, network4xx=0, network5xx=0
- [PASS] teacher /admin-dashboard: expect=private, controls=25, console=0, network4xx=0, network5xx=0
- [PASS] teacher /reports: expect=private, controls=31, console=0, network4xx=0, network5xx=0
- [PASS] teacher /profile: expect=private, controls=25, console=0, network4xx=0, network5xx=0
- [PASS] supervisor /admin-dashboard: expect=private, controls=34, console=0, network4xx=0, network5xx=0
- [PASS] supervisor /reports: expect=private, controls=62, console=0, network4xx=0, network5xx=0
- [PASS] supervisor /profile: expect=private, controls=25, console=0, network4xx=0, network5xx=0
