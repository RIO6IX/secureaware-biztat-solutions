import { ADMIN_ROLES } from "../schema.js";
import { MANAGER_ROLES, canViewUser, teamDepartment } from "../access.js";
import { fail, id as idValue, queryText } from "../validate.js";
import { createRateLimiter } from "../rateLimit.js";

export function attemptRows(db, userId) {
  return db.prepare(`SELECT a.id, a.attempt_number, a.score, a.passed, a.status, a.started_at, a.submitted_at, a.course_version,
      c.slug, c.title, c.pass_mark, cert.certificate_code
    FROM quiz_attempts a JOIN training_courses c ON c.id = a.course_id
    LEFT JOIN certificates cert ON cert.attempt_id = a.id
    WHERE a.user_id = ? ORDER BY a.started_at DESC`).all(userId).map((row) => ({
    id: row.id,
    course: { slug: row.slug, title: row.title },
    attemptNumber: row.attempt_number,
    courseVersion: row.course_version,
    status: row.status,
    score: row.score,
    passed: row.passed === null ? null : Boolean(row.passed),
    passMark: row.pass_mark,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    certificateCode: row.certificate_code
  }));
}

export function memberCourses(store, member) {
  return store.assignedCourseStates(member).map(({ course, state }) => ({
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    status: state.status,
    dueDate: state.dueDate,
    mandatory: state.mandatory,
    lessonsCompleted: state.lessonsCompleted,
    lessonsTotal: state.lessonsTotal,
    bestScore: state.bestScore,
    attemptsUsed: state.attemptsUsed
  }));
}

export default function registerTeam({ route, store, foundation }) {
  // One reminder per manager, learner and course every ten minutes stops accidental spam.
  const reminderLimiter = createRateLimiter({ limit: 1, windowMs: 10 * 60_000 });

  route("GET", "/team", (ctx) => {
    const requested = queryText(ctx.query, "department");
    const department = teamDepartment(ctx.user, requested);
    store.expireStaleAttempts();
    const members = store.q.activeUsers.all().filter((member) => (department ? member.department === department : true) && canViewUser(ctx.user, member));
    const rows = members.map((member) => {
      const courses = memberCourses(store, member);
      return {
        user: { id: member.id, displayName: member.display_name, username: member.username, role: member.role, department: member.department },
        courses,
        counts: {
          assigned: courses.length,
          passed: courses.filter((course) => course.status === "passed").length,
          overdue: courses.filter((course) => course.status === "overdue").length,
          failed: courses.filter((course) => course.status.startsWith("failed")).length
        }
      };
    });
    const assigned = rows.reduce((sum, row) => sum + row.counts.assigned, 0);
    const passed = rows.reduce((sum, row) => sum + row.counts.passed, 0);
    return ctx.send(200, {
      department: department || "All departments",
      canChooseDepartment: foundation.hasRole(ctx.user, ADMIN_ROLES),
      departments: [...new Set(store.q.activeUsers.all().map((member) => member.department))].sort(),
      summary: {
        members: rows.length,
        assigned,
        completionRate: assigned ? Math.round((passed / assigned) * 100) : 0,
        overdue: rows.reduce((sum, row) => sum + row.counts.overdue, 0),
        failed: rows.reduce((sum, row) => sum + row.counts.failed, 0)
      },
      members: rows
    });
  }, { roles: MANAGER_ROLES });

  route("GET", "/team/users/:id", (ctx) => {
    const member = store.q.userById.get(idValue(ctx.params.id, "user id"));
    // Out-of-scope users get the same 404 as missing users, so managers cannot probe other departments.
    if (!canViewUser(ctx.user, member)) return ctx.send(404, { message: "Team member not found" });
    store.expireStaleAttempts();
    return ctx.send(200, {
      user: { id: member.id, displayName: member.display_name, role: member.role, department: member.department },
      courses: memberCourses(store, member),
      // Managers get status and scores only; certificate codes stay with the holder and admins.
      attempts: attemptRows(foundation.db, member.id).map((row) => (foundation.hasRole(ctx.user, ADMIN_ROLES) ? row : { ...row, certificateCode: null }))
    });
  }, { roles: MANAGER_ROLES });

  route("POST", "/team/reminders", async (ctx) => {
    const body = await ctx.body();
    const member = store.q.userById.get(idValue(body.targetUserId, "targetUserId"));
    if (!canViewUser(ctx.user, member) || member.id === ctx.user.id) return ctx.send(404, { message: "Team member not found" });
    const course = store.q.courseById.get(idValue(body.courseId, "courseId"));
    const entry = course ? store.assignedCourseStates(member).find((item) => item.course.id === course.id) : null;
    if (!entry) fail("This course is not assigned to that person");
    if (entry.state.status === "passed") fail("This person has already completed the course");
    const verdict = reminderLimiter(`${ctx.user.id}:${member.id}:${course.id}`);
    if (!verdict.allowed) return ctx.send(429, { message: "A reminder was sent recently. Please wait before sending another." });
    const due = entry.state.dueDate ? ` It was due on ${entry.state.dueDate}.` : "";
    foundation.notify(member.id, "reminder", `Reminder: ${course.title}`,
      `${ctx.user.display_name} has reminded you to complete this training.${due}`, `#/training/${course.slug}`);
    ctx.audit("TRAINING_REMINDER_SENT", `${course.slug} -> user:${member.id}`);
    return ctx.send(201, { ok: true });
  }, { roles: MANAGER_ROLES });
}
