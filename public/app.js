const app = document.getElementById("app");

const state = {
  route: "overview",
  department: "All",
  period: "30",
  reportType: "executive",
  reportDepartment: "All"
};

const navItems = [
  ["overview", "Overview", "grid"],
  ["compliance", "Compliance", "shield"],
  ["policies", "Policies", "policy"],
  ["quizzes", "Quizzes", "quiz"],
  ["reports", "Reports", "report"],
  ["notifications", "Notifications", "bell"]
];

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  shield: '<path d="M12 3 20 6v5c0 5.2-3.4 8.6-8 10-4.6-1.4-8-4.8-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  report: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 17v-3m4 3V9m4 8v-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  policy: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  training: '<path d="m3 8 9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5M21 8v6"/>',
  quiz: '<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="m9 13 2 2 4-4"/>',
  warning: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v4m0 4h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  refresh: '<path d="M20 6v5h-5M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11m16 2-2 4.5A7 7 0 0 1 5.5 15"/>'
};

function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The request could not be completed.");
  return data;
}

function status(value) {
  const normalized = String(value).toLowerCase().replaceAll(" ", "-");
  return `<span class="status status-${normalized}">${escapeHtml(value)}</span>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function relativeTime(value) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function pageMeta() {
  return {
    overview: ["Compliance overview", "Monitor policy awareness, training progress and emerging risk."],
    compliance: ["Compliance management", "Review department performance and follow up on overdue actions."],
    policies: ["Policy management", "Publish, assign and acknowledge current policy versions."],
    quizzes: ["Training and quizzes", "Complete training cards and track scored assessment evidence."],
    reports: ["Reports and exports", "Generate role-appropriate summaries from approved compliance data."],
    notifications: ["Notifications", "Manage reminders and stay informed about important compliance changes."]
  }[state.route];
}

function shell(content, unreadCount = 0) {
  const [title, subtitle] = pageMeta();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">S</div>
          <div><strong>SecureAware</strong><span>Biztat Solutions</span></div>
        </div>
        <div class="sidebar-label">Management</div>
        <nav aria-label="Primary navigation">
          ${navItems.map(([route, label, iconName]) => `
            <button class="nav-item ${state.route === route ? "active" : ""}" data-route="${route}" ${state.route === route ? 'aria-current="page"' : ""}>
              ${icon(iconName)}<span>${label}</span>${route === "notifications" && unreadCount ? `<span class="nav-count">${unreadCount}</span>` : ""}
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="privacy-badge">${icon("shield", 18)}<div><strong>Protected environment</strong><span>Authorized access only</span></div></div>
          <div class="member-tag"><span class="status-indicator"></span>System operational</div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="icon-button mobile-menu" id="menuButton" aria-label="Open navigation">${icon("menu")}</button>
          <div class="topbar-title"><strong>${title}</strong><span>${subtitle}</span></div>
          <div class="topbar-actions">
            <button class="icon-button notification-button" id="notificationButton" aria-label="Open notifications">
              ${icon("bell")}${unreadCount ? `<span class="notification-dot">${unreadCount}</span>` : ""}
            </button>
            <div class="user-chip"><span class="avatar">SA</span><div><strong>Security Admin</strong><span>Authorized reviewer</span></div></div>
          </div>
        </header>
        <section class="workspace" aria-live="polite">${content}</section>
      </main>
      <div class="toast-region" id="toastRegion" aria-live="polite"></div>
    </div>
  `;

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      render();
    });
  });
  document.getElementById("notificationButton")?.addEventListener("click", () => {
    state.route = "notifications";
    render();
  });
  document.getElementById("menuButton")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

function loading() {
  shell(`
    <div class="skeleton-header"></div>
    <div class="metric-grid">${Array.from({ length: 4 }, () => '<div class="metric-card skeleton-card"></div>').join("")}</div>
    <div class="dashboard-grid"><div class="panel skeleton-panel"></div><div class="panel skeleton-panel"></div></div>
  `);
}

function showToast(message, type = "success") {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icon(type === "success" ? "check" : "warning", 18)}<span>${escapeHtml(message)}</span>`;
  region.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

function panel(title, subtitle, body, className = "") {
  return `
    <section class="panel ${className}">
      <div class="panel-header"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div></div>
      ${body}
    </section>
  `;
}

function metricCard(label, value, detail, iconName, tone, trend) {
  return `
    <article class="metric-card">
      <div class="metric-top"><span class="metric-icon tone-${tone}">${icon(iconName)}</span>${trend ? `<span class="metric-trend">${icon("trend", 14)}${trend}</span>` : ""}</div>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <span class="metric-label">${escapeHtml(label)}</span>
      <span class="metric-detail">${escapeHtml(detail)}</span>
    </article>
  `;
}

function lineChart(points) {
  const width = 680;
  const height = 230;
  const left = 38;
  const top = 18;
  const innerWidth = width - 60;
  const innerHeight = height - 58;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: left + (index * innerWidth) / Math.max(1, points.length - 1),
    y: top + ((100 - point.value) / 50) * innerHeight
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${left},${top + innerHeight} ${line} ${left + innerWidth},${top + innerHeight}`;
  return `
    <div class="chart-wrap">
      <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Compliance trend from ${points[0]?.value}% to ${points.at(-1)?.value}%">
        <title>Overall compliance trend</title>
        ${[50, 75, 100].map((tick) => {
          const y = top + ((100 - tick) / 50) * innerHeight;
          return `<line x1="${left}" y1="${y}" x2="${left + innerWidth}" y2="${y}" class="chart-gridline"/><text x="0" y="${y + 4}" class="chart-label">${tick}%</text>`;
        }).join("")}
        <polygon points="${area}" class="chart-area"/>
        <polyline points="${line}" class="chart-line"/>
        ${coordinates.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" class="chart-point"><title>${point.label}: ${point.value}%</title></circle><text x="${point.x}" y="${height - 8}" text-anchor="middle" class="chart-label">${point.label}</text>`).join("")}
      </svg>
    </div>
  `;
}

function progress(value, tone = "blue") {
  return `<div class="progress" aria-label="${value}%"><span class="progress-${tone}" style="width:${value}%"></span></div>`;
}

function riskDonut(risks) {
  const total = risks.low + risks.medium + risks.high || 1;
  const low = Math.round((risks.low / total) * 100);
  const medium = Math.round((risks.medium / total) * 100);
  return `
    <div class="risk-layout">
      <div class="donut" style="--low:${low}%;--medium:${low + medium}%"><div><strong>${total}</strong><span>people</span></div></div>
      <div class="risk-legend">
        <div><span class="legend-dot low"></span><span>Low risk</span><strong>${risks.low}</strong></div>
        <div><span class="legend-dot medium"></span><span>Medium risk</span><strong>${risks.medium}</strong></div>
        <div><span class="legend-dot high"></span><span>High risk</span><strong>${risks.high}</strong></div>
      </div>
    </div>
  `;
}

function filterBar(data) {
  return `
    <div class="page-heading">
      <div><span class="eyebrow">Governance snapshot</span><h1>Good morning, Security Admin</h1><p>Here is the latest compliance position across Biztat Solutions.</p></div>
      <div class="filters">
        <label><span>Department</span><select id="departmentFilter">${data.filters.departments.map((department) => `<option ${department === state.department ? "selected" : ""}>${escapeHtml(department)}</option>`).join("")}</select></label>
        <label><span>Period</span><select id="periodFilter"><option value="30" ${state.period === "30" ? "selected" : ""}>Last 30 days</option><option value="60" ${state.period === "60" ? "selected" : ""}>Last 60 days</option><option value="90" ${state.period === "90" ? "selected" : ""}>Last 90 days</option></select></label>
      </div>
    </div>
  `;
}

function overdueTable(items) {
  return `
    <div class="table-tools">
      <label class="search-field">${icon("search", 17)}<input id="overdueSearch" type="search" placeholder="Search employee or activity" aria-label="Search overdue actions"></label>
      <span class="table-count">${items.length} open actions</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Employee</th><th>Activity</th><th>Due date</th><th>Risk</th><th>Follow-up</th></tr></thead>
        <tbody id="overdueRows">
          ${items.map((item) => `
            <tr data-search="${escapeHtml(`${item.user.name} ${item.title} ${item.user.department}`.toLowerCase())}">
              <td><div class="person-cell"><span class="mini-avatar">${escapeHtml(item.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2))}</span><div><strong>${escapeHtml(item.user.name)}</strong><span>${escapeHtml(item.user.department)}</span></div></div></td>
              <td><strong>${escapeHtml(item.title)}</strong><span class="cell-subtitle">${escapeHtml(item.category)}</span></td>
              <td><strong>${formatDate(item.dueDate)}</strong><span class="cell-subtitle danger-text">${item.daysOverdue} days overdue</span></td>
              <td>${status(item.severity)}</td>
              <td><button class="button button-small ${item.reminderSent ? "button-muted" : "button-secondary"}" data-reminder="${item.id}" ${item.reminderSent ? "disabled" : ""}>${item.reminderSent ? "Reminder sent" : "Send reminder"}</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function overviewPage() {
  const data = await api(`/api/compliance/dashboard?department=${encodeURIComponent(state.department)}&period=${state.period}`);
  shell(`
    ${filterBar(data)}
    <div class="metric-grid">
      ${metricCard("Overall compliance", `${data.summary.overallRate}%`, "Across policy, training and quizzes", "shield", "blue", "+4.2%")}
      ${metricCard("Policy acknowledgement", `${data.summary.policyRate}%`, "Current published versions", "policy", "purple", "+2.8%")}
      ${metricCard("Training completion", `${data.summary.trainingRate}%`, "Assigned awareness modules", "training", "green", "+5.1%")}
      ${metricCard("Overdue actions", data.summary.overdueCount, `${data.summary.highRiskCount} high-risk employees`, "warning", "orange", "Needs review")}
    </div>
    <div class="dashboard-grid primary-grid">
      ${panel("Compliance trend", `Performance over the selected ${state.period}-day period`, lineChart(data.trend), "wide-panel")}
      ${panel("Risk distribution", "Calculated from policy, training and quiz outcomes", riskDonut(data.risks))}
    </div>
    <div class="dashboard-grid secondary-grid">
      ${panel("Department performance", "Role-scoped overview of current completion", `
        <div class="department-list">
          ${data.departments.map((department) => `
            <div class="department-row">
              <div><strong>${escapeHtml(department.name)}</strong><span>${department.employees} ${department.employees === 1 ? "person" : "people"}</span></div>
              <div class="department-progress">${progress(department.overallRate, department.overallRate >= 85 ? "green" : department.overallRate >= 70 ? "blue" : "orange")}<strong>${department.overallRate}%</strong></div>
            </div>
          `).join("")}
        </div>
      `)}
      ${panel("Recent audit activity", "Security-relevant events without sensitive content", `
        <div class="activity-list">
          ${data.activity.map((event) => `<div class="activity-item"><span class="activity-icon">${icon(event.action.includes("REPORT") ? "report" : event.action.includes("REMINDER") ? "bell" : "shield", 17)}</span><div><strong>${escapeHtml(event.action.replaceAll("_", " ").toLowerCase())}</strong><span>${escapeHtml(event.target)}</span></div><time>${relativeTime(event.createdAt)}</time></div>`).join("")}
        </div>
      `)}
    </div>
    ${panel("Priority follow-up", "Overdue items requiring authorized action", overdueTable(data.overdue), "full-panel")}
    <p class="updated-time">${icon("refresh", 14)} Data refreshed ${formatDateTime(data.lastUpdated)}</p>
  `, data.summary.unreadNotifications);
  bindDashboardControls();
  bindOverdueActions();
}

function bindDashboardControls() {
  document.getElementById("departmentFilter")?.addEventListener("change", (event) => {
    state.department = event.target.value;
    render();
  });
  document.getElementById("periodFilter")?.addEventListener("change", (event) => {
    state.period = event.target.value;
    render();
  });
}

function bindOverdueActions() {
  document.getElementById("overdueSearch")?.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase().trim();
    document.querySelectorAll("#overdueRows tr").forEach((row) => {
      row.hidden = !row.dataset.search.includes(query);
    });
  });
  document.querySelectorAll("[data-reminder]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Sending...";
      try {
        await api("/api/reminders", { method: "POST", body: JSON.stringify({ itemId: Number(button.dataset.reminder) }) });
        button.textContent = "Reminder sent";
        button.className = "button button-small button-muted";
        showToast("Reminder created and recorded in the audit trail.");
      } catch (error) {
        button.disabled = false;
        button.textContent = "Send reminder";
        showToast(error.message, "error");
      }
    });
  });
}

async function compliancePage() {
  const [data, riskReport] = await Promise.all([
    api(`/api/compliance/dashboard?department=${encodeURIComponent(state.department)}&period=${state.period}`),
    api(`/api/reports?type=risk&department=${encodeURIComponent(state.department)}`)
  ]);
  shell(`
    <div class="section-heading"><div><span class="eyebrow">Control assurance</span><h1>Compliance monitoring</h1><p>Consolidated insight across acknowledgements, deadlines, training completion and quiz outcomes.</p></div><label class="compact-filter"><span>Department</span><select id="departmentFilter">${data.filters.departments.map((department) => `<option ${department === state.department ? "selected" : ""}>${escapeHtml(department)}</option>`).join("")}</select></label></div>
    <div class="metric-grid compact-metrics">
      ${metricCard("Policy compliance", `${data.summary.policyRate}%`, "Acknowledged current versions", "policy", "purple")}
      ${metricCard("Training completion", `${data.summary.trainingRate}%`, "Completed assigned modules", "training", "green")}
      ${metricCard("Quiz pass rate", `${data.summary.quizPassRate}%`, "Pass mark 70%", "quiz", "blue")}
      ${metricCard("High-risk users", data.summary.highRiskCount, "Minimum necessary data shown", "warning", "orange")}
    </div>
    ${panel("Department comparison", "Policy and training completion by authorized scope", `
      <div class="table-scroll"><table><thead><tr><th>Department</th><th>Employees</th><th>Policy</th><th>Training</th><th>Overall</th></tr></thead><tbody>
      ${data.departments.map((department) => `<tr><td><strong>${escapeHtml(department.name)}</strong></td><td>${department.employees}</td><td><div class="inline-progress">${progress(department.policyRate, "purple")}<span>${department.policyRate}%</span></div></td><td><div class="inline-progress">${progress(department.trainingRate, "green")}<span>${department.trainingRate}%</span></div></td><td>${status(department.overallRate >= 85 ? "On track" : department.overallRate >= 70 ? "Monitor" : "At risk")}</td></tr>`).join("")}
      </tbody></table></div>
    `)}
    ${panel("Employee risk review", "Visible only to authorized compliance personnel", reportTable(riskReport.rows))}
    ${panel("Overdue activity", "Follow-up actions are recorded without exposing unnecessary personal information", overdueTable(data.overdue))}
  `, data.summary.unreadNotifications);
  bindDashboardControls();
  bindOverdueActions();
}

function prettyHeader(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function reportTable(rows) {
  if (!rows.length) return '<div class="empty-state">No records match the selected filters.</div>';
  const headers = Object.keys(rows[0]);
  return `<div class="table-scroll"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(prettyHeader(header))}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${header === "status" || header === "risk" ? status(row[header]) : escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

async function policiesPage() {
  const data = await api("/api/policy/overview");
  const employeeAssignments = data.assignments
    .filter((assignment) => assignment.targetType === "user" && assignment.targetValue === data.employee.username)
    .map((assignment) => ({ ...assignment, policy: data.policies.find((policy) => policy.id === assignment.policyId) }));
  shell(`
    <div class="section-heading"><div><span class="eyebrow">Member 2 contribution</span><h1>Policy management and acknowledgement</h1><p>Versioned policy control, scoped assignments and acknowledgement evidence for Biztat Solutions.</p></div></div>
    <div class="metric-grid compact-metrics">
      ${metricCard("Policies", data.summary.policies, `${data.summary.publishedPolicies} published`, "policy", "purple")}
      ${metricCard("Assignments", data.summary.assignments, "Role, department or user targeted", "users", "blue")}
      ${metricCard("Acknowledgements", data.summary.acknowledgements, "Current-version evidence", "check", "green")}
      ${metricCard("Compliance", `${data.summary.complianceRate}%`, `${data.summary.overdue} overdue acknowledgements`, "shield", "orange")}
    </div>
    <div class="dashboard-grid">
      ${panel("Create policy", "Draft or publish a versioned policy", `
        <form id="policyForm" class="module-form">
          <label><span>Title</span><input name="title" required placeholder="Data Classification Policy"></label>
          <label><span>Category</span><input name="category" value="Information Security"></label>
          <label><span>Version</span><input name="version" value="1.0"></label>
          <label><span>Owner</span><input name="owner" value="Information Security"></label>
          <label><span>Status</span><select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <label><span>Effective date</span><input name="effectiveDate" type="date"></label>
          <label class="wide-control"><span>Summary</span><textarea name="summary" placeholder="What this policy controls"></textarea></label>
          <label class="wide-control"><span>Policy content</span><textarea name="content" required placeholder="Employees must..."></textarea></label>
          <button class="button button-primary" type="submit">Create policy</button>
        </form>
      `)}
      ${panel("Assign policy", "Send the current policy version to a target group", `
        <form id="policyAssignmentForm" class="module-form">
          <label><span>Policy</span><select name="policyId">${data.policies.filter((policy) => policy.status === "published").map((policy) => `<option value="${policy.id}">${escapeHtml(policy.title)} v${escapeHtml(policy.version)}</option>`).join("")}</select></label>
          <label><span>Target type</span><select name="targetType"><option value="department">Department</option><option value="role">Role</option><option value="user">User</option></select></label>
          <label><span>Target value</span><input name="targetValue" value="Consulting"></label>
          <label><span>Due date</span><input name="dueDate" type="date"></label>
          <button class="button button-primary" type="submit">Assign policy</button>
        </form>
      `)}
    </div>
    ${panel("Policy register", "Published, draft and archived versions", `
      <div class="module-card-grid">
        ${data.policies.map((policy) => `
          <article class="module-card">
            <div><span class="eyebrow">${escapeHtml(policy.category)}</span><h3>${escapeHtml(policy.title)} <span class="muted">v${escapeHtml(policy.version)}</span></h3><p>${escapeHtml(policy.summary)}</p></div>
            <dl><div><dt>Owner</dt><dd>${escapeHtml(policy.owner)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(policy.status)}</dd></div><div><dt>Acks</dt><dd>${policy.acknowledgementCount}</dd></div></dl>
            <p>${escapeHtml(policy.content)}</p>
            <div class="report-actions">${policy.status !== "published" ? `<button class="button button-secondary" data-policy-publish="${policy.id}">Publish</button>` : ""}<button class="button button-muted" data-policy-archive="${policy.id}">Archive</button></div>
          </article>
        `).join("")}
      </div>
    `, "full-panel")}
    <div class="dashboard-grid">
      ${panel("Employee acknowledgement workspace", `${escapeHtml(data.employee.name)} can acknowledge assigned current versions`, `
        <div class="module-card-grid">
          ${employeeAssignments.map((assignment) => {
            const acknowledged = data.acknowledgements.some((ack) => ack.user?.id === data.employee.id && ack.policyId === assignment.policy.id && ack.policyVersion === assignment.policy.version);
            return `<article class="module-card"><div><span class="eyebrow">Due ${escapeHtml(assignment.dueDate)}</span><h3>${escapeHtml(assignment.policy.title)} v${escapeHtml(assignment.policy.version)}</h3><p>${escapeHtml(assignment.policy.content)}</p></div>${acknowledged ? status("complete") : `<button class="button button-primary" data-policy-ack="${assignment.policy.id}">Acknowledge current version</button>`}</article>`;
          }).join("") || '<div class="empty-state">No individual policy assignments for the demo employee.</div>'}
        </div>
      `)}
      ${panel("Research basis", "Real-world standards used to justify the module", reportTable(data.researchBasis))}
    </div>
    ${panel("Policy compliance", "Assignment status calculated from due date and exact-version acknowledgement", reportTable(data.complianceRows), "full-panel")}
    ${panel("Acknowledgement evidence", "Stored statement, user, policy version and timestamp", reportTable(data.acknowledgements.map((ack) => ({
      employee: ack.user?.name,
      policy: ack.policy?.title,
      version: ack.policyVersion,
      statement: ack.statement,
      acknowledgedAt: formatDateTime(ack.acknowledgedAt)
    }))), "full-panel")}
  `, data.summary.unreadNotifications || 0);

  document.getElementById("policyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/policy/policies", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    showToast("Policy created.");
    policiesPage();
  });
  document.getElementById("policyAssignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.policyId = Number(body.policyId);
    await api("/api/policy/assignments", { method: "POST", body: JSON.stringify(body) });
    showToast("Policy assignment recorded.");
    policiesPage();
  });
  document.querySelectorAll("[data-policy-publish]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policy/policies/${button.dataset.policyPublish}/publish`, { method: "POST" });
      showToast("Policy published.");
      policiesPage();
    });
  });
  document.querySelectorAll("[data-policy-archive]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policy/policies/${button.dataset.policyArchive}/archive`, { method: "POST" });
      showToast("Policy archived.");
      policiesPage();
    });
  });
  document.querySelectorAll("[data-policy-ack]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policy/policies/${button.dataset.policyAck}/acknowledge`, { method: "POST", body: JSON.stringify({ userId: data.employee.id, statement: "I have read and understood the displayed policy version." }) });
      showToast("Acknowledgement recorded.");
      policiesPage();
    });
  });
}

