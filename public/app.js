const $=id=>document.getElementById(id), KEY="zyzy-future-v03";
let state={tasks:[],activity:[]};try{state=Object.assign(state,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}render()}
function log(title,detail){state.activity.unshift({title,detail,time:new Date().toLocaleString()});state.activity=state.activity.slice(0,10)}
function route(t){let s=t.toLowerCase();if(/stock|share market|trading|trade|crypto|portfolio/.test(s))return"Trading Monitor";if(/youtube|instagram|facebook|caption|reel|video|script|social media|post/.test(s))return"Social Media";if(/remind|reminder|todo|to-do|task|routine|schedule|daily/.test(s))return"Personal Assistant";return"Business"}
function draft(agent,input){if(agent==="Social Media")return`CREATOR STUDIO\n\nSuggested workflow:\n• Pick the audience and goal.\n• Draft a hook, main message and ending.\n• Review accuracy and copyright before publishing.\n\nRequest: ${input}\n\nThis is a local template. A generative AI service is not connected yet.`;if(agent==="Trading Monitor")return`MARKET WATCH\n\nTrading is disabled. Use this module for watchlist notes and a risk checklist only. This is not financial advice and no live market data is connected.\n\nRequest: ${input}`;if(agent==="Personal Assistant"){state.tasks.unshift({id:Date.now(),text:input,done:false});return`PERSONAL\n\nSaved as a task on this device. No reminder notification is scheduled, and tasks will not run in the background.\n\n${input}`}return`BUSINESS\n\n1. Define the outcome.\n2. Break it into small steps.\n3. List resources and risks.\n4. Review before taking external action.\n\nRequest: ${input}\n\nThis is a local planning template; an AI model is not connected yet.`}
async function run(){
 let input=$("command").value.trim(),r=$("result");
 r.classList.remove("hidden");
 if(!input){r.textContent="Type or speak a command first.";return}
 const agent=route(input);
 $("runBtn").disabled=true;
 $("coreTitle").textContent="Connecting to Gemini…";
 $("coreDesc").textContent="Sending your request securely to the backend.";
 r.textContent="Thinking…";
 try{
   const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:input,agent})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok) throw new Error(data.error||"AI request failed ("+response.status+").");
   r.textContent=data.reply||"Gemini returned an empty response.";
   $("coreTitle").textContent=agent+" ready";
   $("coreDesc").textContent="Gemini response received.";
   log("Gemini response → "+agent,input);
   save();
   if("speechSynthesis"in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance((data.reply||"Response received").slice(0,450));u.lang="en-IN";speechSynthesis.speak(u)}
 }catch(err){
   r.textContent="Could not reach Gemini: "+err.message+"\nCheck that the backend is deployed and GEMINI_API_KEY is configured.";
   $("coreTitle").textContent="Connection needs setup";
   $("coreDesc").textContent="Check backend deployment and server environment variables.";
   log("Gemini connection error",err.message);save();
 }finally{$("runBtn").disabled=false}
}
function listen(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$("coreTitle").textContent="Voice input unavailable";$("coreDesc").textContent="This browser does not support speech recognition. Type a command instead.";return}const rec=new SR();rec.lang="en-IN";rec.interimResults=false;rec.maxAlternatives=1;$("orb").classList.add("listening");$("coreState").textContent="LISTENING";$("coreTitle").textContent="Listening…";$("coreDesc").textContent="Speak clearly, then wait for the transcript.";rec.onresult=e=>{$("command").value=e.results[0][0].transcript;$("coreTitle").textContent="Voice captured";$("coreDesc").textContent="Tap the arrow to run your command.";};rec.onerror=e=>{$("coreTitle").textContent="Could not hear you";$("coreDesc").textContent="Check microphone permission or type your command. ("+e.error+")"};rec.onend=()=>{$("orb").classList.remove("listening");$("coreState").textContent="STANDBY"};try{rec.start()}catch(e){$("coreTitle").textContent="Try again";$("coreDesc").textContent="Voice recognition could not start. Type instead."}}
$("runBtn").addEventListener("click",run);$("micBtn").addEventListener("click",listen);$("orb").addEventListener("click",listen);$("command").addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")run()});
$("taskForm").addEventListener("submit",e=>{e.preventDefault();let t=$("taskInput").value.trim();if(!t)return;state.tasks.unshift({id:Date.now(),text:t,done:false});log("Task added",t);$("taskInput").value="";save()});
$("clearLog").addEventListener("click",()=>{state.activity=[];save()});
window.toggleTask=id=>{let t=state.tasks.find(x=>x.id===id);if(t){t.done=!t.done;log(t.done?"Task completed":"Task reopened",t.text);save()}};
window.deleteTask=id=>{let t=state.tasks.find(x=>x.id===id);state.tasks=state.tasks.filter(x=>x.id!==id);if(t)log("Task removed",t.text);save()};
document.querySelectorAll(".module").forEach(el=>el.addEventListener("click",()=>{$("command").value=({"Business":"Help me plan a business task","Social Media":"Draft a YouTube video script","Personal Assistant":"Help organize my daily tasks","Trading Monitor":"Create a market watchlist and risk checklist"})[el.dataset.agent];$("command").focus();}));
function render(){$("taskCount").textContent=state.tasks.filter(t=>!t.done).length;$("tasks").innerHTML=state.tasks.length?state.tasks.map(t=>`<div class="entry"><label class="checkline ${t.done?"done":""}"><input type="checkbox" ${t.done?"checked":""} onchange="toggleTask(${t.id})"><span>${esc(t.text)}</span></label><div class="entry-actions"><button onclick="deleteTask(${t.id})">Remove</button></div></div>`).join(""):'<div class="empty">Your task space is clear.</div>';$("activity").innerHTML=state.activity.length?state.activity.map(a=>`<div class="entry"><strong>${esc(a.title)}</strong><div>${esc(a.detail)}</div><div class="sub">${esc(a.time)}</div></div>`).join(""):'<div class="empty">Waiting for your first command.</div>'}
render();
