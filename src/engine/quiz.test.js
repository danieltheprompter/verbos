import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import { DEFAULT_SETTINGS } from "./constants.js";
import { cellState, isOwned } from "./mastery.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { cellsFor } from "./board.js";

function typed(tense, person, correct) {
  return { tense, person, verb: "hablar", correct, typed: true, ts: 1 };
}

describe("answer checking", () => {
  it("accepts missing accents and optional pronouns", () => {
    expect(answersMatch("hablé", "hable")).toBe(true);
    expect(answersMatch("hablé", " yo  Hablé ")).toBe(true);
    expect(answersMatch("comí", "comi")).toBe(true);
    expect(answersMatch("sé", "se")).toBe(true);
    expect(answersMatch("hablo", "hablas")).toBe(false);
    expect(answersMatch("hablo", "")).toBe(false);
  });
});

describe("mastery", () => {
  it("owns a cell only after 5 of the last 7 typed corrects, min 5", () => {
    const four = Array.from({ length: 4 }, () => typed("presente", "yo", true));
    expect(isOwned(four, "presente", "yo")).toBe(false);
    const five = [...four, typed("presente", "yo", true)];
    expect(isOwned(five, "presente", "yo")).toBe(true);
    const mixed = [
      ...Array.from({ length: 5 }, () => typed("presente", "tu", true)),
      typed("presente", "tu", false),
      typed("presente", "tu", false),
      typed("presente", "tu", false),
    ];
    expect(isOwned(mixed, "presente", "tu")).toBe(false);
  });

  it("never counts multiple-choice toward owned", () => {
    const mc = Array.from({ length: 7 }, () => ({
      tense: "presente",
      person: "yo",
      verb: "hablar",
      correct: true,
      typed: false,
      ts: 1,
    }));
    expect(isOwned(mc, "presente", "yo")).toBe(false);
    expect(cellState(mc, "presente", "yo")).toBe("visit");
    expect(cellState([], "presente", "yo")).toBe("empty");
  });
});

describe("round builder", () => {
  it("first pass is one item per default cell", () => {
    const items = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    expect(items).toHaveLength(10);
    const keys = items.map((item) => `${item.tense}:${item.person}`);
    expect(new Set(keys).size).toBe(10);
    const expected = cellsFor(DEFAULT_SETTINGS).map((cell) => `${cell.tense}:${cell.person}`);
    expect(keys.sort()).toEqual(expected.sort());
    expect(items.every((item) => item.expected)).toBe(true);
  });

  it("after a complete pass, overweights weak cells", () => {
    const cells = cellsFor(DEFAULT_SETTINGS);
    const attempts = cells.flatMap((cell) => [
      typed(cell.tense, cell.person, true),
      typed(cell.tense, cell.person, cell.person === "yo"),
    ]);
    const ownedYo = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    const all = [...attempts, ...ownedYo];
    const counts = {};
    for (let i = 0; i < 80; i += 1) {
      const items = buildRound(DEFAULT_SETTINGS, all, mulberry32(100 + i));
      for (const item of items) {
        const key = `${item.tense}:${item.person}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    expect(counts["presente:yo"]).toBeLessThan(counts["preterito:tu"]);
  });

  it("builds four MC options including the key", () => {
    const [item] = buildRound(DEFAULT_SETTINGS, [], mulberry32(3));
    const options = makeDistractors(item, mulberry32(3));
    expect(options).toHaveLength(4);
    expect(options).toContain(item.expected);
    expect(new Set(options).size).toBe(4);
  });
});
