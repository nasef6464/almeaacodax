# Runtime resources and bandwidth — bounded snapshot

2026-10-14; baseline main `4f166a2d42befb929cf087e05f19ca866917b212`. Read-only Render/Atlas/Vercel inspection; no load test, configuration/plan changes, migration or domain/index writes. This continues the completed PR549 relationship/retention audit. Numbers describe existing observed traffic, not thousands of concurrent students.

## Findings

| Resource | Observation | Boundary |
| --- | --- | --- |
| Render API | free runtime plan, Frankfurt,1 configured instance;0.15CPU and536870900bytes memory limit (~512MiB) | buildPlan starter is separate from the free service runtime plan |
| Memory |17 returned hourly-query points:137383940–224022530bytes (~131–214MiB); highest sample41.73% of limit | not a continuous peak or leak assessment |
| Recent CPU | five returned points in08:00–09:00UTC with MAX/300-second query, maximum0.00481955CPU (~3.21% of0.15limit) | the broader24h CPU query was empty; five samples do not prove all-hour or peak behavior |
| Render outbound24h query |21 returned hourly buckets total54.37005588mb, requested2026-10-13 09:00 through2026-10-14 09:00UTC | first returned timestamp11:00,last08:00; missing buckets are not assumed zero |
| Render outbound7day query |128 returned hourly buckets total483.39302700mb, requestedOctober7 09:00 throughOctober14 09:00UTC | values cover returned service buckets only, not whole-platform transfer or a monthly invoice |
| Atlas almeaa | FREE, AWS AP_SOUTHEAST_1, Mongo8.0.34;111collections/37049objects/600indexes | Master Control records this production cluster; live URI binding and current connection headroom were not inspected here |
| Database sizes | logical data75436403bytes (~71.94MiB), allocated data32591872bytes (~31.08MiB), indexes24743936bytes (~23.60MiB) | compressed allocation, logical size and index size are different; do not mix them or infer cluster quota headroom |

Provider memory/CPU limits and observed samples were retrieved from the exact existing service. The first metrics call lacked workspace context; the successful retry passed the service owner's matching sole listed workspace explicitly, without changing global workspace selection. No workspace contact details were retained. Per-instance metric labels across successive deployments are not a concurrent instance count; configured instance count comes from service metadata.

Public health on the same baseline returned200live/200ready, ready=true, status=ok, database connected and all database/Redis rate-limit/Redis queue checks pass. scaleReady=true is this application's Redis-configuration/health flag, not a throughput or capacity certificate. Only two ordinary public GETs were used; no authentication, fixtures or production pressure. Snapshot is retained in the JSON receipt.

## Missing visibility and attempted safe alternatives

Render24h request-count/latency and recent request-count series were empty; instance-count telemetry was empty. Empty means unavailable, not zero requests/errors. Memory and short-window CPU returned sparse data. The service metadata has an empty custom healthCheckPath; existing public health works, but no provider configuration was changed or claimed fixed.

Vercel schema discovery succeeds, but the initial legacy observability query returns400bad_request (its result/scope remains unproven). The configuration endpoint separately returns404 'Observability Plus is not enabled'. Installed CLI50.3.1 rejects metrics as an unsupported subcommand. No CLI installation/update, authentication flow or paid Observability subscription was started. Billing charges forOctober13 00:00 toOctober14 00:00UTC return404costs_not_found; this does not mean a zero invoice. Render workspace billing, Vercel transfer/billing, Atlas billing and object-storage/media costs remain unverified. No total platform bill or total bandwidth is reported.

The existing /api and /socket.io Vercel rewrites route to Render. Render egress and Vercel transfer represent different provider accounting boundaries and must not be treated as one complete or deduplicated bill. Keeping media on the existing external storage/provider path and immutable static-asset caching remains the current design; no media, API or cache policy was changed.

Source Mongo pool defaults remain max30/min2 with existing selection/socket/idle timeouts; these are source defaults, not observed runtime overrides or active connection counts. Do not multiply the samples into a10000-student admission promise or infer a bandwidth leak from a service-only total.

## Interpretation and next decisions

The measured sparse samples show modest usage, but the current free single-instance service is not a certified production-scale deployment. [Render's Free documentation](https://render.com/docs/free) explicitly describes its production limitations, including idle spin-down and a single instance. [Render's metrics documentation](https://render.com/docs/service-metrics) defines outbound points as previous-hour amounts with delayed availability. [Outbound accounting](https://render.com/docs/outbound-bandwidth) includes service-initiated public traffic. Thus returned hourly buckets may be summed, but they are not an invoice or a lossless current-window total.

Frankfurt/API and the recorded Singapore production cluster preserve an existing topology optimization debt. Cross-region RTT overhead is a risk/inference, not a measured latency cause here; the live URI and query RTT were not re-inspected. The historical bounded PLAN2 tests remain their own evidence; this audit neither reopens that old closure nor extends it to10k concurrency. No database region/cutover or infrastructure purchase is performed.

Next: obtain actual provider billing/transfer and connection telemetry where available, choose an appropriate persistent production compute plan only through a concrete owner-approved change, and measure a representative workload on that intended topology in an isolated environment. Preserve existing data, query/RBAC/scoring contracts and free infrastructure during this inspection. Separate retention policy, stale-reference provenance, concurrent command HTTP replay and legacy Saher smoke remain open.

Three existing contracts PASS: DB1 inventory, DB3 query/index and DB4 growth budgets. This change only records observations, arithmetic and current execution state; no new runtime behavior requires a synthetic mirrored test. Exact-head required CI and evidence review govern publication. Numeric values and query parameters are in the adjacent JSON/normalized METRICS ledger, with unavailable data explicitly labeled.