async function quizzesPage() {
  const data = await api("/api/learning/overview");
  shell(`
    <div class="section-heading"><div><span class="eyebrow">Awareness assessment</span><h1>Training cards and quizzes</h1><p>Each training card includes a short quiz. Scores, pass status and who completed each module are recorded for dashboard evidence.</p></div></div>
    <div class="metric-grid compact-metrics">
      ${metricCard("Training cards", data.summary.modules, "Research-based learning topics", "training", "green")}
      ${metricCard("Quiz attempts", data.summary.quizAttempts, "Server-scored submissions", "quiz", "blue")}
      ${metricCard("Average mark", `${data.summary.averageScore}%`, `${data.summary.passRate}% pass rate`, "report", "purple")}
      ${metricCard("Completion", `${data.summary.completionRate}%`, "Across all users and modules", "check", "orange")}
    </div>
    ${panel("Training portal", "Complete the training, then answer the quiz below each card", `
      <div class="module-card-grid">
        ${data.modules.map((module) => `
          <article class="module-card training-card">
            <div><span class="eyebrow">${escapeHtml(module.category)} · ${module.durationMinutes} min</span><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.summary)}</p></div>
            <dl><div><dt>Audience</dt><dd>${escapeHtml(module.audience)}</dd></div><div><dt>Basis</dt><dd>${escapeHtml(module.source)}</dd></div><div><dt>Pass mark</dt><dd>${module.quiz.passMark}%</dd></div></dl>
            <form class="quiz-inline" data-learning-quiz="${module.id}">
              ${module.quiz.questions.map((question, questionIndex) => `
                <fieldset><legend>${escapeHtml(question.prompt)}</legend>${question.options.map((option) => `<label><input type="radio" name="q${questionIndex}" value="${option.id}" required> ${escapeHtml(option.text)}</label>`).join("")}</fieldset>
              `).join("")}
              <button class="button button-primary" type="submit">Submit quiz as demo user</button>
            </form>
          </article>
        `).join("")}
      </div>
    `, "full-panel")}
    <div class="dashboard-grid">
      ${panel("Who completed what", "Marks and status by employee, department and training module", reportTable(data.rows))}
      ${panel("Research basis", "Sources used for the learning model", reportTable(data.researchBasis))}
    </div>
    ${panel("Quiz attempts", "Latest scored attempts for viva/demo evidence", reportTable(data.attempts.map((attempt) => ({
      employee: attempt.user?.name,
      department: attempt.user?.department,
      module: attempt.module?.title,
      mark: `${attempt.score}%`,
      status: attempt.status,
      submittedAt: formatDateTime(attempt.submittedAt)
    }))), "full-panel")}
  `, data.summary.unreadNotifications || 0);

  document.querySelectorAll("[data-learning-quiz]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const answers = Array.from(new FormData(form).entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => Number(value));
      const result = await api(`/api/learning/modules/${form.dataset.learningQuiz}/submit`, { method: "POST", body: JSON.stringify({ userId: 8, answers }) });
      showToast(`Quiz submitted: ${result.attempt.score}% (${result.attempt.status}).`);
      quizzesPage();
    });
  });
}

