const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "zyzy-jarvis-v6";
const LEGACY_STORAGE_KEY = "zyzy-future-v03";

let state = {
  tasks: [],
  activity: [],
  chatHistory: [],
  archivedChats: [],
  voiceLang: "en-IN"
};

function loadState() {
  let stored = null;

  try {
    stored =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {}

  try {
    if (stored) {
      state = Object.assign(state, JSON.parse(stored));
    }
  } catch {}

  if (!Array.isArray(state.tasks)) state.tasks = [];
  if (!Array.isArray(state.activity)) state.activity = [];
  if (!Array.isArray(state.chatHistory)) state.chatHistory = [];
  if (!Array.isArray(state.archivedChats)) state.archivedChats = [];
  if (typeof state.voiceLang !== "string") state.voiceLang = "en-IN";
}

loadState();

let isRunning = false;
let isResearching = false;
let isSpeaking = false;
let voiceAutoSendTimer = null;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

function setCoreState(value) {
  $("coreState").textContent = value;
}

function setHealth(text, type = "") {
  const badge = $("healthBadge");
  badge.textContent = text;
  badge.className = `status-badge ${type}`.trim();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}

  render();
}

function log(title, detail) {
  state.activity.unshift({
    title,
    detail: String(detail || "").slice(0, 180),
    time: new Date().toLocaleString()
  });

  state.activity = state.activity.slice(0, 10);
}

function routeAgent(text) {
  const value = String(text || "").toLowerCase();

  if (/research|latest|current news|source|links|web search/.test(value))
    return "Research Assistant";

  if (/code|debug|javascript|python|node|express|api|database|sql|git/.test(value))
    return "Coding Assistant";

  if (/youtube|instagram|facebook|caption|reel|video|script|thumbnail|content calendar/.test(value))
    return "Creator Studio";

  if (/stock|share market|trading|crypto|portfolio|nifty|market/.test(value))
    return "Market Watch";

  if (/business|customer|marketing|seo|startup|freelance|plan/.test(value))
    return "Business Assistant";

  return "Personal Assistant";
}

function validMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string"
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 3000)
    }));
}

function renderChatHistory() {
  const box = $("chatHistoryList");
  const messages = state.chatHistory.slice(-24);

  if (!messages.length) {
    box.className = "chat-history empty";
    box.textContent = "No conversation saved yet.";
    return;
  }

  box.className = "chat-history";
  box.innerHTML = messages.map((message) => `
    <article class="chat-message ${message.role === "user" ? "user" : "assistant"}">
      <span class="chat-role">${message.role === "user" ? "Boss" : "ZYZY"}</span>
      ${escapeHtml(message.content)}
    </article>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

function renderTasks() {
  $("taskCount").textContent = state.tasks.filter((task) => !task.done).length;

  if (!state.tasks.length) {
    $("tasks").innerHTML = '<div class="empty">Your task space is clear.</div>';
    return;
  }

  $("tasks").innerHTML = state.tasks.map((task) => `
    <article class="entry">
      <label class="checkline ${task.done ? "done" : ""}">
        <input type="checkbox" data-task-action="toggle" data-task-id="${task.id}" ${task.done ? "checked" : ""}>
        <span>${escapeHtml(task.text)}</span>
      </label>
      <div class="entry-actions">
        <button type="button" data-task-action="delete" data-task-id="${task.id}">Remove</button>
      </div>
    </article>
  `).join("");
}

function renderActivity() {
  if (!state.activity.length) {
    $("activity").innerHTML = '<div class="empty">Waiting for your first action.</div>';
    return;
  }

  $("activity").innerHTML = state.activity.map((item) => `
    <article class="entry">
      <strong>${escapeHtml(item.title)}</strong>
      <div>${escapeHtml(item.detail)}</div>
      <div class="sub">${escapeHtml(item.time)}</div>
    </article>
  `).join("");
}

function updateVoiceButtons() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.voiceLang);
  });
}

function render() {
  renderChatHistory();
  renderTasks();
  renderActivity();
  updateVoiceButtons();
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  isSpeaking = false;
}

function chooseVoice(lang) {
  if (!("speechSynthesis" in window)) return null;

  const prefix = lang === "ta-IN" ? "ta" : "en";
  const voices = speechSynthesis.getVoices();

  return (
    voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => voice.default) ||
    null
  );
}

function speakReply(text) {
  if (!("speechSynthesis" in window)) {
    $("coreTitle").textContent = "Voice output unavailable";
    $("coreDesc").textContent = "Boss, text-to-speech is not supported on this browser.";
    return;
  }

  stopSpeaking();

  const spokenText = String(text || "")
    .replace(/```[\s\S]*?```/g, " Code block. ")
    .replace(/https?:\/\/\S+/g, " Link. ")
    .replace(/[#*_`>\[\]|-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 450);

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = state.voiceLang;
  utterance.rate = 1;
  utterance.pitch = 1;

  const voice = chooseVoice(state.voiceLang);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    isSpeaking = true;
    setCoreState("SPEAKING");
    $("coreTitle").textContent = "Speaking, Boss…";
    $("coreDesc").textContent = "Tap Stop Voice to interrupt ZYZY.";
  };

  utterance.onend = () => {
    isSpeaking = false;
    setCoreState("STANDBY");
    $("coreTitle").textContent = "Ready when you are.";
    $("coreDesc").textContent = "Boss, you can type or start listening.";
  };

  utterance.onerror = () => {
    isSpeaking = false;
    setCoreState("STANDBY");
    $("coreTitle").textContent = "Voice playback issue";
    $("coreDesc").textContent = "The text response is still available. Try another voice or browser.";
  };

  speechSynthesis.speak(utterance);
}

