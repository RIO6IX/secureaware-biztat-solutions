import { ADMIN_ROLES } from "../schema.js";
import { STATUS_VALUES } from "../store.js";
import { oneOf, optionalId, queryText } from "../validate.js";

const CSV_FIELDS = ["employee", "username", "department", "role", "course", "course_version", "mandatory", "due_date", "status", "lessons_completed", "lessons_total", "attempts_used", "best_score", "passed_at", "certificate_code"];

export default function registerReports({ route, store, foundation }) {
  const db = foundation.db;

  function filters(query) {
    const status = queryText(query, "status");
    if (status) oneOf(status, "status", STATUS_VALUES);
    return { courseId: optionalId(query.get("courseId"), "courseId"), department: queryText(query, "department", 60), status };
  }

  // One row per person per assigned course: the evidence behind every completion figure.
  function evidenceRows({ courseId, department, status }) {
    store.expireStaleAttempts();
    const rows = [];
    for (const member of store.q.activeUsers.all()) {
      if (department && member.department !== department) continue;
      for (const { course, state } of store.assignedCourseStates(member)) {
        if (courseId && course.id !== courseId) continue;
        if (status && state.status !== status) continue;
        rows.push({
          employee: member.display_name,
          username: member.username,
          department: member.department,
          role: member.role,
          course_id: course.id,
          course: course.title,
          course_version: course.version,
          mandatory: state.mandatory ? "yes" : "no",
          due_date: state.dueDate || "",
          status: state.status,
          lessons_completed: state.lessonsCompleted,
          lessons_total: state.lessonsTotal,
          attempts_used: state.attemptsUsed,
          best_score: state.bestScore ?? "",
          passed_at: state.passedAt || "",
          certificate_code: state.certificateCode || ""
        });
      }
    }
    return rows;
  }

  function summarise(rows, key) {
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row[key])) groups.set(row[key], []);
      groups.get(row[key]).push(row);
    }
    return [...groups].map(([name, items]) => {
      const passed = items.filter((row) => row.status === "passed");
      return {
        name,
        assigned: items.length,
        completed: passed.length,
        completionRate: Math.round((passed.length / items.length) * 100),
        overdue: items.filter((row) => row.status === "overdue").length,
        failed: items.filter((row) => row.status.startsWith("failed")).length,
        averageAttempts: passed.length ? Number((passed.reduce((sum, row) => sum + row.attempts_used, 0) / passed.length).toFixed(1)) : null
      };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  route("GET", "/admin/reports", (ctx) => {
    const applied = filters(ctx.query);
    const rows = evidenceRows(applied);
    const attempts = db.prepare(`SELECT COUNT(*) AS submitted, COALESCE(SUM(passed), 0) AS passed FROM quiz_attempts WHERE status = 'submitted'
      AND (? IS NULL OR course_id = ?)`).get(applied.courseId, applied.courseId);
    const passedRows = rows.filter((row) => row.status === "passed");
    return ctx.send(200, {
      filters: applied,
      options: {
        courses: db.prepare("SELECT id, title FROM training_courses WHERE status <> 'draft' ORDER BY title").all(),
        departments: db.prepare("SELECT DISTINCT department FROM users WHERE active = 1 ORDER BY department").all().map((row) => row.department),
        statuses: STATUS_VALUES
      },
      summary: {
        learners: new Set(rows.map((row) => row.username)).size,
        assignments: rows.length,
        completionRate: rows.length ? Math.round((passedRows.length / rows.length) * 100) : 0,
        passRate: attempts.submitted ? Math.round((attempts.passed / attempts.submitted) * 100) : 0,
        averageAttempts: passedRows.length ? Number((passedRows.reduce((sum, row) => sum + row.attempts_used, 0) / passedRows.length).toFixed(1)) : null,
        overdue: rows.filter((row) => row.status === "overdue").length
      },
      byCourse: summarise(rows, "course"),
      byDepartment: summarise(rows, "department"),
      overdue: rows.filter((row) => row.status === "overdue"),
      rows
    });
  }, { roles: ADMIN_ROLES });

  route("GET", "/admin/reports.csv", (ctx) => {
    const applied = filters(ctx.query);
    const rows = evidenceRows(applied);
    ctx.audit("TRAINING_EVIDENCE_EXPORTED", `${rows.length} rows${applied.department ? ` dept:${applied.department}` : ""}${applied.courseId ? ` course:${applied.courseId}` : ""}${applied.status ? ` status:${applied.status}` : ""}`);
    return foundation.sendCsv(ctx.response, rows, CSV_FIELDS, `training-evidence-${new Date().toISOString().slice(0, 10)}.csv`);
  }, { roles: ADMIN_ROLES });
}
