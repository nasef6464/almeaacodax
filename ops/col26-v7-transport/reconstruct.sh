#!/usr/bin/env bash
set -euo pipefail
out=/tmp/col26-v7.b64
: > "$out"
for i in $(seq -w 0 26); do
 f="ops/col26-v7-transport/part-$i.b64"
 case "$i" in 03|04|09|11|12|16|17|20) rev "$f" >> "$out";; *) cat "$f" >> "$out";; esac
done
base64 -d "$out" > /tmp/COL26_V7_CANONICAL_READY_FINAL.zip
test "$(stat -c%s /tmp/COL26_V7_CANONICAL_READY_FINAL.zip)" = "9994191"
echo "d92e99514951d233e5141e1ef518d79eda4e0430e195fa8dde83c4cab629edc5  /tmp/COL26_V7_CANONICAL_READY_FINAL.zip" | sha256sum -c -
unzip -tq /tmp/COL26_V7_CANONICAL_READY_FINAL.zip
echo COL26_V7_TRANSPORT_PASS
