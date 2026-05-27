# Batch 187 Auth & Access Matrix

- Total: 17
- PASS: 17
- FAIL: 0
- BLOCKED: 0

## Details
- guest | guard_/admin-dashboard | PASS | RBAC guard via public fallback redirect to home (/).
- guest | guard_/parent-dashboard | PASS | RBAC guard via public fallback redirect to home (/).
- student | login | PASS | url=https://almeaacodax.vercel.app/dashboard
- student | profile_after_login | PASS | url=https://almeaacodax.vercel.app/profile
- student | logout_guard_check | PASS | url=https://almeaacodax.vercel.app/dashboard
- admin | login | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- admin | profile_after_login | PASS | url=https://almeaacodax.vercel.app/profile
- admin | logout_guard_check | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- teacher | login | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- teacher | profile_after_login | PASS | url=https://almeaacodax.vercel.app/profile
- teacher | logout_guard_check | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- supervisor | login | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- supervisor | profile_after_login | PASS | url=https://almeaacodax.vercel.app/profile
- supervisor | logout_guard_check | PASS | url=https://almeaacodax.vercel.app/admin-dashboard
- parent | login | PASS | url=https://almeaacodax.vercel.app/parent-dashboard
- parent | profile_after_login | PASS | url=https://almeaacodax.vercel.app/profile
- parent | logout_guard_check | PASS | url=https://almeaacodax.vercel.app/parent-dashboard

## RBAC Classification
- guest private-route access is blocked by redirect to public home route (/).