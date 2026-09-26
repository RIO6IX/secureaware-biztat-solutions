// Training module: registers its pages and menu entries with the application shell.
import { cataloguePage } from "./catalogue.js";
import { coursePage } from "./course.js";
import { lessonPage } from "./lesson.js";
import { quizPage } from "./quiz.js";
import { resultsPage } from "./results.js";
import { certificatePage, verifyPage } from "./certificate.js";
import { myLearningPage } from "./my-learning.js";
import { adminCoursesPage, newCoursePage, courseEditorPage } from "./admin-courses.js";
import { assignmentsPage } from "./admin-assign.js";
import { matrixPage } from "./admin-matrix.js";
import { ADMIN_ROLES } from "./common.js";

export default {
  register({ route, nav }) {
    nav({ section: "Learning", label: "Security training", href: "#/training", icon: "🎓", card: "Assigned courses, lessons and quizzes." });
    nav({ section: "Learning", label: "My learning", href: "#/my-learning", icon: "📈", card: "Your progress, attempts and certificates." });
    nav({ section: "Learning", label: "Verify a certificate", href: "#/training/verify", icon: "✔" });
    nav({ section: "Training admin", label: "Course builder", href: "#/training/admin/courses", icon: "✎", roles: ADMIN_ROLES, card: "Courses, lessons and question banks." });
    nav({ section: "Training admin", label: "Assignments", href: "#/training/admin/assignments", icon: "➜", roles: ADMIN_ROLES });
    nav({ section: "Training admin", label: "Needs matrix", href: "#/training/admin/matrix", icon: "▦", roles: ADMIN_ROLES, card: "Which roles and departments need which courses." });

    // Fixed paths are registered before "/training/:slug" so they are not read as course slugs.
    route("/training", cataloguePage, { title: "Security training" });
    route("/my-learning", myLearningPage, { title: "My learning" });
    route("/training/verify", verifyPage, { title: "Verify a certificate" });
    route("/training/attempts/:id", resultsPage, { title: "Quiz results" });
    route("/training/certificates/:code", certificatePage, { title: "Certificate" });
    route("/training/admin/courses", adminCoursesPage, { title: "Course builder", roles: ADMIN_ROLES });
    route("/training/admin/courses/new", newCoursePage, { title: "New course", roles: ADMIN_ROLES });
    route("/training/admin/courses/:id", courseEditorPage, { title: "Edit course", roles: ADMIN_ROLES });
    route("/training/admin/assignments", assignmentsPage, { title: "Assignments", roles: ADMIN_ROLES });
    route("/training/admin/matrix", matrixPage, { title: "Training Needs Matrix", roles: ADMIN_ROLES });
    route("/training/:slug", coursePage, { title: "Course" });
    route("/training/:slug/lesson/:position", lessonPage, { title: "Lesson" });
    route("/training/:slug/quiz", quizPage, { title: "Quiz" });
  }
};
