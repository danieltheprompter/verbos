import { RECAP_CLEAN_LINE, RECAP_MISSED, RECAP_TURN_RED } from "./config.js";
import { formState, itemFormKey, parseFormKey, typedAttemptsFor } from "./mastery.js";
import { moodOf, pack, personById, personLabel, timeOf } from "./pack.js";
import { MASTERY_MIN } from "./config.js";

function specOf(item) {
  return {
    mood: item.mood || moodOf(item.tense),
    time: item.time || timeOf(item.tense),
    person: item.person,
    type: item.type || item.verb_type,
    ending: item.ending_pattern || item.ending,
  };
}

function priorAttempts(attempts, items) {
  return attempts.slice(0, Math.max(0, attempts.length - items.length));
}

export function recapChanges(items, attempts) {
  const prior = priorAttempts(attempts, items);
  const seen = new Set();
  const changes = [];
  for (const item of items) {
    const key = `${item.tense}:${item.person}:${specOf(item).type}:${specOf(item).ending}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const spec = specOf(item);
    const from = formState(prior, spec);
    const to = formState(attempts, spec);
    if (from !== to) {
      changes.push({ from, to });
    }
  }
  return changes;
}

export function recapHitsToward(attempts, keys = []) {
  const need = MASTERY_MIN;
  if (!keys.length) return { hits: 0, need, label: `0/${need}` };
  const hits = Math.min(
    ...keys.map((key) => typedAttemptsFor(attempts, parseFormKey(key)).length),
  );
  return { hits, need, label: `${hits}/${need}` };
}

export function recapTally(items = []) {
  const total = items.length;
  const hits = items.filter((item) => item.correct === true).length;
  return { hits, total, label: `${hits} of ${total}` };
}

export function personShortLabel(person) {
  const meta = personById(person);
  const line = meta?.lines?.[0] || meta?.label || personLabel(person);
  return String(line).split(/\s*\/\s*/)[0];
}

export function recapMissedLine(items = []) {
  const order = pack.persons.map((person) => person.id);
  const missed = [];
  const seen = new Set();
  for (const item of items) {
    if (item.correct !== false || seen.has(item.person)) continue;
    seen.add(item.person);
    missed.push(item.person);
  }
  missed.sort((left, right) => order.indexOf(left) - order.indexOf(right));
  if (!missed.length) return "";
  return `${RECAP_MISSED} ${missed.map(personShortLabel).join(" / ")}`;
}

export function recapStory(items = [], attempts = [], sittingKeys = []) {
  const keys = sittingKeys.length ? sittingKeys : items.map(itemFormKey);
  const toward = recapHitsToward(attempts, keys);
  const tally = recapTally(items);
  const clean = tally.total > 0 && tally.hits === tally.total;
  return {
    banner: tally.label,
    head: clean ? "" : recapMissedLine(items),
    line: clean ? RECAP_CLEAN_LINE : RECAP_TURN_RED,
    pips: toward.label,
    hits: toward.hits,
    need: toward.need,
    next: clean ? RECAP_CLEAN_LINE : RECAP_TURN_RED,
    action: "again",
  };
}
