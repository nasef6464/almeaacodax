---
name: almeaa-live-classroom-certification
description: Protocol and reusable test execution flow for live classroom human flow and ease certification (teacher console, student auto-discovery, 1-click batching, live radar without answer leakage, projector privacy, mobile remote, and cognitive ergonomics under pressure).
metadata:
  short-description: Live Classroom human flow and ease certification
---

# ALMEAA Live Classroom Certification Protocol

This skill codifies the verified end-to-end certification workflow for ALMEAA Smart Classroom sessions under real classroom pressure, ensuring exceptional usability and verifiable integrity for both teachers and students.

## Evidence Integrity Invariants (Non-Negotiable)

To prevent superficial audits and ensure incontrovertible evidence:

1. **Zero Hardcoded Credentials (Fail-Closed)**:
   - Scripts and tests must NEVER embed emails, passwords, national IDs, or secrets in source code.
   - Credentials must be sourced exclusively from environment variables (`AUDIT_TEACHER_LOGIN`, `AUDIT_TEACHER_PASSWORD`, `AUDIT_STUDENT_01_LOGIN` .. `AUDIT_STUDENT_20_LOGIN`, etc.).
   - If any required credential is missing from the environment: **FAIL CLOSED** immediately. No static fallback or mock user is permitted.

2. **20 Real Independent Browser Contexts**:
   - Simulated single-student runs cannot claim multi-student certification.
   - Tests must spawn 20 distinct Playwright browser contexts (`browser.newContext()`), each with separate cookies, storage, and authenticated sessions.

3. **Programmatic Assertions Beyond Screenshots**:
   - Screenshots serve as corroborating visual evidence, not primary proof.
   - Every claim must be verified by explicit code assertions against DOM and backend state (e.g. `totalResponses === 20`, exact option counts `A === 4, B === 7, C === 6, D === 3`).
   - Stepwise join counts must be asserted on the Teacher Console: 5 joined, 10 joined, 15 joined, and 20 joined.

4. **Fail-Fast on Mandatory Critical Steps**:
   - Critical path steps (session launch, student join, batch push, answer submission, radar update, reveal, batch end, continuous 10-question push, session archiving) must never be soft or optional (`if (visible) ...`).
   - If any critical operation fails: throw an error immediately and halt certification.

5. **Dynamic Evidence-Based Verdict (No Static 'CLOSED')**:
   - The status must NEVER be hardcoded as `VERIFIED_CLOSED`.
   - The test runner must dynamically calculate:
     `status = (passedAssertions === requiredAssertions && requiredAssertions > 0) ? 'PASSED_CERTIFICATION' : 'FAILED'`
   - Final certification is only achieved when `passedAssertions === requiredAssertions` with zero failures.

6. **Negative RBAC & Data Leakage Inspection**:
   - Cross-student access, cross-class session access, out-of-scope teacher access, and unauthorized role access must be explicitly tested and assert denial (HTTP 403/404).
   - Network traffic, console output, storage, and visual DOM must be monitored for exposed credentials, unmasked National IDs, or sensitive tokens.

7. **Clean Browser Persistence Verification**:
   - After session closure, all student and teacher contexts must be destroyed.
   - A fresh browser context must log in as teacher from scratch, navigate to historical reports, and assert that persisted database values exactly match live session data (`LIVE DATA == PERSISTED REPORT`).

## Core Pedagogical & UX Invariants

1. **Teacher Flow & Cognitive Ease**:
   - Zero-friction launch: Teacher starts the session in <= 3 clicks without typing PINs or complex configurations.
   - 1-Click Batch Presets: Direct presets for `سؤال واحد (1)`, `حزمة 5 أسئلة`, and `حزمة 10 أسئلة` directly from the active panel and inside the push modal.
   - Non-Responders Drilldown: Instant visual badge displaying `${expectedCount - totalResponses} لم يجيبوا` with an expandable list of students who have not yet submitted.
   - Teacher Mobile Remote: When managing the class via mobile (390×844) while walking around the room, a sticky bottom toolbar provides immediate access to question state, reveal answer, and push actions.

