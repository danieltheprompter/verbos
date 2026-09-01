import { MASTERY_MIN, MASTERY_NEED, MASTERY_WINDOW } from "./constants.js";

export function cellKey(tense, person) {
  return `${tense}:${person}`;
}

export function typedAttemptsFor(attempts, tense, person) {
  return attempts.filter(
    (attempt) =>
      attempt.typed && attempt.tense === tense && attempt.person === person,
  );
}

export function visitsFor(attempts, tense, person) {
  return attempts.filter(
    (attempt) => attempt.tense === tense && attempt.person === person,
  );
}

export function isVisited(attempts, tense, person) {
  return visitsFor(attempts, tense, person).length > 0;
}

export function isOwned(attempts, tense, person) {
  const typed = typedAttemptsFor(attempts, tense, person);
  if (typed.length < MASTERY_MIN) return false;
  const window = typed.slice(-MASTERY_WINDOW);
  return window.filter((attempt) => attempt.correct).length >= MASTERY_NEED;
}

export function cellState(attempts, tense, person) {
  if (isOwned(attempts, tense, person)) return "owned";
  if (isVisited(attempts, tense, person)) return "visit";
  return "empty";
}

export function completePassDone(attempts, cells) {
  return cells.every((cell) => isVisited(attempts, cell.tense, cell.person));
}
