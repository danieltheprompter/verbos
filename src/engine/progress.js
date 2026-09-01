import { FORM_COPY, PERSONS, timesForMood } from "./constants.js";
import { cellAllowed } from "./board.js";
import { formCopy, formState } from "./mastery.js";

export function atlasPersons(mood) {
  return mood === "commands" ? PERSONS.filter((person) => person.id !== "yo") : PERSONS;
}

export function atlasSpec(mood, time, person, type, ending) {
  return { mood, time, person, type, ending };
}

export function atlasCell(attempts, spec) {
  const state = formState(attempts, spec);
  return {
    ...spec,
    state,
    copy: FORM_COPY[state],
  };
}

export function buildAtlas(attempts, { mood, type, ending }) {
  const times = timesForMood(mood);
  const persons = atlasPersons(mood);
  return times.map((item) => ({
    id: item.time,
    tense: item.id,
    label: item.label,
    short: item.short,
    cells: persons.map((person) => {
      const allowed = cellAllowed(item.id, person.id);
      if (!allowed) {
        return {
          person: person.id,
          label: person.label,
          allowed: false,
          state: "na",
          copy: "",
        };
      }
      const spec = atlasSpec(mood, item.time, person.id, type, ending);
      return {
        person: person.id,
        label: person.label,
        allowed: true,
        ...atlasCell(attempts, spec),
      };
    }),
  }));
}

export function atlasCopyAt(attempts, mood, time, person, type, ending) {
  return formCopy(attempts, atlasSpec(mood, time, person, type, ending));
}
