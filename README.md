# ZYZY Complete Setup — Frontend + Node.js + Gemini

This package keeps the original ZYZY UI and adds a Node.js backend endpoint for Gemini. It is source code, not an APK, and it is not already deployed online.

## Included
- Original ZYZY interface, styles, PWA files and local task/activity UI
- `server.js`: Express backend, `/api/health`, and `/api/chat`
- Gemini API call performed on the server; API key is not embedded in browser files
- `render.yaml`, `package.json`, `.env.example`, `.gitignore`

## Deploy from an Android phone (GitHub + Render)
1. Create/sign in to GitHub at https://github.com/.
2. Create a new repository (for example `zyzy-gemini`). Keep it private if you prefer.
3. Upload the *contents* of this folder to the repository root. Ensure `package.json`, `server.js`, `render.yaml`, and `public/` are at the root level (not buried inside another folder).
4. Open https://render.com/ and sign in with GitHub.
5. Choose **New + → Web Service**, select the `zyzy-gemini` repository, and deploy. If Render reads `render.yaml`, verify the service settings before creating it.
6. In the Render service dashboard, open **Environment** and add:
   - Key: `GEMINI_API_KEY`
   - Value: your Gemini API key
   Save changes and redeploy if prompted.
7. After deploy, open your service URL. Check `/api/health` at the end of the URL; it should return JSON with `ok: true` and `apiKeyConfigured: true`.
8. Return to the main service URL, type a test prompt into ZYZY, and press the arrow.

## Important
- Never put the API key in `public/app.js`, `public/index.html`, GitHub, screenshots, or chat messages.
- If you already committed a real API key publicly, revoke it and create a replacement.
- Render Free web services can spin down when idle and may take time to respond on the next request. This package does not keep a free server awake. For an always-on service, select a currently available paid plan or a suitable VM and check its current pricing/terms.
- Gemini use may have quotas or charges depending on the account/model. Check Google AI Studio billing and rate limits.
- Speech recognition depends on browser support and microphone permission. This is not an always-listening wake-word agent.
- This package does not control other phone apps or automatically upload videos.
- `GEMINI_MODEL` defaults to `gemini-2.5-flash`; change it in the hosting environment if that model is unavailable to your account.
