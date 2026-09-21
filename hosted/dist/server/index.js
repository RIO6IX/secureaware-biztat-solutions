const users = [
  { id: 1, username: "training.admin", name: "Security Awareness Administrator", role: "Security/HR Administrator", department: "Information Security" },
  { id: 2, username: "finance.analyst01", name: "Finance Analyst 01", role: "Employee", department: "Finance" },
  { id: 3, username: "finance.manager01", name: "Finance Manager 01", role: "Department Manager", department: "Finance" }
];

let nextResultId = 1;
let nextAuditId = 1;

const modules = [
  { id: 1, title: "Email Phishing and Reporting", category: "Email Security", durationMinutes: 20, status: "active", content: "Inspect sender domains, links, attachments, QR codes and unusual payment or credential requests. Confirm suspicious messages through a separate channel and report them using the approved process.", quizId: 1 },
  { id: 2, title: "Password Manager and MFA Use", category: "Account Security", durationMinutes: 15, status: "active", content: "Use unique passwords or passphrases stored in an approved password manager. Enable MFA for business systems and report unexpected approval prompts immediately.", quizId: 2 },
  { id: 3, title: "Clean Desk and Information Handling", category: "Workplace Security", durationMinutes: 12, status: "active", content: "Lock screens, clear printed documents, classify sensitive files correctly and use approved storage locations for business information.", quizId: 3 }
];

const quizzes = [
  { id: 1, moduleId: 1, title: "Phishing Awareness Quiz", passMark: 70, maxAttempts: 3, questions: [
    { prompt: "Which sign most strongly suggests a phishing email?", options: ["Urgent request for credentials", "A known colleague's normal signature", "Company newsletter", "Approved HR memo"], answerIndex: 0 },
    { prompt: "What should an employee do with a suspicious link?", options: ["Click to verify it", "Forward to everyone", "Report it using the approved process", "Ignore all emails"], answerIndex: 2 }
  ] },
  { id: 2, moduleId: 2, title: "Password Manager and MFA Quiz", passMark: 70, maxAttempts: 3, questions: [
    { prompt: "What is the safest password practice?", options: ["Reuse memorable passwords", "Use a password manager", "Write passwords on desk notes", "Share passwords with team leads"], answerIndex: 1 },
    { prompt: "Why should an unexpected MFA approval prompt be reported?", options: ["It may indicate a credential attack", "It means the password is expired", "It makes the account faster", "It is always a system test"], answerIndex: 0 }
  ] },
  { id: 3, moduleId: 3, title: "Information Handling Quiz", passMark: 80, maxAttempts: 3, questions: [
    { prompt: "Where should sensitive business documents be stored?", options: ["Approved company storage", "Personal email", "Public file shares", "Unlabeled USB drives"], answerIndex: 0 },
    { prompt: "What is the safest action before leaving a workstation?", options: ["Leave documents open", "Lock the screen", "Share the session", "Disable MFA"], answerIndex: 1 }
  ] }
];

const assignments = [
  { id: 1, moduleId: 1, targetType: "department", targetValue: "Finance", dueDate: "2026-10-05", status: "assigned" },
  { id: 2, moduleId: 2, targetType: "role", targetValue: "Employee", dueDate: "2026-10-10", status: "assigned" },
  { id: 3, moduleId: 3, targetType: "department", targetValue: "Finance", dueDate: "2026-10-15", status: "assigned" }
];

const results = [];
const auditEvents = [
  { id: nextAuditId++, actor: "system", action: "training_program_initialized", target: "SecureAware baseline training library", createdAt: new Date().toISOString() }
];

const researchBasis = [
  { source: "NIST SP 800-50", use: "Program-managed awareness content, measurement and role-appropriate training." },
  { source: "NIST CSF 2.0", use: "Awareness and training evidence supports Protect outcomes." },
  { source: "CISA Secure Our World", use: "Phishing reporting, strong passwords, MFA and suspicious-message verification." },
  { source: "OWASP ASVS", use: "Workflow decisions and quiz scoring stay on the server side." }
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/styles.css") return text(css(), "text/css; charset=utf-8");
    if (url.pathname === "/app.js") return text(js(), "text/javascript; charset=utf-8");
    if (url.pathname === "/api/health") return json({ ok: true });
    if (url.pathname.startsWith("/api/")) return api(request, url);
    return text(html(), "text/html; charset=utf-8");
  }
};

