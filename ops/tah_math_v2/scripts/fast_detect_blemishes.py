import fitz
import json
import os
import sys
import re
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = 'ops/tah_math_v2/handoff/01_SOURCE_BOOKS/كتاب تجميعات يلو للرياضيات 26 - المعدل(1).pdf'
manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'

print("Loading manifest and PDF...")
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

doc = fitz.open(pdf_path)

# Load the 74 ghosted pages from our previous audit
with open('ops/tah_math_v2/audit_repair/TAH_MATH_FULL_BANK_AUDIT_REPORT.json', 'r', encoding='utf-8') as f:
    audit_data = json.load(f)
ghosted_pages_set = set(audit_data['ghosted_pages_list'])
print(f"Targeting {len(ghosted_pages_set)} ghosted pages out of {len(doc)} total pages.")

# Group questions by page
questions_by_page = defaultdict(list)
for it in manifest['items']:
    p_num = it['printedPageNumber']
    questions_by_page[p_num].append(it)

blemished_questions = []
clean_questions = []

latin_math_regex = re.compile(r'[A-Za-z0-9\+\-\=\<\>\∠\°\≅\√]')

for page_num in sorted(questions_by_page.keys()):
    items_on_page = questions_by_page[page_num]
    
    if page_num not in ghosted_pages_set:
        for it in items_on_page:
            clean_questions.append(it['questionCode'])
        continue
        
    page_idx = page_num - 1
    if page_idx >= len(doc):
        for it in items_on_page:
            clean_questions.append(it['questionCode'])
        continue
        
    page = doc[page_idx]
    # Get all spans on page ONCE
    pdict = page.get_text('dict')
    page_spans = []
    for b in pdict['blocks']:
        if b.get('type') == 0:
            for l in b.get('lines', []):
                for s in l.get('spans', []):
                    # store span with origin and bbox
                    page_spans.append(s)
                    
    for it in items_on_page:
        code = it['questionCode']
        box = it['cropBoxPt'] # [x0, y0, x1, y1]
        
        # Filter spans belonging to this question
        q_spans = []
        for s in page_spans:
            ox, oy = s['origin']
            if box[0] <= ox <= box[2] and box[1] <= oy <= box[3]:
                q_spans.append(s)
                
        # Check for ghosted latin/math
        has_defect = False
        prev = None
        defect_samples = []
        for s in q_spans:
            t = s.get('text', '').strip()
            if not t:
                continue
            if prev:
                prev_t = prev.get('text', '').strip()
                dx = abs(s['origin'][0] - prev['origin'][0])
                dy = abs(s['origin'][1] - prev['origin'][1])
                if t == prev_t and dx < 12 and dy < 2 and latin_math_regex.search(t):
                    has_defect = True
                    defect_samples.append(t)
            prev = s
            
        if has_defect:
            blemished_questions.append({
                "questionCode": code,
                "page": page_num,
                "questionNumber": it['printedQuestionNumber'],
                "defectSamples": list(set(defect_samples))[:6],
                "cropBoxPt": box,
                "pixelDimensions": it.get('pixelDimensions')
            })
        else:
            clean_questions.append(code)

out_report = {
    "total_questions": len(manifest['items']),
    "total_clean_questions": len(clean_questions),
    "total_blemished_questions": len(blemished_questions),
    "blemished_questions": blemished_questions
}

out_path = 'ops/tah_math_v2/audit_repair/FAST_BLEMISHED_QUESTIONS_EXACT.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out_report, f, ensure_ascii=False, indent=2)

print("\n" + "="*60)
print(f"FAST BLEMISH AUDIT COMPLETE")
print(f"Total Questions: {len(manifest['items'])}")
print(f"Total Clean Questions (No Action Needed): {len(clean_questions)}")
print(f"Total Blemished Questions (Need Defect Repair): {len(blemished_questions)}")
print(f"Saved exact list to: {out_path}")
print("Sample blemished questions:")
for b in blemished_questions[:8]:
    print(f"  - {b['questionCode']} (P{b['page']:03d}-Q{b['questionNumber']}): symbols={b['defectSamples']}")
print("="*60)
