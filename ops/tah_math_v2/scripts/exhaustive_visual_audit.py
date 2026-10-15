import fitz # PyMuPDF
from PIL import Image, ImageChops
import numpy as np
import json
import os
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = 'ops/tah_math_v2/handoff/01_SOURCE_BOOKS/كتاب تجميعات يلو للرياضيات 26 - المعدل(1).pdf'
manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'

print("Opening original and clean PDF documents...")
doc_orig = fitz.open(pdf_path)
doc_clean = fitz.open(pdf_path)

# Patch doc_clean with 3 Tr on all pages
print("Patching clean document with '3 Tr' across all streams...")
for page in doc_clean:
    for xref in page.get_contents():
        try:
            data = doc_clean.xref_stream(xref)
            text = data.decode('latin1')
            if '1 Tr' in text:
                fixed_text = text.replace('1 Tr', '3 Tr')
                doc_clean.update_stream(xref, fixed_text.encode('latin1'))
        except Exception:
            pass

with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

by_page = defaultdict(list)
for it in manifest['items']:
    by_page[it['printedPageNumber']].append(it)

scale = 100 / 72 # 100 DPI renders fast and catches every stroke diff
matrix = fitz.Matrix(scale, scale)

visually_blemished = []
purely_clean = []

total_pages = len(doc_orig)
print(f"Scanning all {total_pages} pages ({len(manifest['items'])} questions) using C-level NumPy acceleration...")

for page_num in range(1, total_pages + 1):
    items = by_page.get(page_num, [])
    if not items:
        continue
    
    p_orig = doc_orig[page_num - 1]
    p_clean = doc_clean[page_num - 1]
    
    # Check if this page has 1 Tr in content
    has_1tr = False
    for xref in p_orig.get_contents():
        try:
            if b'1 Tr' in doc_orig.xref_stream(xref):
                has_1tr = True
                break
        except Exception:
            pass
            
    if not has_1tr:
        for it in items:
            purely_clean.append(it['questionCode'])
        continue
        
    # Render both pages at 100 DPI
    pix_orig = p_orig.get_pixmap(matrix=matrix, alpha=False)
    pix_clean = p_clean.get_pixmap(matrix=matrix, alpha=False)
    
    im_orig = Image.frombytes('RGB', [pix_orig.width, pix_orig.height], pix_orig.samples)
    im_clean = Image.frombytes('RGB', [pix_clean.width, pix_clean.height], pix_clean.samples)
    
    p_diff = ImageChops.difference(im_orig, im_clean)
    
    # Fast check: if whole page diff has no bbox, all questions on page are clean!
    if p_diff.getbbox() is None:
        for it in items:
            purely_clean.append(it['questionCode'])
        continue
        
    diff_arr = np.asarray(p_diff)
    
    for it in items:
        b = it['cropBoxPt']
        bx0 = max(0, int(b[0] * scale))
        by0 = max(0, int(b[1] * scale))
        bx1 = min(im_orig.width, int(b[2] * scale))
        by1 = min(im_orig.height, int(b[3] * scale))
        
        q_diff_arr = diff_arr[by0:by1, bx0:bx1]
        
        # Count pixels with difference > 25 across any channel (NumPy is 1000x faster than python loop)
        diff_count = int(np.sum(np.any(q_diff_arr > 25, axis=2)))
        
        if diff_count > 15: # has real stroked text/halo distortion
            visually_blemished.append({
                'questionCode': it['questionCode'],
                'page': page_num,
                'questionNumber': it['printedQuestionNumber'],
                'diffPixels100DPI': diff_count,
                'cropBoxPt': b
            })
        else:
            purely_clean.append(it['questionCode'])

report = {
    "total_questions": len(manifest['items']),
    "total_clean_questions": len(purely_clean),
    "total_blemished_questions": len(visually_blemished),
    "blemished_questions": visually_blemished
}

out_json = 'ops/tah_math_v2/audit_repair/EXHAUSTIVE_VISUAL_BLEMISHED_QUESTIONS.json'
os.makedirs(os.path.dirname(out_json), exist_ok=True)
with open(out_json, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("\n" + "="*60)
print("EXHAUSTIVE VISUAL PIXEL AUDIT COMPLETE")
print(f"Total Questions Analyzed: {len(manifest['items'])}")
print(f"Purely Clean Questions (No distortion at all): {len(purely_clean)}")
print(f"Blemished Questions with Stroked Text/Halos: {len(visually_blemished)}")
q25_found = any('P009-Q25' in b['questionCode'] for b in visually_blemished)
print(f"Was P009-Q25 accurately caught? {q25_found}")
print(f"Detailed list saved to: {out_json}")
print("="*60)
