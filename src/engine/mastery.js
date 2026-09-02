import { FORM_COPY, MASTERY_MIN, MASTERY_NEED, MASTERY_WINDOW, PIP_SLOTS } from "./constants.js";
import { moodOf, timeOf } from "./pack.js";
import { cellKey, cellsFor } from "./board.js";
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

export function itemFormKey(item) {
  return formKey({
    mood: item.mood || moodOf(item.tense),
    time: item.time || timeOf(item.tense),
    person: item.person,
    type: item.type || item.verb_type || attemptType(item),
    ending: item.ending_pattern || item.ending || attemptEnding(item),
  });
}

export function parseFormKey(key) {
  const [mood, time, person, type, ending] = String(key || "").split(":");
  return { mood, time, person, type, ending };
}

export function uniqueFormKeys(keys = []) {
  return [...new Set((keys || []).filter((key) => key && String(key).split(":").length === 5))];
}

export function sittingIncomplete(attempts, sittingKeys = []) {
  if (!sittingKeys.length) return false;
  return sittingKeys.some(
    (key) => typedAttemptsFor(attempts, parseFormKey(key)).length < MASTERY_MIN,
  );
}

export function sittingKeysFromAttempts(attempts = [], cells = []) {
  if (!cells.length) return [];
  const order = cells.map(cellKey);
  const first = new Map();
  for (const attempt of attempts) {
    if (!attempt.typed) continue;
    const hasVerb = Boolean(attempt.verb);
    const hasPair = Boolean(
      (attempt.type || attempt.verb_type) && (attempt.ending_pattern || attempt.ending),
    );
    if (!hasVerb && !hasPair) continue;
    const ck = cellKey(attempt);
    if (!order.includes(ck) || first.has(ck)) continue;
    first.set(ck, itemFormKey(attempt));
  }
  if (first.size !== cells.length) return [];
  return order.map((ck) => first.get(ck));
}

export function sittingKnownCount(attempts, sittingKeys = []) {
  return sittingKeys.filter((key) => youKnowThis(attempts, parseFormKey(key))).length;
}

export function sittingKeyForCell(sittingKeys = [], tense, person) {
  if (!sittingKeys?.length) return null;
  const mood = moodOf(tense);
  const time = timeOf(tense);
  return (
    sittingKeys.find((key) => {
      const spec = parseFormKey(key);
      return spec.mood === mood && spec.time === time && spec.person === person;
    }) || null
  );
}

export function sittingCellMarks(attempts = [], tense, person, sittingKeys = [], slots = PIP_SLOTS) {
  if (!sittingKeys?.length) return 0;
  const key = sittingKeyForCell(sittingKeys, tense, person);
  if (!key) return 0;
  return Math.min(slots, typedAttemptsFor(attempts, parseFormKey(key)).length);
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

export function masteryWindow(attempts, spec) {
  return typedAttemptsFor(attempts, spec).slice(-MASTERY_WINDOW);
}

export function formState(attempts, spec) {
  const window = masteryWindow(attempts, spec);
  if (window.length < MASTERY_MIN) return "not_enough";
  const hits = window.filter((attempt) => attempt.correct === true).length;
  if (hits >= MASTERY_NEED) return "know";
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
