#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups/mongodb}"
MONGODB_URI="${MONGODB_URI:-}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
OFFSITE_DIR="${OFFSITE_DIR:-}"

if [[ -z "$MONGODB_URI" ]]; then
  echo "MONGODB_URI is required." >&2
  exit 1
fi
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "RETENTION_DAYS must be a non-negative integer." >&2
  exit 1
fi

for command in mongodump sha256sum; do
  command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
archive="$BACKUP_DIR/mongodb-$timestamp.archive.gz"
checksum="$archive.sha256"
manifest="$archive.manifest"

mongodump --uri="$MONGODB_URI" --archive="$archive" --gzip
archive_name="$(basename "$archive")"
checksum_name="$(basename "$checksum")"
(
  cd "$BACKUP_DIR"
  sha256sum "$archive_name" > "$checksum_name"
  sha256sum --check "$checksum_name"
)
bytes="$(wc -c < "$archive" | tr -d ' ')"
{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'format=mongodump-archive-gzip\n'
  printf 'bytes=%s\n' "$bytes"
  printf 'checksum_file=%s\n' "$checksum_name"
} > "$manifest"

if [[ -n "$OFFSITE_DIR" ]]; then
  mkdir -p "$OFFSITE_DIR"
  cp "$archive" "$checksum" "$manifest" "$OFFSITE_DIR/"
  (cd "$OFFSITE_DIR" && sha256sum --check "$checksum_name")
fi

if (( RETENTION_DAYS > 0 )); then
  find "$BACKUP_DIR" -type f -name 'mongodb-*' -mtime "+$RETENTION_DAYS" -delete
fi

printf 'Verified MongoDB backup: %s (%s bytes)\n' "$archive" "$bytes"
