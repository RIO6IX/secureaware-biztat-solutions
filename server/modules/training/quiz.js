import crypto from "node:crypto";
import { ATTEMPT_TIME_LIMIT_MINUTES } from "./store.js";
import { fail, httpError, id as idValue } from "./validate.js";

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O or U
export const CERTIFICATE_CODE_PATTERN = /^SA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = crypto.randomInt(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

// 80 random bits, grouped for readability: SA-XXXX-XXXX-XXXX-XXXX.
export function newCertificateCode() {
  const bytes = crypto.randomBytes(10);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += CODE_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return `SA-${output.match(/.{4}/g).join("-")}`;
}

const parseIds = (value) => JSON.parse(value);

export function createQuiz(db) {
  const q = {
    activeQuestions: db.prepare("SELECT id FROM training_questions WHERE course_id = ? AND active = 1"),
    seenQuestionIds: db.prepare(`SELECT DISTINCT j.value AS id FROM quiz_attempts a, json_each(a.question_ids) j WHERE a.user_id = ? AND a.course_id = ?`),
    question: db.prepare("SELECT id, lesson_id, type, prompt, scenario_text, explanation FROM training_questions WHERE id = ?"),
    // Learner-facing option projection: id and text only.
    optionTexts: db.prepare("SELECT id, text FROM training_options WHERE question_id = ? ORDER BY position"),
    // Marking only. The result of this query never leaves this module.
    correctOptionIds: db.prepare("SELECT id FROM training_options WHERE question_id = ? AND is_correct = 1"),
    lesson: db.prepare("SELECT position, title FROM training_lessons WHERE id = ?"),
    attemptById: db.prepare("SELECT * FROM quiz_attempts WHERE id = ?"),
    insertAttempt: db.prepare(`INSERT INTO quiz_attempts (user_id,course_id,course_version,attempt_number,started_at,expires_at,question_ids,option_order,status)
      VALUES (?,?,?,?,?,?,?,?,'in_progress')`),
    insertAnswer: db.prepare("INSERT INTO quiz_answers (attempt_id,question_id,selected_option_ids,correct) VALUES (?,?,?,?)"),
    finishAttempt: db.prepare("UPDATE quiz_attempts SET status = 'submitted', submitted_at = ?, score = ?, passed = ? WHERE id = ? AND status = 'in_progress'"),
    answers: db.prepare("SELECT question_id, selected_option_ids, correct FROM quiz_answers WHERE attempt_id = ?"),
    insertCertificate: db.prepare("INSERT INTO certificates (user_id,course_id,attempt_id,certificate_code,issued_at) VALUES (?,?,?,?,?)"),
    certificateByAttempt: db.prepare("SELECT certificate_code FROM certificates WHERE attempt_id = ?")
  };

  // Prefer questions this learner has not been served before, so a retake is a new test.
  function drawQuestions(userId, course) {
    const active = q.activeQuestions.all(course.id).map((row) => row.id);
    const seen = new Set(q.seenQuestionIds.all(userId, course.id).map((row) => Number(row.id)));
    const ordered = [...shuffle(active.filter((questionId) => !seen.has(questionId))), ...shuffle(active.filter((questionId) => seen.has(questionId)))];
    return shuffle(ordered.slice(0, Math.min(course.questions_per_attempt, active.length)));
  }

  function startAttempt(user, course, state) {
    if (!state.allLessonsComplete) throw httpError(403, "Complete every lesson before starting the quiz");
    if (state.status === "passed") throw httpError(409, "You have already passed this course");
    if (state.inProgressAttemptId) return q.attemptById.get(state.inProgressAttemptId);
    if (state.attemptsLeft <= 0) {
      throw httpError(429, `You have used all ${course.max_attempts} attempts for this course. Ask the Security/HR team if you need another attempt.`);
    }
    if (state.cooldownUntil) {
      const error = httpError(429, `Please review the lessons first. A new attempt opens ${course.cooldown_minutes} minutes after a failed one.`);
      error.retryAt = state.cooldownUntil;
      throw error;
    }
    const questionIds = drawQuestions(user.id, course);
    if (questionIds.length < course.questions_per_attempt) throw httpError(409, "This course does not have enough questions yet");
    const optionOrder = Object.fromEntries(questionIds.map((questionId) => [questionId, shuffle(q.optionTexts.all(questionId).map((option) => option.id))]));
    const now = new Date();
    const { lastInsertRowid } = q.insertAttempt.run(user.id, course.id, course.version, state.attemptsUsed + 1, now.toISOString(),
      new Date(now.getTime() + ATTEMPT_TIME_LIMIT_MINUTES * 60_000).toISOString(), JSON.stringify(questionIds), JSON.stringify(optionOrder));
    return q.attemptById.get(Number(lastInsertRowid));
  }

  // What the learner sees while taking the quiz: prompts and option text in the stored
  // shuffled order. No correctness data of any kind.
  function attemptForLearner(attempt) {
    const order = JSON.parse(attempt.option_order);
    return {
      id: attempt.id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
      questions: parseIds(attempt.question_ids).map((questionId, index) => {
        const question = q.question.get(questionId);
        const texts = new Map(q.optionTexts.all(questionId).map((option) => [option.id, option.text]));
        return {
          id: question.id,
          number: index + 1,
          type: question.type,
          prompt: question.prompt,
          scenarioText: question.scenario_text,
          selectMultiple: question.type === "multi",
          options: (order[questionId] || [...texts.keys()]).map((optionId) => ({ id: optionId, text: texts.get(optionId) }))
        };
      })
    };
  }

  function validateAnswers(attempt, body) {
    const served = parseIds(attempt.question_ids);
    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length > 50) fail("answers must be a list");
    const byQuestion = new Map();
    for (const answer of answers) {
      if (!answer || typeof answer !== "object") fail("Each answer must be an object");
      const questionId = idValue(answer.questionId, "questionId");
      if (!served.includes(questionId)) fail("An answer refers to a question that was not part of this attempt");
      if (byQuestion.has(questionId)) fail("Each question can only be answered once");
      if (!Array.isArray(answer.optionIds) || answer.optionIds.length < 1 || answer.optionIds.length > 8) fail("Choose at least one option for every question");
      const optionIds = [...new Set(answer.optionIds.map((optionId) => idValue(optionId, "optionId")))];
      const question = q.question.get(questionId);
      const valid = new Set(q.optionTexts.all(questionId).map((option) => option.id));
      if (optionIds.some((optionId) => !valid.has(optionId))) fail("An answer contains an option that does not belong to its question");
      if (question.type !== "multi" && optionIds.length !== 1) fail("Choose exactly one option for single-answer questions");
      byQuestion.set(questionId, optionIds);
    }
    if (byQuestion.size !== served.length) fail("Answer every question before submitting");
    return byQuestion;
  }

  function submitAttempt(attempt, course, body) {
    if (attempt.status !== "in_progress") throw httpError(409, "This attempt has already been submitted");
    if (new Date(attempt.expires_at) <= new Date()) {
      db.prepare("UPDATE quiz_attempts SET status = 'expired' WHERE id = ? AND status = 'in_progress'").run(attempt.id);
      throw httpError(409, `This attempt expired after ${ATTEMPT_TIME_LIMIT_MINUTES} minutes and counts as used`);
    }
    const answers = validateAnswers(attempt, body);
    let correctCount = 0;
    const marked = [...answers].map(([questionId, selected]) => {
      const correctIds = q.correctOptionIds.all(questionId).map((row) => row.id);
      const isCorrect = correctIds.length === selected.length && selected.every((optionId) => correctIds.includes(optionId));
      if (isCorrect) correctCount += 1;
      return { questionId, selected, isCorrect };
    });
    const score = Math.round((correctCount / answers.size) * 100);
    const passed = score >= course.pass_mark;
    let certificateCode = null;
    db.exec("BEGIN IMMEDIATE");
    try {
      const finished = q.finishAttempt.run(new Date().toISOString(), score, passed ? 1 : 0, attempt.id);
      if (finished.changes !== 1) throw httpError(409, "This attempt has already been submitted");
      for (const answer of marked) q.insertAnswer.run(attempt.id, answer.questionId, JSON.stringify(answer.selected), answer.isCorrect ? 1 : 0);
      if (passed) {
        certificateCode = newCertificateCode();
        q.insertCertificate.run(attempt.user_id, course.id, attempt.id, certificateCode, new Date().toISOString());
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return { score, passed, certificateCode };
  }

  // Review after submission: the learner's own choice, whether it was right and the lesson
  // to revisit. The correct option is never named. Until the learner has passed the course,
  // explanations are withheld for wrong answers because they would give away the answer to
  // questions that can be served again on a retake.
  function resultView(attempt, course, { coursePassed = false } = {}) {
    const answers = new Map(q.answers.all(attempt.id).map((row) => [row.question_id, row]));
    const review = parseIds(attempt.question_ids).map((questionId, index) => {
      const question = q.question.get(questionId);
      const texts = new Map(q.optionTexts.all(questionId).map((option) => [option.id, option.text]));
      const answer = answers.get(questionId);
      const lesson = question.lesson_id ? q.lesson.get(question.lesson_id) : null;
      return {
        number: index + 1,
        type: question.type,
        prompt: question.prompt,
        scenarioText: question.scenario_text,
        yourAnswer: answer ? JSON.parse(answer.selected_option_ids).map((optionId) => texts.get(optionId)) : [],
        answeredCorrectly: answer ? Boolean(answer.correct) : false,
        explanation: coursePassed || answer?.correct ? question.explanation : null,
        lesson: lesson ? { position: lesson.position, title: lesson.title } : null
      };
    });
    const topics = new Map();
    for (const item of review.filter((entry) => !entry.answeredCorrectly && entry.lesson)) {
      const key = item.lesson.position;
      topics.set(key, { ...item.lesson, missed: (topics.get(key)?.missed || 0) + 1 });
    }
    return {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attempt_number,
        courseVersion: attempt.course_version,
        status: attempt.status,
        score: attempt.score,
        passed: attempt.passed === null ? null : Boolean(attempt.passed),
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at
      },
      course: { slug: course.slug, title: course.title, passMark: course.pass_mark, maxAttempts: course.max_attempts },
      certificateCode: q.certificateByAttempt.get(attempt.id)?.certificate_code ?? null,
      review,
      topicsToReview: [...topics.values()].sort((a, b) => a.position - b.position)
    };
  }

  return { q, startAttempt, attemptForLearner, submitAttempt, resultView };
}
