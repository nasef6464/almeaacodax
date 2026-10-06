#!/usr/bin/env bash
set -euo pipefail

UPLOAD_DIR="${UPLOAD_DIR:-server/uploads}"
BACKUP_DIR="${BACKUP_DIR:-backups/uploads}"

if [[ ! -d "$UPLOAD_DIR" ]]; then
  echo "Upload directory not found: $UPLOAD_DIR"
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/uploads-$timestamp.tar.gz" "$UPLOAD_DIR"
echo "Uploads backup written to $BACKUP_DIR/uploads-$timestamp.tar.gz"
