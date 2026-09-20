const users = [
  { id: 1, username: "policy.admin", name: "Policy Governance Administrator", role: "Security/HR Administrator", department: "Information Security" },
  { id: 2, username: "finance.analyst01", name: "Finance Analyst 01", role: "Employee", department: "Finance" },
  { id: 3, username: "finance.manager01", name: "Finance Manager 01", role: "Department Manager", department: "Finance" }
];

let nextAcknowledgementId = 1;
let nextAuditId = 1;

const policies = [
  { id: 1, title: "Acceptable Use Policy", category: "Information Security", version: "1.0", status: "published", effectiveDate: "2026-09-01", summary: "Approved use of Biztat Solutions systems, email, internet and information assets.", content: "Use company systems for approved work, protect credentials, follow data-handling rules and report suspected misuse." },
  { id: 2, title: "Password and MFA Policy", category: "Access Control", version: "1.1", status: "published", effectiveDate: "2026-09-05", summary: "Password manager, passphrase and MFA requirements for business systems.", content: "Use unique credentials, store them in an approved password manager, never share passwords and report unexpected MFA prompts." },
  { id: 3, title: "Remote Work Security Policy", category: "Remote Work", version: "1.0", status: "published", effectiveDate: "2026-09-12", summary: "Secure remote work requirements for approved devices, networks and company data.", content: "Use approved devices, lock screens, avoid public Wi-Fi without approved protection and store business files only in approved locations." }
];

const assignments = [
  { id: 1, policyId: 1, targetType: "role", targetValue: "Employee", dueDate: "2026-10-01", status: "assigned" },
  { id: 2, policyId: 2, targetType: "department", targetValue: "Finance", dueDate: "2026-10-10", status: "assigned" },
  { id: 3, policyId: 3, targetType: "department", targetValue: "Finance", dueDate: "2026-10-15", status: "assigned" }
];

const acknowledgements = [];
const auditEvents = [
  { id: nextAuditId++, actor: "system", action: "policy_program_initialized", target: "SecureAware baseline policy library", createdAt: new Date().toISOString() }
];

const researchBasis = [
  { source: "NIST SP 800-50", use: "Policy awareness is treated as measurable evidence, not only document distribution." },
  { source: "NIST CSF 2.0", use: "Policy acknowledgement and awareness completion support Protect governance outcomes." },
  { source: "NIST SP 800-12", use: "Acknowledgement statements support evidence that users read and understand requirements." },
  { source: "OWASP ASVS", use: "Workflow decisions, version checks and authorization checks are enforced server-side." }
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
  if (request.method === "GET" && url.pathname === "/api/compliance/policies") return json({ rows: complianceRows() });
  if (request.method === "GET" && url.pathname === "/api/policies") return json({ policies: policies.map(withStats) });
  if (request.method === "GET" && url.pathname === "/api/acknowledgements") return json({ acknowledgements: acknowledgements.map(withAcknowledgementDetails) });
  if (request.method === "GET" && url.pathname === "/api/employee/policies") return json({ user: users[1], assignedPolicies: assignedPoliciesFor(users[1]) });
  const match = url.pathname.match(/^\/api\/policies\/(\d+)\/acknowledge$/);
  if (request.method === "POST" && match) {
    const policy = policies.find((item) => item.id === Number(match[1]));
    if (!policy || policy.status !== "published") return json({ message: "Only published policies can be acknowledged." }, 400);
    const existing = acknowledgements.find((item) => item.userId === users[1].id && item.policyId === policy.id && item.policyVersion === policy.version);
    if (existing) return json({ acknowledgement: withAcknowledgementDetails(existing) });
    const acknowledgement = { id: nextAcknowledgementId++, policyId: policy.id, policyVersion: policy.version, userId: users[1].id, acknowledgedAt: new Date().toISOString(), statement: "I have read and understood the displayed policy version." };
    acknowledgements.push(acknowledgement);
    auditEvents.push({ id: nextAuditId++, actor: users[1].username, action: "policy_acknowledged", target: `${policy.title} v${policy.version}`, createdAt: new Date().toISOString() });
    return json({ acknowledgement: withAcknowledgementDetails(acknowledgement) }, 201);
  }
  return json({ message: "Not found" }, 404);
}

function dashboard() {
  const rows = complianceRows();
  const complete = rows.filter((row) => row.status === "complete").length;
  return { policies: policies.length, publishedPolicies: policies.length, assignments: assignments.length, acknowledgements: acknowledgements.length, complianceRate: rows.length ? Math.round((complete / rows.length) * 100) : 0 };
}

