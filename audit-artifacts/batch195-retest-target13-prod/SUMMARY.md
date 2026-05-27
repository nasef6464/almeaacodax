# BATCH 195 - Production Retest for Target 13 (2026-05-28)

- Source baseline: `audit-artifacts/ui-audit-exhaustive/2026-05-26T19-39-23-050Z/ui-audit-checklist.json` (13 FAIL items).
- Retest run artifact: `audit-artifacts/batch195-retest-target13-prod/ui-audit-retest.ndjson`.
- Retest method: production Playwright flow against `https://almeaacodax.vercel.app` using multi-role auth attempts.

## Result

- Total baseline FAIL items retested: 13
- PASS: 9
- FAIL: 3
- MISSING: 1

## Remaining Items

1. Bug: `فتح مركز المكتبة` not found in supervisor dashboard retest
- Location: `/admin-dashboard`
- Role: `supervisor`
- Expected: control visible/clickable for allowed supervisor scope
- Actual: `not-found-or-not-clickable`
- Root cause (current evidence): role-specific UI exposure/selector mismatch on production
- Fix: pending
- Files: N/A (production behavior)
- Retest: FAIL
- Risk: Medium (workflow access)

2. Bug: `فتح مركز الاختبارات` not found in supervisor dashboard retest
- Location: `/admin-dashboard`
- Role: `supervisor`
- Expected: control visible/clickable for allowed supervisor scope
- Actual: `not-found-or-not-clickable`
- Root cause (current evidence): role-specific UI exposure/selector mismatch on production
- Fix: pending
- Files: N/A (production behavior)
- Retest: FAIL
- Risk: Medium (workflow access)

3. Bug: `تصدير الطلاب` not found/clickable in teacher reports retest
- Location: `/reports`
- Role: `teacher`
- Expected: export action clickable when in-scope for teacher
- Actual: `not-found-or-not-clickable`
- Root cause (current evidence): role capability mismatch or control hidden in current state
- Fix: pending
- Files: N/A (production behavior)
- Retest: FAIL
- Risk: Medium (reporting action)

4. Item: `WhatsApp contact` on student `/plan`
- Location: `/plan`
- Role: `student`
- Expected: item included in retest map if present in active checklist
- Actual: MISSING in current retest dataset join
- Root cause (current evidence): dataset mismatch between original run and consolidated retest source
- Fix: pending targeted single-case recheck
- Files: N/A
- Retest: MISSING
- Risk: Low

## Notes

- Large-scale retest file contains additional entries beyond baseline 13, but this batch closure is scoped to baseline mapping only.
- Arabic label encoding in historical artifacts is mojibake in some files; matching is done using exact stored strings.
