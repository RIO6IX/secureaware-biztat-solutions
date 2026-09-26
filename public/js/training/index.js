// Training module: registers its pages and menu entries with the application shell.
import { cataloguePage } from "./catalogue.js";
import { coursePage } from "./course.js";
import { lessonPage } from "./lesson.js";
import { quizPage } from "./quiz.js";
import { resultsPage } from "./results.js";
import { certificatePage, verifyPage } from "./certificate.js";
import { myLearningPage } from "./my-learning.js";

export default {
  register({ route, nav }) {
    nav({ section: "Learning", label: "Security training", href: "#/training", icon: "🎓", card: "Assigned courses, lessons and quizzes." });
    nav({ section: "Learning", label: "My learning", href: "#/my-learning", icon: "📈", card: "Your progress, attempts and certificates." });
    nav({ section: "Learning", label: "Verify a certificate", href: "#/training/verify", icon: "✔" });

    // Fixed paths are registered before "/training/:slug" so they are not read as course slugs.
    route("/training", cataloguePage, { title: "Security training" });
    route("/my-learning", myLearningPage, { title: "My learning" });
    route("/training/verify", verifyPage, { title: "Verify a certificate" });
    route("/training/attempts/:id", resultsPage, { title: "Quiz results" });
    route("/training/certificates/:code", certificatePage, { title: "Certificate" });
    route("/training/:slug", coursePage, { title: "Course" });
    route("/training/:slug/lesson/:position", lessonPage, { title: "Lesson" });
    route("/training/:slug/quiz", quizPage, { title: "Quiz" });
  }
};
