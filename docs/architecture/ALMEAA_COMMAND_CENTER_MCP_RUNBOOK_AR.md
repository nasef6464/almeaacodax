# ALMEAA Command Center — Remote MCP Runbook

> الحالة: MCP CORE MERGED — Developer/Codex code-only bridge in PR #397 — Production OAuth IdP / external connection proof pending.
> التاريخ: 2026-10-06

## الهدف

تعريض نفس Command Tool Layer المستخدمة داخل ALMEAA إلى عملاء خارجيين مثل ChatGPT / Codex وأي عميل MCP متوافق، بدون إعطاء النموذج وصولًا مباشرًا إلى MongoDB أو صلاحية Publish/Delete.

## Endpoint

- MCP: `POST /api/command-center/mcp`
- Protected Resource Metadata:
  - `GET /.well-known/oauth-protected-resource`
  - `GET /.well-known/oauth-protected-resource/api/command-center/mcp`

الخادم يدعم:
- MCP modern stateless revision: `2026-07-28`
- MCP legacy handshake revision: `2025-11-25`

## المصادقة

### Production
OAuth 2.1 Resource Server.

المتغيرات:
- `ALMEAA_MCP_ENABLED=true`
- `ALMEAA_MCP_OAUTH_ISSUER=https://<issuer>`
- `ALMEAA_MCP_OAUTH_AUDIENCE=<resource audience>`
- `ALMEAA_MCP_OAUTH_REQUIRED_SCOPE=almeaa:admin`
- `ALMEAA_MCP_OAUTH_SCOPES=...` ويجب أن تتضمن `developer:read,developer:write` لتفعيل Developer/Codex bridge
- `ALMEAA_MCP_JWKS_CACHE_MS=600000`

الخادم يتحقق من:
- signature عبر JWKS
- issuer
- audience
- expiration
- scopes لكل tool

لا يتم تنفيذ OAuth Authorization Server داخل ALMEAA. يجب استخدام Identity Provider موثوق يدعم OAuth 2.1 / Authorization Code + PKCE / discovery، بدل بناء نظام تفويض مخصص داخل المنصة.

### Service-to-service / controlled testing
يمكن استخدام:
- `ALMEAA_COMMAND_API_KEY`
- `ALMEAA_COMMAND_API_SCOPES`

هذا المسار لا يعطي صلاحية أكثر من الـscopes المعرفة، ويظل بدون Apply/Publish tools عبر MCP.

## MCP Tools الحالية

Read:
- `get_profile`
- `get_skill_tree`
- `get_course_inventory`
- `list_drafts`
- `get_workflow`

Draft write:
- `create_question_drafts`
- `create_quiz_draft`
- `create_course_draft`
- `create_school_setup_draft`

Workflow:
- `plan_workflow`
- `execute_workflow`

Developer/Codex — code only:
- `create_developer_task_draft`
- `get_developer_task_handoff`

سياسة Developer/Codex:
- المستودع المسموح فقط: `nasef6464/almeaacodax`.
- الإنشاء ينتج Draft قابلًا للمراجعة، وليس GitHub mutation مباشرًا.
- handoff لا يُقرأ إلا بعد موافقة بشرية.
- العمليات المسموحة في المواصفة: investigate / patch / test / pull_request.
- Remote MCP لا يمنح merge أو deploy أو content mutation.

## أشياء غير معروضة للـMCP عمدًا

- Approve draft
- Apply approved draft
- Publish
- Delete
- Permission changes
- Raw Mongo queries
- GitHub merge
- GitHub deploy
- Platform content mutation من Developer/Codex tools

هذه العمليات تظل بشرية/داخلية في هذه المرحلة.

## دورة التنفيذ

External Agent:
1. يقرأ البيانات اللازمة.
2. يبني Draft أو Workflow.
3. ينفذ Workflow الآمن عند الحاجة.
4. النتيجة تبقى reviewable.

Admin داخل ALMEAA:
1. يراجع Draft.
2. يعتمد أو يرفض.
3. ينفذ Apply.
4. Publish يبقى خطوة منفصلة.

## Reuse-first للدورات

الـAgent يقرأ:
- Lessons / Videos
- Quizzes
- Library items
- Skills

ثم يبني Course Draft من الموجود أولًا. أي توليد جديد يكون فقط عند وجود فجوة فعلية.

## ملاحظات حماية

- CSRF exemption مقصور على MCP bearer/server-to-server auth.
- Mongo unsafe-key scanning يظل مفعلًا على `params.arguments`.
- modern MCP protocol metadata لا يمر إلى domain writes.
- كل draft/workflow write idempotent.
- كل apply داخلي يسجل Audit.
- apply لا يعني publish.
