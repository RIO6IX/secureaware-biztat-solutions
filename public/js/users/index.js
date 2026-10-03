import { api } from "../core/api.js";
import { h, formatDate } from "../core/dom.js";
import { currentQuery, navigate } from "../core/router.js";
import { badge, confirmDialog, emptyState, field, pageHeader, table, toast, withStates } from "../core/ui.js";

const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];

function option(value, selected, label = value) {
  return h("option", { value, selected: value === selected }, label);
}

function formDialog({ title, submitLabel, user = null, data, onSubmit }) {
  const create = !user;
  const username = h("input", { id: "user-username", name: "username", autocomplete: "off", minlength: "3", maxlength: "40", required: true, value: user?.username || "", disabled: !create });
  const displayName = h("input", { id: "user-name", name: "displayName", autocomplete: "name", minlength: "2", maxlength: "80", required: true, value: user?.displayName || "" });
  const role = h("select", { id: "user-role", name: "role", required: true }, data.permissions.assignableRoles.map((name) => option(name, user?.role || "Employee")));
  const department = h("input", { id: "user-department", name: "department", list: "department-options", maxlength: "60", required: true, value: user?.department || "" });
  const password = create ? h("input", { id: "user-password", name: "temporaryPassword", type: "password", autocomplete: "new-password", minlength: "15", maxlength: "128", required: true }) : null;
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const submit = h("button", { type: "submit", class: "primary" }, submitLabel);
  const dialog = h("dialog", { class: "dialog user-dialog", "aria-labelledby": "user-dialog-title" },
    h("form", { class: "stack", on: { submit: async (event) => {
      event.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      const body = { displayName: displayName.value, role: role.value, department: department.value };
      if (create) Object.assign(body, { username: username.value, temporaryPassword: password.value });
      try {
        await onSubmit(body);
        dialog.close();
        dialog.remove();
      } catch (requestError) {
        error.textContent = requestError.message;
        error.hidden = false;
        submit.disabled = false;
      }
    } } },
      h("div", {}, h("h2", { id: "user-dialog-title" }, title), h("p", { class: "muted" }, create ? "Create a named account and securely share the temporary password with the user." : "Changes to role or department revoke the user's active sessions.")),
      h("div", { class: "form-grid" },
        field("Display name", displayName),
        field("Username", username, create ? "Lowercase letters, numbers, dots, hyphens or underscores." : "Usernames are retained for audit integrity."),
        field("Role", role),
        field("Department", department),
        h("datalist", { id: "department-options" }, data.filters.departments.map((name) => h("option", { value: name }))),
        password ? h("div", { class: "wide" }, field("Temporary password", password, "Use at least 15 characters. The password is never stored or shown in the audit log.")) : null),
      error,
      h("div", { class: "dialog-actions" },
        h("button", { type: "button", on: { click: () => { dialog.close(); dialog.remove(); } } }, "Cancel"), submit)));
  dialog.addEventListener("cancel", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  displayName.focus();
}

function passwordDialog(user, refresh) {
  const password = h("input", { id: "reset-password", type: "password", autocomplete: "new-password", minlength: "15", maxlength: "128", required: true });
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const submit = h("button", { type: "submit", class: "primary" }, "Reset password");
  const dialog = h("dialog", { class: "dialog", "aria-labelledby": "password-dialog-title" },
    h("form", { class: "stack", on: { submit: async (event) => {
      event.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      try {
        await api(`/api/users/${user.id}/password`, { method: "POST", body: { temporaryPassword: password.value } });
        dialog.close();
        dialog.remove();
        toast(`Password reset for ${user.displayName}. Their existing sessions were closed.`);
        refresh();
      } catch (requestError) {
        error.textContent = requestError.message;
        error.hidden = false;
        submit.disabled = false;
      }
    } } },
      h("div", {}, h("h2", { id: "password-dialog-title" }, `Reset ${user.displayName}'s password`), h("p", { class: "muted" }, "Give the temporary password to the user through an approved secure channel.")),
      field("New temporary password", password, "Use at least 15 characters. All current sessions will be revoked."),
      error,
      h("div", { class: "dialog-actions" }, h("button", { type: "button", on: { click: () => { dialog.close(); dialog.remove(); } } }, "Cancel"), submit)));
  dialog.addEventListener("cancel", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  password.focus();
}

function summaryCard(value, label, tone = "") {
  return h("div", { class: `user-summary-card ${tone}` }, h("strong", {}, String(value)), h("span", {}, label));
}

function usersPage(container) {
  const query = currentQuery();
  const filters = {
    search: query.get("search") || "",
    role: query.get("role") || "All",
    department: query.get("department") || "",
    status: query.get("status") || "all"
  };
  const params = new URLSearchParams(filters);
  const load = () => api(`/api/users?${params}`);
  const render = () => withStates(container, load, (data) => {
    const refresh = () => render();
    const createUser = () => formDialog({
      title: "Add user", submitLabel: "Create account", data,
      onSubmit: async (body) => {
        await api("/api/users", { method: "POST", body });
        toast(`Account created for ${body.displayName}.`);
        refresh();
      }
    });
    const editUser = (user) => formDialog({
      title: `Edit ${user.displayName}`, submitLabel: "Save changes", user, data,
      onSubmit: async (body) => {
        const result = await api(`/api/users/${user.id}`, { method: "PUT", body });
        toast(result.sessionsRevoked ? "User updated and existing sessions were closed." : "User updated.");
        refresh();
      }
    });
    const setStatus = async (user) => {
      const activate = !user.active;
      const confirmed = await confirmDialog({
        title: `${activate ? "Activate" : "Deactivate"} ${user.displayName}?`,
        body: activate ? "The user will be able to sign in again." : "The user will be signed out immediately and prevented from signing in.",
        confirmLabel: activate ? "Activate user" : "Deactivate user",
        tone: activate ? "primary" : "danger"
      });
      if (!confirmed) return;
      try {
        await api(`/api/users/${user.id}/status`, { method: "POST", body: { active: activate } });
        toast(`${user.displayName} ${activate ? "activated" : "deactivated"}.`);
        refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    };
    const actions = (user) => user.canManage ? h("div", { class: "user-actions" },
      h("button", { type: "button", class: "subtle", on: { click: () => editUser(user) } }, "Edit"),
      h("button", { type: "button", class: "subtle", on: { click: () => passwordDialog(user, refresh) } }, "Reset password"),
      h("button", { type: "button", class: user.active ? "subtle danger-text" : "subtle", on: { click: () => setStatus(user) } }, user.active ? "Deactivate" : "Activate"))
      : h("span", { class: "small muted" }, user.id === data.currentUserId ? "Current account" : "System Admin only");
    const search = h("input", { id: "user-search", type: "search", name: "search", value: filters.search, placeholder: "Name, username, role…" });
    const role = h("select", { id: "user-role-filter", name: "role" }, data.filters.roles.map((name) => option(name, filters.role, name === "All" ? "All roles" : name)));
    const department = h("select", { id: "user-dept-filter", name: "department" }, option("", filters.department, "All departments"), data.filters.departments.map((name) => option(name, filters.department)));
    const status = h("select", { id: "user-status-filter", name: "status" }, [["all", "All statuses"], ["active", "Active"], ["inactive", "Inactive"]].map(([value, label]) => option(value, filters.status, label)));
    const filterForm = h("form", { class: "filters user-filters", on: { submit: (event) => {
      event.preventDefault();
      const next = new URLSearchParams({ search: search.value.trim(), role: role.value, department: department.value, status: status.value });
      navigate(`/users?${next}`);
    } } },
      h("div", { class: "field grow" }, h("label", { class: "field-label", for: "user-search" }, "Search users"), search),
      field("Role", role), field("Department", department), field("Status", status),
      h("button", { type: "submit" }, "Apply filters"),
      h("a", { class: "button subtle", href: "#/users" }, "Clear"));
    return h("div", { class: "stack" },
      pageHeader("User management", "Create accounts, assign appropriate access and manage the complete user lifecycle.", h("button", { type: "button", class: "primary", on: { click: createUser } }, "Add user")),
      h("div", { class: "user-summary" },
        summaryCard(data.summary.total, "Total users"), summaryCard(data.summary.active, "Active", "success"),
        summaryCard(data.summary.inactive, "Inactive", "muted-card"), summaryCard(data.summary.administrators, "Administrators", "info")),
      h("section", { class: "panel stack" },
        h("div", {}, h("h2", {}, "User directory"), h("p", { class: "muted" }, data.permissions.canManageAdministratorAccounts ? "You can manage all accounts and roles." : "Security/HR Admins can manage Employee and Department Manager accounts. Administrator accounts are protected.")),
        filterForm,
        data.users.length ? table([
          { label: "User", render: (user) => h("div", { class: "user-identity" }, h("strong", {}, user.displayName), h("span", { class: "small muted" }, `@${user.username}`)) },
          { label: "Role", render: (user) => badge(user.role, ADMIN_ROLES.includes(user.role) ? "info" : "neutral") },
          { label: "Department", key: "department" },
          { label: "Status", render: (user) => h("div", { class: "user-status" }, badge(user.active ? "Active" : "Inactive", user.active ? "success" : "danger"), user.lockedUntil ? badge("Locked", "warning") : null) },
          { label: "Created", render: (user) => formatDate(user.createdAt) },
          { label: "Actions", render: actions }
        ], data.users, { caption: "User accounts" }) : emptyState("No users match these filters", "Clear or change the filters to see more accounts.")));
  });
  return render();
}

export default {
  register({ route, nav }) {
    nav({ section: "Administration", label: "User management", href: "#/users", icon: "♙", roles: ADMIN_ROLES, card: "Create accounts, assign roles and manage access." });
    route("/users", usersPage, { title: "User management", roles: ADMIN_ROLES });
  }
};
