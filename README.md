<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f0aa43be-3dac-4592-a5c7-5460f006fcf6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure the backend AI variables in [server/.env](</C:/ALMEAA MAY - codax/server/.env.example>) if you want AI features
3. Run the app:
   `npm run dev`

## Backend Foundation

The project now includes a backend foundation under [server](</C:/ALMEAA MAY - codax/server>).

### Backend prerequisites

1. Install frontend dependencies:
   `npm install`
2. Install backend dependencies:
   `npm --prefix server install`
3. Copy `server/.env.example` to `server/.env`
4. Fill in:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_URL`
5. Run the backend:
   `npm run server:dev`

### AI Engine

The platform uses the backend as the only AI gateway. The frontend never talks to Gemini directly, so keys stay private and the UI stays unchanged.

Default managed provider:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

Local/open-source provider for development labs:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
AI_REQUEST_TIMEOUT_MS=15000
```

Local OpenAI-compatible provider such as LM Studio:

```env
AI_PROVIDER=lmstudio
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=local-model
AI_REQUEST_TIMEOUT_MS=15000
```

Disable AI safely while keeping the platform running:

```env
AI_PROVIDER=none
```

Notes:
- Use `MONGODB_URI` as the single MongoDB variable name.
- Keep AI keys and model endpoints in `server/.env` or hosting environment variables only.
- Ollama/LM Studio style local models are useful for experimentation, while hosted production needs a reachable model endpoint.

### Current production targets

- Frontend: `https://almeaacodax.vercel.app`
- Backend API: `https://almeaacodax-k2ux.onrender.com/api`
- Backend health: `https://almeaacodax-k2ux.onrender.com/api/health`
- MongoDB Atlas: `mongodb+srv://nasef64:<db_password>@almeaa.5y2fzx5.mongodb.net/the-hundred?appName=almeaa`

### Local MongoDB option

This workspace is also prepared to run MongoDB locally on Windows without Atlas.

1. Start local MongoDB:
   `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-mongo.ps1`
   Keep that PowerShell window open while the backend is running.
2. The backend uses:
   `mongodb://127.0.0.1:27017/the-hundred`
3. Seed the first admin user:
   `npm --prefix server run seed:admin`
4. Stop local MongoDB when needed:
   `powershell -ExecutionPolicy Bypass -File .\scripts\stop-local-mongo.ps1`
