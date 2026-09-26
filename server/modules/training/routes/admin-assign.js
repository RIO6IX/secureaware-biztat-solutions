import { ADMIN_ROLES, ROLES } from "../schema.js";
import { today } from "../store.js";
import { bool, fail, id as idValue, int, isoDate, oneOf, queryText, text } from "../validate.js";

export default function registerAdminAssign({ route, store, foundation, matrix }) {
  const db = foundation.db;
  const admin = { roles: ADMIN_ROLES };
  const departments = () => db.prepare("SELECT DISTINCT department FROM users WHERE active = 1 ORDER BY department").all().map((row) => row.department);

  // Resolves an assignment target to a stored value and the users it currently reaches.
  function resolveTarget(targetType, rawValue) {
    oneOf(targetType, "Target type", ["department", "role", "user"]);
    const value = text(rawValue, "Target", { max: 80 });
    if (targetType === "department") {
      if (!departments().includes(value)) fail("Choose an existing department");
      return { stored: value, label: value, users: db.prepare("SELECT id, display_name, role, department FROM users WHERE active = 1 AND department = ? ORDER BY display_name").all(value) };
    }
    if (targetType === "role") {
      oneOf(value, "Role", ROLES);
      return { stored: value, label: value, users: db.prepare("SELECT id, display_name, role, department FROM users WHERE active = 1 AND role = ? ORDER BY display_name").all(value) };
    }
    const user = db.prepare("SELECT id, display_name, role, department FROM users WHERE active = 1 AND username = ?").get(value);
    if (!user) fail("No active user has that username");
    return { stored: String(user.id), label: user.display_name, users: [user] };
  }

  function publishedCourse(courseId) {
    const course = store.q.courseById.get(idValue(courseId, "Course"));
    if (!course) fail("Course not found");
    if (course.status !== "published") fail("Only published courses can be assigned");
    return course;
  }

  const recipientView = (user) => ({ displayName: user.display_name, role: user.role, department: user.department });

  route("GET", "/admin/assignments", (ctx) => {
    const source = queryText(ctx.query, "source") || "manual";
    oneOf(source, "source", ["manual", "matrix", "all"]);
    const rows = db.prepare(`SELECT a.*, c.title, c.slug, u.display_name AS assigned_by_name, tu.display_name AS target_user_name
      FROM training_assignments a JOIN training_courses c ON c.id = a.course_id
      LEFT JOIN users u ON u.id = a.assigned_by
      LEFT JOIN users tu ON a.target_type = 'user' AND tu.id = CAST(a.target_value AS INTEGER)
      WHERE (? = 'all' OR a.source = ?) ORDER BY a.created_at DESC LIMIT 500`).all(source, source);
    return ctx.send(200, {
      assignments: rows.map((row) => ({
        id: row.id,
        course: { id: row.course_id, title: row.title, slug: row.slug },
        targetType: row.target_type,
        target: row.target_type === "user" ? row.target_user_name || "Former user" : row.target_value,
        dueDate: row.due_date,
        mandatory: Boolean(row.mandatory),
        source: row.source,
        assignedBy: row.assigned_by_name || "Training Needs Matrix",
        createdAt: row.created_at
      })),
      courses: db.prepare("SELECT id, title FROM training_courses WHERE status = 'published' ORDER BY title").all(),
      departments: departments(),
      roles: ROLES
    });
  }, admin);

  route("POST", "/admin/assignments/preview", async (ctx) => {
    const body = await ctx.body();
    const course = publishedCourse(body.courseId);
    const target = resolveTarget(body.targetType, body.targetValue);
    return ctx.send(200, { course: { id: course.id, title: course.title }, target: target.label, recipients: target.users.map(recipientView) });
  }, admin);

  route("POST", "/admin/assignments", async (ctx) => {
    const body = await ctx.body();
    const course = publishedCourse(body.courseId);
    const target = resolveTarget(body.targetType, body.targetValue);
    const dueDate = isoDate(body.dueDate, "Due date");
    if (dueDate < today()) fail("The due date cannot be in the past");
    const mandatory = bool(body.mandatory, "Mandatory");
    db.prepare(`INSERT INTO training_assignments (course_id,target_type,target_value,due_date,mandatory,source,assigned_by,created_at)
      VALUES (?,?,?,?,?,'manual',?,?)
      ON CONFLICT(course_id,target_type,target_value) DO UPDATE SET due_date = excluded.due_date, mandatory = excluded.mandatory, source = 'manual', assigned_by = excluded.assigned_by`)
      .run(course.id, body.targetType, target.stored, dueDate, mandatory ? 1 : 0, ctx.user.id, new Date().toISOString());
    for (const user of target.users) {
      foundation.notify(user.id, "training", `Training assigned: ${course.title}`, `${mandatory ? "Mandatory" : "Recommended"} training, due ${dueDate}.`, `#/training/${course.slug}`);
    }
    ctx.audit("TRAINING_ASSIGNED", `${course.slug} -> ${body.targetType}:${target.label} (${target.users.length} recipients, due ${dueDate})`);
    return ctx.send(201, { recipients: target.users.length });
  }, admin);

  route("DELETE", "/admin/assignments/:id", (ctx) => {
    const assignment = db.prepare("SELECT a.*, c.slug FROM training_assignments a JOIN training_courses c ON c.id = a.course_id WHERE a.id = ?").get(idValue(ctx.params.id, "assignment id"));
    if (!assignment) return ctx.send(404, { message: "Assignment not found" });
    db.prepare("DELETE FROM training_assignments WHERE id = ?").run(assignment.id);
    ctx.audit("TRAINING_ASSIGNMENT_REMOVED", `${assignment.slug} -> ${assignment.target_type}:${assignment.target_value}`);
    return ctx.send(200, { ok: true });
  }, admin);

  route("GET", "/admin/matrix", (ctx) => ctx.send(200, {
    roles: ROLES,
    departments: departments(),
    courses: db.prepare("SELECT id, title, status FROM training_courses WHERE status <> 'archived' ORDER BY id").all(),
    requirements: db.prepare("SELECT role, department, course_id, due_in_days FROM training_role_requirements ORDER BY id").all()
      .map((row) => ({ role: row.role, department: row.department, courseId: row.course_id, dueInDays: row.due_in_days }))
  }), admin);

  route("PUT", "/admin/matrix", async (ctx) => {
    const body = await ctx.body();
    if (!Array.isArray(body.requirements) || body.requirements.length > 500) fail("requirements must be a list of at most 500 entries");
    const knownDepartments = departments();
    const courseIds = new Set(db.prepare("SELECT id FROM training_courses WHERE status <> 'archived'").all().map((row) => row.id));
    const cleaned = body.requirements.map((entry, index) => {
      if (!entry || typeof entry !== "object") fail(`Requirement ${index + 1} is invalid`);
      const role = oneOf(entry.role, "Role", ["*", ...ROLES]);
      const department = entry.department === null || entry.department === undefined ? null : text(entry.department, "Department", { max: 60 });
      if (department && !knownDepartments.includes(department)) fail(`Unknown department: ${department}`);
      const courseId = idValue(entry.courseId, "Course");
      if (!courseIds.has(courseId)) fail("A requirement refers to a course that does not exist");
      return { role, department, courseId, dueInDays: int(entry.dueInDays ?? 30, "Due in days", 1, 365) };
    });
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM training_role_requirements").run();
      const insert = db.prepare("INSERT OR IGNORE INTO training_role_requirements (role,department,course_id,due_in_days) VALUES (?,?,?,?)");
      for (const entry of cleaned) insert.run(entry.role, entry.department, entry.courseId, entry.dueInDays);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const totals = matrix.reconcileAll();
    ctx.audit("TRAINING_MATRIX_UPDATED", `${cleaned.length} requirements; ${totals.created} assignments created, ${totals.removed} removed`);
    return ctx.send(200, { requirements: cleaned.length, ...totals });
  }, admin);

  route("POST", "/admin/matrix/apply", (ctx) => {
    const totals = matrix.reconcileAll();
    ctx.audit("TRAINING_MATRIX_APPLIED", `${totals.created} assignments created, ${totals.removed} removed`);
    return ctx.send(200, totals);
  }, admin);
}
