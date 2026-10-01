// Course builder for Security/HR Admin and System Admin. Every rule shown here is also
// enforced by the server; client checks only give faster feedback.
import { api } from "../core/api.js";
import { h, mount, formatDateTime, debounce } from "../core/dom.js";
import { renderMarkdown } from "../core/markdown.js";
import { navigate, currentQuery } from "../core/router.js";
import { withStates, pageHeader, table, badge, toast, field, confirmDialog, emptyState } from "../core/ui.js";

const STATUS_TONE = { draft: "warning", published: "success", archived: "neutral" };
const TYPE_LABEL = { single: "Single answer", multi: "Multiple answers", true_false: "True / false", scenario: "Scenario" };

export function adminCoursesPage(container) {
  return withStates(container, () => api("/api/training/admin/courses"), ({ courses }) => h("div", { class: "stack" },
    pageHeader("Course builder", "Create and maintain courses, lessons and question banks.",
      h("a", { class: "button primary", href: "#/training/admin/courses/new" }, "New course")),
    table([
      { label: "Course", render: (row) => h("a", { href: `#/training/admin/courses/${row.id}` }, row.title) },
      { label: "Status", render: (row) => badge(row.status, STATUS_TONE[row.status]) },
      { label: "Version", render: (row) => `v${row.version}` },
      { label: "Lessons", render: (row) => String(row.lessons) },
      { label: "Question bank", render: (row) => `${row.activeQuestions} active / ${row.questionsPerAttempt} per attempt` },
      { label: "Pass rate", render: (row) => (row.passRate === null ? "—" : `${row.passRate}% of ${row.attempts} attempts`) },
      { label: "Updated", render: (row) => formatDateTime(row.updatedAt) }
    ], courses, { caption: "Courses" })));
}

function input(name, value, attrs = {}) {
  return h("input", { name, id: `course-${name}`, value: value ?? "", ...attrs });
}

function courseForm(course, options, onSave) {
  const objectives = h("textarea", { name: "learningObjectives", id: "course-objectives", rows: "4" }, (course?.learningObjectives || []).join("\n"));
  const form = h("form", { class: "form-grid", novalidate: true },
    h("div", { class: "wide" }, field("Title", input("title", course?.title, { required: true, maxlength: "120" }))),
    field("Category", input("category", course?.category, { required: true, maxlength: "60" })),
    field("Level", h("select", { name: "level", id: "course-level" }, options.levels.map((level) => h("option", { value: level, selected: course?.level === level }, level)))),
    h("div", { class: "wide" }, field("Summary", input("summary", course?.summary, { required: true, maxlength: "300" }), "One or two sentences shown on the course card.")),
    h("div", { class: "wide" }, field("Description", h("textarea", { name: "description", id: "course-description", rows: "4", maxlength: "4000" }, course?.description || ""))),
    h("div", { class: "wide" }, field("Learning objectives", objectives, "One per line.")),
    field("Duration (minutes)", input("durationMinutes", course?.durationMinutes ?? 20, { type: "number", min: "1", max: "600" })),
    field("Cover illustration", h("select", { name: "cover", id: "course-cover" }, options.covers.map((cover) => h("option", { value: cover, selected: course?.cover === cover }, cover)))),
    field("Pass mark (%)", input("passMark", course?.passMark ?? 80, { type: "number", min: "50", max: "100" })),
    field("Maximum attempts", input("maxAttempts", course?.maxAttempts ?? 3, { type: "number", min: "1", max: "10" })),
    field("Wait after a fail (minutes)", input("cooldownMinutes", course?.cooldownMinutes ?? 30, { type: "number", min: "0", max: "10080" })),
    field("Questions per attempt", input("questionsPerAttempt", course?.questionsPerAttempt ?? 10, { type: "number", min: "1", max: "50" })),
    h("div", { class: "wide" }, field("Audience note", input("audienceNote", course?.audienceNote, { maxlength: "300" }))),
    h("label", { class: "checkbox wide" }, h("input", { type: "checkbox", name: "openToAll", checked: course ? course.openToAll : true }), h("span", {}, "Open to all employees (otherwise only assigned learners can see it)")),
    h("div", { class: "wide" }, h("button", { type: "submit", class: "primary" }, course ? "Save details" : "Create course")));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = {
      title: data.get("title"), category: data.get("category"), level: data.get("level"), summary: data.get("summary"),
      description: data.get("description"), learningObjectives: String(data.get("learningObjectives")).split("\n").map((line) => line.trim()).filter(Boolean),
      durationMinutes: Number(data.get("durationMinutes")), audienceNote: data.get("audienceNote"), cover: data.get("cover"),
      passMark: Number(data.get("passMark")), maxAttempts: Number(data.get("maxAttempts")), cooldownMinutes: Number(data.get("cooldownMinutes")),
      questionsPerAttempt: Number(data.get("questionsPerAttempt")), openToAll: data.get("openToAll") === "on"
    };
    try {
      await onSave(body);
    } catch (error) {
      toast(error.message, "error");
    }
  });
  return form;
}

