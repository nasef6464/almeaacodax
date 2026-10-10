#!/usr/bin/env python3
"""Generate PRIVATE PHYS26 crop candidates from a user-supplied PDF.

No network, no OCR, no production writes, no automatic content/answer approval.
Install free libraries: pip install pymupdf pillow
Example:
  python scripts/build-phys26-private-crop-candidates.py \
    --pdf "/path/to/collection.pdf" \
    --index "/path/to/PHYS26_NUMBERED_SOURCE_INDEX_2064.json" \
    --out "/tmp/phys26_private_batch" --start 0 --count 400
"""
import argparse
import hashlib
import io
import json
import zipfile
from collections import defaultdict
from pathlib import Path

import fitz
from PIL import Image


def sha256(payload):
    return hashlib.sha256(payload).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--index", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=400)
    parser.add_argument("--crop-overrides", help="Optional private JSON: source ID -> [x0,y0,x1,y1]")
    args = parser.parse_args()

    source = Path(args.pdf).resolve()
    index_path = Path(args.index).resolve()
    output = Path(args.out).resolve()
    cwd = Path.cwd().resolve()
    if output == cwd or cwd in output.parents:
        parser.error("Private crop output must be outside the checkout/repository working directory")
    if args.start < 0 or args.count <= 0:
        parser.error("--start must be >=0 and --count must be >0")
    if not source.is_file() or not index_path.is_file():
        parser.error("Source PDF or indexed source file not found")

    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("project") != "PHYS26" or len(index.get("items", [])) != index.get("sourceQuestionOccurrences"):
        raise ValueError("PHYS26 source question index is inconsistent")
    if sha256(source.read_bytes()) != index["sourceSHA256"]:
        raise ValueError("SOURCE SHA MISMATCH; refusing to crop wrong book edition")
    items = index["items"][args.start:args.start + args.count]
    if len(items) != args.count:
        raise ValueError("Requested crop range extends beyond indexed questions")

    overrides = {}
    if args.crop_overrides:
        overrides = json.loads(Path(args.crop_overrides).read_text(encoding="utf-8"))
        if not isinstance(overrides, dict):
            raise ValueError("crop-overrides must be an object keyed by source ID")

    output.mkdir(parents=True, exist_ok=True)
    images = output / "images"
    images.mkdir(exist_ok=True)
    per_page = defaultdict(list)
    for row in index["items"]:
        per_page[(row["pdfPage"], row["column"])].append(row)
    doc = fitz.open(source)
    if len(doc) != index["pages"]:
        raise ValueError("PDF page count mismatch")

    records = []
    image_hashes = set()
    for row in items:
        key = row["canonicalSourceId"]
        page_number = row["pdfPage"]
        page = doc[page_number - 1]
        bbox = overrides.get(key, row["proposedCropBBox"])
        clip = fitz.Rect(bbox)
        printed = fitz.Rect(row["numberBBox"])
        flags = []
        if clip.is_empty or not page.rect.contains(clip):
            flags.append("CROP_OUTSIDE_PAGE")
        if not clip.contains(printed):
            flags.append("PRINTED_NUMBER_OUTSIDE_CROP")
        if clip.height < 50 or clip.width < 150:
            flags.append("CROP_TOO_SMALL")
        collisions = [
            other["canonicalSourceId"]
            for other in per_page[(page_number, row["column"])]
            if other["canonicalSourceId"] != key
            and fitz.Rect(other["numberBBox"]).intersects(clip)
        ]
        if collisions:
            flags.append("OTHER_QUESTION_LABEL_IN_CROP")
        rec = {
            "sourceId": key,
            "pdfPage": page_number,
            "lesson": row["lessonIndex"],
            "section": row["sectionInLesson"],
            "questionNumber": row["questionNumber"],
            "cropBBox": [clip.x0, clip.y0, clip.x1, clip.y1],
            "flags": flags,
            "visuallyApproved": False,
            "answerVerified": False,
            "importReady": False,
        }
        if not flags:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip, alpha=False)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            output_bytes = io.BytesIO()
            image.save(output_bytes, format="WEBP", quality=90, method=3)
            image_bytes = output_bytes.getvalue()
            digest = sha256(image_bytes)
            if digest in image_hashes:
                flags.append("DUPLICATE_IMAGE_SHA")
            image_hashes.add(digest)
            filename = key + ".webp"
            (images / filename).write_bytes(image_bytes)
            rec.update({"imageFileName": filename, "imageSha256": digest, "pixels": [pix.width, pix.height]})
        rec["status"] = "NEEDS_CROP_REVIEW" if flags else "PRIVATE_CANDIDATE_NOT_APPROVED"
        records.append(rec)

    manifest = {
        "project": "PHYS26",
        "scope": "PRIVATE_OFFLINE_CROP_CANDIDATES",
        "sourceSha256": index["sourceSHA256"],
        "startIndexZeroBased": args.start,
        "candidateCount": len(records),
        "geometryFlagged": sum(bool(row["flags"]) for row in records),
        "visualQAApproved": 0,
        "correctAnswersApproved": 0,
        "licensing": "UNVERIFIED",
        "productionWrites": 0,
        "warning": "Geometry check is NOT visual/source/answer validation",
        "items": records,
    }
    manifest_file = output / "manifest.json"
    manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    archive_path = output / "crop_candidates.zip"
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.write(manifest_file, "manifest.json")
        for rec in records:
            if rec.get("imageFileName"):
                archive.write(images / rec["imageFileName"], rec["imageFileName"])
    print(json.dumps({
        "candidateCount": len(records),
        "geometryFlagged": manifest["geometryFlagged"],
        "answerApproved": 0,
        "archive": str(archive_path),
        "sha256": sha256(archive_path.read_bytes()),
    }))


if __name__ == "__main__":
    main()
