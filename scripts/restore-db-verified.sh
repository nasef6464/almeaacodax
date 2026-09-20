#!/usr/bin/env bash
set -euo pipefail

BACKUP_ARCHIVE="${BACKUP_ARCHIVE:-}"
RESTORE_MONGODB_URI="${RESTORE_MONGODB_URI:-}"
ALLOW_DESTRUCTIVE_RESTORE="${ALLOW_DESTRUCTIVE_RESTORE:-false}"
RESTORE_TARGET_CONFIRMATION="${RESTORE_TARGET_CONFIRMATION:-}"

if [[ -z "$BACKUP_ARCHIVE" || -z "$RESTORE_MONGODB_URI" ]]; then
  echo "BACKUP_ARCHIVE and RESTORE_MONGODB_URI are required." >&2
  exit 1
fi
if [[ "$RESTORE_TARGET_CONFIRMATION" != "isolated-recovery" ]]; then
  echo "Set RESTORE_TARGET_CONFIRMATION=isolated-recovery only after verifying the target is an isolated recovery cluster/namespace." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_ARCHIVE" || ! -f "$BACKUP_ARCHIVE.sha256" ]]; then
  echo "Backup archive and matching .sha256 file are required." >&2
  exit 1
fi
for command in mongorestore sha256sum; do
  command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

(cd "$(dirname "$BACKUP_ARCHIVE")" && sha256sum --check "$(basename "$BACKUP_ARCHIVE").sha256")

restore_args=(--uri="$RESTORE_MONGODB_URI" --archive="$BACKUP_ARCHIVE" --gzip)
if [[ "$ALLOW_DESTRUCTIVE_RESTORE" == "true" ]]; then
  restore_args+=(--drop)
fi

mongorestore "${restore_args[@]}"
printf 'Verified restore completed from %s. destructive=%s\n' "$BACKUP_ARCHIVE" "$ALLOW_DESTRUCTIVE_RESTORE"
