# Codex Schools Handoff

## Current Goal

Close the schools item completely.

## Base Commit

- `7fad0757` Confirm school roster removal actions.

## Last Completed

Secured removal actions inside schools management:

- Remove school supervisor.
- Remove class supervisor.
- Remove student from class.
- Each action now requires a clear confirmation before removal.

## Cleanup Completed

- Reduced untracked files from 840 to 2.
- Updated `.gitignore` with local audit and verification artifact rules.

## Remaining To Close Schools

1. Test school supervisor and class supervisor permissions from the supervisor dashboard.
2. Verify student reports and skill reports for supervisors by school and class.
3. Visually test adding and editing classes and students after real data exists.
4. Cover the case where a student is visible inside a class.
5. Review that there is no duplication between school operations and the school follow-up portal.

## Work Rule

- No new account starts from scratch.
- Read this file first.
- Read only the last 5 commits.
- Continue from the first incomplete checkpoint.
- Do not use `git add .`.
- Do not open goals outside schools.
