import { api } from "../core/api.js";
import { h, mount, externalLink } from "../core/dom.js";
import { renderMarkdown } from "../core/markdown.js";
import { navigate } from "../core/router.js";
import { withStates, pageHeader, progressBar, toast } from "../core/ui.js";
import { courseHref, lessonHref, quizHref } from "./common.js";
import { interactiveFor } from "./interactive/index.js";

export function lessonPage(container, { slug, position }) {
  const base = `/api/training/courses/${encodeURIComponent(slug)}`;
  return withStates(container, () => api(`${base}/lessons/${encodeURIComponent(position)}`), ({ course, lesson, progress, nav }) => {
    let completed = lesson.completed;
    let exerciseDone = !lesson.interactive;
    const completeArea = h("div", { class: "complete" });
    const progressArea = h("div", {});

    function renderProgress(done) {
      mount(progressArea, progressBar(done, progress.total, `${done} of ${progress.total} lessons complete`));
    }

    function renderComplete() {
      if (completed) {
        mount(completeArea, h("span", { class: "completed-note" }, h("span", { "aria-hidden": "true" }, "✓"), "Lesson complete"));
        return;
      }
      const button = h("button", { type: "button", class: "primary block", disabled: !exerciseDone, on: { click: markComplete } }, "Mark lesson complete");
      mount(completeArea, button, exerciseDone ? null : h("p", { class: "muted small" }, "Finish the exercise above to complete this lesson."));
    }

    async function markComplete() {
      try {
        const result = await api(`${base}/lessons/${nav.position}/complete`, { method: "POST", body: {} });
        completed = true;
        renderComplete();
        renderProgress(result.progress.completed);
        if (result.quizUnlocked) toast("All lessons complete – the quiz is now unlocked.");
        else toast("Lesson complete.");
        if (nav.next) navigate(lessonHref(slug, nav.next).slice(1));
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const Interactive = lesson.interactive ? interactiveFor(lesson.interactive) : null;
    if (lesson.interactive && !Interactive) exerciseDone = true;
    renderProgress(progress.completed);
    renderComplete();

    return h("div", { class: "lesson" },
      pageHeader(lesson.title, "", null, [["Training", "#/training"], [course.title, courseHref(slug)], [`Lesson ${nav.position}`]]),
      h("div", { class: "lesson-topbar" },
        h("div", { class: "lesson-topbar-row" }, h("span", {}, `Lesson ${nav.position} of ${nav.total}`), h("span", {}, `About ${lesson.estimatedMinutes} min`)),
        progressArea),
      h("article", { class: "lesson-body" },
        renderMarkdown(lesson.bodyMarkdown),
        Interactive ? Interactive({ onComplete: () => { exerciseDone = true; renderComplete(); } }) : null,
        lesson.keyTakeaways.length ? h("section", { class: "takeaways", "aria-labelledby": "takeaways-title" },
          h("h2", { id: "takeaways-title" }, "Key takeaways"),
          h("ul", {}, lesson.keyTakeaways.map((item) => h("li", {}, item)))) : null,
        lesson.sources.length ? h("section", { class: "sources", "aria-labelledby": "sources-title" },
          h("h2", { id: "sources-title" }, "Sources"),
          h("ol", {}, lesson.sources.map((source) => h("li", {}, externalLink(source.url, source.title))))) : null),
      h("nav", { class: "lesson-nav", "aria-label": "Lesson navigation" },
        nav.previous ? h("a", { class: "button", href: lessonHref(slug, nav.previous) }, "← Previous") : h("a", { class: "button", href: courseHref(slug) }, "← Course overview"),
        completeArea,
        nav.next ? h("a", { class: "button", href: lessonHref(slug, nav.next) }, "Next →") : h("a", { class: "button", href: quizHref(slug) }, "Go to quiz →")));
  });
}
