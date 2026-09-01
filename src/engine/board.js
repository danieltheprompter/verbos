import { PERSONS } from "./constants.js";

export function personsFor(settings) {
  const people = ["yo", settings.vos ? "vos" : "tu", "el", "nos"];
  if (settings.vosotros) people.push("vosotros");
  people.push("ellos");
  return people;
}

export function cellsFor(settings) {
  const cells = [];
  for (const tense of settings.tenses) {
    for (const person of personsFor(settings)) {
      cells.push({ tense, person });
    }
  }
  return cells;
}

export function columnLabels(settings) {
  return personsFor(settings).map((id) => {
    const meta = PERSONS.find((person) => person.id === id);
    return { id, label: meta.label };
  });
}

export function personLabel(person) {
  return PERSONS.find((entry) => entry.id === person)?.label ?? person;
}
