import fitz # PyMuPDF
from PIL import Image
import json
import os
import sys
import hashlib
import shutil
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = 'ops/tah_math_v2/handoff/01_SOURCE_BOOKS/كتاب تجميعات يلو للرياضيات 26 - المعدل(1).pdf'
manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'
defect_json_path = 'ops/tah_math_v2/audit_repair/REMAINING_37_BLEMISHED_QUESTIONS.json'
crops_dir = 'ops/tah_math_v2/crops'
backup_dir = 'ops/tah_math_v2/crops_pre_repair_backup'

os.makedirs(backup_dir, exist_ok=True)

print("Loading PDF and defect list...")
doc = fitz.open(pdf_path)

with open(defect_json_path, 'r', encoding='utf-8') as f:
    defect_data = json.load(f)
questions_to_repair = defect_data['remaining_questions']
print(f"Targeting {len(questions_to_repair)} remaining blemished questions for vector repair.")

with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)
manifest_map = {it['questionCode']: it for it in manifest['items']}

# Group questions by printedPageNumber
by_page = defaultdict(list)
for q in questions_to_repair:
    by_page[q['page']].append(q)

zoom = 200 / 72 # 200 DPI
matrix = fitz.Matrix(zoom, zoom)

results = []
success_count = 0

for page_num in sorted(by_page.keys()):
    page_idx = page_num - 1
    page = doc[page_idx]
    
    # Patch all streams on this page: 1 Tr -> 3 Tr
    for xref in page.get_contents():
        try:
            data = doc.xref_stream(xref)
            text = data.decode('latin1')
            if '1 Tr' in text:
                fixed = text.replace('1 Tr', '3 Tr')
                doc.update_stream(xref, fixed.encode('latin1'))
        except Exception as e:
            print(f"Warning patching stream {xref} on page {page_num}: {e}")
            
    # Now render each question on this page
    for q in by_page[page_num]:
        code = q['questionCode']
        it = manifest_map.get(code)
        if not it:
            print(f"Error: {code} not found in manifest!")
            continue
            
        target_path = os.path.join(crops_dir, f"{code}.webp")
        backup_path = os.path.join(backup_dir, f"{code}.webp")
        
        # 1. Back up existing crop if not already backed up
        if os.path.exists(target_path) and not os.path.exists(backup_path):
            shutil.copy2(target_path, backup_path)
            
        # 2. Render from patched PDF
        box = it['cropBoxPt']
        rect = fitz.Rect(box[0], box[1], box[2], box[3])
        pix = page.get_pixmap(clip=rect, matrix=matrix, alpha=False)
        
        tmp_png = os.path.join(crops_dir, f"{code}_tmp.png")
        pix.save(tmp_png)
        
        # 3. Standardize width to 703px
        im = Image.open(tmp_png)
        if im.width != 703:
            ratio = 703.0 / im.width
            new_h = int(round(im.height * ratio))
            im = im.resize((703, new_h), Image.Resampling.LANCZOS)
        else:
            new_h = im.height
            
        # 4. Save as WebP quality 95
        im.save(target_path, "WEBP", quality=95, method=6)
        if os.path.exists(tmp_png):
            os.remove(tmp_png)
            
        # Compute SHA-256
        with open(target_path, 'rb') as f:
            new_hash = hashlib.sha256(f.read()).hexdigest()
            
        success_count += 1
        results.append({
            "questionCode": code,
            "page": page_num,
            "questionNumber": q['questionNumber'],
            "dimensions": [703, new_h],
            "sha256": new_hash,
            "status": "REPAIRED_CLEAN"
        })
        print(f"Repaired: {code} (P{page_num:03d}-Q{q['questionNumber']:02d}) -> {703}x{new_h} sha={new_hash[:12]}...")

report = {
    "total_targeted": len(questions_to_repair),
    "total_repaired": success_count,
    "questions": results
}

out_report_path = 'ops/tah_math_v2/audit_repair/REPAIR_EXECUTION_REPORT_37.json'
with open(out_report_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("\n" + "="*60)
print(f"REPAIR COMPLETE: {success_count}/{len(questions_to_repair)} questions successfully vector-repaired.")
print(f"Report written to: {out_report_path}")
print("="*60)
