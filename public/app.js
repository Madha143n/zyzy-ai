
const $ = id => document.getElementById(id);
const KEY = "zyzy-future-v03";

let state = {
  tasks: [],
  activity: [],
  chatHistory: []
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

function draft(agent, input) {
  if (agent === "Social Media") {
    return `CREATOR STUDIO

Suggested workflow:
• Pick the audience and goal.
• Draft a hook, main message and ending.
• Review accuracy and copyright before publishing.

Request: ${input}

This is a local template. A generative AI service is not connected yet.`;
  }

  if (agent === "Trading Monitor") {
    return `MARKET WATCH

Trading is disabled. Use this module for watchlist notes and a risk checklist only. This is not financial advice and no live market data is connected.

Request: ${input}`;
  }

  if (agent === "Personal Assistant") {
    state.tasks.unshift({
      id: Date.now(),
      text: input,
      done: false
    });

    return `PERSONAL

Saved as a task on this device. No reminder notification is scheduled, and tasks will not run in the background.

${input}`;
  }

  return `BUSINESS

1. Define the outcome.
2. Break it into small steps.
3. List resources and risks.
4. Review before taking external action.

Request: ${input}

This is a local planning template; an AI model is not connected yet.`;
}

async function run() {
  const input = $("command").value.trim();
  const r = $("result");

  r.classList.remove("hidden");

  if (!input) {
    r.textContent = "Boss, type or speak a command first.";
    return;
  }

  const agent = route(input);
  $("runBtn").disabled = true;
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
        message: input,
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

    const reply = data.reply || "Sorry, Boss. I couldn't get a response.";

    state.chatHistory.push(
      { role: "user", content: input },
      { role: "assistant", content: reply }
    );

    state.chatHistory = state.chatHistory.slice(-24);

    r.textContent = reply;
    $("coreTitle").textContent = `${agent} ready`;
    $("coreDesc").textContent = "ZYZY has replied, Boss.";

    log("ZYZY response → " + agent, input);
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
    r.textContent =
      "Sorry, Boss. " + err.message +
      "\nPlease check the backend connection and try again.";

    $("coreTitle").textContent = "Connection issue";
    $("coreDesc").textContent =
      "ZYZY couldn't complete this request.";

    log("ZYZY connection error", err.message);
    save();
  } finally {
    $("runBtn").disabled = false;
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
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
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
}

render();
