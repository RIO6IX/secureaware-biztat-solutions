let session = JSON.parse(sessionStorage.getItem("secureaware.session") || "null");

async function api(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (session?.csrfToken && options.method && options.method !== "GET") headers["x-csrf-token"] = session.csrfToken;
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function saveSession(value) {
  session = value;
  if (value) sessionStorage.setItem("secureaware.session", JSON.stringify(value));
  else sessionStorage.removeItem("secureaware.session");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function appShell(content) {
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">SA</div><span>SecureAware</span></div>
        <button class="active">Foundation</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <strong>SecureAware - Biztat Solutions</strong>
          <span class="muted">${escapeHtml(session.user.displayName)} · ${escapeHtml(session.user.role)} <button id="logout">Logout</button></span>
        </header>
        <section class="workspace">${content}</section>
      </main>
    </div>
  `;
  document.getElementById("logout").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    saveSession(null);
    render();
  });
}

function loginView() {
  document.getElementById("app").innerHTML = `
    <main class="login-shell">
      <section class="login-panel">
        <h1>SecureAware</h1>
        <p class="muted">Shared secure foundation for the IE3072 project.</p>
        <form id="loginForm" class="form-grid">
          <label class="wide">Username<input name="username" value="security.admin" autocomplete="username" required></label>
          <label class="wide">Password<input name="password" type="password" value="AdminPass!2026" autocomplete="current-password" required></label>
          <div class="wide"><button class="primary">Sign in</button></div>
        </form>
        <p class="muted">Seed users: employee.demo / EmployeePass!2026, manager.demo / ManagerPass!2026, security.admin / AdminPass!2026, system.admin / SystemPass!2026.</p>
      </section>
    </main>
  `;
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    saveSession(result);
    render();
  });
}

async function foundationView() {
  const me = await api("/api/me");
  let auditHtml = "<p class='muted'>Audit is visible to Security/HR Admin and System Admin only.</p>";
  if (["Security/HR Admin", "System Admin"].includes(me.user.role)) {
    const { auditEvents } = await api("/api/foundation/audit");
    auditHtml = `
      <table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th></tr></thead>
      <tbody>${auditEvents.map((event) => `<tr><td>${new Date(event.created_at).toLocaleString()}</td><td>${escapeHtml(event.username || "system")}</td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.target)}</td></tr>`).join("")}</tbody></table>
    `;
  }
  appShell(`
    <div class="grid metrics">
      <div class="metric"><strong>RBAC</strong><span>Server-enforced roles</span></div>
      <div class="metric"><strong>CSRF</strong><span>Protected state changes</span></div>
      <div class="metric"><strong>scrypt</strong><span>Salted password hashes</span></div>
      <div class="metric"><strong>Audit</strong><span>No password logging</span></div>
    </div>
    <section class="panel">
      <h2>Foundation Status</h2>
      <p>Authenticated as ${escapeHtml(me.user.displayName)}. This branch provides the shared foundation that should be merged into Chanuka and Sanduni.</p>
    </section>
    <section class="panel">
      <h2>Audit Evidence</h2>
      ${auditHtml}
    </section>
  `);
}

function render() {
  if (!session) return loginView();
  return foundationView().catch((error) => {
    saveSession(null);
    console.error(error);
    loginView();
  });
}

render();
