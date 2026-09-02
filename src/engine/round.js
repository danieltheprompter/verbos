import { ROUND_SIZE } from "./config.js";
import { cellKey, cellPips, cellsFor, sameBoard } from "./board.js";
import { moodOf, pack, tenses as packTenses, tenseFor, timeOf } from "./pack.js";
import { lastMiss, miniCellState } from "./levels.js";
import {
  allSelectedKnown,
  completePassDone,
  formKey,
  isVisited,
  itemFormKey,
  parseFormKey,
  sittingIncomplete,
  sameFormKeySet,
  sittingKeysFromAttempts,
  typeKnownAtCell,
  uniqueFormKeys,
  youKnowThis,
} from "./mastery.js";
import { pick, shuffle, weightedPick } from "./random.js";
import { activeTypes, conjugate, endingPattern, verbsForSettings } from "./verbs.js";

function avoidRepeat(prev, candidate) {
  if (!prev) return true;
  return prev.tense !== candidate.tense || prev.person !== candidate.person;
}

function pickVerb(verbs, used, rng) {
  const fresh = verbs.filter((verb) => !used.has(verb.inf));
  return pick(fresh.length ? fresh : verbs, rng);
}

function lastPromptOnCell(attempts, cell) {
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (attempt.tense === cell.tense && attempt.person === cell.person) {
      return {
        type: cell.type || attempt.type || attempt.verb_type,
        ending: cell.ending || attempt.ending_pattern || attempt.ending,
        verb: cell.verb || attempt.verb,
      };
    }
  }
  return { type: cell.type, ending: cell.ending, verb: cell.verb };
}

function verbForCell(cell, verbs, types, verbsByType, attempts, usedVerbs, rng) {
  const pinned = lastPromptOnCell(attempts, cell);
  const type =
    pinned.type && verbsByType[pinned.type]?.length
      ? pinned.type
      : pickTypeForCell(types, verbsByType, cell, attempts, rng);
  let pool = verbsByType[type] || verbs;
  if (pinned.ending) {
    const matched = pool.filter((verb) => endingPattern(verb.inf) === pinned.ending);
    if (matched.length) pool = matched;
  }
  if (pinned.verb) {
    const same =
      pool.find((verb) => verb.inf === pinned.verb) ||
      verbs.find((verb) => verb.inf === pinned.verb);
    if (same) {
      usedVerbs.add(same.inf);
      return same;
    }
  }
  return pickVerb(pool, usedVerbs, rng);
}

function lastVerbOnKey(attempts, spec) {
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (
      attempt.person === spec.person &&
      (attempt.type || attempt.verb_type) === spec.type &&
      (attempt.ending_pattern || attempt.ending) === spec.ending &&
      (attempt.mood || moodOf(attempt.tense)) === spec.mood &&
      (attempt.time || timeOf(attempt.tense)) === spec.time
    ) {
      return attempt.verb;
    }
  }
  return null;
}

function pickVerbForSpec(verbs, spec, used, rng, prefer) {
  const pool = verbs.filter(
    (verb) => verb.type === spec.type && endingPattern(verb.inf) === spec.ending,
  );
  if (!pool.length) return null;
  if (prefer) {
    const same = pool.find((verb) => verb.inf === prefer);
    if (same) {
      used.add(same.inf);
      return same;
    }
  }
  const fresh = pool.filter((verb) => !used.has(verb.inf));
  const verb = pick(fresh.length ? fresh : pool, rng);
  if (verb) used.add(verb.inf);
  return verb;
}

function keysFromReplayCells(cells = []) {
  const keys = [];
  for (const cell of cells || []) {
    const type = cell.type || cell.verb_type;
    const ending = cell.ending || cell.ending_pattern;
    if (!cell?.tense || !cell?.person || !type || !ending) continue;
    keys.push(
      formKey({
        mood: cell.mood || moodOf(cell.tense),
        time: cell.time || timeOf(cell.tense),
        person: cell.person,
        type,
        ending,
      }),
    );
  }
  return uniqueFormKeys(keys);
}

