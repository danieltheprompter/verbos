import { PERSONS, isCommand } from "./constants.js";

export function addressPersons(settings) {
  const address = settings.address || (settings.vos ? "vos" : "tu");
  if (address === "both") return ["tu", "vos"];
  if (address === "vos") return ["vos"];
  return ["tu"];
}

export function personsFor(settings, tense) {
  const people = [];
  if (!isCommand(tense)) people.push("yo");
  people.push(...addressPersons(settings));
  people.push("el", "nos");
  if (settings.vosotros) people.push("vosotros");
  people.push("ellos");
  return people;
}

export function columnPersons(settings) {
  const order = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"];
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

export function columnLabels(settings) {
  return columnPersons(settings).map((id) => {
    const meta = PERSONS.find((person) => person.id === id);
    return { id, label: meta.label };
  });
}

export function personLabel(person) {
  return PERSONS.find((entry) => entry.id === person)?.label ?? person;
}

export function cellAllowed(tense, person) {
  return !(isCommand(tense) && person === "yo");
}

export function answeredCellKeys(items = []) {
  return new Set(
    items
      .filter((item) => typeof item.correct === "boolean")
      .map((item) => `${item.tense}:${item.person}`),
  );
}

export function roundCellState(tense, person, current, answered = new Set()) {
  const key = `${tense}:${person}`;
  const isCurrent = Boolean(current && current.tense === tense && current.person === person);
  const isAnswered = answered instanceof Set ? answered.has(key) : Boolean(answered[key]);
  if (isAnswered) return isCurrent ? "answered-now" : "answered";
  if (isCurrent) return "now";
  return "empty";
}
