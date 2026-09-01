import { ROUND_SIZE } from "./constants.js";
import { cellsFor } from "./board.js";
import { completePassDone, isOwned, isVisited } from "./mastery.js";
import { pick, shuffle, weightedPick } from "./random.js";
import { conjugate, verbsInPool } from "./verbs.js";

function avoidRepeat(prev, candidate) {
  if (!prev) return true;
  return prev.tense !== candidate.tense || prev.person !== candidate.person;
}

function pickCell(cells, attempts, prev, rng) {
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));
  const weak = cells.filter((cell) => !isOwned(attempts, cell.tense, cell.person));
  const pool = empty.length ? empty : cells;
  const weights = pool.map((cell) => {
    if (empty.length) return 8;
    if (isOwned(attempts, cell.tense, cell.person)) return 1;
    return weak.length ? 5 : 1;
  });

  for (let tryNo = 0; tryNo < 8; tryNo += 1) {
    const next = weightedPick(pool, weights, rng);
    if (avoidRepeat(prev, next) || pool.length === 1) return next;
  }
  return weightedPick(pool, weights, rng);
}

function pickVerb(verbs, used, rng) {
  const fresh = verbs.filter((verb) => !used.has(verb.inf));
  return pick(fresh.length ? fresh : verbs, rng);
}

export function buildRound(settings, attempts, rng = Math.random, size = ROUND_SIZE) {
  const cells = cellsFor(settings);
  const verbs = verbsInPool(settings.pool);
  const items = [];
  const usedVerbs = new Set();
  const firstPass = !completePassDone(attempts, cells);
  const empty = cells.filter((cell) => !isVisited(attempts, cell.tense, cell.person));

  if (firstPass && empty.length) {
    const cover = shuffle(empty, rng).slice(0, size);
    for (const cell of cover) {
      const verb = pickVerb(verbs, usedVerbs, rng);
      usedVerbs.add(verb.inf);
      items.push({
        tense: cell.tense,
        person: cell.person,
        verb: verb.inf,
        expected: conjugate(verb.inf, cell.tense, cell.person),
      });
    }
  }

  while (items.length < size) {
    const cell = pickCell(cells, attempts, items[items.length - 1], rng);
    const verb = pickVerb(verbs, usedVerbs, rng);
    usedVerbs.add(verb.inf);
    items.push({
      tense: cell.tense,
      person: cell.person,
      verb: verb.inf,
      expected: conjugate(verb.inf, cell.tense, cell.person),
    });
  }

  return items;
}

export function makeDistractors(item, rng = Math.random) {
  const others = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"].filter(
    (person) => person !== item.person,
  );
  const tenses = ["presente", "preterito", "imperfecto", "futuro", "condicional", "subjuntivo"].filter(
    (tense) => tense !== item.tense,
  );
  const pool = new Set();
  for (const person of others) {
    pool.add(conjugate(item.verb, item.tense, person));
  }
  for (const tense of tenses) {
    pool.add(conjugate(item.verb, tense, item.person));
  }
  pool.delete(item.expected);
  const options = shuffle([...pool], rng).slice(0, 3);
  while (options.length < 3) {
    options.push(item.expected + "s");
  }
  return shuffle([item.expected, ...options], rng);
}
