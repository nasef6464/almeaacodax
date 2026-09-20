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

`BACKUP_ARCHIVE=/path/mongodb-...archive.gz RESTORE_MONGODB_URI=<isolated-uri> scripts/restore-db-verified.sh`

The script refuses missing checksum evidence and does not use `--drop` by default. `ALLOW_DESTRUCTIVE_RESTORE=true` is an explicit operator-only switch and must never target production during a drill.

After restore, run application/server type/build gates and recovery/integration smoke suites against the isolated target. Record archive timestamp, checksum result, restore start/end, restored DB target, application SHA and gate results.

## RPO / RTO

Repository tooling cannot truthfully set production RPO/RTO. Production owners must choose targets based on backup frequency, database/provider capabilities and business tolerance. Batch 11 closure requires measured restore-drill duration and verified backup age from the live schedule before claiming an achieved RPO/RTO.

## Failure rules

A backup is not successful merely because a file exists. Checksum verification is mandatory. A restore is not proven merely because `mongorestore` exits zero: application integrity/smoke gates must pass against the restored target. Never weaken tests to certify a restore.

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
