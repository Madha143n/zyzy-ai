const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "zyzy-backend", model: MODEL, apiKeyConfigured: Boolean(API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: "Server admin must set GEMINI_API_KEY in hosting environment variables." });
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const agent = typeof req.body?.agent === "string" ? req.body.agent.slice(0, 60) : "Personal Assistant";
    if (!message) return res.status(400).json({ error: "Message is required." });
    if (message.length > 8000) return res.status(413).json({ error: "Message is too long (maximum 8,000 characters)." });

    const prompt = `You are ZYZY, a helpful personal AI assistant. Current module: ${agent}. Answer clearly and accurately. Do not claim you performed actions outside this chat. If a request needs an external action, explain the limitation and provide safe steps.\n\nUser request:\n${message}`;
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(45000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = payload?.error?.message || `Gemini API returned HTTP ${upstream.status}`;
      console.error("Gemini API error:", upstream.status, detail);
      return res.status(502).json({ error: "Gemini request failed. Check API key, API access, quota, and model settings." });
    }
    const reply = (payload.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("\n").trim();
    if (!reply) return res.status(502).json({ error: "Gemini returned no text. Try again." });
    res.json({ reply, model: MODEL });
  } catch (err) {
    console.error("Chat endpoint error:", err.message);
    res.status(500).json({ error: "Backend request failed or timed out. Please try again." });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`ZYZY listening on port ${PORT}`));
