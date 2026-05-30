# Admin Relations API Audit

- Generated: 2026-05-30T20:20:37.409Z
- Base URL: https://almeaacodax.vercel.app
- API Base URL: https://almeaacodax-k2ux.onrender.com/api
- Total: 12
- PASS: 12
- REVIEW: 0
- FAIL: 0

## Counts
- users: 42
- userRoleCounts: {"student":25,"supervisor":8,"teacher":4,"parent":4,"admin":1}
- groups: 24
- schools: 18
- classes: 6
- classesWithSchool: 5
- students: 25
- schoolLinkedStudents: 6
- classLinkedStudents: 6
- courses: 13
- packages: 13
- membershipPackages: 1
- publicPackages: 13
- schoolPackages: 4
- b2bPackages: 4
- accessCodes: 1
- accessCodesFromBootstrap: 1
- redemptions: 0
- paymentRequests: 17
- premiumUsers: 21
- purchasedPackageUsers: 11

## Checks
- [PASS] admin auth for relation audit: status=200, role=admin
- [PASS] users endpoint returns role data: status=200, users=42
- [PASS] groups bootstrap returns schools and classes: schools=18, classes=6
- [PASS] classes are linked to schools: linkedClasses=5/6
- [PASS] students are linked to school/class scopes: students=25, schoolLinked=6, classLinked=6
- [PASS] school reports load for admin: sampled=3, ok=3
- [PASS] memberships/packages are visible to admin: packages=13, memberships=1, publicPackages=13
- [PASS] school packages/access codes have linkage fields: schoolPackages=4, linkedAccessCodes=2
- [PASS] payment requests endpoint is reachable: status=200, rows=17
- [PASS] payment summary endpoint is reachable: status=200
- [PASS] subscription purchases are represented on users: purchasedPackageUsers=11, premiumUsers=21
- [PASS] access code redemptions endpoint is reachable: status=200, rows=0
