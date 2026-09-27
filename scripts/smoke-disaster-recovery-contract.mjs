import fs from 'node:fs';
import assert from 'node:assert/strict';

const backup = fs.readFileSync(new URL('./verify-db-backup.sh', import.meta.url), 'utf8');
const restore = fs.readFileSync(new URL('./restore-db-verified.sh', import.meta.url), 'utf8');
const mediaBackup = fs.readFileSync(new URL('./verify-r2-media-backup.sh', import.meta.url), 'utf8');
const mediaRestore = fs.readFileSync(new URL('./restore-r2-media-verified.sh', import.meta.url), 'utf8');
const renderStage = fs.readFileSync(new URL('./render-stage-mongo-backup.mjs', import.meta.url), 'utf8');
const runbook = fs.readFileSync(new URL('../docs/architecture/DISASTER_RECOVERY_RUNBOOK.md', import.meta.url), 'utf8');
const productionGuide = fs.readFileSync(new URL('../docs/BACKUP_RESTORE_PRODUCTION.md', import.meta.url), 'utf8');
const backupManager = fs.readFileSync(new URL('../dashboards/admin/BackupManager.tsx', import.meta.url), 'utf8');
const scheduledWorkflow = fs.readFileSync(new URL('../.github/workflows/production-dr-backup.yml', import.meta.url), 'utf8');

assert.match(backup, /mongodump/);
assert.match(backup, /--archive=/);
assert.match(backup, /--gzip/);
assert.match(backup, /sha256sum --check/);
assert.match(restore, /RESTORE_TARGET_CONFIRMATION/);
assert.match(restore, /isolated-recovery/);
assert.match(restore, /ALLOW_DESTRUCTIVE_RESTORE/);
assert.doesNotMatch(restore, /restore_args=\([^\n]*--drop/);

assert.match(renderStage, /mongodump/);
assert.match(renderStage, /dr-staging\/mongodb\/current/);
assert.match(renderStage, /R2_ACCOUNT_ID/);
assert.match(renderStage, /ready\.json/);
assert.match(renderStage, /Atomic readiness marker/);
assert.match(renderStage, /RENDER_GIT_COMMIT/);
assert.match(renderStage, /sha256/);

assert.match(mediaBackup, /R2_ENDPOINT/);
assert.match(mediaBackup, /R2_BUCKET/);
assert.match(mediaBackup, /DR_STAGE_PREFIX/);
assert.match(mediaBackup, /--exclude "\$\{DR_STAGE_PREFIX\}\*"/);
assert.match(mediaBackup, /index\(\$1, prefix\) != 1/);
assert.match(mediaBackup, /sha256sum --check/);
assert.match(mediaRestore, /MEDIA_RESTORE_TARGET_CONFIRMATION/);
assert.match(mediaRestore, /isolated-recovery-bucket/);
assert.doesNotMatch(mediaRestore, /--delete/);

assert.match(runbook, /isolated recovery/i);
assert.match(runbook, /RPO \/ RTO/);
assert.match(productionGuide, /backup:database:verified/);
assert.match(productionGuide, /restore:database:verified/);
assert.match(backupManager, /data-testid="backup-schedule-readiness"/);
assert.doesNotMatch(backupManager, /تم تفعيل الجدولة بنجاح!/);

assert.match(scheduledWorkflow, /schedule:/);
assert.match(scheduledWorkflow, /cron: "17 1 \* \* \*"/);
assert.doesNotMatch(scheduledWorkflow, /PRODUCTION_BACKUP_MONGODB_URI/);
assert.match(scheduledWorkflow, /PRODUCTION_R2_BACKUP_ACCESS_KEY_ID/);
assert.match(scheduledWorkflow, /Fail closed when R2 source secrets are incomplete/);
assert.match(scheduledWorkflow, /Resolve fresh MongoDB backup staged by Render/);
assert.match(scheduledWorkflow, /staged Mongo backup is stale/);
assert.match(scheduledWorkflow, /limit 7200s/);
assert.match(scheduledWorkflow, /actions\/upload-artifact@v4/);
assert.match(scheduledWorkflow, /retention-days: 30/);
assert.match(scheduledWorkflow, /production-dr-/);
assert.match(scheduledWorkflow, /mongo:8\.0/);
assert.match(scheduledWorkflow, /minio\/minio/);
assert.match(scheduledWorkflow, /restore:database:verified/);
assert.match(scheduledWorkflow, /restore:media:r2/);
assert.match(scheduledWorkflow, /R2 restore object count mismatch/);
assert.match(scheduledWorkflow, /independent artifact digest/);
assert.match(scheduledWorkflow, /achieved RPO objective/);
assert.match(scheduledWorkflow, /combined isolated restore RTO/);
assert.doesNotMatch(scheduledWorkflow, /DR_OFFSITE_ENDPOINT/);
assert.doesNotMatch(scheduledWorkflow, /DR_OFFSITE_BUCKET/);
assert.match(scheduledWorkflow, /Alert DR backup failure/);
assert.match(scheduledWorkflow, /issue_number: 235/);
assert.match(scheduledWorkflow, /fail-closed alert/);

console.log('Disaster recovery contract smoke: PASS');