function complianceRows() {
  return assignments.flatMap((assignment) => users.filter((user) => matches(user, assignment)).map((user) => {
    const policy = policies.find((item) => item.id === assignment.policyId);
    const acknowledgement = acknowledgements.find((item) => item.userId === user.id && item.policyId === policy.id && item.policyVersion === policy.version);
    const overdue = assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59.000Z`) < new Date();
    return { user, policy, dueDate: assignment.dueDate, status: acknowledgement ? "complete" : overdue ? "overdue" : "pending", acknowledgedAt: acknowledgement?.acknowledgedAt ?? null };
  }));
}

function assignedPoliciesFor(user) {
  return assignments.filter((assignment) => matches(user, assignment)).map((assignment) => {
    const policy = policies.find((item) => item.id === assignment.policyId);
    const acknowledgement = acknowledgements.find((item) => item.userId === user.id && item.policyId === policy.id && item.policyVersion === policy.version);
    return { ...assignment, policy: withStats(policy), acknowledgement: acknowledgement ? withAcknowledgementDetails(acknowledgement) : null };
  });
}

function matches(user, assignment) {
  if (assignment.targetType === "role") return assignment.targetValue === user.role;
  if (assignment.targetType === "department") return assignment.targetValue === user.department;
  return assignment.targetValue === user.username;
}

function withStats(policy) {
  return { ...policy, assignmentCount: assignments.filter((item) => item.policyId === policy.id).length, acknowledgementCount: acknowledgements.filter((item) => item.policyId === policy.id && item.policyVersion === policy.version).length };
}

function withAcknowledgementDetails(ack) {
  return { ...ack, policy: policies.find((item) => item.id === ack.policyId), user: users.find((item) => item.id === ack.userId) };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" } });
}

function text(body, type) {
  return new Response(body, { headers: { "content-type": type, "x-content-type-options": "nosniff" } });
}

function html() {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SecureAware Policy</title><link rel="stylesheet" href="/styles.css"></head><body><div id="app">Loading SecureAware...</div><script src="/app.js"></script></body></html>`;
}

function css() {
  return `:root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#172033;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}button{font:inherit}.shell{min-height:100vh;display:grid;grid-template-columns:230px 1fr}.side{background:#0f172a;color:#fff;padding:22px 16px}.brand{font-size:22px;font-weight:800;margin-bottom:22px}.side button{width:100%;justify-content:flex-start;margin:0 0 8px;padding:10px 12px;border:1px solid transparent;border-radius:6px;background:transparent;color:#e5e7eb;cursor:pointer;text-align:left}.side button.active{background:#1e293b;border-color:#334155}.top{min-height:72px;background:#fff;border-bottom:1px solid #d8dee9;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 28px;flex-wrap:wrap}.workspace{padding:28px}.grid{display:grid;gap:18px}.metrics{grid-template-columns:repeat(4,minmax(150px,1fr))}.panel,.metric,.card{background:#fff;border:1px solid #d8dee9;border-radius:8px;padding:18px;margin-bottom:18px;overflow-x:auto}.metric strong{display:block;font-size:29px}.muted{color:#667085}table{width:100%;min-width:720px;border-collapse:collapse}th,td{border-top:1px solid #e4e8f0;padding:12px;text-align:left;vertical-align:top}th{color:#667085;font-size:14px}.status{display:inline-flex;border-radius:999px;border:1px solid #ccd5e1;padding:4px 10px;font-size:13px;font-weight:700;text-transform:capitalize}.complete,.published{color:#116132;background:#e9f7ee}.pending{color:#8a5a00;background:#fff5d8}.overdue{color:#8a1f11;background:#ffe9e6}.primary{border:1px solid #172033;border-radius:6px;background:#172033;color:#fff;font-weight:700;min-height:40px;padding:0 14px;cursor:pointer}.notice{border-radius:8px;padding:12px 14px;background:#eef6ff;color:#15466f;font-weight:700}@media(max-width:820px){.shell{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.side{position:sticky;top:0;z-index:3}}`;
}

function js() {
  return `
let route="dashboard";
const nav=[["dashboard","Dashboard"],["employee","Employee View"],["evidence","Compliance"],["audit","Audit"]];
const app=document.getElementById("app");
async function api(path,options={}){const response=await fetch(path,{headers:{"content-type":"application/json"},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||"Request failed");return data}
function esc(value){return String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function status(value){return '<span class="status '+value+'">'+value+'</span>'}
function panel(title,body){return '<section class="panel"><h2>'+title+'</h2>'+body+'</section>'}
function shell(content){app.innerHTML='<div class="shell"><aside class="side"><div class="brand">SecureAware</div>'+nav.map(([key,label])=>'<button data-route="'+key+'" class="'+(route===key?"active":"")+'">'+label+'</button>').join("")+'</aside><main><header class="top"><strong>Member 2 - Policy Management + Assignment + Acknowledgement</strong><span class="muted">Pilot-safe policy environment</span></header><section class="workspace">'+content+'</section></main></div>';document.querySelectorAll("[data-route]").forEach((button)=>button.onclick=()=>{route=button.dataset.route;render()})}
async function dashboard(){const [d,r]=await Promise.all([api("/api/dashboard"),api("/api/research-basis")]);shell('<div class="grid metrics"><div class="metric"><strong>'+d.policies+'</strong><span>Total policies</span></div><div class="metric"><strong>'+d.publishedPolicies+'</strong><span>Published</span></div><div class="metric"><strong>'+d.assignments+'</strong><span>Assignments</span></div><div class="metric"><strong>'+d.complianceRate+'%</strong><span>Completion rate</span></div></div>'+panel("Research-Based Scope",'<p>This version follows the proposal requirement for versioned policy control, exact-version acknowledgement, compliance visibility and audit evidence.</p><table><thead><tr><th>Reference</th><th>Use</th></tr></thead><tbody>'+r.researchBasis.map((x)=>'<tr><td>'+esc(x.source)+'</td><td>'+esc(x.use)+'</td></tr>').join("")+'</tbody></table>'))}
async function employee(){const data=await api("/api/employee/policies");shell(panel("Employee Policy Workspace",'<p>'+esc(data.user.name)+' can read assigned policy versions and record acknowledgement evidence.</p>')+'<div class="grid">'+data.assignedPolicies.map((item)=>'<div class="card"><h3>'+esc(item.policy.title)+' <span class="muted">v'+esc(item.policy.version)+'</span></h3><p>'+esc(item.policy.content)+'</p><p><strong>Due:</strong> '+item.dueDate+' '+(item.acknowledgement?status("complete"):status("pending"))+'</p>'+(item.acknowledgement?'<p class="notice">Acknowledged at '+new Date(item.acknowledgement.acknowledgedAt).toLocaleString()+'</p>':'<button class="primary" data-ack="'+item.policy.id+'">Acknowledge Displayed Version</button>')+'</div>').join("")+'</div>');document.querySelectorAll("[data-ack]").forEach((button)=>button.onclick=async()=>{await api("/api/policies/"+button.dataset.ack+"/acknowledge",{method:"POST",body:JSON.stringify({})});employee()})}
async function evidence(){const [c,a]=await Promise.all([api("/api/compliance/policies"),api("/api/acknowledgements")]);shell(panel("Policy Compliance",'<table><thead><tr><th>Employee</th><th>Department</th><th>Policy</th><th>Version</th><th>Due</th><th>Status</th></tr></thead><tbody>'+c.rows.map((row)=>'<tr><td>'+esc(row.user.name)+'</td><td>'+esc(row.user.department)+'</td><td>'+esc(row.policy.title)+'</td><td>'+esc(row.policy.version)+'</td><td>'+row.dueDate+'</td><td>'+status(row.status)+'</td></tr>').join("")+'</tbody></table>')+panel("Acknowledgement Evidence",'<table><thead><tr><th>User</th><th>Policy</th><th>Version</th><th>Statement</th><th>Time</th></tr></thead><tbody>'+(a.acknowledgements.length?a.acknowledgements.map((x)=>'<tr><td>'+esc(x.user.name)+'</td><td>'+esc(x.policy.title)+'</td><td>'+esc(x.policyVersion)+'</td><td>'+esc(x.statement)+'</td><td>'+new Date(x.acknowledgedAt).toLocaleString()+'</td></tr>').join(""):'<tr><td colspan="5" class="muted">No acknowledgements recorded yet.</td></tr>')+'</tbody></table>'))}
async function audit(){const data=await api("/api/audit-events");shell(panel("Audit Evidence",'<table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>'+data.auditEvents.map((x)=>'<tr><td>'+new Date(x.createdAt).toLocaleString()+'</td><td>'+esc(x.actor)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.target)+'</td></tr>').join("")+'</tbody></table>'))}
function render(){if(route==="employee")return employee();if(route==="evidence")return evidence();if(route==="audit")return audit();return dashboard()}
render();
`;
}
