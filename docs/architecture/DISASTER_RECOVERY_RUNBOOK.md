# ALMEAA Disaster Recovery Runbook

Status: Batch 11 repository recovery contract. Live scheduling/off-site configuration remains deployment evidence, not repository evidence.

## Scope

The application learning snapshot is not a full database backup. Full MongoDB recovery uses verified `mongodump` archives. External object/media storage must have an independent provider backup/versioning policy; URL references in MongoDB do not back up the referenced bytes.

## Backup contract

Use `scripts/verify-db-backup.sh` with a least-privilege backup URI. It creates one gzip archive, SHA-256 checksum and manifest, verifies the checksum immediately, optionally copies all three artifacts to `OFFSITE_DIR`, verifies the off-site copy, then applies local retention.

Required production controls outside Git:
- scheduled execution and alerting on non-zero exit;
- encrypted storage at rest and in transit;
- credentials isolated from application/runtime logs;
- off-site/independent failure domain;
- provider access audit and least privilege;
- retention chosen by the system owner/legal policy rather than invented by code.

`RETENTION_DAYS` defaults to 14 only as an operational local-artifact default and is configurable. It is not a legal retention policy.

## Restore drill

Restore only into an isolated recovery database/cluster first:

`BACKUP_ARCHIVE=/path/mongodb-...archive.gz RESTORE_MONGODB_URI=<isolated-uri> RESTORE_TARGET_CONFIRMATION=isolated-recovery scripts/restore-db-verified.sh`

The script refuses missing checksum evidence and refuses to run until the operator explicitly confirms an isolated recovery target. A Mongo archive preserves source database/namespace names; therefore a different database name embedded in a URI is **not by itself** proof of isolation. Prefer a separate recovery cluster/failure domain. If an intentional same-cluster namespace remap is ever introduced, it must be explicit, reviewed and separately tested rather than inferred.

The script does not use `--drop` by default. `ALLOW_DESTRUCTIVE_RESTORE=true` is an additional operator-only switch and must never target production during a drill.

After restore, run application/server type/build gates and recovery/integration smoke suites against the isolated target. Record archive timestamp, checksum result, restore start/end, restored DB target, application SHA and gate results.

## RPO / RTO

Repository tooling cannot truthfully set production RPO/RTO. Production owners must choose targets based on backup frequency, database/provider capabilities and business tolerance. Batch 11 closure requires measured restore-drill duration and verified backup age from the live schedule before claiming an achieved RPO/RTO.

## Failure rules

A backup is not successful merely because a file exists. Checksum verification is mandatory. A restore is not proven merely because `mongorestore` exits zero: application integrity/smoke gates must pass against the restored target. Never weaken tests to certify a restore.

## Verified live evidence — 2026-09-20

Read-only production inspection established the following current facts without using application secrets in Git:

- MongoDB Atlas project `almeaacodax` has cluster `almeaa`, currently a FREE Atlas cluster on AWS `AP_SOUTHEAST_1`, MongoDB 8.0.32.
- Production database `almeaa` currently contains 58 collections.
- A read-only query found 1,768 `questions` documents whose `imageUrl` points to Cloudflare R2 public delivery URLs matching `https://pub-…r2.dev/questions/pilot/...`.
- Therefore MongoDB recovery preserves media references/metadata, while the referenced image bytes require an independent R2 backup/recovery path.
- The available Atlas connector did not expose a provider-native backup policy for this cluster. Do not assume provider-native snapshots/continuous backup unless separately proven from the Atlas control plane.

These observations are evidence of current topology and references, **not** proof of recoverability. Live backup schedule, independent off-site copies and recovery drills are still required.

## R2 media backup contract

Use:

`npm run backup:media:r2`

with standard AWS-compatible credentials supplied only through the runtime secret store plus:
- `R2_ENDPOINT`;
- `R2_BUCKET`;
- optional `MEDIA_BACKUP_DIR`;
- optional `MEDIA_OFFSITE_DIR`;
- optional `RETENTION_DAYS`.

The script:
- inventories current R2 object keys/sizes/ETags;
- downloads the bucket through the S3-compatible endpoint;
- creates a gzip archive;
- writes and immediately verifies SHA-256 evidence using portable basename references;
- optionally copies archive/checksum/inventory to an independent off-site directory and verifies the copied archive;
- applies configurable local retention.

For a media restore drill use:

`MEDIA_BACKUP_ARCHIVE=/path/r2-...tar.gz R2_ENDPOINT=<endpoint> R2_RESTORE_BUCKET=<non-production-bucket> MEDIA_RESTORE_TARGET_CONFIRMATION=isolated-recovery-bucket npm run restore:media:r2`

The restore is additive/non-destructive and does not use `--delete`. It must target a non-production recovery bucket. A final production recovery plan must also prove how the same stable URL/key mapping is restored or deliberately migrated.

## External media — Cloudflare-backed production contract

The repository stores learning media primarily as external URLs. The current production/content practice uses Cloudflare-backed delivery for uploaded images/media; MongoDB therefore backs up the **references and metadata**, not the media bytes.

Treat database recovery and media recovery as two independent failure domains:

1. MongoDB DR must restore the URL/key references exactly.
2. Cloudflare-backed storage/delivery must independently preserve or recover the referenced objects.
3. A CDN cache hit is not a backup. Purging or losing the origin object must not be considered recoverable merely because an edge cache may still contain a copy.
4. Do not copy large media bytes into MongoDB as a DR shortcut.
5. Do not rewrite existing Cloudflare URLs during restore unless a deliberate migration/cutover plan proves the replacement mapping.

### Live Cloudflare recovery evidence required

Before Batch 11 can claim production DR closure, record provider-side evidence for the Cloudflare product actually in use (for example R2, Cloudflare Images, or another Cloudflare-backed origin):

- exact storage/delivery product and account/bucket/namespace identity without committing secrets;
- custom/public delivery hostname and whether stored DB URLs remain stable after restore;
- object/versioning or independent backup/export capability;
- encryption-at-rest and transport protection;
- least-privilege credentials and access/audit policy;
- lifecycle/retention rules, including protection from accidental deletion;
- a media inventory/sample that maps a MongoDB URL reference to the corresponding Cloudflare object/key;
- one sample recovery drill: remove or isolate a test object, recover it from the provider backup/version/source of truth, and verify the original or intentionally migrated URL resolves again;
- cache behavior after recovery, including purge/revalidation where required.

If the Cloudflare layer has no independent object recovery/versioning/export path, Batch 11 must remain **BLOCKED for full production DR** even when MongoDB restore succeeds.

The exact Cloudflare account/bucket configuration is live-environment evidence and must not be inferred from repository templates. A public delivery URL alone can prove reachability, but not backup/versioning, access control, or recoverability.
