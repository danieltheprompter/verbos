import { cellsFor } from "./board.js";
import { formKey, uniqueFormKeys, youKnowThis } from "./mastery.js";
import { moodOf, pack, timeOf } from "./pack.js";
import { endingPattern, verbsForSettings } from "./verbs.js";

export function journeyCatalog() {
  return pack.journeyTrials || [];
}

export function journeyTrial(id) {
  return journeyCatalog().find((trial) => trial.id === id) || null;
}

export function journeySettings(trial) {
  return pack.trialSettings(trial);
}

export function trialSittingKeys(trial) {
  const settings = journeySettings(trial);
  const verbs = verbsForSettings(settings);
  const pairs = [];
  const seen = new Set();
  for (const verb of verbs) {
    const type = verb.type;
    const ending = endingPattern(verb.inf);
    if (trial.endings?.length && !trial.endings.includes(ending)) continue;
    const pair = `${type}:${ending}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    pairs.push({ type, ending });
  }
  if (!pairs.length) {
    pairs.push({
      type: trial.types[0],
      ending: trial.endings?.[0] || "ar",
    });
  }
  const pair = pairs[0];
  const keys = [];
  for (const tense of trial.tenses) {
    for (const person of trial.persons) {
      keys.push(
        formKey({
          mood: moodOf(tense),
          time: timeOf(tense),
          person,
          type: pair.type,
          ending: pair.ending,
        }),
      );
    }
  }
  return uniqueFormKeys(keys);
}

export function trialBeaten(attempts, trial) {
  const keys = trialSittingKeys(trial);
  if (!keys.length) return false;
  return keys.every((key) => {
    const [mood, time, person, type, ending] = key.split(":");
    return youKnowThis(attempts, { mood, time, person, type, ending });
  });
}

export function beatenTrialIds(attempts, catalog = journeyCatalog()) {
  return new Set(catalog.filter((trial) => trialBeaten(attempts, trial)).map((trial) => trial.id));
}

export function trialUnlocked(trial, beaten) {
  return (trial.requires || []).every((id) => beaten.has(id));
}

export function journeyNodeState(trial, beaten, currentId) {
  if (beaten.has(trial.id)) return "beaten";
  if (trial.id === currentId) return "current";
  if (trialUnlocked(trial, beaten)) return "current";
  return "locked";
}

export function currentJourneyId(attempts, catalog = journeyCatalog()) {
  const beaten = beatenTrialIds(attempts, catalog);
  const required = catalog.filter((trial) => !trial.optional).sort((a, b) => a.order - b.order);
  const open = required.find((trial) => !beaten.has(trial.id) && trialUnlocked(trial, beaten));
  return open?.id || required.find((trial) => !beaten.has(trial.id))?.id || required.at(-1)?.id || null;
}

export function journeyMap(attempts, catalog = journeyCatalog()) {
  const beaten = beatenTrialIds(attempts, catalog);
  const currentId = currentJourneyId(attempts, catalog);
  const allLit = requiredAllBeaten(beaten, catalog);
  return catalog
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((trial) => ({
      id: trial.id,
      label: trial.label,
      optional: Boolean(trial.optional),
      state: allLit ? "beaten" : journeyNodeState(trial, beaten, currentId),
    }));
}

function requiredAllBeaten(beaten, catalog) {
  return catalog.filter((trial) => !trial.optional).every((trial) => beaten.has(trial.id));
}

export function journeyPlayable(trial, attempts) {
  const beaten = beatenTrialIds(attempts);
  return trialUnlocked(trial, beaten);
}

export function journeyRoundSize(trial) {
  return cellsFor(journeySettings(trial)).length;
}

export function isJourneyUnlocked(profile) {
  return profile?.journeyUnlocked !== false;
}
