import fs from 'node:fs';
import assert from 'node:assert/strict';

const backup = fs.readFileSync(new URL('./verify-db-backup.sh', import.meta.url), 'utf8');
const restore = fs.readFileSync(new URL('./restore-db-verified.sh', import.meta.url), 'utf8');
const runbook = fs.readFileSync(new URL('../docs/architecture/DISASTER_RECOVERY_RUNBOOK.md', import.meta.url), 'utf8');

assert.match(backup, /mongodump/);
assert.match(backup, /--archive=/);
assert.match(backup, /--gzip/);
assert.match(backup, /archive_name="\$\(basename "\$archive"\)"/);
assert.match(backup, /checksum_name="\$\(basename "\$checksum"\)"/);
assert.match(backup, /cd "\$BACKUP_DIR"/);
assert.match(backup, /sha256sum "\$archive_name" > "\$checksum_name"/);
assert.match(backup, /sha256sum --check "\$checksum_name"/);
assert.match(backup, /OFFSITE_DIR/);
assert.match(backup, /cd "\$OFFSITE_DIR"/);
assert.match(backup, /RETENTION_DAYS/);
assert.match(restore, /sha256sum --check/);
assert.match(restore, /RESTORE_TARGET_CONFIRMATION/);
assert.match(restore, /isolated-recovery/);
assert.match(restore, /ALLOW_DESTRUCTIVE_RESTORE/);
assert.match(restore, /if \[\[ "\$ALLOW_DESTRUCTIVE_RESTORE" == "true" \]\]/);
assert.doesNotMatch(restore, /restore_args=\([^\n]*--drop/);
assert.match(runbook, /isolated recovery/i);
assert.match(runbook, /separate recovery cluster\/failure domain/i);
assert.match(runbook, /namespace names/i);
assert.match(runbook, /RPO \/ RTO/);
assert.match(runbook, /External media/);
assert.match(runbook, /Cloudflare-backed production contract/i);
assert.match(runbook, /MongoDB DR must restore the URL\/key references exactly/i);
assert.match(runbook, /CDN cache hit is not a backup/i);
assert.match(runbook, /sample recovery drill/i);
assert.match(runbook, /BLOCKED for full production DR/i);
assert.match(runbook, /not a full database backup/i);

console.log('Disaster recovery contract smoke: PASS');
