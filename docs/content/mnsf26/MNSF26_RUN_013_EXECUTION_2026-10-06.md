# MNSF26 Heavy Execution Run 013 — 2026-10-06

## Scope
MNSF26 only. No Batches 001–013 were reprocessed.

## Exact-head reconciliation completed
Before this run:
- MNSF26 head: 9c73d1ff1d32bceee070198a149662f68b15861c
- main: f4131739d34b229d9d2c392bbbca6212adfa3397
- compare: diverged, 86 ahead / 249 behind
- merge base: 01a90bf1b63624f3d5c3fb9677a73e42ae601e95

Created a two-parent reconciliation commit preserving the MNSF26 tree while incorporating current main as the second parent:
- merge commit: b2f85f122b0d5e65480427ca7c1889216e668e7c
- parents: MNSF26 9c73d1ff... + main f4131739...
- branch ref update used expected-head lease and succeeded.

Post-reconciliation compare:
- status: ahead
- ahead: 87
- behind: 0

## MNSF26 integrity after reconciliation
Re-read exact-head files:
- server/package.json still contains all MNSF26 QA commands including dedupe in verify:mnsf26:all.
- verifyMnsf26PreImportGate.ts still enforces authoritative crop evidence.
- MNSF26_CROP_QUEUE_V1.json remains 129 content-ready + 3 source-review, all protected by crop/source gates.

## Production
No production import was attempted. Crop/source evidence remains the blocking dependency.
