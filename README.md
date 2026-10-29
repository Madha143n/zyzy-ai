ZYZY AI

ZYZY AI is a personal AI assistant and modular AI workspace built with Node.js, Express, vanilla HTML/CSS/JavaScript, and Google Gemini.

Current features

- Natural Gemini chat with the required "Boss" personality.
- Browser-persisted conversation history.
- New Chat and Clear History controls.
- Voice input and voice output where browser Web Speech is supported.
- English and Tamil voice selection, with device-dependent limitations.
- Personal tasks and activity log.
- Personal Assistant, Creator Studio, Business Assistant, Research Assistant, Coding Assistant, and Market Watch modules.
- Optional live web research through Tavily when `SEARCH_API_KEY` is configured.
- Gemini primary and fallback model handling.
- Rate limiting, request-size validation, security headers, and sanitized error responses.

Important limitations

- Browser memory is local to the current browser/device. It is not cross-device cloud memory.
- A normal website cannot silently control every Android app or system setting. Android quick links only open supported websites.
- Live research requires a configured research API key.
- Market Watch does not provide live financial data or execute trades.
- No wake word or continuous background listening is implemented.
- No content is published, sent, purchased, or deleted outside the app.

Required Render environment variables

```text
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
PORT=10000
```

`PORT` is normally supplied by Render.

Optional environment variables

```text
SEARCH_API_KEY=your_tavily_key
SEARCH_PROVIDER=tavily
GEMINI_TIMEOUT_MS=60000
GEMINI_MAX_TOKENS=1200
```

If `SEARCH_API_KEY` is not set, the Research Assistant clearly uses general model knowledge and does not claim live browsing.

Local development

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Tests

```bash
npm test
```

Deployment

1. Replace the repository files with the project files.
2. Commit and push to GitHub.
3. In Render, connect the repository.
4. Add the required environment variables.
5. Deploy the web service.
6. Check `/api/health` after deployment.
