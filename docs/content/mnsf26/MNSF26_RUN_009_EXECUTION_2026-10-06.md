# MNSF26 Heavy Execution Run 009 — 2026-10-06

## Continuation
Started from aaead02596e9170aae1d1a5dd9655526cca068e9. MNSF26 only. No Batches 001–013 were reprocessed and no production import was attempted.

## QA execution hardening
Revalidated that all four file-based verifiers now resolve repository-root manifests correctly when invoked from server/package.json:
- content manifest
- crop queue
- geometry index
- arithmetic index

Hardened verifyMnsf26CropQueue.ts with two additional fail-closed gates:
1. declared-counts-parity: declared queued/contentReady/sourceReview counts must equal actual queue classifications.
2. pending-crop-must-not-claim-assets: a PENDING_ORIGINAL_PIXELS item may not claim imageHash/imageUrl.

Commit: 65667850982e0d0b21f4a96e085c2b3528e4ee19

## Source recovery / direct page evidence
Arithmetic source page-mode read expanded from pages 15–18 to pages 15–22.
Direct parsed headers confirm:
- page 16: الاختبار التاسع — العمليات على الاعداد
- page 18: الاختبار العاشر — ترتيب العمليات / قابلية القسمة
- page 20: الاختبار الحادي عشر — ترتيب العمليات / قابلية القسمة
- page 22: الاختبار الثاني عشر — الأعداد الأولية / العوامل الأولى / القاسم والمضاعف / باقي القسمة

The question-card pixels are still unavailable in page rendering, so these headers are structure evidence only and are not used to transcribe/import questions.

Geometry source pages 1–8 were also re-read directly.
Direct parsed headers confirm:
- page 1: الاختبار الأول / الدرس الأول / الأشكال
- page 3: الاختبار الثاني / الدرس الأول / الأشكال
- page 4: الاختبار الثالث / الدرس الثاني / الزوايا
- page 6: الاختبار الرابع / الدرس الثاني / الزوايا

Geometry test 4 page-6 boundary evidence was explicitly revalidated in the machine-readable source index.
Commit: 8c6ff5bc056a4f471b3d4a8ebcbac8f51abb7e0e

## Integrity
Images continue to return unavailable for the requested source pages. No OCR/inference from missing mathematical pixels was accepted. No fake crop, answer, or question text was created.

## Safe state
The prior analyzed corpus remains:
- 138 reviewed source questions
- 129 CONTENT_READY_CROP_PENDING
- 3 HOLD_SOURCE
- 1 QUARANTINE_SOURCE_DEFECT
- 5 suppressed duplicates
- MNSF26 production remains intentionally unopened until authoritative crop evidence is available.

## Next
Continue source-byte/pixel recovery. Once available: crop -> hash/url -> source HOLD resolution -> verify:mnsf26:all -> dry-run -> canary -> full import -> production/E2E certification.