async function run() {
  if (isRunning) return;

  const inputEl = $("command");
  const submittedInput = inputEl.value.trim();
  const resultEl = $("result");

  resultEl.classList.remove("hidden");

  if (!submittedInput) {
    resultEl.textContent = "Boss, type or speak a command first.";
    return;
  }

  isRunning = true;
  stopSpeaking();
  clearTimeout(voiceAutoSendTimer);

  const agent = routeAgent(submittedInput);
  inputEl.value = "";

  $("runBtn").disabled = true;
  setCoreState("THINKING");
  $("coreTitle").textContent = "Thinking, Boss…";
  $("coreDesc").textContent = "ZYZY is preparing a response.";
  resultEl.textContent = "Thinking…";

  try {
    const history = validMessages(state.chatHistory);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: submittedInput,
        agent,
        history
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `AI request failed (${response.status}).`);
    }

    const reply = data.reply || "Sorry, Boss. I couldn't get a response.";

    state.chatHistory.push(
      { role: "user", content: submittedInput },
      { role: "assistant", content: reply }
    );
    state.chatHistory = state.chatHistory.slice(-24);

    resultEl.textContent = reply;
    setCoreState("READY");
    $("coreTitle").textContent = `${data.agent || agent} ready`;
    $("coreDesc").textContent = `ZYZY replied using ${data.model || "Gemini"}.`;

    log(`ZYZY response → ${agent}`, submittedInput);
    save();
    speakReply(reply);
  } catch (error) {
    inputEl.value = submittedInput;
    resultEl.textContent =
      `Sorry, Boss. ${error.message}\nPlease check the connection and try again.`;

    setCoreState("STANDBY");
    $("coreTitle").textContent = "Connection issue";
    $("coreDesc").textContent = "ZYZY couldn't complete this request.";

    log("ZYZY connection error", error.message);
    save();
  } finally {
    isRunning = false;
    $("runBtn").disabled = false;
    inputEl.focus();
  }
}

function listen() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    $("coreTitle").textContent = "Voice input unavailable";
    $("coreDesc").textContent = "Boss, this browser does not support speech recognition. Please type instead.";
    setCoreState("STANDBY");
    return;
  }

  stopSpeaking();
  clearTimeout(voiceAutoSendTimer);

  const recognition = new SpeechRecognition();
  recognition.lang = state.voiceLang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  $("orb").classList.add("listening");
  setCoreState("LISTENING");
  $("coreTitle").textContent = "Listening, Boss…";
  $("coreDesc").textContent = state.voiceLang === "ta-IN"
    ? "Speak in Tamil or Tanglish. ZYZY will respond shortly."
    : "Speak clearly. ZYZY will respond shortly.";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    $("command").value = transcript;

    $("coreTitle").textContent = "Voice captured";
    $("coreDesc").textContent = "Boss, ZYZY is sending your voice message now.";
    setCoreState("THINKING");

    voiceAutoSendTimer = setTimeout(run, 500);
  };

  recognition.onerror = (event) => {
    $("coreTitle").textContent = "Couldn't hear you";
    $("coreDesc").textContent = `Check microphone permission or type instead. (${event.error})`;
    setCoreState("STANDBY");
  };

  recognition.onend = () => {
    $("orb").classList.remove("listening");
    if (!isRunning) setCoreState("STANDBY");
  };

  try {
    recognition.start();
  } catch {
    $("orb").classList.remove("listening");
    $("coreTitle").textContent = "Try again, Boss";
    $("coreDesc").textContent = "Voice recognition could not start. Please type instead.";
    setCoreState("STANDBY");
  }
}

