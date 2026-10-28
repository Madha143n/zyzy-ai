
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = String(process.env.GEMINI_API_KEY || "").trim();

const MODEL = String(
  process.env.GEMINI_MODEL || "gemini-3.8-flash"
)
  .trim()
  .replace(/\s+/g, "");


app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "zyzy-backend",
    model: MODEL,
    apiKeyConfigured: Boolean(API_KEY)
  });
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

app.post("/api/chat", async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({
      error: "Gemini API key is not configured on the server."
    });
  }

  const message =
    typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

  const agent =
    typeof req.body?.agent === "string"
      ? req.body.agent.slice(0, 60)
      : "Personal Assistant";

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  if (message.length > 8000) {
    return res.status(413).json({
      error: "Message is too long. Maximum 8,000 characters."
    });
  }

  const prompt = `
You are ZYZY, a personal AI assistant inspired by the
experience of a natural, intelligent human conversation.

PERSONALITY:
- Speak naturally, warmly, and confidently.
- Adapt your tone to the situation.
- Be friendly in casual conversations.
- Be empathetic when the user is upset or stressed.
- Be clear and professional for technical or serious topics.
- Avoid robotic greetings, repetitive phrases, and unnecessary
  introductions.
- For a simple greeting, reply briefly and naturally.
- Ask follow-up questions only when they are genuinely useful.
- Remember and use the conversation context provided below.
- Never pretend to remember information that is not provided.
- Never claim to have completed an action you did not perform.
- Match the user's language when possible, including Tamil,
  English, and Tanglish.

CURRENT MODULE: ${agent}

CONVERSATION HISTORY:
${JSON.stringify(
  Array.isArray(req.body?.history)
    ? req.body.history
        .filter(
          (m) =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        )
        .slice(-12)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 3000)
        }))
    : []
)}

CURRENT USER MESSAGE:
${message}

Respond to the current message naturally and use the supplied
conversation history when relevant.
`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(MODEL)}:generateContent` +
    `?key=${encodeURIComponent(API_KEY)}`;

  let lastStatus = 503;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        }),
        signal: AbortSignal.timeout(60000)
      });

      const payload = await upstream.json().catch(() => ({}));

      if (upstream.ok) {
        const reply = (
          payload.candidates?.[0]?.content?.parts || []
        )
          .map((part) => part.text || "")
          .join("\n")
          .trim();

        if (!reply) {
          console.error("Gemini returned no text.");
          return res.status(502).json({
            error: "Gemini returned no reply. Please try again."
          });
        }

        return res.json({ reply, model: MODEL });
      }

      lastStatus = upstream.status;

      const retryable = [429, 500, 502, 503, 504].includes(
        upstream.status
      );

      console.error(
        `Gemini API error: ${upstream.status}; attempt ${attempt + 1}/3`,
        payload?.error?.message || ""
      );

      if (!retryable) {
        if ([400, 401, 403].includes(upstream.status)) {
          return res.status(502).json({
            error: "Gemini rejected the request. Check API key permissions, API access, and model settings."
          });
        }

        return res.status(502).json({
          error: "Gemini request failed. Please check the server logs."
        });
      }

      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
      }
    } catch (err) {
      console.error(
        `Gemini connection error; attempt ${attempt + 1}/3:`,
        err.message
      );

      lastStatus = 503;

      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  const busy = [429, 500, 502, 503, 504].includes(lastStatus);

  return res.status(503).json({
    error: busy
      ? "Gemini is temporarily busy or unavailable. Please try again shortly."
      : "Gemini request failed. Please try again."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ZYZY listening on port ${PORT}`);
});
