# Supervisor → Student → School Flow Repair

Date: 2026-09-05
Branch: `codex/supervisor-student-school-flow`
Base: `3b125e8b5f2d9bf60480b11be01019bc392f466d`

## Proved gaps before implementation

1. `UnifiedQuizBuilder` defaulted `isPublished` and `showOnPlatform` to `true` only for Admin. A Supervisor-created directed assessment could therefore save approved but hidden/unpublished, so the targeted Student catalog would not show it.
2. `UsersManager` changed Student/Supervisor school relationships with multiple independent optimistic add/remove writes. One UI change could race several `PATCH /auth/admin/users/:id` calls and leave `User.schoolId/groupIds` out of sync with `Group.studentIds/supervisorIds`.
3. `PATCH /auth/admin/users/:id` persisted `schoolId/groupIds` but did not reconcile Group membership. Direct Admin edits could therefore create relationship drift even without a frontend race.
4. Cookie-first auth intentionally removes bearer tokens from the stored `SessionUser`, while `NotificationBell` and `useNotificationStream` refused to fetch/connect without `user.token`. In-app alerts could be created successfully but never appear in normal cookie-first sessions.

## Repair boundary

- Keep the existing five roles and current RBAC model.
- Keep existing Quiz/notification/API URLs.
- Make Admin user relationship writes server-authoritative and idempotently reconcile Group membership.
- Keep class-only Supervisor scope class-only; do not infer school-wide authority from the class parent.
- Persist one desired relationship state from Users Manager instead of racing add/remove mutations.
- Make Supervisor-directed assessment creation visible/published by default, matching the backend Supervisor workflow policy.
- Allow notification list/SSE to authenticate through the existing cookie-first session when no bearer token exists.

## Verification required before merge

- Focused structural contract.
- School management and School Portal contracts.
- Notification contracts.
- Frontend + backend typecheck and `git diff --check`.
- Real isolated HTTP journey before merge: Admin relationship update → Supervisor directed assessment → target Student catalog/read → in-app alert → Student notification read; outsider must remain blocked.
