import { FORM_COPY, MASTERY_MIN, MASTERY_NEED, MASTERY_WINDOW, moodOf, timeOf } from "./constants.js";
import { cellsFor } from "./board.js";
import { endingPattern, verbType, verbsForSettings } from "./verbs.js";

export function attemptType(attempt) {
  return attempt.verb_type || attempt.type || verbType(attempt.verb);
}

export function attemptEnding(attempt) {
  return attempt.ending_pattern || attempt.ending || attempt.family || endingPattern(attempt.verb);
}

export function attemptMood(attempt) {
  return attempt.mood || moodOf(attempt.tense);
}

export function attemptTime(attempt) {
  return attempt.time || timeOf(attempt.tense);
}

export function normalizeAttempt(attempt) {
  const type = attemptType(attempt);
  const ending_pattern = attemptEnding(attempt);
  const mood = attemptMood(attempt);
  const time = attemptTime(attempt);
  return {
    ...attempt,
    type,
    verb_type: attempt.verb_type || type,
    ending_pattern,
    ending: ending_pattern,
    mood,
    time,
  };
}

export function formKey({ mood, time, person, type, ending }) {
  return `${mood}:${time}:${person}:${type}:${ending}`;
}

export function typedAttemptsFor(attempts, spec) {
  return attempts.map(normalizeAttempt).filter((attempt) => {
    if (!attempt.typed) return false;
    if (spec.mood && attemptMood(attempt) !== spec.mood) return false;
    if (spec.time && attemptTime(attempt) !== spec.time) return false;
    if (spec.person && attempt.person !== spec.person) return false;
    if (spec.type && attemptType(attempt) !== spec.type) return false;
    if (spec.ending && attemptEnding(attempt) !== spec.ending) return false;
    return true;
  });
}

export function formState(attempts, spec) {
  const typed = typedAttemptsFor(attempts, spec);
  if (typed.length < MASTERY_MIN) return "not_enough";
  const window = typed.slice(-MASTERY_WINDOW);
  if (window.filter((attempt) => attempt.correct).length >= MASTERY_NEED) return "know";
  return "learning";
}

export function formCopy(attempts, spec) {
  return FORM_COPY[formState(attempts, spec)];
}

export function youKnowThis(attempts, spec) {
  return formState(attempts, spec) === "know";
}

export function visitsForCell(attempts, tense, person) {
  return attempts.filter((attempt) => attempt.tense === tense && attempt.person === person);
}

export function isVisited(attempts, tense, person) {
  return visitsForCell(attempts, tense, person).length > 0;
}

export function completePassDone(attempts, cells) {
  return cells.every((cell) => isVisited(attempts, cell.tense, cell.person));
}

export function typeKnownAtCell(attempts, tense, person, type) {
  const spec = { mood: moodOf(tense), time: timeOf(tense), person, type };
  return ["ar", "er_ir"].some((ending) => youKnowThis(attempts, { ...spec, ending }));
}

export function specsForSettings(settings) {
  const verbs = verbsForSettings(settings);
  const pairs = [];
  const seen = new Set();
  for (const verb of verbs) {
    const pair = `${verb.type}:${endingPattern(verb.inf)}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    pairs.push({ type: verb.type, ending: endingPattern(verb.inf) });
  }
  const specs = [];
  for (const cell of cellsFor(settings)) {
    for (const pair of pairs) {
      specs.push({
        mood: moodOf(cell.tense),
        time: timeOf(cell.tense),
        person: cell.person,
        type: pair.type,
        ending: pair.ending,
      });
    }
  }
  return specs;
}

export function allSelectedKnown(settings, attempts) {
  const specs = specsForSettings(settings);
  return specs.length > 0 && specs.every((spec) => youKnowThis(attempts, spec));
}
