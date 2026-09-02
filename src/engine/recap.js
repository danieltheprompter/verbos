import {
  MASTERY_MIN,
  RECAP_CLEAN,
  RECAP_HEAD,
  RECAP_NEXT_AGAIN,
  RECAP_SAME_BOARD,
  RECAP_SAME_TEN,
} from "./config.js";
import { formState, itemFormKey, parseFormKey, typedAttemptsFor } from "./mastery.js";
import { moodOf, timeOf } from "./pack.js";

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

export function recapStory(items = [], attempts = [], sittingKeys = []) {
  const keys = sittingKeys.length ? sittingKeys : items.map(itemFormKey);
  const toward = recapHitsToward(attempts, keys);
  const clean = items.length > 0 && items.every((item) => item.correct);
  return {
    banner: RECAP_SAME_BOARD,
    head: clean ? RECAP_CLEAN : RECAP_HEAD,
    line: RECAP_SAME_TEN,
    pips: toward.label,
    hits: toward.hits,
    need: toward.need,
    next: RECAP_NEXT_AGAIN,
    action: "again",
  };
}
