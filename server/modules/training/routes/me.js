import { courseSummary } from "../store.js";
import { canViewUser } from "../access.js";
import { CERTIFICATE_CODE_PATTERN } from "../quiz.js";
import { createRateLimiter } from "../rateLimit.js";
import { attemptRows } from "./team.js";

export default function registerMe({ route, store, foundation }) {
  const db = foundation.db;
  const verifyLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
  const certificateByCode = db.prepare(`SELECT cert.certificate_code, cert.issued_at, cert.user_id, a.score, a.course_version, c.title, c.slug, u.display_name
    FROM certificates cert
    JOIN quiz_attempts a ON a.id = cert.attempt_id
    JOIN training_courses c ON c.id = cert.course_id
    JOIN users u ON u.id = cert.user_id
    WHERE cert.certificate_code = ?`);

  // The learner's own dashboard: only the signed-in user's data, never anyone else's.
  route("GET", "/me", (ctx) => {
    const courses = store.learnerCourses(ctx.user).map(({ course, state }) => ({ ...courseSummary(course), state }));
    const relevant = courses.filter(({ state }) => state.assigned || state.status !== "not_started");
    return ctx.send(200, {
      summary: {
        assigned: courses.filter(({ state }) => state.assigned).length,
        inProgress: relevant.filter(({ state }) => ["in_progress", "failed_retake"].includes(state.status)).length,
        overdue: courses.filter(({ state }) => state.status === "overdue").length,
        completed: courses.filter(({ state }) => state.status === "passed").length
      },
      courses: relevant,
      attempts: attemptRows(db, ctx.user.id),
      certificates: db.prepare(`SELECT cert.certificate_code, cert.issued_at, c.title, c.slug FROM certificates cert
        JOIN training_courses c ON c.id = cert.course_id WHERE cert.user_id = ? ORDER BY cert.issued_at DESC`).all(ctx.user.id)
        .map((row) => ({ code: row.certificate_code, issuedAt: row.issued_at, course: { title: row.title, slug: row.slug } }))
    });
  });

  // Full certificate for printing: the holder, their department manager or an admin.
  route("GET", "/me/certificates/:code", (ctx) => {
    const code = String(ctx.params.code).toUpperCase();
    const row = CERTIFICATE_CODE_PATTERN.test(code) ? certificateByCode.get(code) : null;
    const holder = row ? store.q.userById.get(row.user_id) : null;
    if (!row || !canViewUser(ctx.user, holder)) return ctx.send(404, { message: "Certificate not found" });
    return ctx.send(200, {
      certificate: {
        code: row.certificate_code,
        learnerName: row.display_name,
        course: { title: row.title, slug: row.slug },
        courseVersion: row.course_version,
        score: row.score,
        issuedAt: row.issued_at
      }
    });
  });

  // Verification answers only "is this code genuine, for which course and when".
  // It never returns the holder's name, score or any other personal data.
  route("GET", "/certificates/:code", (ctx) => {
    const verdict = verifyLimiter(String(ctx.user.id));
    if (!verdict.allowed) {
      ctx.response.setHeader("retry-after", String(verdict.retryAfterSeconds));
      return ctx.send(429, { message: "Too many verification requests. Please wait a moment." });
    }
    const code = String(ctx.params.code).trim().toUpperCase();
    const row = CERTIFICATE_CODE_PATTERN.test(code) ? certificateByCode.get(code) : null;
    ctx.audit("TRAINING_CERTIFICATE_VERIFIED", `${row ? "valid" : "invalid"} code`);
    if (!row) return ctx.send(200, { valid: false });
    return ctx.send(200, { valid: true, course: row.title, issuedOn: row.issued_at.slice(0, 10) });
  });
}
