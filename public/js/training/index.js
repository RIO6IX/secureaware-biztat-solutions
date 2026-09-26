// Training module: registers its pages and menu entries with the application shell.
import { cataloguePage } from "./catalogue.js";
import { coursePage } from "./course.js";

export default {
  register({ route, nav }) {
    nav({ section: "Learning", label: "Security training", href: "#/training", icon: "🎓", card: "Assigned courses, lessons and quizzes." });

    route("/training", cataloguePage, { title: "Security training" });
    route("/training/:slug", coursePage, { title: "Course" });
  }
};
