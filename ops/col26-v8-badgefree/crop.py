from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
import json, os, sys

src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/cv8/images")
dst = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/cv8-v8/images")
dst.mkdir(parents=True, exist_ok=True)

files = sorted(src.glob("TAH-MATH-COL26-*.webp"))
if len(files) != 1012:
    raise SystemExit(f"Expected 1012 V7 WebPs, found {len(files)}")

def crop_one(source_path):
    path = Path(source_path)
    target = dst / path.name
    with Image.open(path) as im:
        im.load()
        if im.width != 596:
            raise RuntimeError(f"Unexpected source width for {path.name}: {im.width}")
        if im.height <= 0:
            raise RuntimeError(f"Invalid height for {path.name}: {im.height}")
        out = im.crop((0, 0, 518, im.height))
        out.save(target, "WEBP", lossless=True, quality=100, method=6, exact=True)
        if out.width != 518 or out.height != im.height:
            raise RuntimeError(f"Crop geometry failed for {path.name}")
        return {
            "questionCode": path.stem,
            "sourceWidth": im.width,
            "sourceHeight": im.height,
            "outputWidth": out.width,
            "outputHeight": out.height,
        }

workers = max(2, min(4, os.cpu_count() or 2))
rows = []
with ProcessPoolExecutor(max_workers=workers) as pool:
    for i, row in enumerate(pool.map(crop_one, [str(p) for p in files], chunksize=8), 1):
        rows.append(row)
        if i % 100 == 0:
            print(f"COL26_V8_CROP_PROGRESS {i}/1012", flush=True)

report = {
    "status": "PASS",
    "count": len(rows),
    "sourceWidth": 596,
    "outputWidth": 518,
    "removedRightPixels": 78,
    "losslessWebPMethod": 6,
    "workers": workers,
    "rule": "remove printed question-number/year/collections badge strip; preserve question body, diagrams and A/B/C/D options",
}
(dst.parent / "crop-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print("COL26_V8_CROP_PASS count=1012 width=518 removedRightPixels=78", flush=True)
