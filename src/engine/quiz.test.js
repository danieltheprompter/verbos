import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import { DEFAULT_SETTINGS, POOL, typesInPool } from "./constants.js";
import { isOwned, toyCellState, typeReadout } from "./mastery.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { cellsFor } from "./board.js";
import { verbType } from "./verbs.js";

function typed(tense, person, correct, extra = {}) {
  return {
    tense,
    person,
    verb: extra.verb || "hablar",
    type: extra.type || verbType(extra.verb || "hablar"),
    correct,
    typed: true,
    ts: 1,
  };
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

describe("mastery key", () => {
  it("owns tense × person × verb type only after 5 of last 7 typed, min 5", () => {
    const four = Array.from({ length: 4 }, () => typed("presente", "yo", true));
    expect(isOwned(four, "presente", "yo", "regular")).toBe(false);
    const five = [...four, typed("presente", "yo", true)];
    expect(isOwned(five, "presente", "yo", "regular")).toBe(true);
  });

  it("does not let regular tú paint vos or another type", () => {
    const tu = Array.from({ length: 5 }, () => typed("presente", "tu", true, { verb: "hablar" }));
    expect(isOwned(tu, "presente", "tu", "regular")).toBe(true);
    expect(isOwned(tu, "presente", "vos", "regular")).toBe(false);
    expect(isOwned(tu, "presente", "tu", "stem")).toBe(false);
    expect(isOwned(tu, "presente", "tu", "irregular")).toBe(false);
  });

  it("never counts multiple-choice toward owned", () => {
    const mc = Array.from({ length: 7 }, () => ({
      tense: "presente",
      person: "yo",
      verb: "hablar",
      type: "regular",
      correct: true,
      typed: false,
      ts: 1,
    }));
    expect(isOwned(mc, "presente", "yo", "regular")).toBe(false);
    expect(toyCellState(mc, "presente", "yo")).toBe("visit");
    expect(toyCellState([], "presente", "yo")).toBe("empty");
  });

  it("paints owned on the toy board only for a single-type pool", () => {
    const owned = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    expect(
      toyCellState(owned, "presente", "yo", { paintOwned: true, type: "regular" }),
    ).toBe("owned");
    expect(
      toyCellState(owned, "presente", "yo", { paintOwned: false, type: "regular" }),
    ).toBe("visit");
  });

  it("classifies the four type buckets", () => {
    expect(verbType("hablar")).toBe("regular");
    expect(verbType("ser")).toBe("irregular");
    expect(verbType("pensar")).toBe("stem");
    expect(verbType("buscar")).toBe("spelling");
    expect(typesInPool(POOL.REGULARS)).toEqual(["regular"]);
    expect(typesInPool(POOL.IRREGULARS)).toEqual(["regular", "irregular"]);
    expect(typesInPool(POOL.STEM)).toEqual(["regular", "irregular", "stem", "spelling"]);
  });

  it("rolls four type buckets under the board for a mixed pool", () => {
    const cells = cellsFor(DEFAULT_SETTINGS);
    const regularOwned = cells.flatMap((cell) =>
      Array.from({ length: 5 }, () => typed(cell.tense, cell.person, true, { verb: "hablar" })),
    );
    const stemVisit = [typed("presente", "yo", false, { verb: "pensar" })];
    const rows = typeReadout(
      [...regularOwned, ...stemVisit],
      typesInPool(POOL.STEM),
      cells,
    );
    expect(rows.map((row) => row.label)).toEqual([
      "regulars",
      "high-freq irregulars",
      "stem-changers",
      "spelling",
    ]);
    expect(rows.find((row) => row.id === "regular").state).toBe("owned");
    expect(rows.find((row) => row.id === "stem").state).toBe("visit");
    expect(rows.find((row) => row.id === "irregular").state).toBe("empty");
    expect(rows.find((row) => row.id === "spelling").state).toBe("empty");
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
    expect(items.every((item) => item.expected && item.type === "regular")).toBe(true);
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
