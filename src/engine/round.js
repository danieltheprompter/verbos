import { ROUND_SIZE } from "./constants.js";
import { cellsFor } from "./board.js";
import { completePassDone, isOwned, isVisited } from "./mastery.js";
import { pick, shuffle, weightedPick } from "./random.js";
import { activeTypes, conjugate, verbsForSettings } from "./verbs.js";

function avoidRepeat(prev, candidate) {
  if (!prev) return true;
  return prev.tense !== candidate.tense || prev.person !== candidate.person;
}

function pickVerb(verbs, used, rng) {
  const fresh = verbs.filter((verb) => !used.has(verb.inf));
  return pick(fresh.length ? fresh : verbs, rng);
}

function itemFrom(cell, verb) {
  return {
    tense: cell.tense,
    person: cell.person,
    verb: verb.inf,
    type: verb.type,
    expected: conjugate(verb.inf, cell.tense, cell.person),
  };
}

function pickWeightedCell(cells, attempts, types, prev, rng) {
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));
  const board = empty.length ? empty : cells;
  const weights = board.map((cell) => {
    if (empty.length) return 8;
    const weak = types.some((type) => !isOwned(attempts, cell.tense, cell.person, type));
    return weak ? 5 : 1;
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
    isOwned(attempts, cell.tense, cell.person, type) ? 1 : 5,
  );
  return weightedPick(open, weights, rng);
}

export function buildRound(settings, attempts, rng = Math.random, size = ROUND_SIZE) {
  const cells = cellsFor(settings);
  const verbs = verbsForSettings(settings);
  const types = activeTypes(settings);
  const verbsByType = Object.fromEntries(
    types.map((type) => [type, verbs.filter((verb) => verb.type === type)]),
  );
  const items = [];
  const usedVerbs = new Set();
  const firstPass = !completePassDone(attempts, cells);
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));

  if (!verbs.length || !cells.length) return items;

  if (firstPass && empty.length) {
    const cover = shuffle(empty, rng).slice(0, size);
    for (const cell of cover) {
      const type = pickTypeForCell(types, verbsByType, cell, attempts, rng);
      const verb = pickVerb(verbsByType[type] || verbs, usedVerbs, rng);
      usedVerbs.add(verb.inf);
      items.push(itemFrom(cell, verb));
    }
  }

  while (items.length < size) {
    const cell = pickWeightedCell(cells, attempts, types, items[items.length - 1], rng);
    const type = pickTypeForCell(types, verbsByType, cell, attempts, rng);
    const verb = pickVerb(verbsByType[type] || verbs, usedVerbs, rng);
    usedVerbs.add(verb.inf);
    items.push(itemFrom(cell, verb));
  }

  return items;
}

export function makeDistractors(item, rng = Math.random) {
  const others = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"].filter(
    (person) => person !== item.person,
  );
  const tenses = [
    "presente",
    "preterito",
    "imperfecto",
    "futuro",
    "condicional",
    "subjuntivo",
    "subjuntivo_imp",
  ].filter((tense) => tense !== item.tense);
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
