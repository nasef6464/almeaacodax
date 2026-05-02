# Deployment Guide

## Current Production Snapshot

- GitHub repo: `https://github.com/nasef6464/almeaacodax`
- Production branch: `main`
- Render service: `almeaacodax`
- Render primary URL: `https://almeaacodax-k2ux.onrender.com`
- Backend API base: `https://almeaacodax-k2ux.onrender.com/api`
- Vercel production domain: `https://almeaacodax.vercel.app`
- Vercel preview/main domain: `https://almeaacodax-git-main-nasefs-projects-18e6bdb1.vercel.app`
- MongoDB Atlas project: `almeaacodax`
- MongoDB Atlas cluster: `almeaa`
- Production database name: `almeaa`

Do not commit real passwords, API keys, or JWT secrets. Keep secrets only in Render/Vercel/Atlas.

## 1. Backend (Render.com)
1.  Create a **Web Service**.
2.  **Repo:** Connect the GitHub repo.
3.  **Root Directory:** `server`
4.  **Build Command:** `npm install && npm run build`
5.  **Start Command:** `npm start`
6.  **Environment Variables:**
    - `NODE_ENV`: production
    - `PORT`: 10000
    - `MONGODB_URI`: `mongodb+srv://nasef64:<db_password>@almeaa.5y2fzx5.mongodb.net/almeaa?appName=almeaa`
    - `JWT_SECRET`: (Random 64-char string)
    - `CLIENT_URL`: `https://almeaacodax.vercel.app`
    - `ADMIN_EMAIL`: production admin email
    - `ADMIN_NAME`: production admin display name
    - `ADMIN_PASSWORD`: production admin password, kept only in Render
    - `DEV_LOCAL_ADMIN_BYPASS`: `false`
    - `AI_PROVIDER`: `gemini`, `ollama`, or `none` (optional)
    - `GEMINI_API_KEY`: (Google AI Key)
    - `GEMINI_MODEL`: Gemini model name, defaults to `gemini-2.5-flash`
    - `OLLAMA_BASE_URL`: Ollama server URL, defaults to `http://127.0.0.1:11434`
    - `OLLAMA_MODEL`: Ollama model name, defaults to `gemma3:4b`

> Production note: Render cannot call Ollama on your personal computer. Use `AI_PROVIDER=gemini` on Render, or host Ollama/Gemma on a reachable private server and set `OLLAMA_BASE_URL` to that server.

## 2. Frontend (Vercel)
1.  Create a **New Project**.
2.  **Repo:** Connect the GitHub repo.
3.  **Root Directory:** `.` (Project Root)
4.  **Build Command:** `npm run build`
5.  **Output Directory:** `dist`
6.  **Environment Variables:**
    - `VITE_API_URL`: `https://almeaacodax-k2ux.onrender.com/api`

Set `VITE_API_URL` for both Production and Preview environments if preview deployments should talk to the same Render backend.

## 3. Database (MongoDB Atlas)
1.  Create a generic M0 (Free) Cluster.
2.  Create a Database User.
3.  Network Access: Allow `0.0.0.0/0` (or specific IPs for tighter security).
4.  Use the `almeaa` database name in the connection string so production data lands in the same database Render reads from.

## Current Seeded Test Accounts

Use these only for operational testing and rotate credentials before a public launch:

| Role | Email | Password |
|---|---|---|
| Admin | `nasef64@gmail.com` | stored in Render only |
| Teacher | `teacher.quant@almeaa.local` | `Teacher@123` |
| Student | `student.a@almeaa.local` | `Student@123` |
| Parent | `parent.a@almeaa.local` | `Parent@123` |
| Supervisor | `supervisor.group@almeaa.local` | `Supervisor@123` |

## Current Verification Status

- Render build: successful from GitHub `main`.
- Render health: `/api/health` returns `status=ok` and `database=connected`.
- MongoDB Atlas data size observed after seed: about `2.03 MB`.
- Admin inventory through Render shows seeded users.
- Latest smoke test: `48/53` checks passed. Remaining gaps are missing demo content for some learning spaces and teacher analytics seed depth.
