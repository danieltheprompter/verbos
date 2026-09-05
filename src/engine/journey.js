import { cellsFor } from "./board.js";
import { formKey, uniqueFormKeys, youKnowThis } from "./mastery.js";
import { moodOf, pack, timeOf } from "./pack.js";
import { endingPattern, verbsForSettings } from "./verbs.js";

const ISLE_LAYOUT = {
  a: { x: 160, y: 128, rx: 148, ry: 96 },
  b: { x: 430, y: 118, rx: 158, ry: 90 },
  c: { x: 720, y: 128, rx: 138, ry: 94 },
  d: { x: 180, y: 318, rx: 136, ry: 84 },
  e: { x: 450, y: 328, rx: 148, ry: 92 },
  f: { x: 730, y: 328, rx: 136, ry: 88 },
  g: { x: 450, y: 518, rx: 300, ry: 86 },
};

const NODE_POS = {
  1: [82, 102],
  2: [138, 158],
  3: [190, 92],
  4: [228, 158],
  5: [278, 112],
  6: [348, 92],
  7: [398, 158],
  8: [462, 88],
  9: [522, 148],
  10: [648, 108],
  11: [722, 168],
  review: [792, 104],
  12: [128, 298],
  13: [228, 342],
  14: [378, 308],
  15: [450, 372],
  16: [522, 302],
  17: [668, 302],
  18: [740, 372],
  19: [802, 308],
  20: [220, 508],
  21: [300, 548],
  22: [380, 502],
  23: [460, 548],
  24: [540, 502],
  25: [620, 548],
  26: [720, 508],
};

export function journeyCatalog() {
  return pack.journeyTrials || [];
}

export function journeyTrial(id) {
  return journeyCatalog().find((trial) => trial.id === id) || null;
}

export function journeyPronouns(settings = {}) {
  return {
    address: settings.address,
    extraColumn: Boolean(settings.extraColumn),
  };
}

export function journeySettings(trial, pronouns = {}) {
  return pack.trialSettings(trial, pronouns);
}

export function trialSittingKeys(trial, pronouns = {}) {
  const settings = journeySettings(trial, pronouns);
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
      ending: trial.endings?.[0] || pack.endingPatterns?.[0]?.id,
    });
  }
  const pair = pairs[0];
  const keys = [];
  for (const tense of trial.tenses) {
    for (const person of settings.persons) {
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

export function trialBeaten(attempts, trial, pronouns = {}) {
  const keys = trialSittingKeys(trial, pronouns);
  if (!keys.length) return false;
  return keys.every((key) => {
    const [mood, time, person, type, ending] = key.split(":");
    return youKnowThis(attempts, { mood, time, person, type, ending });
  });
}

export function beatenTrialIds(attempts, catalog = journeyCatalog(), pronouns = {}) {
  return new Set(
    catalog.filter((trial) => trialBeaten(attempts, trial, pronouns)).map((trial) => trial.id),
  );
}

export function trialUnlocked(trial, beaten) {
  return (trial.requires || []).every((id) => beaten.has(id));
}

export function journeyNodeState(trial, beaten, currentId) {
  if (beaten.has(trial.id)) return "beaten";
  if (trial.id === currentId || trialUnlocked(trial, beaten)) return "current";
  return "ahead";
}

export function currentJourneyId(attempts, catalog = journeyCatalog(), pronouns = {}) {
  const beaten = beatenTrialIds(attempts, catalog, pronouns);
  const required = catalog.filter((trial) => !trial.optional).sort((a, b) => a.order - b.order);
  const open = required.find((trial) => !beaten.has(trial.id) && trialUnlocked(trial, beaten));
  return open?.id || required.find((trial) => !beaten.has(trial.id))?.id || required.at(-1)?.id || null;
}

export function requiredAllBeaten(beaten, catalog = journeyCatalog()) {
  return catalog.filter((trial) => !trial.optional).every((trial) => beaten.has(trial.id));
}

export function journeyMap(attempts, catalog = journeyCatalog(), pronouns = {}) {
  const beaten = beatenTrialIds(attempts, catalog, pronouns);
  const currentId = currentJourneyId(attempts, catalog, pronouns);
  const allLit = requiredAllBeaten(beaten, catalog);
  return catalog
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((trial) => ({
      id: trial.id,
      label: trial.label,
      optional: Boolean(trial.optional),
      state: allLit && !trial.optional ? "beaten" : journeyNodeState(trial, beaten, currentId),
    }));
}

export function journeyAtlas(attempts, pronouns = {}, catalog = journeyCatalog()) {
  const islands = pack.journeyIslands || [];
  const beaten = beatenTrialIds(attempts, catalog, pronouns);
  const currentId = currentJourneyId(attempts, catalog, pronouns);
  const complete = requiredAllBeaten(beaten, catalog);
  const nodes = journeyMap(attempts, catalog, pronouns).map((node) => {
    const [x, y] = NODE_POS[node.id] || [0, 0];
    const island = islands.find((isle) => isle.trials.includes(node.id))?.id || "";
    const playable = node.state === "current" || node.state === "beaten";
    return { ...node, x, y, island, playable };
  });
  const required = catalog.filter((trial) => !trial.optional).sort((a, b) => a.order - b.order);
  const route = [];
  for (let i = 0; i < required.length - 1; i += 1) {
    const from = required[i];
    const to = required[i + 1];
    const a = NODE_POS[from.id];
    const b = NODE_POS[to.id];
    if (!a || !b) continue;
    route.push({
      from: from.id,
      to: to.id,
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      lit: beaten.has(from.id),
    });
  }
  return {
    complete,
    currentId,
    islands: islands.map((isle) => ({
      id: isle.id,
      label: isle.label,
      ...ISLE_LAYOUT[isle.id],
    })),
    nodes,
    route,
  };
}

export function journeyPlayable(trial, attempts, pronouns = {}) {
  if (!trial) return false;
  const beaten = beatenTrialIds(attempts, journeyCatalog(), pronouns);
  return trialUnlocked(trial, beaten) || beaten.has(trial.id);
}

export function journeyRoundSize(trial, pronouns = {}) {
  return cellsFor(journeySettings(trial, pronouns)).length;
}

export function isJourneyUnlocked(profile) {
  return profile?.journeyUnlocked !== false;
}

export function sameSittingSet(left = [], right = []) {
  return [...left].sort().join("|") === [...right].sort().join("|");
}
