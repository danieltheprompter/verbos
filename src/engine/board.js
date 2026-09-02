import { PIP_SLOTS } from "./config.js";
import { isCommand, moodOf, pack, personById, personLabel } from "./pack.js";

export { personLabel };

export function addressPersons(settings) {
  const addressed = pack.persons.filter((person) => person.address).map((person) => person.id);
  const fallback = addressed[0];
  const address = settings.address || (settings.vos ? addressed[1] : fallback);
  if (address === "both") return addressed;
  if (addressed.includes(address)) return [address];
  return fallback ? [fallback] : [];
}

export function personsFor(settings, tense) {
  const address = new Set(addressPersons(settings));
  const mood = moodOf(tense);
  return pack.persons
    .filter((person) => {
      if (person.skipMoods?.includes(mood)) return false;
      if (person.optionalColumn && !settings.extraColumn) return false;
      if (person.address && !address.has(person.id)) return false;
      return true;
    })
    .map((person) => person.id);
}

export function commandPersons(settings) {
  const command = pack.targetGroups.find((group) =>
    group.items.some((item) => isCommand(item.id)),
  )?.items[0];
  return personsFor(settings, command?.id);
}

export function columnPersons(settings) {
  const order = pack.persons.map((person) => person.id);
  const present = new Set();
  for (const tense of settings.tenses) {
    for (const person of personsFor(settings, tense)) present.add(person);
  }
  return order.filter((id) => present.has(id));
}

export function cellsFor(settings) {
  const cells = [];
  for (const tense of settings.tenses) {
    for (const person of personsFor(settings, tense)) {
      cells.push({ tense, person });
    }
  }
  return cells;
}

export function cellKey(cell) {
  return `${cell.tense}:${cell.person}`;
}

export function itemsToCells(items = []) {
  return items.map((item) => ({ tense: item.tense, person: item.person }));
}

export function sameBoard(cells, settings) {
  if (!cells?.length) return false;
  const now = cellsFor(settings).map(cellKey).sort();
  const last = cells.map(cellKey).sort();
  return now.length === last.length && now.every((key, index) => key === last[index]);
}

export function columnLabels(settings) {
  return columnPersons(settings).map((id) => {
    const meta = personById(id);
    return { id, label: meta?.label ?? id, lines: meta?.lines || [meta?.label ?? id] };
  });
}

export function cellAllowed(tense, person) {
  const meta = personById(person);
  return !meta?.skipMoods?.includes(moodOf(tense));
}

export function answeredCellKeys(items = []) {
  return new Set(
    items
      .filter((item) => typeof item.correct === "boolean")
      .map((item) => cellKey(item)),
  );
}

export function visitPieceCount(sittingMarks = 0, visits = 0, dropped = false) {
  return Math.max(Number(sittingMarks) || 0, Number(visits) || 0, dropped ? 1 : 0);
}

export function roundCellState(tense, person, current, answered = new Set()) {
  const key = `${tense}:${person}`;
  const isCurrent = Boolean(current && current.tense === tense && current.person === person);
  const isAnswered = answered instanceof Set ? answered.has(key) : Boolean(answered[key]);
  if (isAnswered) return isCurrent ? "answered-now" : "answered";
  if (isCurrent) return "now";
  return "empty";
}

export function cellPipCount(attempts = [], tense, person) {
  return attempts.filter(
    (attempt) => attempt.typed && attempt.tense === tense && attempt.person === person,
  ).length;
}

export function cellPips(attempts, tense, person, slots = PIP_SLOTS) {
  return Math.min(slots, cellPipCount(attempts, tense, person));
}

export const typedPips = cellPips;

export function lastRoundResult(items, tense, person) {
  const hits = items.filter((item) => item.tense === tense && item.person === person);
  const last = hits[hits.length - 1];
  if (!last || typeof last.correct !== "boolean") return null;
  return last.correct;
}

export function recapCellTone(items, tense, person) {
  const hit = lastRoundResult(items, tense, person);
  if (hit === true) return "hit";
  if (hit === false) return "miss";
  return "";
}

export function recapStillNotEnough(attempts, items) {
  return items.every((item) => cellPips(attempts, item.tense, item.person) < PIP_SLOTS);
}
