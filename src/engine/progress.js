import { ENDING_PATTERNS, FORM_COPY, MOODS, RANK_PATH, VERB_BUCKETS, timesForMood } from "./constants.js";
import { pack } from "./pack.js";
import { cellAllowed } from "./board.js";
import { formCopy, formState, typedAttemptsFor } from "./mastery.js";

export function atlasPersons(mood) {
  return pack.persons.filter((person) => !person.skipMoods?.includes(mood));
}

export function atlasSpec(mood, time, person, type, ending) {
  return { mood, time, person, type, ending };
}

export function atlasCell(attempts, spec) {
  const typed = typedAttemptsFor(attempts, spec);
  const state = formState(attempts, spec);
  return {
    ...spec,
    state,
    opened: typed.length > 0,
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
    short: item.label,
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

export function atlasFillName(mood, type, ending) {
  const moodLabel = MOODS.find((item) => item.id === mood)?.label ?? mood;
  const typeLabel = VERB_BUCKETS.find((item) => item.id === type)?.label ?? type;
  const endingLabel = ENDING_PATTERNS.find((item) => item.id === ending)?.label ?? ending;
  return `${moodLabel} · ${typeLabel} · ${endingLabel}`;
}

export function atlasRank({ known = 0, opened = 0, allowed = 0 } = {}) {
  if (!opened) return RANK_PATH[0];
  if (!known) return RANK_PATH[1];
  if (allowed > 0 && known >= allowed) return RANK_PATH[6];
  const fill = allowed ? known / allowed : 0;
  if (fill < 0.2) return RANK_PATH[2];
  if (fill < 0.4) return RANK_PATH[3];
  if (fill < 0.7) return RANK_PATH[4];
  return RANK_PATH[5];
}

export function atlasFillStats(attempts, { mood, type, ending }) {
  const rows = buildAtlas(attempts, { mood, type, ending });
  let allowed = 0;
  let opened = 0;
  let known = 0;
  for (const row of rows) {
    for (const cell of row.cells) {
      if (!cell.allowed) continue;
      allowed += 1;
      if (cell.opened) opened += 1;
      if (cell.state === "know") known += 1;
    }
  }
  const rank = atlasRank({ known, opened, allowed });
  return {
    allowed,
    opened,
    known,
    rank: rank.id,
    name: atlasFillName(mood, type, ending),
    line: rank.label,
  };
}