async function api(request, url) {
  if (request.method === "GET" && url.pathname === "/api/dashboard") return json(dashboard());
  if (request.method === "GET" && url.pathname === "/api/research-basis") return json({ researchBasis });
  if (request.method === "GET" && url.pathname === "/api/audit-events") return json({ auditEvents: auditEvents.slice(-25).reverse() });
  if (request.method === "GET" && url.pathname === "/api/compliance/training") return json({ rows: complianceRows() });
  if (request.method === "GET" && url.pathname === "/api/training/modules") return json({ modules: modules.map(withQuiz) });
  if (request.method === "GET" && url.pathname === "/api/quizzes") return json({ quizzes: quizzes.map(withModuleForQuiz) });
  if (request.method === "GET" && url.pathname === "/api/results") return json({ results: results.map(withResultDetails) });
  if (request.method === "GET" && url.pathname === "/api/employee/assigned-training") return json({ user: users[1], assignedTraining: assignedFor(users[1]) });
  const match = url.pathname.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (request.method === "POST" && match) {
    const quiz = quizzes.find((item) => item.id === Number(match[1]));
    if (!quiz) return json({ message: "Quiz not found." }, 404);
    const body = await request.json().catch(() => ({}));
    const previousAttempts = results.filter((item) => item.userId === users[1].id && item.quizId === quiz.id);
    if (previousAttempts.length >= quiz.maxAttempts && !previousAttempts.some((item) => item.status === "passed")) return json({ message: "Maximum quiz attempts reached." }, 429);
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    const correct = quiz.questions.filter((question, index) => question.answerIndex === answers[index]).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    const result = { id: nextResultId++, userId: users[1].id, moduleId: quiz.moduleId, quizId: quiz.id, attemptNumber: previousAttempts.length + 1 };
    Object.assign(result, { score, status: score >= quiz.passMark ? "passed" : "failed", submittedAt: new Date().toISOString() });
    results.push(result);
    auditEvents.push({ id: nextAuditId++, actor: users[1].username, action: "quiz_submitted", target: `${quiz.title} attempt ${result.attemptNumber} - ${score}%`, createdAt: new Date().toISOString() });
    return json({ result: withResultDetails(result) }, 201);
  }
  return json({ message: "Not found" }, 404);
}

function dashboard() {
  const rows = complianceRows();
  const complete = rows.filter((row) => row.status === "complete").length;
  return { modules: modules.length, activeModules: modules.length, assignments: assignments.length, attempts: results.length, complianceRate: rows.length ? Math.round((complete / rows.length) * 100) : 0 };
}