export function playAgainRound(sittingKeys, settings, attempts = [], rng = Math.random) {
  return mapSittingKeys(sittingKeys, settings, attempts, rng);
}

export function mapSittingKeys(keys, settings, attempts = [], rng = Math.random) {
  const unique = uniqueFormKeys(keys);
  if (unique.length !== ROUND_SIZE) {
    throw new Error(`sittingKeys must be ${ROUND_SIZE} unique formKeys, got ${unique.length}`);
  }
  const verbs = verbsForSettings(settings);
  const items = [];
  const used = new Set();
  for (const key of shuffle(unique, rng)) {
    const spec = parseFormKey(key);
    const tense = tenseFor(spec.mood, spec.time);
    if (!tense) throw new Error(`sitting key has no tense: ${key}`);
    const verb = pickVerbForSpec(verbs, spec, used, rng, lastVerbOnKey(attempts, spec));
    if (!verb) throw new Error(`sitting key has no verb: ${key}`);
    const item = itemFrom({ tense, person: spec.person }, verb);
    if (itemFormKey(item) !== key) {
      throw new Error(`sitting map drifted ${key} -> ${itemFormKey(item)}`);
    }
    items.push(item);
  }
  if (!sameFormKeySet(items.map(itemFormKey), unique)) {
    throw new Error("built round set ≠ sittingKeys");
  }
  return items;
}

function pinForRound(sittingKeys, replay, attempts, cells) {
  const explicit = uniqueFormKeys(sittingKeys);
  if (explicit.length === ROUND_SIZE) return explicit;
  const recovered = uniqueFormKeys(sittingKeysFromAttempts(attempts, cells));
  if (recovered.length === ROUND_SIZE) return recovered;
  const fromReplay = keysFromReplayCells(replay || []);
  if (fromReplay.length === ROUND_SIZE) return fromReplay;
  return [];
}

function itemFrom(cell, verb) {
  return {
    tense: cell.tense,
    mood: moodOf(cell.tense),
    time: timeOf(cell.tense),
    person: cell.person,
    verb: verb.inf,
    type: verb.type,
    ending_pattern: endingPattern(verb.inf),
    expected: conjugate(verb.inf, cell.tense, cell.person),
  };
}

function cellHasUnknown(cell, attempts, types, verbs) {
  return !types.some((type) => {
    const endings = [
      ...new Set(verbs.filter((verb) => verb.type === type).map((verb) => endingPattern(verb.inf))),
    ];
    return endings.some((ending) =>
      youKnowThis(attempts, {
        mood: moodOf(cell.tense),
        time: timeOf(cell.tense),
        person: cell.person,
        type,
        ending,
      }),
    );
  });
}

function pickWeightedCell(cells, attempts, types, verbs, prev, rng) {
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));
  const unknown = cells.filter((cell) => cellHasUnknown(cell, attempts, types, verbs));
  const board = empty.length ? empty : unknown.length ? unknown : cells;
  const miss = lastMiss(attempts);
  const weights = board.map((cell) => {
    const pips = cellPips(attempts, cell.tense, cell.person);
    const learning = miniCellState(attempts, cell.tense, cell.person) === "learning";
    let weight = 1;
    if (pips === 0) weight = 12;
    else if (learning) weight = 8;
    else if (types.some((type) => !typeKnownAtCell(attempts, cell.tense, cell.person, type))) {
      weight = 5;
    }
    if (miss && (cell.person === miss.person || cell.tense === miss.tense)) weight += 3;
    return weight;
  });

  for (let tryNo = 0; tryNo < 8; tryNo += 1) {
    const next = weightedPick(board, weights, rng);
    if (avoidRepeat(prev, next) || board.length === 1) return next;
  }
  return weightedPick(board, weights, rng);
}

function pickTypeForCell(types, verbsByType, cell, attempts, rng) {
  const open = types.filter((type) => verbsByType[type]?.length);
  const weights = open.map((type) =>
    typeKnownAtCell(attempts, cell.tense, cell.person, type) ? 1 : 5,
  );
  return weightedPick(open, weights, rng);
}