async function reportsPage() {
  const [dashboard, report] = await Promise.all([
    api("/api/compliance/dashboard"),
    api(`/api/reports?type=${state.reportType}&department=${encodeURIComponent(state.reportDepartment)}`)
  ]);
  shell(`
    <div class="section-heading"><div><span class="eyebrow">Analytics and exports</span><h1>Compliance reports</h1><p>Generate decision-ready evidence using approved reporting criteria and access controls.</p></div></div>
    <section class="report-controls panel">
      <label><span>Report</span><select id="reportType"><option value="executive" ${state.reportType === "executive" ? "selected" : ""}>Executive summary</option><option value="policy" ${state.reportType === "policy" ? "selected" : ""}>Policy acknowledgement</option><option value="training" ${state.reportType === "training" ? "selected" : ""}>Training and quiz</option><option value="risk" ${state.reportType === "risk" ? "selected" : ""}>Employee risk review</option></select></label>
      <label><span>Department</span><select id="reportDepartment">${dashboard.filters.departments.map((department) => `<option ${department === state.reportDepartment ? "selected" : ""}>${escapeHtml(department)}</option>`).join("")}</select></label>
      <div class="report-actions"><button class="button button-secondary" id="printReport">Print preview</button><button class="button button-primary" id="exportReport">${icon("download", 18)}Export CSV</button></div>
    </section>
    ${panel(report.title, `${report.department} scope · Generated ${formatDateTime(report.generatedAt)}`, reportTable(report.rows), "report-panel")}
    <div class="privacy-note">${icon("shield", 18)}<div><strong>Privacy-aware reporting</strong><span>Exports are limited to authorized compliance data and protected against spreadsheet-formula injection.</span></div></div>
  `, dashboard.summary.unreadNotifications);
  document.getElementById("reportType").addEventListener("change", (event) => { state.reportType = event.target.value; render(); });
  document.getElementById("reportDepartment").addEventListener("change", (event) => { state.reportDepartment = event.target.value; render(); });
  document.getElementById("exportReport").addEventListener("click", () => {
    window.location.assign(`/api/reports/export?type=${state.reportType}&department=${encodeURIComponent(state.reportDepartment)}`);
    showToast("CSV export prepared.");
  });
  document.getElementById("printReport").addEventListener("click", () => window.print());
}

