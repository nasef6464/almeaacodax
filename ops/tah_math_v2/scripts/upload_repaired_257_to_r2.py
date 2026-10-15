import os
import json
import hashlib
import boto3
from botocore.config import Config
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read credentials from server/.env
env_vars = {}
with open('server/.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip()

account_id = env_vars.get('R2_ACCOUNT_ID', 'ec809778b02328f67837a815e6bd27a2')
endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
bucket_name = env_vars.get('R2_BUCKET', env_vars.get('R2_BUCKET_NAME', 'almeaa-media'))
access_key = env_vars.get('R2_ACCESS_KEY_ID')
secret_key = env_vars.get('R2_SECRET_ACCESS_KEY')

print(f"Connecting to Cloudflare R2 bucket: {bucket_name}")
print(f"Endpoint: {endpoint_url}")

s3_client = boto3.client(
    's3',
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(signature_version='s3v4', max_pool_connections=25)
)

manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

manifest_by_code = {it['questionCode']: it for it in manifest['items']}

blemish_path = 'ops/tah_math_v2/audit_repair/FAST_BLEMISHED_QUESTIONS_EXACT.json'
with open(blemish_path, 'r', encoding='utf-8') as f:
    blemish_data = json.load(f)

target_list = blemish_data['blemished_questions']
print(f"Uploading {len(target_list)} repaired crops to R2...")

crops_dir = 'ops/tah_math_v2/crops'

def upload_file(q_info):
    code = q_info['questionCode']
    file_path = os.path.join(crops_dir, f"{code}.webp")
    if not os.path.exists(file_path):
        return (code, False, f"File missing: {file_path}")
        
    with open(file_path, 'rb') as f:
        data = f.read()
        
    sha256 = hashlib.sha256(data).hexdigest()
    r2_key = f"tah-math-v2/crops/{code}/{sha256}.webp"
    public_url = f"https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/{r2_key}"
    
    # Update manifest item
    item = manifest_by_code.get(code)
    if item:
        item['sha256'] = sha256
        item['r2Key'] = r2_key
        item['imageUrl'] = public_url
        item['fileSizeBytes'] = len(data)
        
    # Upload to R2
    s3_client.put_object(
        Bucket=bucket_name,
        Key=r2_key,
        Body=data,
        ContentType='image/webp',
        CacheControl='public, max-age=31536000, immutable'
    )
    return (code, True, r2_key)

uploaded = 0
failed = 0
errors = []

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = [executor.submit(upload_file, q) for q in target_list]
    for fut in as_completed(futures):
        code, ok, res = fut.result()
        if ok:
            uploaded += 1
        else:
            failed += 1
            errors.append((code, res))
            print(f"Error {code}: {res}")
            
        sys.stdout.write(f"\rProgress: {uploaded}/{len(target_list)} uploaded, {failed} failed")
        sys.stdout.flush()

print(f"\nUpload complete: {uploaded} successfully uploaded to R2, {failed} failed.")

# Save updated manifest
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"Manifest successfully updated: {manifest_path}")

report = {
    "timestamp": "2026-10-15T06:55:00Z",
    "total_target": len(target_list),
    "uploaded": uploaded,
    "failed": failed,
    "errors": errors
}
with open('ops/tah_math_v2/audit_repair/R2_UPLOAD_REPORT_257.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print("Saved R2 upload report to: ops/tah_math_v2/audit_repair/R2_UPLOAD_REPORT_257.json")