export async function newCoursePage(container) {
  return withStates(container, () => api("/api/training/admin/courses"), ({ options }) => h("div", { class: "stack" },
    pageHeader("New course", "Courses start as drafts. Add lessons and questions, then publish.", null, [["Course builder", "#/training/admin/courses"], ["New course"]]),
    h("section", { class: "panel" }, courseForm(null, options, async (body) => {
      const { course } = await api("/api/training/admin/courses", { method: "POST", body });
      toast("Draft course created.");
      navigate(`/training/admin/courses/${course.id}?tab=lessons`);
    }))));
}

function lessonEditor(course, lesson, options, refresh) {
  const body = h("textarea", { class: "md-editor", name: "bodyMarkdown", id: "lesson-body", "aria-describedby": "md-help" }, lesson?.bodyMarkdown || "## Heading\n\nWrite the lesson here.");
  const preview = h("div", { class: "md-preview lesson-body", "aria-live": "off", "aria-label": "Preview" });
  const updatePreview = () => mount(preview, renderMarkdown(body.value));
  body.addEventListener("input", debounce(updatePreview, 150));
  updatePreview();
  const form = h("form", { class: "stack" },
    h("div", { class: "form-grid" },
      h("div", { class: "wide" }, field("Lesson title", h("input", { name: "title", id: "lesson-title", value: lesson?.title || "", required: true, maxlength: "120" }))),
      field("Estimated minutes", h("input", { name: "estimatedMinutes", id: "lesson-minutes", type: "number", min: "1", max: "120", value: String(lesson?.estimatedMinutes ?? 5) })),
      field("Interactive element", h("select", { name: "interactive", id: "lesson-interactive" }, h("option", { value: "" }, "None"),
        options.interactive.map((key) => h("option", { value: key, selected: lesson?.interactive === key }, key))))),
    h("p", { id: "md-help", class: "muted small" }, "Markdown: ## heading, **bold**, _italic_, `code`, - list, 1. list, [text](https://…), and callouts such as > [!WARNING] Title, > [!DO], > [!DONT], > [!EXAMPLE], > [!NOTE], > [!STAT]. HTML is shown as plain text."),
    h("div", { class: "builder-layout" }, h("label", { class: "field" }, h("span", { class: "field-label" }, "Content"), body), h("div", { class: "field" }, h("span", { class: "field-label" }, "Live preview"), preview)),
    field("Key takeaways", h("textarea", { name: "keyTakeaways", id: "lesson-takeaways", rows: "3" }, (lesson?.keyTakeaways || []).join("\n")), "One per line."),
    field("Sources", h("textarea", { name: "sources", id: "lesson-sources", rows: "3" }, (lesson?.sources || []).map((source) => `${source.title} | ${source.url}`).join("\n")), "One per line: Title | https://link"),
    h("div", { class: "inline-actions" }, h("button", { type: "submit", class: "primary" }, lesson ? "Save lesson" : "Add lesson"),
      lesson && course.status === "draft" ? h("button", { type: "button", class: "danger", on: { click: async () => {
        if (!(await confirmDialog({ title: "Delete lesson?", body: h("p", {}, lesson.title), confirmLabel: "Delete", tone: "danger" }))) return;
        try {
          await api(`/api/training/admin/lessons/${lesson.id}`, { method: "DELETE" });
          toast("Lesson deleted.");
          refresh("lessons");
        } catch (error) {
          toast(error.message, "error");
        }
      } } }, "Delete lesson") : null));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      title: data.get("title"), bodyMarkdown: data.get("bodyMarkdown"), estimatedMinutes: Number(data.get("estimatedMinutes")),
      interactive: data.get("interactive") || null,
      keyTakeaways: String(data.get("keyTakeaways")).split("\n").map((line) => line.trim()).filter(Boolean),
      sources: String(data.get("sources")).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [title, url] = line.split("|").map((part) => part.trim());
        return { title, url };
      })
    };
    try {
      await api(lesson ? `/api/training/admin/lessons/${lesson.id}` : `/api/training/admin/courses/${course.id}/lessons`, { method: lesson ? "PUT" : "POST", body: payload });
      toast(lesson ? "Lesson saved." : "Lesson added.");
      refresh("lessons");
    } catch (error) {
      toast(error.message, "error");
    }
  });
  return form;
}

