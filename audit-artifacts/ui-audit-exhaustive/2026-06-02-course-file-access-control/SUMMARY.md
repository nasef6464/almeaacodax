# Course File Access Control - 2026-06-02

## Scope
- Closed a real delivery gap in course management: course-level files were shown as direct resources without per-course preview/payment access.
- The fix keeps reusable lessons/quizzes/files usable in different places while letting each course decide whether a file is free preview or included with purchase.

## Change
- Added `CourseFile.access` with `free_preview` / `enrolled_paid`.
- Backend course payload now accepts and defaults course files to `enrolled_paid`.
- Admin course builder now shows the file access state and lets the manager choose:
  - `ضمن شراء الدورة`
  - `معاينة مجانية`
- Student course overview now separates visible files from locked paid files.
- Course player now hides paid course files from preview lessons unless the student owns the course/package or the viewer is staff.

## Verification
- `node scripts/smoke-course-file-access-contract.mjs` - PASS
- `npm run typecheck` - PASS
- `npm run build` - PASS
- `npm --prefix server run check` - PASS
- `npm --prefix server run build` - PASS
- `npm run smoke:arabic-mojibake` - PASS

## Visual Note
- Local browser opened `http://127.0.0.1:5173/course/course_1779224794108?tab=files&fresh=file-access-local`.
- The local UI shell rendered, but the local frontend had no connected API backend, so course data could not load locally.
- Post-deploy production visual verification is required on `https://almeaacodax.vercel.app/course/course_1779224794108?tab=files`.

## Delivery Decision
- This is a real functional fix, not a cosmetic change.
- It supports the requested TutorLMS-like behavior: preview can open selected course content, while paid files stay gated until purchase.
