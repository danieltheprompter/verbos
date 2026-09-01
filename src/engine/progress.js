import { PERSONS, STATE_LABEL, TARGET_GROUPS, VERB_TYPES } from "./constants.js";
import { isOwned, normalizeAttempt } from "./mastery.js";

function slice(attempts, match) {
  return attempts.map(normalizeAttempt).filter(match);
}

function accuracy(attempts) {
  const typed = attempts.filter((attempt) => attempt.typed);
  if (!typed.length) return null;
  return typed.filter((attempt) => attempt.correct).length / typed.length;
}

function masteredAny(attempts, cells) {
  return cells.some((cell) => isOwned(attempts, cell.tense, cell.person, cell.type));
}

function practicedCells(attempts) {
  const keys = new Set();
  const cells = [];
  for (const attempt of attempts.map(normalizeAttempt)) {
    const key = `${attempt.tense}:${attempt.person}:${attempt.type}`;
    if (keys.has(key)) continue;
    keys.add(key);
    cells.push({ tense: attempt.tense, person: attempt.person, type: attempt.type });
  }
  return cells;
}

function summarize(attempts, allAttempts) {
  if (!attempts.length) return null;
  const cells = practicedCells(attempts);
  const owned = cells.filter((cell) =>
    isOwned(allAttempts, cell.tense, cell.person, cell.type),
  );
  const rate = accuracy(attempts);
  const state = owned.length && owned.length === cells.length ? "owned" : "visit";
  return {
    state,
    label: STATE_LABEL[state],
    typed: attempts.filter((attempt) => attempt.typed).length,
    right: attempts.filter((attempt) => attempt.typed && attempt.correct).length,
    masteredCells: owned.length,
    practicedCells: cells.length,
    rate,
    strength: owned.length > 0 || (rate != null && rate >= 0.7 && attempts.length >= 5),
    struggle:
      attempts.length >= 3 &&
      !masteredAny(allAttempts, cells) &&
      (rate == null || rate < 0.6),
  };
}

export function progressReport(attempts) {
  const tenses = [];
  for (const group of TARGET_GROUPS) {
    const rows = [];
    for (const item of group.items) {
      const hits = slice(attempts, (attempt) => attempt.tense === item.id);
      const stats = summarize(hits, attempts);
      if (stats) rows.push({ id: item.id, name: item.label, ...stats });
    }
    if (rows.length) tenses.push({ id: group.id, name: group.label, rows });
  }

  const persons = PERSONS.map((person) => {
    const hits = slice(attempts, (attempt) => attempt.person === person.id);
    const stats = summarize(hits, attempts);
    return stats ? { id: person.id, name: person.label, ...stats } : null;
  }).filter(Boolean);

  const types = VERB_TYPES.map((type) => {
    const hits = slice(attempts, (attempt) => attempt.type === type.id);
    const stats = summarize(hits, attempts);
    return stats ? { id: type.id, name: type.label, ...stats } : null;
  }).filter(Boolean);

  const allRows = [
    ...tenses.flatMap((group) => group.rows.map((row) => ({ ...row, kind: "mood" }))),
    ...persons.map((row) => ({ ...row, kind: "person" })),
    ...types.map((row) => ({ ...row, kind: "type" })),
  ];

  return {
    tenses,
    persons,
    types,
    strengths: allRows.filter((row) => row.strength),
    struggles: allRows.filter((row) => row.struggle),
  };
}
