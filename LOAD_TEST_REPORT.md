# Load Test Report

## Status

Not executed yet in this sprint. The project now has the production-hardening checklist needed before formal pressure testing.

## Required Scenarios

- Login and session refresh.
- Home/bootstrap content loading.
- Student path and subject loading.
- Quiz start and submit.
- Student results page.
- Admin dashboard loading.

## Target Levels

- 100 concurrent students: pilot readiness.
- 500 concurrent students: paid launch minimum target.
- 1000 concurrent students: scaling decision point.

## Recommended Tools

- k6 for scenario-based traffic.
- autocannon for API endpoint pressure.
- Render and MongoDB metrics during the run.

## Output Needed

Each run should record latency p50/p95/p99, error rate, Render CPU/memory, MongoDB slow queries, and recommended scaling changes.
