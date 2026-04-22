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
    - `MONGO_URI`: (Connection string from Atlas)
    - `JWT_SECRET`: (Random 64-char string)
    - `GEMINI_API_KEY`: (Google AI Key)
    - `CLIENT_URL`: (The Vercel Frontend URL)

## 2. Frontend (Vercel)
1.  Create a **New Project**.
2.  **Repo:** Connect the GitHub repo.
3.  **Root Directory:** `.` (Project Root)
4.  **Build Command:** `npm run build`
5.  **Output Directory:** `dist`
6.  **Environment Variables:**
    - `VITE_API_URL`: (The Render Backend URL, e.g., `https://api-hundred.onrender.com`)

## 3. Database (MongoDB Atlas)
1.  Create a generic M0 (Free) Cluster.
2.  Create a Database User.
3.  Network Access: Allow `0.0.0.0/0` (or specific IPs for tighter security).
4.  Get Connection String for Render.
