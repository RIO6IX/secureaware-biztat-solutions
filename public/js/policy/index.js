// Policy module: registers its pages and menu entries with the application shell.
import { inboxPage } from "./inbox.js";
import { readerPage } from "./reader.js";
import { receiptPage, myReceiptsPage } from "./receipt.js";
import { libraryPage } from "./library.js";
import { newPolicyPage, editorPage } from "./editor.js";
import { historyPage, comparePage } from "./history.js";
import { reviewsPage } from "./reviews.js";
import { assignPage } from "./assign.js";
import { compliancePage, calendarPage } from "./compliance.js";
import { questionsPage, exceptionsPage } from "./queues.js";
import { teamPage } from "./team.js";
import { researchPage } from "./research.js";
import { ADMIN_ROLES, MANAGER_ROLES } from "./common.js";

export default {
  register({ route, nav }) {
    nav({ section: "Policies", label: "My policies", href: "#/policies", icon: "📄", card: "Policies to read and acknowledge." });
    nav({ section: "Policies", label: "My acknowledgements", href: "#/policies/receipts", icon: "🧾" });
    nav({ section: "Policies", label: "Policy reviews", href: "#/policies/reviews", icon: "✓", card: "Policies waiting for your approval." });
    nav({ section: "Team", label: "Team policies", href: "#/policies/team", icon: "👥", roles: MANAGER_ROLES, card: "Who in your team still has to acknowledge." });
    nav({ section: "Policy admin", label: "Policy library", href: "#/policies/admin", icon: "📚", roles: ADMIN_ROLES, card: "Draft, review, publish and version policies." });
    nav({ section: "Policy admin", label: "Policy assignments", href: "#/policies/admin/assignments", icon: "➜", roles: ADMIN_ROLES });
    nav({ section: "Policy admin", label: "Compliance & evidence", href: "#/policies/admin/compliance", icon: "📊", roles: ADMIN_ROLES, card: "Acknowledgement status and evidence export." });
    nav({ section: "Policy admin", label: "Review calendar", href: "#/policies/admin/calendar", icon: "🗓", roles: ADMIN_ROLES });
    nav({ section: "Policy admin", label: "Questions", href: "#/policies/admin/questions", icon: "?", roles: ADMIN_ROLES });
    nav({ section: "Policy admin", label: "Exceptions", href: "#/policies/admin/exceptions", icon: "⚑", roles: ADMIN_ROLES });
    nav({ section: "Policy admin", label: "Standards alignment", href: "#/policies/research", icon: "🔎", roles: ADMIN_ROLES });

    // Fixed paths first so they are not read as policy slugs.
    route("/policies", inboxPage, { title: "My policies" });
    route("/policies/receipts", myReceiptsPage, { title: "My acknowledgements" });
    route("/policies/receipts/:code", receiptPage, { title: "Acknowledgement receipt" });
    route("/policies/reviews", reviewsPage, { title: "Policy reviews" });
    route("/policies/team", teamPage, { title: "Team policies", roles: MANAGER_ROLES });
    route("/policies/research", researchPage, { title: "Policy standards alignment", roles: ADMIN_ROLES });
    route("/policies/admin", libraryPage, { title: "Policy library", roles: ADMIN_ROLES });
    route("/policies/admin/new", newPolicyPage, { title: "New policy", roles: ADMIN_ROLES });
    route("/policies/admin/versions/:id", editorPage, { title: "Edit policy version", roles: ADMIN_ROLES });
    route("/policies/admin/assignments", assignPage, { title: "Policy assignments", roles: ADMIN_ROLES });
    route("/policies/admin/compliance", compliancePage, { title: "Policy compliance", roles: ADMIN_ROLES });
    route("/policies/admin/calendar", calendarPage, { title: "Review calendar", roles: ADMIN_ROLES });
    route("/policies/admin/questions", questionsPage, { title: "Policy questions", roles: ADMIN_ROLES });
    route("/policies/admin/exceptions", exceptionsPage, { title: "Policy exceptions", roles: ADMIN_ROLES });
    route("/policies/:slug/history", historyPage, { title: "Version history", roles: ADMIN_ROLES });
    route("/policies/:slug/compare", comparePage, { title: "Compare versions", roles: ADMIN_ROLES });
    route("/policies/:slug/v/:label", readerPage, { title: "Policy" });
    route("/policies/:slug", readerPage, { title: "Policy" });
  }
};
