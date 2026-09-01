import { MASTERY_MIN, MASTERY_NEED, MASTERY_WINDOW, VERB_TYPES } from "./constants.js";
import { verbType } from "./verbs.js";

export function normalizeAttempt(attempt) {
  return {
    ...attempt,
    type: attempt.type || verbType(attempt.verb),
  };
}

export function cellKey(tense, person, type) {
  return `${tense}:${person}:${type}`;
}

export function typedAttemptsFor(attempts, tense, person, type) {
  return attempts
    .map(normalizeAttempt)
    .filter(
      (attempt) =>
        attempt.typed &&
        attempt.tense === tense &&
        attempt.person === person &&
        attempt.type === type,
    );
}

export function visitsForType(attempts, type) {
  return attempts.map(normalizeAttempt).filter((attempt) => attempt.type === type);
}

export function visitsForCell(attempts, tense, person) {
  return attempts
    .map(normalizeAttempt)
    .filter((attempt) => attempt.tense === tense && attempt.person === person);
}

export function isVisited(attempts, tense, person) {
  return visitsForCell(attempts, tense, person).length > 0;
}

export function isOwned(attempts, tense, person, type) {
  if (!type) return false;
  const typed = typedAttemptsFor(attempts, tense, person, type);
  if (typed.length < MASTERY_MIN) return false;
  const window = typed.slice(-MASTERY_WINDOW);
  return window.filter((attempt) => attempt.correct).length >= MASTERY_NEED;
}

export function toyCellState(attempts, tense, person, { paintOwned = false, type = null } = {}) {
  if (paintOwned && type && isOwned(attempts, tense, person, type)) return "owned";
  if (isVisited(attempts, tense, person)) return "visit";
  return "empty";
}

export function completePassDone(attempts, cells) {
  return cells.every((cell) => isVisited(attempts, cell.tense, cell.person));
}

export function typeRollup(attempts, type, cells) {
  const hits = visitsForType(attempts, type);
  if (!hits.length) return "empty";
  const owned = cells.every((cell) => isOwned(attempts, cell.tense, cell.person, type));
  return owned ? "owned" : "visit";
}

export function typeReadout(attempts, typeIds, cells) {
  return typeIds.map((id) => {
    const meta = VERB_TYPES.find((type) => type.id === id);
    return { id, label: meta.label, state: typeRollup(attempts, id, cells) };
  });
}
