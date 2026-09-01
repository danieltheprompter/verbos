import { cellPips } from "./board.js";
import {
  FORM_COPY,
  RECAP_CLEAN,
  RECAP_HEAD,
  RECAP_NEXT_AGAIN,
  RECAP_NEXT_MAP,
  RECAP_NEXT_REST,
  RECAP_ROUND1,
  RECAP_STILL,
} from "./config.js";
import { formState } from "./mastery.js";
import { moodOf, personLabel, tenseLabel, timeOf } from "./pack.js";

function specOf(item) {
  return {
    mood: item.mood || moodOf(item.tense),
    time: item.time || timeOf(item.tense),
    person: item.person,
    type: item.type || item.verb_type,
    ending: item.ending_pattern || item.ending,
  };
}

function cellName(item) {
  return `${tenseLabel(item.tense)} · ${personLabel(item.person)}`;
}

function listNames(names) {
  const unique = [...new Set(names)];
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique[0]}, ${unique[1]}, and ${unique.length - 2} more`;
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
      changes.push({ name: cellName(item), from, to });
    }
  }
  return changes;
}

export function recapStory(items = [], attempts = []) {
  const prior = priorAttempts(attempts, items);
  const changes = recapChanges(items, attempts);
  const firstVisit = items.every((item) => cellPips(prior, item.tense, item.person) === 0);
  const stillNotEnough = items.every((item) => formState(attempts, specOf(item)) === "not_enough");
  const minted = changes.filter((change) => change.to === "know");
  const learning = changes.filter((change) => change.to === "learning");
  const leftover = items.some((item) => formState(attempts, specOf(item)) !== "know");

  const clean = items.length > 0 && items.every((item) => item.correct);
  const head = clean ? RECAP_CLEAN : RECAP_HEAD;

  if (firstVisit && stillNotEnough) {
    return {
      head,
      line: RECAP_ROUND1,
      next: RECAP_NEXT_AGAIN,
      action: "again",
    };
  }

  if (minted.length) {
    const names = listNames(minted.map((change) => change.name));
    const verb = minted.length === 1 ? "is" : "are";
    return {
      head,
      line: `${names} ${verb} ${FORM_COPY.know} — ${leftover ? RECAP_NEXT_REST : RECAP_NEXT_MAP}`,
      next: leftover ? RECAP_NEXT_REST : RECAP_NEXT_MAP,
      action: leftover ? "again" : "map",
    };
  }

  if (learning.length) {
    const names = listNames(learning.map((change) => change.name));
    const verb = learning.length === 1 ? "is" : "are";
    return {
      head,
      line: `${names} ${verb} ${FORM_COPY.learning} — ${RECAP_NEXT_AGAIN}`,
      next: RECAP_NEXT_AGAIN,
      action: "again",
    };
  }

  return {
    head,
    line: `${RECAP_STILL} ${RECAP_NEXT_AGAIN}`,
    next: RECAP_NEXT_AGAIN,
    action: "again",
  };
}
