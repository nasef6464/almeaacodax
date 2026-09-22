# Backup And Restore Production

> Production DR must use the verified backup/restore contracts below. The older
> `backup-db.sh` / `restore-db.sh` helpers are not the production-certification path.

## MongoDB verified backup

Required runtime controls:

- `MONGODB_URI` from a least-privilege secret store;
- `BACKUP_DIR` on durable storage;
- `OFFSITE_DIR` on an independent failure domain for production certification;
- configurable `RETENTION_DAYS`.

Run:

```bash
MONGODB_URI="<runtime secret>" \
BACKUP_DIR="/durable/backups/mongodb" \
OFFSITE_DIR="/independent/offsite/mongodb" \
RETENTION_DAYS=14 \
npm run backup:database:verified
```

The verified backup path uses `mongodump --archive --gzip`, writes SHA-256
evidence and verifies both the local archive and the optional independent copy.

A file existing is not sufficient backup evidence; the checksum must pass.

## MongoDB isolated restore drill

Never use the production database as a restore-drill target.

```bash
BACKUP_ARCHIVE="/durable/backups/mongodb/mongodb-YYYYMMDDTHHMMSSZ.archive.gz" \
RESTORE_MONGODB_URI="<isolated recovery cluster secret>" \
RESTORE_TARGET_CONFIRMATION=isolated-recovery \
npm run restore:database:verified
```

The verified restore refuses to run without:

- the matching `.sha256` file;
- an explicit isolated-recovery confirmation;
- valid MongoDB restore tooling.

It does **not** use `--drop` by default. A destructive restore requires the
separate `ALLOW_DESTRUCTIVE_RESTORE=true` switch and must never target
production during a drill.

After restore, run the application build/integration/recovery gates against the
isolated recovery target and record the measured restore duration.

## Cloudflare R2 verified media backup

MongoDB stores media references; it does not back up the R2 object bytes.

Required secrets/configuration:

- standard AWS-compatible access credentials from the runtime secret store;
- `R2_ENDPOINT`;
- `R2_BUCKET`;
- `MEDIA_BACKUP_DIR`;
- `MEDIA_OFFSITE_DIR` for an independent copy.

Run:

```bash
R2_ENDPOINT="<runtime endpoint>" \
R2_BUCKET="<production bucket>" \
MEDIA_BACKUP_DIR="/durable/backups/r2" \
MEDIA_OFFSITE_DIR="/independent/offsite/r2" \
npm run backup:media:r2
```

The script inventories object keys/sizes/ETags, downloads the bucket, creates a
gzip archive, verifies SHA-256 evidence and verifies the optional off-site copy.

## R2 isolated restore drill

Restore only to a non-production bucket:

```bash
MEDIA_BACKUP_ARCHIVE="/durable/backups/r2/r2-YYYYMMDDTHHMMSSZ.tar.gz" \
R2_ENDPOINT="<runtime endpoint>" \
R2_RESTORE_BUCKET="<isolated recovery bucket>" \
MEDIA_RESTORE_TARGET_CONFIRMATION=isolated-recovery-bucket \
npm run restore:media:r2
```

The restore is additive and does not use `--delete`.

After restoring, verify that a sampled MongoDB media URL/key can be recovered
with the intended stable key mapping.

## Scheduling and live evidence

Repository scripts are only tooling. Production DR is **not certified** until
live evidence proves:

1. scheduled MongoDB backup execution;
2. scheduled R2/media backup execution;
3. independent/off-site copies;
4. encryption at rest and in transit;
5. least-privilege backup credentials;
6. one isolated MongoDB restore drill;
7. one isolated R2/media restore drill;
8. measured backup age and restore duration;
9. achieved RPO/RTO based on those measurements;
10. alerting on backup failure.

Do not infer these controls from repository code alone.

## Current ALM-PRD-001 evidence — 2026-09-22

Current repository/live inspection has proven:

- verified MongoDB and R2 backup/restore scripts exist and are CI-contracted;
- production learning snapshots are queryable inside the application;
- an ALM-PRD-001 learner-reference safety snapshot and a rollback dry-run
  activity were recorded;
- production Post Deploy Operational Smoke is green on
  `main@6f1fab225216368333c30e225bc9b250a01851aa`.

Still open:

- Sentry live proof is blocked because production has no `SENTRY_DSN`;
- no live scheduled full MongoDB dump was proven;
- no independent off-site MongoDB archive was proven;
- no isolated full MongoDB restore drill was proven;
- no independent R2 backup/restore drill was proven;
- measured RPO/RTO remains open.

See `docs/architecture/DISASTER_RECOVERY_RUNBOOK.md` and
`docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`.
