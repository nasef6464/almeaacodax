#!/usr/bin/env bash
set -euo pipefail

R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_BUCKET="${R2_BUCKET:-}"
MEDIA_BACKUP_DIR="${MEDIA_BACKUP_DIR:-backups/r2}"
MEDIA_OFFSITE_DIR="${MEDIA_OFFSITE_DIR:-}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "$R2_ENDPOINT" || -z "$R2_BUCKET" ]]; then
  echo "R2_ENDPOINT and R2_BUCKET are required." >&2
  exit 1
fi
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "RETENTION_DAYS must be a non-negative integer." >&2
  exit 1
fi
for command in aws tar sha256sum find; do
  command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$MEDIA_BACKUP_DIR"
stage_dir="$MEDIA_BACKUP_DIR/r2-$timestamp.stage"
archive="$MEDIA_BACKUP_DIR/r2-$timestamp.tar.gz"
checksum="$archive.sha256"
inventory="$MEDIA_BACKUP_DIR/r2-$timestamp.inventory.txt"
archive_name="$(basename "$archive")"
checksum_name="$(basename "$checksum")"
inventory_name="$(basename "$inventory")"

rm -rf "$stage_dir"
mkdir -p "$stage_dir"

AWS_DEFAULT_REGION=auto aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2   --bucket "$R2_BUCKET"   --query 'Contents[].[Key,Size,ETag]'   --output text > "$inventory"

AWS_DEFAULT_REGION=auto aws --endpoint-url "$R2_ENDPOINT" s3 sync   "s3://$R2_BUCKET/" "$stage_dir/" --no-progress

file_count="$(find "$stage_dir" -type f | wc -l | tr -d ' ')"
bytes="$(du -sb "$stage_dir" | awk '{print $1}')"

tar -czf "$archive" -C "$stage_dir" .
rm -rf "$stage_dir"

(
  cd "$MEDIA_BACKUP_DIR"
  sha256sum "$archive_name" > "$checksum_name"
  sha256sum --check "$checksum_name"
)

if [[ -n "$MEDIA_OFFSITE_DIR" ]]; then
  mkdir -p "$MEDIA_OFFSITE_DIR"
  cp "$archive" "$checksum" "$inventory" "$MEDIA_OFFSITE_DIR/"
  (
    cd "$MEDIA_OFFSITE_DIR"
    sha256sum --check "$checksum_name"
  )
fi

if (( RETENTION_DAYS > 0 )); then
  find "$MEDIA_BACKUP_DIR" -maxdepth 1 -type f \( -name 'r2-*.tar.gz' -o -name 'r2-*.tar.gz.sha256' -o -name 'r2-*.inventory.txt' \) -mtime "+$RETENTION_DAYS" -delete
fi

printf 'Verified R2 media backup: %s files=%s source_bytes=%s inventory=%s\n' "$archive" "$file_count" "$bytes" "$inventory"