2. **Student Frictionless Participation**:
   - Auto-discovery & 1-click join: Enrolled students see active sessions with zero manual PIN entry required.
   - Distraction-free mobile UI: Clear typography, touch-optimized option cards (min 44px tap target), and sequential progression without reloading.

3. **Live Radar Privacy & Integrity**:
   - No premature leaks: Before the teacher explicitly triggers "كشف الحل للفصل 💡", option distribution displays neutral counts and percentages without green highlights or distractor warnings.
   - Explicit reveal: When clicked, the correct option highlights in emerald green with exact accuracy percentage and pedagogical distractor insights.

4. **Projector View (Theater Privacy)**:
   - High-contrast theater dark mode (1920×1080) designed for back-of-the-room visibility.
   - Individual student scores or failure states remain strictly private; aggregate submission counts are shown by default (`سلّم: X / Y`).
   - Full student roster is collapsed behind an optional toggle (`عرض قائمة التسليم (اختياري)`).

## Certified Scenario Sequence (A through S)

- **Scenario A (Teacher Starts Class)**:
  - Homepage -> Login -> Classroom Console -> Start Session.
  - Threshold: <= 20s, <= 3 clicks.
- **Scenario B (20 Students Incremental Join)**:
  - 20 independent browser contexts join in batches of 5 (5 -> 10 -> 15 -> 20).
  - Teacher console asserts real participant count at each increment.
- **Scenario C & E (5-Question Batch Push)**:
  - Teacher clicks `تخصيص حزمة مهارة` -> Clicks `حزمة 5 أسئلة` -> Clicks `إرسال فوراً لتابلت الطلاب (5) 🚀`.
  - Student receives Question 1 sequentially on mobile viewport (390×844).
- **Scenario G & H (Live Radar & Solution Reveal)**:
  - 20 students submit answers with known distribution (A=4, B=7, C=6, D=3).
  - Teacher console radar asserts totalResponses === 20 and exact counts per option.
  - Options distribution remains neutral until teacher clicks `كشف الحل للفصل 💡`.
- **Scenario I (Projector Mode)**:
  - Displayed on 1920×1080 theater view. Centralized question, large math rendering, aggregate counter.
- **Scenario J & K (Post-Batch Summary)**:
  - Teacher clicks `إنهاء الدفعة وعرض ملخصها` -> Mini-report displays class average, hardest question, and skill accuracies.
- **Scenario F & P (10-Question Same Session Continuity)**:
  - Teacher selects `حزمة 10 أسئلة` in the same session without student disconnection or new PIN.
- **Scenario O (Teacher Mobile Remote)**:
  - Teacher accesses console from mobile phone (390×844) with sticky bottom controls.
- **Scenario S (Final Human Verdict)**:
  - Assessment of all 8 UX dimensions: Functionality, Ease, Speed, Visual, Clarity, Teacher Cognitive Load, Student Ease, Mobile Ergonomics.

## Reusable Automated Playwright Test Execution

To execute this certification suite against any local or staging deployment:

```bash
node scripts/audit_classroom_human_pressure.mjs
```

The script automatically:
1. Validates all required credentials from environment variables (`.env.audit`, `.env.local`, `.env`).
2. Proxies network requests to the live backend while testing local frontend components.
3. Spawns 20 independent browser contexts for Students, plus Teacher Desktop, Projector, and Teacher Mobile Remote.
4. Executes incremental join assertions, exact answer distribution assertions, negative RBAC tests, data leakage audits, and fresh browser persistence checks.
5. Captures 14 dual-stored evidence screenshots in `audit-evidence/human-ux/` and the conversation artifacts directory.
6. Computes dynamic verdict based on `passedAssertions === requiredAssertions` and outputs structured JSON report to `human_classroom_pressure_report.json`.
