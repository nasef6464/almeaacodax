#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${ARCHIVE_PATH:-}"
RESTORE_DIR="${RESTORE_DIR:-server/uploads}"

if [[ -z "$ARCHIVE_PATH" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "ARCHIVE_PATH is required and must exist."
  exit 1
fi

read -r -p "This will restore uploads into $RESTORE_DIR. Type RESTORE to continue: " answer
if [[ "$answer" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

mkdir -p "$RESTORE_DIR"
tar -xzf "$ARCHIVE_PATH" -C .
echo "Uploads restore completed from $ARCHIVE_PATH"
