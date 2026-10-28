const $ = id => document.getElementById(id);
const KEY = "zyzy-future-v03";

let state = {
  tasks: [],
  activity: [],
  chatHistory: [],
  archivedChats: []
};

try {
  state = Object.assign(
    state,
    JSON.parse(localStorage.getItem(KEY) || "{}")
  );
} catch {}

if (!Array.isArray(state.tasks)) state.tasks = [];
if (!Array.isArray(state.activity)) state.activity = [];
if (!Array.isArray(state.chatHistory)) state.chatHistory = [];
if (!Array.isArray(state.archivedChats)) state.archivedChats = [];

let isRunning = false;

const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  render();
}

function log(title, detail) {
  state.activity.unshift({
    title,
    detail,
    time: new Date().toLocaleString()
  });
  state.activity = state.activity.slice(0, 10);
}

function injectChatMemoryUi() {
  if ($("zyzy-chat-styles")) return;

  const style = document.createElement("style");
  style.id = "zyzy-chat-styles";
  style.textContent = `
    .chat-memory-panel {
      margin-top: 12px;
      overflow: hidden;
    }

    .chat-history-list {
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .chat-message {
      margin: 0 0 10px;
      padding: 10px 11px;
      border: 1px solid #263754;
      border-radius: 12px;
      background: #0a1120;
      font-size: 10px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .chat-message:last-child {
      margin-bottom: 0;
    }

    .chat-message.assistant {
      border-color: #315d79;
      background: #111f34;
    }

    .chat-role {
      display: block;
      margin-bottom: 5px;
      color: #7cecff;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }

    .chat-message.user .chat-role {
      color: #9baaff;
    }

    .chat-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .chat-actions .text-btn {
      border: 1px solid #365074;
      border-radius: 7px;
      padding: 5px 7px;
      background: #162744;
      color: #cfe7ff;
    }
  `;
  document.head.appendChild(style);

  if ($("chatMemoryPanel")) return;

  const commandCard = document.querySelector(".command-card");
  if (!commandCard) return;

  const panel = document.createElement("section");
  panel.className = "panel chat-memory-panel";
  panel.id = "chatMemoryPanel";

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="eyebrow">MEMORY</div>
        <h2>Conversation</h2>
      </div>
      <div class="chat-actions">
        <button id="newChat" class="text-btn" type="button">
          New chat
        </button>
        <button id="clearHistory" class="text-btn" type="button">
          Clear history
        </button>
      </div>
    </div>
    <div id="chatHistoryList" class="chat-history-list empty">
      No conversation saved yet.
    </div>
  `;

  commandCard.after(panel);

  $("newChat").addEventListener("click", () => {
    if (!state.chatHistory.length) {
      state.chatHistory = [];
      save();
      return;
    }

    const firstUserMessage =
      state.chatHistory.find(m => m.role === "user")?.content ||
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
    const ok = window.confirm(
      "Boss, clear the active conversation and archived chats?"
    );

    if (!ok) return;

    state.chatHistory = [];
    state.archivedChats = [];
    log("Conversation history cleared", "Saved chat was removed.");
    save();
  });
}

function renderChatHistory() {
  injectChatMemoryUi();

  const box = $("chatHistoryList");
  if (!box) return;

  const messages = state.chatHistory.slice(-10);

  if (!messages.length) {
    box.className = "chat-history-list empty";
    box.textContent = "No conversation saved yet.";
    return;
  }

  box.className = "chat-history-list";

  box.innerHTML = messages.map(m => `
    <div class="chat-message ${m.role === "user" ? "user" : "assistant"}">
      <span class="chat-role">
        ${m.role === "user" ? "Boss" : "ZYZY"}
      </span>
      ${esc(m.content)}
    </div>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

function route(t) {
  const s = t.toLowerCase();

  if (/stock|share market|trading|trade|crypto|portfolio/.test(s))
    return "Trading Monitor";

  if (/youtube|instagram|facebook|caption|reel|video|script|social media|post/.test(s))
    return "Social Media";

  if (/remind|reminder|todo|to-do|task|routine|schedule|daily/.test(s))
    return "Personal Assistant";

  return "Business";
}

async function run() {
  if (isRunning) return;

  const inputEl = $("command");
  const submittedInput = inputEl.value.trim();
  const r = $("result");

  r.classList.remove("hidden");

  if (!submittedInput) {
    r.textContent = "Boss, type or speak a command first.";
    return;
  }

  isRunning = true;

  const agent = route(submittedInput);
  inputEl.value = "";

  $("runBtn").disabled = true;
  $("coreState").textContent = "THINKING";
  $("coreTitle").textContent = "Thinking, Boss…";
  $("coreDesc").textContent = "ZYZY is preparing a response.";
  r.textContent = "Thinking…";

  try {
    const history = state.chatHistory
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 3000)
      }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: submittedInput,
        agent,
        history
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `AI request failed (${response.status}).`
      );
    }

    const reply =
      data.reply || "Sorry, Boss. I couldn't get a response.";

    state.chatHistory.push(
      { role: "user", content: submittedInput },
      { role: "assistant", content: reply }
    );

    state.chatHistory = state.chatHistory.slice(-24);

    r.textContent = reply;
    $("coreState").textContent = "READY";
    $("coreTitle").textContent = `${agent} ready`;
    $("coreDesc").textContent = "ZYZY has replied, Boss.";

    log("ZYZY response → " + agent, submittedInput);
    save();

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        reply.slice(0, 450)
      );

      utterance.lang = "en-IN";
      utterance.rate = 1;
      utterance.pitch = 1;

      speechSynthesis.speak(utterance);
    }
  } catch (err) {
    inputEl.value = submittedInput;

    r.textContent =
      "Sorry, Boss. " + err.message +
      "\nPlease check the backend connection and try again.";

    $("coreState").textContent = "STANDBY";
    $("coreTitle").textContent = "Connection issue";
    $("coreDesc").textContent =
      "ZYZY couldn't complete this request.";

    log("ZYZY connection error", err.message);
    save();
  } finally {
    isRunning = false;
    $("runBtn").disabled = false;
    inputEl.focus();
  }
}

