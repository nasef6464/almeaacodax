---
name: almeaa-live-classroom-certification
description: Protocol and reusable test execution flow for live classroom human flow and ease certification (teacher console, student auto-discovery, 1-click batching, live radar without answer leakage, projector privacy, mobile remote, and cognitive ergonomics under pressure).
metadata:
  short-description: Live Classroom human flow and ease certification
---

# ALMEAA Live Classroom Certification Protocol

This skill codifies the verified end-to-end certification workflow for ALMEAA Smart Classroom sessions under real classroom pressure, ensuring exceptional usability for both teachers and students.

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
- **Scenario B (Student Join)**:
  - Student Login -> Live Classroom URL or dashboard widget -> 1-Click Instant Join.
  - Threshold: <= 15s, <= 2 clicks.
- **Scenario C & E (5-Question Batch Push)**:
  - Teacher clicks `تخصيص حزمة مهارة` -> Clicks `حزمة 5 أسئلة` -> Clicks `إرسال فوراً لتابلت الطلاب (5) 🚀`.
  - Student receives Question 1 sequentially on mobile viewport (390×844).
- **Scenario G & H (Live Radar & Solution Reveal)**:
  - Student answers on mobile -> Teacher radar updates submission count live.
  - Options distribution remains neutral. Teacher clicks `كشف الحل للفصل 💡` to reveal the model solution.
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
1. Proxies network requests to the live backend while testing local frontend components.
2. Spawns independent browser contexts for Teacher Desktop (1280×800), Student Mobile (390×844), Projector (1920×1080), and Teacher Mobile Remote (390×844).
3. Captures all 11 dual-stored evidence screenshots in `audit-evidence/human-ux/` and the conversation artifacts directory.
4. Outputs structured timing and click ergonomics to `human_classroom_pressure_report.json`.