async function runResearch() {
  if (isResearching) return;

  const input = $("researchInput");
  const query = input.value.trim();
  const output = $("researchOutput");

  if (!query) {
    output.className = "research-output empty";
    output.textContent = "Boss, type a research question first.";
    return;
  }

  isResearching = true;
  $("researchBtn").disabled = true;
  output.className = "research-output empty";
  output.textContent = "Researching…";

  try {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Research failed (${response.status}).`);
    }

    output.className = "research-output";
    output.replaceChildren();

    if (!data.results || !data.results.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = data.warning || "No usable research results were returned.";
      output.appendChild(empty);
      return;
    }

    const intro = document.createElement("div");
    intro.className = "entry";
    intro.textContent = `Live research results from ${data.provider || "configured provider"}:`;
    output.appendChild(intro);

    data.results.forEach((item) => {
      const article = document.createElement("article");
      article.className = "research-item";

      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.title;

      const content = document.createElement("p");
      content.textContent = item.content;

      article.append(link, content);
      output.appendChild(article);
    });

    log("Live research completed", query);
    save();
  } catch (error) {
    output.className = "research-output empty";
    output.textContent = error.message;
  } finally {
    isResearching = false;
    $("researchBtn").disabled = false;
  }
}

async function loadHealth() {
  setHealth("Checking", "");

  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) throw new Error("Health check failed");

    $("modelName").textContent = data.model || "Not configured";
    $("fallbackName").textContent = data.fallbackModel || "Not configured";
    $("researchState").textContent = data.researchConfigured ? "Configured" : "Not configured";
    $("apiState").textContent = data.apiKeyConfigured ? "Server only" : "Missing";

    setHealth(
      data.apiKeyConfigured ? "Online" : "Needs key",
      data.apiKeyConfigured ? "ok" : "error"
    );
  } catch {
    $("modelName").textContent = "Unavailable";
    $("fallbackName").textContent = "Unavailable";
    $("researchState").textContent = "Unavailable";
    $("apiState").textContent = "Unknown";
    setHealth("Offline", "error");
  }
}

function openExternalLink(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

$("runBtn").addEventListener("click", run);
$("micBtn").addEventListener("click", listen);
$("orb").addEventListener("click", listen);
$("researchBtn").addEventListener("click", runResearch);
$("stopVoice").addEventListener("click", () => {
  stopSpeaking();
  setCoreState("STANDBY");
  $("coreTitle").textContent = "Voice stopped";
  $("coreDesc").textContent = "Boss, ZYZY stopped speaking.";
});

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    state.voiceLang = button.dataset.lang === "ta-IN" ? "ta-IN" : "en-IN";
    log("Voice language changed", state.voiceLang);
    save();
  });
});

document.querySelectorAll(".module-card").forEach((card) => {
  card.addEventListener("click", () => {
    const prompts = {
      "Personal Assistant": "Help me plan my day and organize my tasks",
      "Creator Studio": "Create an original YouTube video script with title and captions",
      "Business Assistant": "Help me validate a business idea and plan the next steps",
      "Research Assistant": "Research the latest developments in artificial intelligence",
      "Coding Assistant": "Explain how to build and test a secure Node.js API",
      "Market Watch": "Create a market watchlist and risk checklist"
    };

    const agent = card.dataset.agent;
    $("command").value = prompts[agent] || "Hello, ZYZY";
    $("command").focus();
    $("command").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

document.querySelectorAll(".quick-link").forEach((button) => {
  button.addEventListener("click", () => {
    openExternalLink(button.dataset.url);
    log("Android quick link opened", button.dataset.url);
    save();
  });
});

$("command").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    run();
  }
});

$("researchInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runResearch();
  }
});

$("taskForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("taskInput");
  const text = input.value.trim();

  if (!text) return;

  state.tasks.unshift({
    id: Date.now(),
    text,
    done: false
  });

  input.value = "";
  log("Task added", text);
  save();
});

$("tasks").addEventListener("click", (event) => {
  const control = event.target.closest("[data-task-action]");
  if (!control) return;

  const id = Number(control.dataset.taskId);
  const action = control.dataset.taskAction;
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  if (action === "toggle") {
    task.done = !task.done;
    log(task.done ? "Task completed" : "Task reopened", task.text);
  }

  if (action === "delete") {
    state.tasks = state.tasks.filter((item) => item.id !== id);
    log("Task removed", task.text);
  }

  save();
});

$("newChat").addEventListener("click", () => {
  if (!state.chatHistory.length) {
    save();
    return;
  }

  const firstUserMessage =
    state.chatHistory.find((message) => message.role === "user")?.content ||
    "Saved conversation";

  state.archivedChats.unshift({
    id: Date.now(),
    title: firstUserMessage.slice(0, 50),
    createdAt: new Date().toISOString(),
    messages: state.chatHistory.slice(-24)
  });

  state.archivedChats = state.archivedChats.slice(0, 5);
  state.chatHistory = [];

  log("New chat started", "Previous conversation was archived.");
  save();
});

$("clearHistory").addEventListener("click", () => {
  const ok = window.confirm("Boss, clear the active conversation and archived chats?");

  if (!ok) return;

  state.chatHistory = [];
  state.archivedChats = [];
  log("Conversation history cleared", "Saved chat was removed.");
  save();
});

$("clearLog").addEventListener("click", () => {
  state.activity = [];
  save();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

render();
loadHealth();
