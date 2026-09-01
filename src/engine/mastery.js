import { ATLAS_LABEL, FAMILIES, MASTERY_MIN, MASTERY_NEED, MASTERY_WINDOW, VERB_BUCKETS } from "./constants.js";
import { verbFamily, verbType } from "./verbs.js";

const VERB_TYPE_IDS = VERB_BUCKETS.map((bucket) => bucket.id);

export function attemptType(attempt) {
  return attempt.verb_type || attempt.type || verbType(attempt.verb);
}

export function attemptFamily(attempt) {
  return attempt.family || verbFamily(attempt.verb);
}

export function normalizeAttempt(attempt) {
  const type = attemptType(attempt);
  const family = attemptFamily(attempt);
  return {
    ...attempt,
    type,
    verb_type: attempt.verb_type || type,
    family,
  };
}

export function cellKey(tense, person, type, family) {
  return `${tense}:${person}:${type}:${family}`;
}

export function typedAttemptsFor(attempts, tense, person, type, family) {
  return attempts
    .map(normalizeAttempt)
    .filter(
      (attempt) =>
        attempt.typed &&
        attempt.tense === tense &&
        attempt.person === person &&
        attempt.type === type &&
        attempt.family === family,
    );
}

export function visitsForCell(attempts, tense, person) {
  return attempts
    .map(normalizeAttempt)
    .filter((attempt) => attempt.tense === tense && attempt.person === person);
}

export function isVisited(attempts, tense, person) {
  return visitsForCell(attempts, tense, person).length > 0;
}

export function isOwned(attempts, tense, person, type, family) {
  if (!type || !family) return false;
  const typed = typedAttemptsFor(attempts, tense, person, type, family);
  if (typed.length < MASTERY_MIN) return false;
  const window = typed.slice(-MASTERY_WINDOW);
  return window.filter((attempt) => attempt.correct).length >= MASTERY_NEED;
}

export function completePassDone(attempts, cells) {
  return cells.every((cell) => isVisited(attempts, cell.tense, cell.person));
}

export function sliceState(attempts, tense, person, type, family) {
  const typed = typedAttemptsFor(attempts, tense, person, type, family);
  if (typed.length < MASTERY_MIN) return "not_enough";
  const window = typed.slice(-MASTERY_WINDOW);
  if (window.filter((attempt) => attempt.correct).length >= MASTERY_NEED) return "know";
  return "learning";
}

function rollup(states) {
  if (!states.length || states.every((state) => state === "not_enough")) return "not_enough";
  if (states.some((state) => state === "learning")) return "learning";
  if (states.some((state) => state === "know")) return "know";
  return "not_enough";
}

export function atlasCellState(attempts, tense, person, filters = {}) {
  const types = filters.type ? [filters.type] : VERB_TYPE_IDS;
  const families = filters.family ? [filters.family] : FAMILIES.map((item) => item.id);
  const states = [];
  for (const type of types) {
    for (const family of families) {
      states.push(sliceState(attempts, tense, person, type, family));
    }
  }
  return rollup(states);
}

export function atlasLabel(state) {
  return ATLAS_LABEL[state];
}

export function roundCellState(fills, current, tense, person) {
  const active = current && current.tense === tense && current.person === person;
  if (active) return "now";
  const filled = fills.some((item) => item.tense === tense && item.person === person);
  return filled ? "fill" : "empty";
}
