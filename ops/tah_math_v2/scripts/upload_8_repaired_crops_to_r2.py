import os
import sys
import json
import hashlib
import urllib.request
from pathlib import Path
import boto3
from botocore.config import Config

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent.parent.parent
CROPS_DIR = ROOT / "ops" / "tah_math_v2" / "repaired_crops"
REPORT_PATH = ROOT / "ops" / "tah_math_v2" / "audit_repair" / "REPAIRED_8_R2_UPLOAD_REPORT.json"
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

# Load server/.env
env_file = ROOT / "server" / ".env"
env = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

account_id = env.get("R2_ACCOUNT_ID", "ec809778b02328f67837a815e6bd27a2")
bucket = env.get("R2_BUCKET", "almeaa-media")
access_key = env.get("R2_ACCESS_KEY_ID")
secret_key = env.get("R2_SECRET_ACCESS_KEY")
public_base_url = env.get("R2_PUBLIC_BASE_URL", "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev").rstrip("/")

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

mapping = [
    ("TAH-MATH-V2-COL26-P005-Q02", "REPAIRED_HOLD_1_P005_Q02.webp"),
    ("TAH-MATH-V2-COL26-P006-Q15", "REPAIRED_HOLD_2_P006_Q15.webp"),
    ("TAH-MATH-V2-COL26OLD-P055-Q42", "REPAIRED_HOLD_3_P055_Q42.webp"),
    ("TAH-MATH-V2-COL26OLD-P129-Q87", "REPAIRED_HOLD_4_P129_Q87.webp"),
    ("TAH-MATH-V2-COL26OLD-P130-Q105", "REPAIRED_HOLD_5_P130_Q105.webp"),
    ("TAH-MATH-V2-COL26-P131-Q06", "REPAIRED_HOLD_6_P131_Q06.webp"),
    ("TAH-MATH-V2-COL26-P132-Q29", "REPAIRED_HOLD_7_P132_Q29.webp"),
    ("TAH-MATH-V2-COL26-P132-Q30", "REPAIRED_HOLD_8_P132_Q30.webp"),
]

print("=== UPLOADING 8 REPAIRED CROPS TO CLOUDFLARE R2 ===")
print(f"Bucket: {bucket}")
print(f"Public Base URL: {public_base_url}\n")

results = []

for qcode, fname in mapping:
    file_path = CROPS_DIR / fname
    if not file_path.exists():
        raise FileNotFoundError(f"File missing: {file_path}")
        
    bytes_data = file_path.read_bytes()
    sha256 = hashlib.sha256(bytes_data).hexdigest()
    r2_key = f"tah-math-v2/crops/{qcode}/{sha256}.webp"
    public_url = f"{public_base_url}/{r2_key}"
    
    print(f"Uploading {qcode} ({fname})...")
    s3.put_object(
        Bucket=bucket,
        Key=r2_key,
        Body=bytes_data,
        ContentType="image/webp",
        CacheControl="public, max-age=31536000, immutable"
    )
    
    # Verify via public HTTP GET
    req = urllib.request.Request(public_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP GET failed with status {resp.status} for {public_url}")
        fetched_bytes = resp.read()
        fetched_sha256 = hashlib.sha256(fetched_bytes).hexdigest()
        if fetched_sha256 != sha256:
            raise RuntimeError(f"SHA256 mismatch for {qcode}: {fetched_sha256} vs {sha256}")
            
    print(f" -> Verified HTTP 200 & SHA256 match: {public_url}")
    results.append({
        "questionCode": qcode,
        "filename": fname,
        "sha256": sha256,
        "r2Key": r2_key,
        "imageUrl": public_url,
        "verified": True
    })

REPORT_PATH.write_text(json.dumps({"timestamp": "2026-10-15T14:15:00Z", "items": results}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nAll 8 crops uploaded and verified successfully! Report written to {REPORT_PATH}")
