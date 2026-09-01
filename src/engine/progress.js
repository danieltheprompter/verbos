import { PERSONS, TARGET_GROUPS } from "./constants.js";
import { cellAllowed } from "./board.js";
import { atlasCellState, atlasLabel } from "./mastery.js";

export function atlasMoods() {
  return TARGET_GROUPS.map((group) => ({ id: group.id, label: group.label }));
}

export function atlasPersons(moodId) {
  return PERSONS.filter((person) => moodId !== "commands" || person.id !== "yo");
}

export function atlasGrid(attempts, moodId, filters = {}) {
  const group = TARGET_GROUPS.find((item) => item.id === moodId) || TARGET_GROUPS[0];
  const columns = atlasPersons(group.id);
  return {
    mood: group.id,
    columns,
    rows: group.items.map((tense) => ({
      id: tense.id,
      label: tense.label,
      short: tense.short,
      cells: columns.map((person) => {
        const allowed = cellAllowed(tense.id, person.id);
        const state = allowed
          ? atlasCellState(attempts, tense.id, person.id, filters)
          : "na";
        return {
          person: person.id,
          state,
          label: allowed ? atlasLabel(state) : "",
        };
      }),
    })),
  };
}
