#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH="${BACKUP_PATH:-}"
MONGODB_URI="${MONGODB_URI:-}"

if [[ -z "$MONGODB_URI" || -z "$BACKUP_PATH" ]]; then
  echo "MONGODB_URI and BACKUP_PATH are required."
  exit 1
fi

read -r -p "This will restore MongoDB from $BACKUP_PATH. Type RESTORE to continue: " answer
if [[ "$answer" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_PATH"
echo "MongoDB restore completed from $BACKUP_PATH"