function fillCells(cover, verbs, types, verbsByType, attempts, rng) {
  const items = [];
  const usedVerbs = new Set();
  for (const cell of cover) {
    const verb = verbForCell(cell, verbs, types, verbsByType, attempts, usedVerbs, rng);
    usedVerbs.add(verb.inf);
    items.push(itemFrom(cell, verb));
  }
  return items;
}

function pushItem(items, cell, verbs, types, verbsByType, attempts, usedVerbs, rng) {
  const verb = verbForCell(cell, verbs, types, verbsByType, attempts, usedVerbs, rng);
  usedVerbs.add(verb.inf);
  items.push(itemFrom(cell, verb));
}

function fillWeighted(board, verbs, types, verbsByType, attempts, rng, size, seed = []) {
  const items = [...seed];
  const usedVerbs = new Set(items.map((item) => item.verb));
  while (items.length < size) {
    const cell = pickWeightedCell(board, attempts, types, verbs, items[items.length - 1], rng);
    pushItem(items, cell, verbs, types, verbsByType, attempts, usedVerbs, rng);
  }
  return items;
}

export function buildRound(
  settings,
  attempts,
  rng = Math.random,
  size = ROUND_SIZE,
  replayCells,
  sittingKeys,
) {
  const cells = cellsFor(settings);
  const verbs = verbsForSettings(settings);
  const types = activeTypes(settings);
  const verbsByType = Object.fromEntries(
    types.map((type) => [type, verbs.filter((verb) => verb.type === type)]),
  );
  const firstPass = !completePassDone(attempts, cells);
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));
  const unknown = cells.filter((cell) => cellHasUnknown(cell, attempts, types, verbs));
  const replay = replayCells?.length && sameBoard(replayCells, settings) ? replayCells : null;
  const nothingKnown = unknown.length === cells.length;

  if (!verbs.length || !cells.length) return [];
  if (allSelectedKnown(settings, attempts)) return [];

  const pin = pinForRound(sittingKeys, replay, attempts, cells);
  if (pin.length === ROUND_SIZE && sittingIncomplete(attempts, pin)) {
    return mapSittingKeys(pin, settings, attempts, rng);
  }

  // Round 1 / still nothing you-know-this: one visit per cell, no retries stuffed in.
  if (nothingKnown && cells.length <= size) {
    const order = replay || shuffle(cells, rng);
    return fillCells(order.slice(0, size), verbs, types, verbsByType, attempts, rng);
  }

  if (firstPass && empty.length) {
    const cover = shuffle(empty, rng).slice(0, size);
    return fillCells(cover, verbs, types, verbsByType, attempts, rng);
  }

  // After the complete pass, stay on cells that are not you-know-this.
  const open = unknown.length ? unknown : [];
  if (!open.length) return [];
  const replayOpen = replay
    ? replay.filter((cell) => open.some((item) => cellKey(item) === cellKey(cell)))
    : [];
  const board = replayOpen.length ? replayOpen : open;

  if (board.length <= size) {
    const cover = shuffle(board, rng);
    return fillWeighted(
      board,
      verbs,
      types,
      verbsByType,
      attempts,
      rng,
      size,
      fillCells(cover, verbs, types, verbsByType, attempts, rng),
    );
  }

  return fillWeighted(board, verbs, types, verbsByType, attempts, rng, size);
}

export function makeDistractors(item, rng = Math.random) {
  const others = pack.persons.map((person) => person.id).filter((person) => person !== item.person);
  const tenses = packTenses
    .filter((tense) => tense.id !== item.tense && tense.mood !== "commands")
    .map((tense) => tense.id);
  const pool = new Set();
  for (const person of others) {
    try {
      const form = conjugate(item.verb, item.tense, person);
      if (form) pool.add(form);
    } catch {
      /* skip impossible person */
    }
  }
  for (const tense of tenses) {
    try {
      const form = conjugate(item.verb, tense, item.person);
      if (form) pool.add(form);
    } catch {
      /* skip */
    }
  }
  pool.delete(item.expected);
  const options = shuffle([...pool], rng).slice(0, 3);
  while (options.length < 3) {
    options.push(`${item.expected}s`);
  }
  return shuffle([item.expected, ...options], rng);
}