function listen() {
  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {
    $("coreTitle").textContent = "Voice input unavailable";
    $("coreDesc").textContent =
      "Boss, this browser doesn't support speech recognition. Please type instead.";
    return;
  }

  const rec = new SR();
  rec.lang = "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  $("orb").classList.add("listening");
  $("coreState").textContent = "LISTENING";
  $("coreTitle").textContent = "Listening, Boss…";
  $("coreDesc").textContent =
    "Speak clearly, then wait for the transcript.";

  rec.onresult = e => {
    $("command").value =
      e.results[0][0].transcript;

    $("coreTitle").textContent = "Voice captured";
    $("coreDesc").textContent =
      "Boss, tap the arrow to send your command.";
  };

  rec.onerror = e => {
    $("coreTitle").textContent = "Couldn't hear you";
    $("coreDesc").textContent =
      "Check microphone permission or type your command. (" +
      e.error + ")";
  };

  rec.onend = () => {
    $("orb").classList.remove("listening");
    $("coreState").textContent = "STANDBY";
  };

  try {
    rec.start();
  } catch {
    $("coreTitle").textContent = "Try again, Boss";
    $("coreDesc").textContent =
      "Voice recognition could not start. Please type instead.";
  }
}

$("runBtn").addEventListener("click", run);
$("micBtn").addEventListener("click", listen);
$("orb").addEventListener("click", listen);

$("command").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    run();
  }
});

$("taskForm").addEventListener("submit", e => {
  e.preventDefault();

  const t = $("taskInput").value.trim();
  if (!t) return;

  state.tasks.unshift({
    id: Date.now(),
    text: t,
    done: false
  });

  log("Task added", t);
  $("taskInput").value = "";
  save();
});

$("clearLog").addEventListener("click", () => {
  state.activity = [];
  save();
});

window.toggleTask = id => {
  const t = state.tasks.find(x => x.id === id);

  if (t) {
    t.done = !t.done;
    log(t.done ? "Task completed" : "Task reopened", t.text);
    save();
  }
};

window.deleteTask = id => {
  const t = state.tasks.find(x => x.id === id);

  state.tasks = state.tasks.filter(x => x.id !== id);

  if (t) log("Task removed", t.text);
  save();
};

document.querySelectorAll(".module").forEach(el => {
  el.addEventListener("click", () => {
    const prompts = {
      Business: "Help me plan a business task",
      "Social Media": "Draft a YouTube video script",
      "Personal Assistant": "Help organize my daily tasks",
      "Trading Monitor": "Create a market watchlist and risk checklist"
    };

    $("command").value =
      prompts[el.dataset.agent] || "Hello, ZYZY";

    $("command").focus();
  });
});

function render() {
  $("taskCount").textContent =
    state.tasks.filter(t => !t.done).length;

  $("tasks").innerHTML = state.tasks.length
    ? state.tasks.map(t => `
        <div class="entry">
          <label class="checkline ${t.done ? "done" : ""}">
            <input type="checkbox"
              ${t.done ? "checked" : ""}
              onchange="toggleTask(${t.id})">
            <span>${esc(t.text)}</span>
          </label>
          <div class="entry-actions">
            <button onclick="deleteTask(${t.id})">Remove</button>
          </div>
        </div>
      `).join("")
    : '<div class="empty">Your task space is clear.</div>';

  $("activity").innerHTML = state.activity.length
    ? state.activity.map(a => `
        <div class="entry">
          <strong>${esc(a.title)}</strong>
          <div>${esc(a.detail)}</div>
          <div class="sub">${esc(a.time)}</div>
        </div>
      `).join("")
    : '<div class="empty">Waiting for your first command.</div>';

  renderChatHistory();
}

injectChatMemoryUi();
render();
