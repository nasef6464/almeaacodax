#!/usr/bin/env python3
"""PHYS26 PRIVATE geometry-risk and conservative trim proposal audit.

Free offline dependency: pip install pymupdf
No OCR, network, production writes, question/answer transcription, or automatic approval.
Example:
 python scripts/audit-phys26-private-crop-risks.py --pdf /private/collection.pdf \
   --index /private/PHYS26_NUMBERED_SOURCE_INDEX_2064.json \
   --out /tmp/phys26_risk_audit.json
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path

import fitz


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--index", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    pdf, index_path, out = map(lambda x: Path(x).resolve(), (args.pdf, args.index, args.out))
    cwd = Path.cwd().resolve()
    if out == cwd or cwd in out.parents:
        ap.error("Private audit output must be outside the repository checkout")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("project") != "PHYS26" or len(index.get("items", [])) != index.get("sourceQuestionOccurrences"):
        raise ValueError("Invalid PHYS26 numbered index")
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if digest != index.get("sourceSHA256"):
        raise ValueError("PDF SHA256 mismatch: refusing incorrect source edition")
    doc = fitz.open(pdf)
    if len(doc) != index["pages"]:
        raise ValueError("PDF page count mismatch")

    spans_by_page = {}
    rows = []
    counts = collections.Counter()
    for position, q in enumerate(index["items"], 1):
        page_number = q["pdfPage"]
        clip = fitz.Rect(q["proposedCropBBox"])
        number = fitz.Rect(q["numberBBox"])
        if not clip.is_empty and not doc[page_number - 1].rect.contains(clip):
            raise ValueError("Crop exceeds source page at occurrence " + str(position))
        if page_number not in spans_by_page:
            spans_by_page[page_number] = [
                span
                for block in doc[page_number - 1].get_text("dict")["blocks"]
                if block.get("type") == 0
                for line in block["lines"]
                for span in line["spans"]
            ]
        spans = spans_by_page[page_number]
        blue = [
            s for s in spans
            if s["color"] == 0x09529F and fitz.Rect(s["bbox"]).intersects(clip)
        ]
        headings = [
            s for s in blue
            if s["size"] >= 11.5 and s["bbox"][1] > number.y0 + 3 and s["text"].strip()
        ]
        risks = []
        if headings:
            risks.append("HEADING_OVERLAP")
        if clip.y1 >= 710:
            risks.append("POSSIBLE_FOOTER_KEY_OVERLAP")
        if clip.height >= 250:
            risks.append("VERY_TALL_CROP")
        counts.update(risks)

        d_labels = [
            s for s in blue
            if s["text"].strip() in ("د", "D") and 9 <= s["size"] <= 11
        ]
        d_bottom = max((s["bbox"][3] for s in d_labels), default=None)
        suggestions = []
        if d_bottom is not None:
            for s in headings:
                if s["bbox"][1] > d_bottom + 8:
                    suggestions.append(("HEADING_AFTER_OPTIONS", s["bbox"][1] - 5))
            is_right = q["column"] == "right"
            for color, reason, offset in (
                (0xFFFFFF, "FOOTER_NUMBER_HEADER_AFTER_OPTIONS", 8),
                (0x171717, "FOOTER_ANSWER_TABLE_AFTER_OPTIONS", 8),
            ):
                groups = collections.defaultdict(list)
                for s in spans:
                    if s["color"] != color or s["bbox"][1] < 650 or s["bbox"][1] > clip.y1:
                        continue
                    if (((s["bbox"][0] + s["bbox"][2]) / 2) > 294) != is_right:
                        continue
                    t = s["text"].strip()
                    if color == 0xFFFFFF and not (s["size"] >= 9 and t.isdigit()):
                        continue
                    if color == 0x171717 and not (s["size"] >= 10 and t in ("A", "B", "C", "D")):
                        continue
                    groups[round(s["bbox"][1] / 5) * 5].append(s)
                for group in groups.values():
                    first = min(s["bbox"][1] for s in group)
                    if len(group) >= 4 and first > d_bottom + 10:
                        suggestions.append((reason, first - offset))
            if clip.y1 >= 710 and d_bottom < 680 and not any(item[0].startswith("FOOTER") for item in suggestions):
                suggestions.append(("PAGE_FOOTER_PROXIMITY_AFTER_OPTIONS", 700.0))
        valid = [
            (reason, y) for reason, y in suggestions
            if y < clip.y1 - 3 and y > d_bottom + 6 and y > clip.y0 + 45
        ]
        reason, trim_y = min(valid, key=lambda x: x[1]) if valid else (None, None)
        proposed = [clip.x0, clip.y0, clip.x1, round(trim_y, 2)] if reason else None
        if proposed and risks:
            counts["TRIM_PROPOSALS"] += 1
        rows.append({
            "sourceId": q["canonicalSourceId"],
            "globalOccurrence": position,
            "pdfPage": page_number,
            "risks": risks,
            "suggestedCropBBox": proposed,
            "suggestionReason": reason,
            "visualQAApproved": False,
            "answerVerified": False,
            "importReady": False,
        })

    report = {
        "project": "PHYS26",
        "scope": "PRIVATE_STRUCTURAL_RISK_AND_TRIM_PROPOSALS",
        "sourceSha256": digest,
        "indexed": len(rows),
        "riskFlagged": sum(bool(x["risks"]) for x in rows),
        "trimProposals": sum(bool(x["suggestedCropBBox"]) for x in rows),
        "counts": dict(counts),
        "sourceContentApproved": 0,
        "answersVerified": 0,
        "publicationAllowed": False,
        "warning": "Risk flags and suggested trims require real human visual QA; never treat as source approval.",
        "items": rows,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "items"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
