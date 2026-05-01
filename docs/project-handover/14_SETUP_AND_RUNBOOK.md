# Setup and Runbook

## Install dependencies
### Root
```bash
npm install
```

### Backend
```bash
npm --prefix server install
```

## Configure environment variables
### Frontend
- `VITE_USE_REAL_API`
- `VITE_API_URL`

### Backend
Copy `server/.env.example` to `server/.env` and set the documented variables:
- `PORT`
- `CLIENT_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `DEV_LOCAL_ADMIN_BYPASS`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AI_PROVIDER`
- `AI_REQUEST_TIMEOUT_MS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `LM_STUDIO_BASE_URL`
- `LM_STUDIO_MODEL`

## Run locally
### Frontend only
```bash
npm run dev
```

### Backend only
```bash
npm run server:dev
```

### Recommended local full stack
1. Start MongoDB locally or provide Atlas.
2. Start backend with `npm run server:dev`
3. Start frontend with `npm run dev`

## Run local MongoDB (Windows helper)
From `README.md`:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-mongo.ps1
```

Stop it when finished:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-local-mongo.ps1
```

## Run migrations / seeds
No formal migration framework was visible.  
Use the available seed scripts:
- `npm --prefix server run seed:admin`
- `npm --prefix server run seed:platform`
- `npm --prefix server run seed:courses:api`
- `npm --prefix server run seed:users`
- `npm --prefix server run seed:operational`
- `npm --prefix server run seed:operational:api`
- `npm --prefix server run seed:learning:api`

## Run tests / checks
```bash
npm run lint
npm run typecheck
npm run server:check
npm run smoke:operational
npm --prefix server run smoke:operational:api
```

## Build
### Frontend
```bash
npm run build
```

### Backend
```bash
npm run server:build
```

### Start built backend
```bash
npm --prefix server run start
```

## Deployment
No explicit deployment manifest was clearly visible in the inspected repository.  
What is visible:
- frontend is a Vite build
- backend is a compiled Node/Express service
- environment variables drive runtime behavior

## Common errors and solutions
| Error | Likely cause | Suggested fix |
|---|---|---|
| Backend fails to start | Missing `MONGODB_URI` or `JWT_SECRET` | Check `server/.env` |
| Frontend cannot reach API | `VITE_API_URL` or `CLIENT_URL` mismatch | Make frontend and backend origins match |
| Auth seems broken locally | Local admin bypass disabled or bootstrap user missing | Seed admin and confirm env settings |
| AI endpoints fail | AI provider not configured | Set `AI_PROVIDER` and provider-specific envs |
| Content looks empty | Seeds were not run or path filters hide content | Check taxonomy bootstrap and active paths |

## Production readiness checklist
- [ ] MongoDB production connection confirmed
- [ ] JWT secret set securely
- [ ] Frontend origin allowed in CORS
- [ ] AI provider configured or disabled intentionally
- [ ] Seed/admin bootstrapping documented
- [ ] File storage strategy confirmed
- [ ] Payment workflow confirmed
- [ ] Legacy fallback behavior documented
- [ ] Smoke tests run successfully
- [ ] Deployment target confirmed

