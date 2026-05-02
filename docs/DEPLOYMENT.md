# Deployment Guide

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

## 3. Database (MongoDB Atlas)
1.  Create a generic M0 (Free) Cluster.
2.  Create a Database User.
3.  Network Access: Allow `0.0.0.0/0` (or specific IPs for tighter security).
4.  Use the `almeaa` database name in the connection string so production data lands in the same database Render reads from.
