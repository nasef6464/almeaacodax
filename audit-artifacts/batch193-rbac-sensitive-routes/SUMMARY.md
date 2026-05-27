# Batch 193 RBAC Sensitive Routes

- Total: 28
- PASS: 28
- FAIL: 0
- BLOCKED: 0

## Details
- admin | login | PASS | 
- admin | /admin-dashboard?tab=users | PASS | expected=true; url=https://almeaacodax.vercel.app/
- admin | /admin-dashboard?tab=payments | PASS | expected=true; url=https://almeaacodax.vercel.app/
- admin | /admin-dashboard?tab=schools | PASS | expected=true; url=https://almeaacodax.vercel.app/
- admin | /admin-dashboard?tab=paths | PASS | expected=true; url=https://almeaacodax.vercel.app/
- admin | /admin-dashboard?tab=library | PASS | expected=true; url=https://almeaacodax.vercel.app/
- admin | /admin-dashboard?tab=quizzes | PASS | expected=true; url=https://almeaacodax.vercel.app/
- teacher | login | PASS | 
- teacher | /admin-dashboard?tab=users | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=users
- teacher | /admin-dashboard?tab=payments | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=payments
- teacher | /admin-dashboard?tab=schools | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=schools
- teacher | /admin-dashboard?tab=paths | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=paths
- teacher | /admin-dashboard?tab=library | PASS | expected=true; url=https://almeaacodax.vercel.app/admin-dashboard?tab=library
- teacher | /admin-dashboard?tab=quizzes | PASS | expected=true; url=https://almeaacodax.vercel.app/admin-dashboard?tab=quizzes
- supervisor | login | PASS | 
- supervisor | /admin-dashboard?tab=users | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=users
- supervisor | /admin-dashboard?tab=payments | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=payments
- supervisor | /admin-dashboard?tab=schools | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=schools
- supervisor | /admin-dashboard?tab=paths | PASS | expected=false; url=https://almeaacodax.vercel.app/admin-dashboard?tab=paths
- supervisor | /admin-dashboard?tab=library | PASS | expected=true; url=https://almeaacodax.vercel.app/admin-dashboard?tab=library
- supervisor | /admin-dashboard?tab=quizzes | PASS | expected=true; url=https://almeaacodax.vercel.app/admin-dashboard?tab=quizzes
- parent | login | PASS | 
- parent | /admin-dashboard?tab=users | PASS | expected=false; url=https://almeaacodax.vercel.app/
- parent | /admin-dashboard?tab=payments | PASS | expected=false; url=https://almeaacodax.vercel.app/
- parent | /admin-dashboard?tab=schools | PASS | expected=false; url=https://almeaacodax.vercel.app/
- parent | /admin-dashboard?tab=paths | PASS | expected=false; url=https://almeaacodax.vercel.app/
- parent | /admin-dashboard?tab=library | PASS | expected=false; url=https://almeaacodax.vercel.app/
- parent | /admin-dashboard?tab=quizzes | PASS | expected=false; url=https://almeaacodax.vercel.app/