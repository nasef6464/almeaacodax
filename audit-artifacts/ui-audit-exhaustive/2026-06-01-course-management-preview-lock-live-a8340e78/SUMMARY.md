# Course Management Preview Lock Evidence

Date: 2026-06-01
Production commit: a8340e78
URL: https://almeaacodax.vercel.app/course/course_1779224794108?learn=1

## Result

PASS - A guest/student without purchase cannot view paid course lesson content by opening the learning URL directly.

## Verified

- Paid lessons imported into the course remain locked for non-enrolled users.
- The player does not fall back to the first paid lesson when no free preview lesson exists.
- The mobile course outline starts closed, so it does not cover the lock message.
- No video or iframe was rendered in the guest direct-learning check.
- Production smoke confirmed Vercel is serving commit `a8340e78`.

## Evidence

- `guest-paid-direct-learn-mobile-final.png`
- `guest-paid-direct-learn-final-result.json`

## Follow-Up Gap

The paid course currently has no free preview lesson. This is valid access control, but for better sales UX the admin should mark one lesson or one quiz as `public` when a real preview is desired.