function questionEditor(course, question, options, refresh) {
  const optionList = h("div", { class: "stack" });
  let rows = question ? question.options.map((option) => ({ ...option })) : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }];
  const typeSelect = h("select", { name: "type", id: "question-type" }, options.questionTypes.map((type) => h("option", { value: type, selected: (question?.type || "single") === type }, TYPE_LABEL[type])));
  const hint = h("p", { class: "form-error", role: "alert", hidden: true });

  function drawOptions() {
    const multi = typeSelect.value === "multi";
    mount(optionList, rows.map((row, index) => h("div", { class: "option-row" },
      h("input", { type: multi ? "checkbox" : "radio", name: "correct", checked: row.isCorrect, "aria-label": `Option ${index + 1} is correct`, on: { change: (event) => {
        if (!multi) rows.forEach((other) => { other.isCorrect = false; });
        row.isCorrect = event.target.checked;
        drawOptions();
      } } }),
      h("input", { value: row.text, "aria-label": `Option ${index + 1} text`, maxlength: "300", on: { input: (event) => { row.text = event.target.value; } } }),
      h("button", { type: "button", "aria-label": `Remove option ${index + 1}`, disabled: rows.length <= 2, on: { click: () => { rows.splice(index, 1); drawOptions(); } } }, "Remove"))),
    h("button", { type: "button", disabled: rows.length >= 6, on: { click: () => { rows.push({ text: "", isCorrect: false }); drawOptions(); } } }, "Add option"));
  }
  typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "true_false") rows = [{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }];
    else if (typeSelect.value !== "multi" && rows.filter((row) => row.isCorrect).length > 1) rows.forEach((row, index) => { row.isCorrect = index === rows.findIndex((item) => item.isCorrect); });
    drawOptions();
  });
  drawOptions();

  const form = h("form", { class: "stack" },
    h("div", { class: "form-grid" },
      field("Type", typeSelect),
      field("Linked lesson", h("select", { name: "lessonId", id: "question-lesson" }, h("option", { value: "" }, "None"),
        course.lessons.map((lesson) => h("option", { value: String(lesson.id), selected: question?.lessonId === lesson.id }, `${lesson.position}. ${lesson.title}`)))),
      field("Difficulty", h("select", { name: "difficulty", id: "question-difficulty" }, [[1, "Easy"], [2, "Medium"], [3, "Hard"]].map(([value, label]) => h("option", { value: String(value), selected: (question?.difficulty ?? 2) === value }, label))))),
    field("Scenario (optional)", h("textarea", { name: "scenarioText", id: "question-scenario", rows: "2", maxlength: "1500" }, question?.scenarioText || "")),
    field("Question", h("textarea", { name: "prompt", id: "question-prompt", rows: "2", required: true, maxlength: "500" }, question?.prompt || "")),
    h("fieldset", { class: "stack" }, h("legend", { class: "field-label" }, "Options (mark the correct answer)"), optionList),
    field("Explanation", h("textarea", { name: "explanation", id: "question-explanation", rows: "2", maxlength: "1000" }, question?.explanation || ""), "Explain the idea without naming an option letter. Learners see it once they have passed."),
    hint,
    question?.used ? h("p", { class: "muted small" }, "This question has been used in attempts. Saving creates a new version of the question and retires this one, so past results stay accurate.") : null,
    course.status === "published" ? h("p", { class: "muted small" }, "Changing questions of a published course increases the course version.") : null,
    h("div", {}, h("button", { type: "submit", class: "primary" }, question ? "Save question" : "Add question")));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (!rows.some((row) => row.isCorrect)) {
      hint.textContent = "Mark at least one option as correct.";
      hint.hidden = false;
      return;
    }
    const payload = {
      type: typeSelect.value, lessonId: data.get("lessonId") ? Number(data.get("lessonId")) : null, difficulty: Number(data.get("difficulty")),
      scenarioText: data.get("scenarioText"), prompt: data.get("prompt"), explanation: data.get("explanation"),
      options: rows.map((row) => ({ text: row.text.trim(), isCorrect: row.isCorrect }))
    };
    try {
      await api(question ? `/api/training/admin/questions/${question.id}` : `/api/training/admin/courses/${course.id}/questions`, { method: question ? "PUT" : "POST", body: payload });
      toast(question ? "Question saved." : "Question added.");
      refresh("questions");
    } catch (error) {
      hint.textContent = error.message;
      hint.hidden = false;
    }
  });
  return form;
}

