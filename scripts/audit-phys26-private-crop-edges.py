#!/usr/bin/env python3
"""PHYS26 private offline WebP crop hygiene audit.

Inspects user-owned private ZIP locally; writes no question text, source photos, or
question images to GitHub. Requires Pillow. Technical/edge heuristic only.
Usage: python scripts/audit-phys26-private-crop-edges.py /absolute/private/V6.zip
"""
import argparse
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image


def inspect(archive):
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError("ZIP CRC FAILURE")
        manifest = json.loads(z.read("manifest.json"))
        if manifest.get("project") != "PHYS26":
            raise ValueError("SOURCE PROJECT NOT PHYS26")
        rows = manifest.get("items", [])
        if len(rows) != 2064 or manifest.get("totalIndexed") != len(rows):
            raise ValueError("SOURCE ITEM COUNT DRIFT")
        seen_ids, seen_sha = set(), set()
        problems, bottom_edge = [], []
        for row in rows:
            sid = row["sourceId"]
            name = row["selectedImageFile"]
            if sid in seen_ids:
                problems.append((sid, "DUPLICATE_ID"))
            seen_ids.add(sid)
            if Path(name).name != name or not name.endswith(".webp"):
                problems.append((sid, "BAD_IMAGE_PATH"))
                continue
            raw = z.read(name)
            sha = hashlib.sha256(raw).hexdigest()
            if sha != row["selectedImageSha256"]:
                problems.append((sid, "SHA_MISMATCH"))
            if sha in seen_sha:
                problems.append((sid, "DUPLICATE_IMAGE_SHA"))
            seen_sha.add(sha)
            try:
                im = Image.open(io.BytesIO(raw))
                im.load()
                if im.format != "WEBP":
                    raise ValueError("NOT_WEBP")
                grey = im.convert("L")
                w, h = grey.size
                if w < 300 or h < 90:
                    problems.append((sid, "SMALL_CROP"))
                # Local heuristic: very dark 9px at the lower edge suggests either
                # answer/options cut off OR a following heading/footer included.
                # This test cannot certify question completeness.
                band = grey.crop((12, max(0, h-9), max(13, w-12), h)).tobytes()
                if band and sum(value < 175 for value in band) / len(band) > 0.028:
                    bottom_edge.append(sid)
            except Exception as exc:
                problems.append((sid, "DECODE_ERROR:" + str(exc)[:80]))
        return {"technicalIntegrityPass": not problems,
                "imageCount": len(rows),
                "shaUnique": len(seen_sha),
                "technicalProblems": problems[:40],
                "bottomEdgeHeuristicFlags": bottom_edge,
                "cropFullyVisuallyApproved": False,
                "answerApproved": False,
                "sourceLicensingApproved": False}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("private_zip", type=Path)
    args = p.parse_args()
    result = inspect(args.private_zip)
    print(json.dumps(result, ensure_ascii=False))
    if not result["technicalIntegrityPass"] or result["bottomEdgeHeuristicFlags"]:
        sys.exit(1)
