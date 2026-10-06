#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups/mongodb}"
MONGODB_URI="${MONGODB_URI:-}"

if [[ -z "$MONGODB_URI" ]]; then
  echo "MONGODB_URI is required."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
target="$BACKUP_DIR/$timestamp"
mkdir -p "$target"
mongodump --uri="$MONGODB_URI" --out="$target"
echo "MongoDB backup written to $target"
