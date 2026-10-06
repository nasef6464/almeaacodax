import urllib.request
import json
import ssl

BASE_URL = "https://almeaacodax.vercel.app/api"
# Fallback or local check if needed

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    
    headers["Content-Type"] = "application/json"
    body = json.dumps(data).encode("utf-8") if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    context = ssl._create_unverified_context()
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_body)
        except:
            parsed = {"raw": res_body}
        return e.code, parsed
    except Exception as e:
        return 500, {"error": str(e)}

print("Starting Live API Audit Simulation...")
# Test public routes
status, data = make_request(f"{BASE_URL}/courses")
print(f"[Public] GET /courses -> Status: {status}")

status, data = make_request(f"{BASE_URL}/quizzes")
print(f"[Public] GET /quizzes -> Status: {status}")