export function courseEditorPage(container, { id }) {
  const tab = ["details", "lessons", "questions"].includes(currentQuery().get("tab")) ? currentQuery().get("tab") : "details";
  const refresh = (nextTab) => {
    history.replaceState(null, "", `#/training/admin/courses/${id}?tab=${nextTab}`);
    courseEditorPage(container, { id });
  };
  return withStates(container, () => api(`/api/training/admin/courses/${encodeURIComponent(id)}`), ({ course, options }) => {
    const panel = h("div", {});
    const editing = { lesson: currentQuery().get("lesson"), question: currentQuery().get("question") };

    async function statusAction(action) {
      const label = action === "publish" ? "Publish" : "Archive";
      const ok = await confirmDialog({
        title: `${label} "${course.title}"?`,
        body: h("p", {}, action === "publish" ? "Learners will be able to see and take this course, and matrix assignments will be applied." : "Learners will no longer see this course. Records are kept."),
        confirmLabel: label, tone: action === "publish" ? "primary" : "danger"
      });
      if (!ok) return;
      try {
        await api(`/api/training/admin/courses/${course.id}/${action}`, { method: "POST", body: {} });
        toast(action === "publish" ? "Course published." : "Course archived.");
        refresh(tab);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    function drawTab(name) {
      if (name === "details") {
        mount(panel, h("section", { class: "panel" }, courseForm(course, options, async (body) => {
          await api(`/api/training/admin/courses/${course.id}`, { method: "PUT", body });
          toast("Course details saved.");
          refresh("details");
        })));
      } else if (name === "lessons") {
        const current = editing.lesson === "new" ? null : course.lessons.find((lesson) => String(lesson.id) === editing.lesson);
        mount(panel, h("div", { class: "stack" },
          h("section", { class: "panel" }, h("h2", {}, "Lessons"),
            course.lessons.length ? h("ol", { class: "outline" }, course.lessons.map((lesson) => h("li", {},
              h("span", { class: "outline-mark", "aria-hidden": "true" }, String(lesson.position)),
              h("strong", {}, lesson.title), h("span", { class: "muted small" }, `${lesson.estimatedMinutes} min${lesson.interactive ? ` · ${lesson.interactive}` : ""}`),
              h("button", { type: "button", on: { click: () => { editing.lesson = String(lesson.id); drawTab("lessons"); } } }, "Edit")))) : emptyState("No lessons yet"),
            h("p", {}, h("button", { type: "button", on: { click: () => { editing.lesson = "new"; drawTab("lessons"); } } }, "Add lesson"))),
          editing.lesson ? h("section", { class: "panel" }, h("h2", {}, current ? `Edit lesson ${current.position}` : "New lesson"), lessonEditor(course, current, options, refresh)) : null));
      } else {
        const current = editing.question === "new" ? null : course.questions.find((question) => String(question.id) === editing.question);
        mount(panel, h("div", { class: "stack" },
          h("section", { class: "panel" },
            h("h2", {}, "Question bank"),
            h("p", { class: "muted" }, `${course.activeQuestions} active questions; ${course.questionsPerAttempt} are drawn at random for each attempt. Keep the bank larger than one attempt so retakes differ.`),
            course.questions.length ? h("ul", { class: "question-list" }, course.questions.map((question) => h("li", { class: question.active ? "" : "inactive" },
              h("div", {}, h("strong", {}, question.prompt), h("p", { class: "muted small" }, `${TYPE_LABEL[question.type]} · ${question.options.length} options${question.used ? " · used in attempts" : ""}`)),
              h("div", { class: "inline-actions" },
                question.active ? badge("Active", "success") : badge("Retired", "neutral"),
                h("button", { type: "button", on: { click: () => { editing.question = String(question.id); drawTab("questions"); } } }, "Edit"),
                h("button", { type: "button", on: { click: async () => {
                  try {
                    await api(`/api/training/admin/questions/${question.id}/${question.active ? "deactivate" : "activate"}`, { method: "POST", body: {} });
                    refresh("questions");
                  } catch (error) {
                    toast(error.message, "error");
                  }
                } } }, question.active ? "Retire" : "Restore"))))) : emptyState("No questions yet"),
            h("p", {}, h("button", { type: "button", on: { click: () => { editing.question = "new"; drawTab("questions"); } } }, "Add question"))),
          editing.question ? h("section", { class: "panel" }, h("h2", {}, current ? "Edit question" : "New question"), questionEditor(course, current, options, refresh)) : null));
      }
      tabs.querySelectorAll("[role=tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === name)));
      const editor = (name === "lessons" && editing.lesson) || (name === "questions" && editing.question) ? panel.querySelector("section:last-child") : null;
      if (editor) {
        editor.scrollIntoView({ block: "start" });
        editor.querySelector("input, textarea, select")?.focus({ preventScroll: true });
      }
    }

    const tabs = h("div", { class: "tabs", role: "tablist", "aria-label": "Course sections" },
      [["details", "Details"], ["lessons", `Lessons (${course.lessons.length})`], ["questions", `Question bank (${course.activeQuestions})`]].map(([key, label]) =>
        h("button", { type: "button", role: "tab", class: "tab", dataset: { tab: key }, "aria-selected": String(key === tab), on: { click: () => {
          history.replaceState(null, "", `#/training/admin/courses/${id}?tab=${key}`);
          drawTab(key);
        } } }, label)));
    drawTab(tab);

    return h("div", { class: "stack" },
      pageHeader(course.title, `Version ${course.version} · ${course.status}`, [
        course.status === "published" ? h("a", { class: "button", href: `#/training/${course.slug}` }, "View as learner") : null,
        course.status !== "published" ? h("button", { type: "button", class: "primary", on: { click: () => statusAction("publish") } }, "Publish") : null,
        course.status !== "archived" ? h("button", { type: "button", on: { click: () => statusAction("archive") } }, "Archive") : null
      ], [["Course builder", "#/training/admin/courses"], [course.title]]),
      tabs,
      panel);
  });
}
