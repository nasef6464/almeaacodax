# Course File Access Control - 2026-06-02

## Scope
- Closed a real delivery gap in course management: course-level files were shown as direct resources without per-course preview/payment access.
- The fix keeps reusable lessons/quizzes/files usable in different places while letting each course decide whether a file is free preview or included with purchase.
- Closed the guest course-card gap reported visually: a paid course card could show learning access before login/purchase if the course payload had a global `isPurchased` flag.

## Change
- Added `CourseFile.access` with `free_preview` / `enrolled_paid`.
- Backend course payload now accepts and defaults course files to `enrolled_paid`.
- Backend course model now persists `CourseFile.access`; the first live probe proved the route accepted the field but the model dropped it, and this was fixed before signoff.
- Admin course builder now shows the file access state and lets the manager choose whether a course file is free preview or included with purchase.
- Student course overview now separates visible files from locked paid files.
- Course player now hides paid course files from preview lessons unless the student owns the course/package or the viewer is staff.
- Course cards and course landing now ignore global `course.isPurchased` for guests; only a real registered viewer purchase/package can turn the main button into learning access.

## Verification
- `node scripts/smoke-course-file-access-contract.mjs` - PASS (14/14)
- `npm run typecheck` - PASS
- `npm run build` - PASS
- `npm --prefix server run check` - PASS
- `npm --prefix server run build` - PASS
- `npm run smoke:arabic-mojibake` - PASS
- `npm run smoke:frontend:strict` - PASS 29/29 on production serving commit `1a904b9a`

## Visual Evidence
- Production course page baseline:
  - `live-course-description-a55f578f.png`
  - The course page renders title, course tabs, price panel, and course files tab.
- Guest course card verification after `1a904b9a`:
  - `live-guest-course-cards-1a904b9a.png`
  - `live-guest-course-cards-1a904b9a.json`
  - Result: paid course card shows old/new price, instructor, student count, preview, and purchase; it does not show learning access for the paid course.
- Guest paid course preview verification:
  - `live-guest-paid-course-preview-1a904b9a.png`
  - `live-guest-course-preview-1a904b9a.json`
  - Result: preview opens the course page without `learn=1`; paid lessons/tests are locked until subscription; purchase remains visible.
- Guest paid course purchase CTA verification:
  - `live-guest-paid-course-buy-1a904b9a.png`
  - `live-guest-course-buy-1a904b9a.json`
  - Result: clicking purchase as guest redirects to `/?auth=login` and does not open learning mode.
- Guest direct learning URL verification after `ff2a72dd`:
  - `live-guest-direct-learn-paid-course-ff2a72dd.png`
  - `live-guest-direct-learn-paid-course-ff2a72dd.json`
  - Result: opening `?learn=1` on a paid course with no free preview lesson returns a normal course preview page with locked lessons and purchase CTA, not an empty player.
- Admin preview-control note:
  - Course builder already exposes lesson access per course item: `معاينة مجانية` for public preview lessons and `مدفوع بعد شراء الدورة` for locked lessons.
  - Course builder also exposes the same per-course preview/purchase split for linked assessments and course files.
- Live data configuration after user reference:
  - Course `course_1779224794108` was configured so the first two course lessons are free preview and the remaining three course items stay purchase-only.
  - Evidence:
    - `live-guest-two-preview-lessons-course-page.png`
    - `live-guest-two-preview-lessons-player.png`
    - `live-guest-two-preview-lessons-proof.json`
  - Result: guest sees 2 items as `مفتوح الآن`, 3 items as `يحتاج اشتراك`, and `?learn=1` opens only the first free preview lesson.

- Guest preview boundary verification:
  - Evidence:
    - `live-guest-preview-boundary-locked-third-90799d7f.png`
    - `live-guest-preview-boundary-locked-third-90799d7f.json`
  - Result: a guest on the second free preview lesson cannot continue into the third purchase-only lesson via the Next button or by clicking the locked sidebar item. The player stays on the second preview lesson.

## Delivery Decision
- This is a real functional fix, not a cosmetic change.
- It supports the requested TutorLMS-like behavior: preview can browse the course and open only preview/free content, while paid lessons/tests/files stay gated until purchase or a real package/subscription.
