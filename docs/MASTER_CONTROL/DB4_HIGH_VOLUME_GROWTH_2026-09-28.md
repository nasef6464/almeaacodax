# DB-4 — High-Volume Data Growth Evidence
Date: 2026-09-28
Plan: #300
PR: #301

## Live baseline
Production Atlas read-only maxima:
- User: completedLessons=5, interactiveVideoProgress=0, max doc ~1.3KB.
- LessonProgress: answeredQuestionIds=0, max doc ~343B.
- ClassroomSession: 5 question snapshots, 2 batches, max doc 237,197B.
- Course: max doc 308,194B; thumbnail string 303,079B.
- AnnouncementAd: max doc 303,448B; image string 303,079B.

## Enforced growth budgets
- legacy completedLessons: 5,000 IDs.
- interactive video progress rows: 100.
- answered question IDs per lesson: 100.
- Smart Classroom questions/batches: 100; whole session approx JSON ceiling 4MB.
- Course document approx JSON ceiling: 1MB.
- Announcement document approx JSON ceiling: 512KB.
- inline admin media string: 450,000 chars.

All limits are above current production usage. They prevent unbounded Mongo document growth without deleting history.

Smart Classroom already limited each create/append request, but repeated appends were unbounded. DB-4 adds a total session ceiling at route and schema levels.

The auth preference API already bounded interactive-video rows/answers; DB-4 shares the same constants with User and LessonProgress mirror so internal scripts cannot bypass that boundary.

ClientEvent and NotificationDelivery need bounded retention, but the approved privacy matrix explicitly requires owner/legal/business input for exact durations. DB-4 does not invent destructive TTL values. Academic/payment/audit evidence receives no TTL.

DB-4 closes only after exact-head CI is green and the read-only growth audit confirms production is inside all budgets.
