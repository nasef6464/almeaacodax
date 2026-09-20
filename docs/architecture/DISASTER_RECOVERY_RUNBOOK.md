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

## External media

The repository stores learning media primarily as external URLs. Production certification must separately verify storage versioning/backup, lifecycle policy, encryption/access controls and a sample media recovery. Do not proxy or duplicate large media into MongoDB as a DR shortcut.
