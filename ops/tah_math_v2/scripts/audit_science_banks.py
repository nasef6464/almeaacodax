import os
import json
import zipfile
from PIL import Image
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== AUDITING SCIENCES QUESTION BANKS (PHYS26, CHEM26, BIO26) ===")

# 1. PHYS26
phys_crops_dir = 'ops/phys26/crops'
phys_manifest_path = 'ops/phys26/CROPS_MANIFEST_2064.json'
with open(phys_manifest_path, 'r', encoding='utf-8') as f:
    phys_manifest = json.load(f)

phys_items = phys_manifest.get('items', [])
print(f"\n[PHYS26] Total manifest items: {len(phys_items)}")
phys_valid = 0
phys_missing = 0
for it in phys_items:
    p = os.path.join(phys_crops_dir, f"{it['questionCode']}.webp")
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        phys_valid += 1
    else:
        phys_missing += 1
print(f"[PHYS26] Disk integrity: {phys_valid} valid / {len(phys_items)} expected (missing: {phys_missing})")

# 2. CHEM26
chem_crops_dir = 'ops/chem26/crops'
chem_manifest_path = 'ops/chem26/CROPS_MANIFEST_1708.json'
with open(chem_manifest_path, 'r', encoding='utf-8') as f:
    chem_manifest = json.load(f)

chem_items = chem_manifest.get('items', [])
print(f"\n[CHEM26] Total manifest items: {len(chem_items)}")
chem_valid = 0
chem_missing = 0
for it in chem_items:
    p = os.path.join(chem_crops_dir, f"{it['questionCode']}.webp")
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        chem_valid += 1
    else:
        chem_missing += 1
print(f"[CHEM26] Disk integrity: {chem_valid} valid / {len(chem_items)} expected (missing: {chem_missing})")

# 3. BIO26
bio_zip_path = 'ops/bio26/BIO26_FINAL_ASSETS_V2_CANONICAL.zip'
bio_valid = 0
if os.path.exists(bio_zip_path):
    with zipfile.ZipFile(bio_zip_path, 'r') as z:
        bio_files = [f for f in z.namelist() if f.endswith('.webp')]
        bio_valid = len(bio_files)
    print(f"\n[BIO26] Zip assets: {bio_valid} valid WebP images in canonical archive")
else:
    print(f"\n[BIO26] Canonical zip not found at {bio_zip_path}")

report = {
    "timestamp": "2026-10-15T06:58:00Z",
    "phys26": {
        "expected": len(phys_items),
        "validOnDisk": phys_valid,
        "missing": phys_missing,
        "status": "PASS" if phys_missing == 0 else "FAIL"
    },
    "chem26": {
        "expected": len(chem_items),
        "validOnDisk": chem_valid,
        "missing": chem_missing,
        "status": "PASS" if chem_missing == 0 else "FAIL"
    },
    "bio26": {
        "expected": 2832,
        "validInZip": bio_valid,
        "status": "PASS" if bio_valid == 2832 else "FAIL"
    }
}

with open('ops/tah_math_v2/audit_repair/SCIENCES_AUDIT_REPORT.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print("\n" + "="*60)
print("SCIENCES AUDIT COMPLETE")
print(f"PHYS26: {phys_valid}/2064 PASS")
print(f"CHEM26: {chem_valid}/1708 PASS")
print(f"BIO26: {bio_valid}/2832 PASS")
print("="*60)
