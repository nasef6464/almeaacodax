# Live AI Runtime Audit

- Generated: 2026-05-31T22:35:10.197Z
- API: https://almeaacodax-k2ux.onrender.com/api
- Provider: gemini
- Routing: manual / admin
- Readiness score: 84
- Post-chat readiness score: 82
- Student chat: provider=none, fallback=true
- Fallback reason: gemini: Gemini request failed with status 429: { "error": { "code": 429, "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash Please retry in 50.835957518s.", "sta | ollama: fetch failed | lmstudio: fetch failed
- Checks: PASS 6, REVIEW 2

## Checks
- [PASS] ai status endpoint is reachable
- [PASS] admin readiness endpoint is reachable
- [PASS] provider order comes from admin integrations
- [PASS] at least one real provider is configured
- [REVIEW] configured provider live test succeeds
- [PASS] student chat endpoint responded
- [REVIEW] student chat used a real provider
- [PASS] post-chat readiness reflects fallback pressure
