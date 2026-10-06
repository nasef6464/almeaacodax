#!/usr/bin/env bash
set -euo pipefail

MEDIA_BACKUP_ARCHIVE="${MEDIA_BACKUP_ARCHIVE:-}"
R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_RESTORE_BUCKET="${R2_RESTORE_BUCKET:-}"
MEDIA_RESTORE_TARGET_CONFIRMATION="${MEDIA_RESTORE_TARGET_CONFIRMATION:-}"

if [[ -z "$MEDIA_BACKUP_ARCHIVE" || -z "$R2_ENDPOINT" || -z "$R2_RESTORE_BUCKET" ]]; then
  echo "MEDIA_BACKUP_ARCHIVE, R2_ENDPOINT and R2_RESTORE_BUCKET are required." >&2
  exit 1
fi
if [[ "$MEDIA_RESTORE_TARGET_CONFIRMATION" != "isolated-recovery-bucket" ]]; then
  echo "Set MEDIA_RESTORE_TARGET_CONFIRMATION=isolated-recovery-bucket only after verifying the destination is not the production bucket." >&2
  exit 1
fi
if [[ ! -f "$MEDIA_BACKUP_ARCHIVE" || ! -f "$MEDIA_BACKUP_ARCHIVE.sha256" ]]; then
  echo "Media backup archive and matching .sha256 file are required." >&2
  exit 1
fi
for command in aws tar sha256sum mktemp; do
  command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

(
  cd "$(dirname "$MEDIA_BACKUP_ARCHIVE")"
  sha256sum --check "$(basename "$MEDIA_BACKUP_ARCHIVE").sha256"
)

stage_dir="$(mktemp -d)"
cleanup() { rm -rf "$stage_dir"; }
trap cleanup EXIT

tar -xzf "$MEDIA_BACKUP_ARCHIVE" -C "$stage_dir"
AWS_DEFAULT_REGION=auto aws --endpoint-url "$R2_ENDPOINT" s3 sync   "$stage_dir/" "s3://$R2_RESTORE_BUCKET/" --no-progress

restored_count="$(find "$stage_dir" -type f | wc -l | tr -d ' ')"
printf 'Verified R2 media restore completed to isolated bucket %s files=%s\n' "$R2_RESTORE_BUCKET" "$restored_count"
