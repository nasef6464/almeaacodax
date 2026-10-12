import os
import sys
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from PIL import Image
import numpy as np

R2_MAP_PATH = 'ops/phys26/PHYS26_R2_URL_MAP.json'
OUT_DIR = 'ops/phys26/cleaned_images'
LOCAL_BATCH_DIR = 'ops/phys26/batches/images'
MANIFEST_OUT = 'ops/phys26/PHYS26_CLEANED_MANIFEST.json'

os.makedirs(OUT_DIR, exist_ok=True)

with open(R2_MAP_PATH, 'r', encoding='utf-8') as f:
    r2_map = json.load(f)

print(f'Loaded R2 map with {len(r2_map)} items.')

def clean_and_crop(im):
    arr = np.array(im.convert('RGB'))
    w, h = im.size

    # 1. Right badge cut
    diffs = []
    for x in range(w - 76, w - 48):
        d = np.mean(np.abs(arr[:, x, :].astype(float) - arr[:, x + 1, :].astype(float)))
        diffs.append((d, x))
    diffs.sort(reverse=True)
    best_x = diffs[0][1]

    cut_w = w - best_x
    if 50 <= cut_w <= 78:
        cut_x = best_x
    else:
        cut_x = w - 62

    # 2. Bottom extraneous text trim
    cropped_arr = arr[:, :cut_x, :]
    white_streak = 0
    cut_y = h
    saw_bottom = False

    for y in range(h - 1, int(h * 0.5), -1):
        row = cropped_arr[y, :, :]
        is_white = np.mean(row) > 250 and np.min(row) > 220
        if not is_white:
            if white_streak >= 30:
                cut_y = y + 10
                break
            saw_bottom = True
            white_streak = 0
        else:
            if saw_bottom:
                white_streak += 1

    cropped = im.crop((0, 0, cut_x, cut_y))
    return cropped, cut_w, (h - cut_y)

def fetch_image_with_retry(code, entry, max_retries=5):
    local_path = os.path.join(LOCAL_BATCH_DIR, f'{code}.webp')
    if os.path.exists(local_path):
        try:
            return Image.open(local_path)
        except Exception:
            pass

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(entry['publicUrl'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return Image.open(resp)
        except Exception as e:
            if attempt == max_retries:
                raise e
            time.sleep(0.5 * attempt)

def process_item(code, entry):
    out_file = os.path.join(OUT_DIR, f'{code}.webp')

    # If already generated successfully, just read metadata
    if os.path.exists(out_file) and os.path.getsize(out_file) > 500:
        with open(out_file, 'rb') as f:
            file_bytes = f.read()
            new_hash = sha256(file_bytes).hexdigest()
        im = Image.open(out_file)
        return {
            'questionCode': code,
            'origSize': None,
            'cleanedSize': im.size,
            'cutRight': None,
            'cutBottom': None,
            'sizeBytes': len(file_bytes),
            'newHash': new_hash,
            'filePath': out_file,
            'origKey': entry['key'],
        }

    im = fetch_image_with_retry(code, entry)
    orig_size = im.size
    cleaned, cut_w, cut_h = clean_and_crop(im)
    cleaned.save(out_file, 'WEBP', quality=95)

    with open(out_file, 'rb') as f:
        file_bytes = f.read()
        new_hash = sha256(file_bytes).hexdigest()

    return {
        'questionCode': code,
        'origSize': orig_size,
        'cleanedSize': cleaned.size,
        'cutRight': cut_w,
        'cutBottom': cut_h,
        'sizeBytes': len(file_bytes),
        'newHash': new_hash,
        'filePath': out_file,
        'origKey': entry['key'],
    }

def main():
    items = list(r2_map.items())
    results = {}
    errors = []
    completed = 0

    print(f'Starting processing with retry...')
    with ThreadPoolExecutor(max_workers=12) as executor:
        future_to_code = {executor.submit(process_item, code, entry): code for code, entry in items}
        for future in as_completed(future_to_code):
            code = future_to_code[future]
            try:
                res = future.result()
                results[code] = res
                completed += 1
                if completed % 200 == 0 or completed == len(items):
                    print(f'Progress: {completed}/{len(items)} processed ({len(errors)} errors)')
            except Exception as e:
                errors.append({'code': code, 'error': str(e)})
                print(f'Error processing {code}: {e}')

    if errors:
        print(f'Encountered {len(errors)} errors!')
        with open('ops/phys26/PHYS26_RECROP_ERRORS.json', 'w', encoding='utf-8') as f:
            json.dump(errors, f, indent=2)
        sys.exit(1)

    print(f'ALL {len(results)}/{len(items)} ITEMS SUCCESSFULLY PROCESSED AND SAVED (0 ERRORS)!')
    with open(MANIFEST_OUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f'Saved manifest to {MANIFEST_OUT}')

    widths = [r['cleanedSize'][0] for r in results.values()]
    print('--- RECROP STATISTICS ---')
    print(f'Total questions: {len(results)}')
    print(f'Cleaned Width: min={min(widths)}, max={max(widths)}, mean={sum(widths)/len(widths):.1f}')

if __name__ == '__main__':
    main()