async function notificationsPage() {
  const [data, dashboard] = await Promise.all([api("/api/notifications"), api("/api/compliance/dashboard")]);
  shell(`
    <div class="section-heading"><div><span class="eyebrow">Alert management</span><h1>Notification centre</h1><p>Manage new, upcoming and overdue compliance activity reminders.</p></div>${data.unreadCount ? `<button class="button button-secondary" id="markAllRead">${icon("check", 17)}Mark all as read</button>` : ""}</div>
    <div class="notification-layout">
      ${panel("Recent notifications", `${data.unreadCount} unread notification${data.unreadCount === 1 ? "" : "s"}`, `
        <div class="notification-list">
          ${data.notifications.map((notification) => `<button class="notification-item ${notification.read ? "" : "unread"}" data-notification="${notification.id}" ${notification.read ? "disabled" : ""}><span class="notification-type type-${escapeHtml(notification.type)}">${icon(notification.type === "training" ? "training" : notification.type === "policy" ? "policy" : notification.type === "report" ? "report" : notification.type === "reminder" ? "bell" : "warning", 19)}</span><span class="notification-copy"><strong>${escapeHtml(notification.title)}</strong><span>${escapeHtml(notification.message)}</span><time>${relativeTime(notification.createdAt)}</time></span>${notification.read ? "" : '<span class="unread-marker"></span>'}</button>`).join("")}
        </div>
      `, "notification-panel")}
      ${panel("Reminder preferences", "Choose which in-application events should notify authorized users", `
        <form id="settingsForm" class="settings-form">
          ${settingToggle("assignmentCreated", "New assignments", "Policy or training assigned to a user group", data.settings.assignmentCreated)}
          ${settingToggle("dueSoon", "Upcoming deadlines", "Activities approaching their due date", data.settings.dueSoon)}
          ${settingToggle("overdue", "Overdue activities", "Incomplete work after the due date", data.settings.overdue)}
          ${settingToggle("weeklyDigest", "Weekly compliance digest", "Summary for authorized managers", data.settings.weeklyDigest)}
          <button class="button button-primary" type="submit">Save preferences</button>
        </form>
      `, "settings-panel")}
    </div>
  `, data.unreadCount);
  document.querySelectorAll("[data-notification]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/notifications/${button.dataset.notification}/read`, { method: "POST" });
      render();
    });
  });
  document.getElementById("markAllRead")?.addEventListener("click", async () => {
    await api("/api/notifications/read-all", { method: "POST" });
    render();
  });
  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries([...new FormData(event.target).keys()].map((key) => [key, true]));
    ["assignmentCreated", "dueSoon", "overdue", "weeklyDigest"].forEach((key) => { if (!(key in body)) body[key] = false; });
    await api("/api/notification-settings", { method: "PATCH", body: JSON.stringify(body) });
    showToast("Notification preferences saved.");
  });
}

function settingToggle(name, title, description, checked) {
  return `<label class="setting-row"><span><strong>${title}</strong><small>${description}</small></span><span class="switch"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span class="switch-track"></span></span></label>`;
}

async function render() {
  loading();
  try {
    if (state.route === "compliance") return await compliancePage();
    if (state.route === "policies") return await policiesPage();
    if (state.route === "quizzes") return await quizzesPage();
    if (state.route === "reports") return await reportsPage();
    if (state.route === "notifications") return await notificationsPage();
    return await overviewPage();
  } catch (error) {
    shell(`<div class="error-state">${icon("warning", 32)}<h1>Unable to load the dashboard</h1><p>${escapeHtml(error.message)}</p><button class="button button-primary" id="retryButton">Try again</button></div>`);
    document.getElementById("retryButton")?.addEventListener("click", render);
  }
}

render();