function complianceRows() {
  return assignments.flatMap((assignment) => users.filter((user) => matches(user, assignment)).map((user) => {
    const module = modules.find((item) => item.id === assignment.moduleId);
    const result = bestResultFor(user.id, module.id);
    const overdue = assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59.000Z`) < new Date();
    return { user, module, dueDate: assignment.dueDate, score: result?.score ?? null, status: result?.status === "passed" ? "complete" : overdue ? "overdue" : "pending", submittedAt: result?.submittedAt ?? null };
  }));
}

function assignedFor(user) {
  return assignments.filter((assignment) => matches(user, assignment)).map((assignment) => {
    const module = modules.find((item) => item.id === assignment.moduleId);
    const result = bestResultFor(user.id, module.id);
    return { ...assignment, module: withQuiz(module), result: result ? withResultDetails(result) : null };
  });
}

function matches(user, assignment) {
  if (assignment.targetType === "role") return assignment.targetValue === user.role;
  if (assignment.targetType === "department") return assignment.targetValue === user.department;
  return assignment.targetValue === user.username;
}

function withQuiz(module) {
  const quiz = quizzes.find((item) => item.id === module.quizId);
  return { ...module, quiz: quiz ? publicQuiz(quiz) : null };
}

function withModuleForQuiz(quiz) {
  return { ...publicQuiz(quiz), module: modules.find((module) => module.id === quiz.moduleId) || null };
}

function withResultDetails(result) {
  const quiz = quizzes.find((item) => item.id === result.quizId);
  return { ...result, user: users.find((user) => user.id === result.userId), module: modules.find((module) => module.id === result.moduleId), quiz: quiz ? publicQuiz(quiz) : null };
}

function publicQuiz(quiz) {
  return { id: quiz.id, moduleId: quiz.moduleId, title: quiz.title, passMark: quiz.passMark, maxAttempts: quiz.maxAttempts, questions: quiz.questions.map((question, index) => ({ id: `${quiz.id}-${index + 1}`, prompt: question.prompt, options: question.options.map((option, optionIndex) => ({ id: optionIndex, text: option })) })) };
}

function bestResultFor(userId, moduleId) {
  const attempts = results.filter((item) => item.userId === userId && item.moduleId === moduleId);
  return attempts.find((item) => item.status === "passed") || attempts.at(-1) || null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" } });
}

function text(body, type) {
  return new Response(body, { headers: { "content-type": type, "x-content-type-options": "nosniff" } });
}

function html() {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SecureAware Training</title><link rel="stylesheet" href="/styles.css"></head><body><div id="app">Loading SecureAware...</div><script src="/app.js"></script></body></html>`;
}

function css() {
  return `:root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#172033;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}.shell{min-height:100vh;display:grid;grid-template-columns:230px 1fr}.side{background:#0f172a;color:#fff;padding:22px 16px}.brand{font-size:22px;font-weight:800;margin-bottom:22px}.side button{width:100%;justify-content:flex-start;margin:0 0 8px;padding:10px 12px;border:1px solid transparent;border-radius:6px;background:transparent;color:#e5e7eb;cursor:pointer;text-align:left}.side button.active{background:#1e293b;border-color:#334155}.top{min-height:72px;background:#fff;border-bottom:1px solid #d8dee9;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 28px;flex-wrap:wrap}.workspace{padding:28px}.grid{display:grid;gap:18px}.metrics{grid-template-columns:repeat(4,minmax(150px,1fr))}.panel,.metric,.card{background:#fff;border:1px solid #d8dee9;border-radius:8px;padding:18px;margin-bottom:18px;overflow-x:auto}.metric strong{display:block;font-size:29px}.muted{color:#667085}table{width:100%;min-width:720px;border-collapse:collapse}th,td{border-top:1px solid #e4e8f0;padding:12px;text-align:left;vertical-align:top}th{color:#667085;font-size:14px}.status{display:inline-flex;border-radius:999px;border:1px solid #ccd5e1;padding:4px 10px;font-size:13px;font-weight:700;text-transform:capitalize}.complete,.passed{color:#116132;background:#e9f7ee}.pending{color:#8a5a00;background:#fff5d8}.failed,.overdue{color:#8a1f11;background:#ffe9e6}.quiz{display:grid;gap:14px}fieldset{border:1px solid #d8dee9;border-radius:8px;padding:14px}legend{font-weight:700}.choice{display:flex;gap:10px;align-items:center;margin-top:10px}.primary{border:1px solid #172033;border-radius:6px;background:#172033;color:#fff;font-weight:700;min-height:40px;padding:0 14px;cursor:pointer}@media(max-width:820px){.shell{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.side{position:sticky;top:0;z-index:3}}`;
}

function js() {
  return `
let route="dashboard";
const nav=[["dashboard","Dashboard"],["employee","Employee View"],["results","Compliance"],["audit","Audit"]];
const app=document.getElementById("app");
async function api(path,options={}){const response=await fetch(path,{headers:{"content-type":"application/json"},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||"Request failed");return data}
function esc(value){return String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function status(value){return '<span class="status '+value+'">'+value.replace("_"," ")+'</span>'}
function panel(title,body){return '<section class="panel"><h2>'+title+'</h2>'+body+'</section>'}
function shell(content){app.innerHTML='<div class="shell"><aside class="side"><div class="brand">SecureAware</div>'+nav.map(([key,label])=>'<button data-route="'+key+'" class="'+(route===key?"active":"")+'">'+label+'</button>').join("")+'</aside><main><header class="top"><strong>Member 3 - Security Training + Quiz & Assessment</strong><span class="muted">Pilot-safe training environment</span></header><section class="workspace">'+content+'</section></main></div>';document.querySelectorAll("[data-route]").forEach((button)=>button.onclick=()=>{route=button.dataset.route;render()})}
async function dashboard(){const [d,r]=await Promise.all([api("/api/dashboard"),api("/api/research-basis")]);shell('<div class="grid metrics"><div class="metric"><strong>'+d.modules+'</strong><span>Training modules</span></div><div class="metric"><strong>'+d.activeModules+'</strong><span>Active modules</span></div><div class="metric"><strong>'+d.assignments+'</strong><span>Assignments</span></div><div class="metric"><strong>'+d.complianceRate+'%</strong><span>Completion rate</span></div></div>'+panel("Research-Based Scope",'<p>This version follows the proposal requirement for assigned training, server-side quiz scoring, compliance visibility, auditability and privacy-safe academic testing.</p><table><thead><tr><th>Reference</th><th>Use</th></tr></thead><tbody>'+r.researchBasis.map((x)=>'<tr><td>'+esc(x.source)+'</td><td>'+esc(x.use)+'</td></tr>').join("")+'</tbody></table>'))}
async function employee(){const data=await api("/api/employee/assigned-training");shell(panel("Employee Training Workspace",'<p>'+esc(data.user.name)+' can complete assigned training and submit real quiz answers.</p>')+'<div class="grid">'+data.assignedTraining.map((item)=>'<div class="card"><h3>'+esc(item.module.title)+'</h3><p>'+esc(item.module.content)+'</p><p><strong>Due:</strong> '+item.dueDate+' '+(item.result?status(item.result.status):status("pending"))+'</p>'+quizForm(item.module.quiz)+'</div>').join("")+'</div>');document.querySelectorAll("[data-quiz]").forEach((form)=>form.onsubmit=async(event)=>{event.preventDefault();const answers=Array.from(new FormData(form).entries()).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>Number(v));await api("/api/quizzes/"+form.dataset.quiz+"/submit",{method:"POST",body:JSON.stringify({answers})});employee()})}
function quizForm(quiz){return '<form class="quiz" data-quiz="'+quiz.id+'"><strong>'+esc(quiz.title)+' - pass mark '+quiz.passMark+'% - max attempts '+quiz.maxAttempts+'</strong>'+quiz.questions.map((q,i)=>'<fieldset><legend>'+esc(q.prompt)+'</legend>'+q.options.map((o)=>'<label class="choice"><input type="radio" name="q'+i+'" value="'+o.id+'" required>'+esc(o.text)+'</label>').join("")+'</fieldset>').join("")+'<button class="primary">Submit Quiz</button></form>'}
async function results(){const [c,r]=await Promise.all([api("/api/compliance/training"),api("/api/results")]);shell(panel("Training Compliance",'<table><thead><tr><th>Employee</th><th>Department</th><th>Module</th><th>Due</th><th>Score</th><th>Status</th></tr></thead><tbody>'+c.rows.map((row)=>'<tr><td>'+esc(row.user.name)+'</td><td>'+esc(row.user.department)+'</td><td>'+esc(row.module.title)+'</td><td>'+row.dueDate+'</td><td>'+(row.score===null?"-":row.score+"%")+'</td><td>'+status(row.status)+'</td></tr>').join("")+'</tbody></table>')+panel("Quiz Results",'<table><thead><tr><th>User</th><th>Quiz</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead><tbody>'+(r.results.length?r.results.map((x)=>'<tr><td>'+esc(x.user.name)+'</td><td>'+esc(x.quiz.title)+'</td><td>'+x.score+'%</td><td>'+status(x.status)+'</td><td>'+new Date(x.submittedAt).toLocaleString()+'</td></tr>').join(""):'<tr><td colspan="5" class="muted">No quiz attempts submitted yet.</td></tr>')+'</tbody></table>'))}
async function audit(){const data=await api("/api/audit-events");shell(panel("Audit Evidence",'<table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>'+data.auditEvents.map((x)=>'<tr><td>'+new Date(x.createdAt).toLocaleString()+'</td><td>'+esc(x.actor)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.target)+'</td></tr>').join("")+'</tbody></table>'))}
function render(){if(route==="employee")return employee();if(route==="results")return results();if(route==="audit")return audit();return dashboard()}
render();
`;
}
