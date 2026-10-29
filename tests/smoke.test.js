const test = require("node:test");
const assert = require("node:assert/strict");
const { app, cleanEnv, sanitizeHistory, routeAgent } = require("../server");

test("cleanEnv removes whitespace from model names", () => {
  assert.equal(cleanEnv("  gemini-3.5-flash-lite\n"), "gemini-3.5-flash-lite");
});

test("sanitizeHistory keeps valid messages and limits length", () => {
  const history = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `Message ${i}`
  }));

  history.push({ role: "system", content: "ignored" });
  history.push({ role: "user", content: 123 });

  const result = sanitizeHistory(history);
  assert.equal(result.length, 12);
  assert.ok(result.every(item => ["user", "assistant"].includes(item.role)));
});

test("routeAgent falls back safely", () => {
  assert.equal(routeAgent("Research Assistant"), "Research Assistant");
  assert.equal(routeAgent("Unknown Agent"), "Personal Assistant");
});

test("health endpoint responds", async () => {
  const server = app.listen(0, "127.0.0.1");
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "zyzy-backend");

  server.close();
});
