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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
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
