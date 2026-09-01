import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import {
  CONTENT_VERSION,
  DEFAULT_SETTINGS,
  POOL,
  STATE_LABEL,
  TYPE_LINE_BUCKETS,
  typesInPool,
} from "./constants.js";
import { isOwned, toyCellState, typeReadout } from "./mastery.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { cellsFor, personsFor } from "./board.js";
import { toLogAttempt } from "./storage.js";
import { isSingleTypePool, parseCustomList, verbType, verbsForSettings } from "./verbs.js";
import { progressReport } from "./progress.js";

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

  it("keeps regular and stem-changer as different cells at the same tense and person", () => {
    const regulars = Array.from({ length: 5 }, () =>
      typed("presente", "yo", true, { verb: "hablar" }),
    );
    const stems = Array.from({ length: 5 }, () =>
      typed("presente", "yo", true, { verb: "pensar" }),
    );
    expect(isOwned(regulars, "presente", "yo", "regular")).toBe(true);
    expect(isOwned(regulars, "presente", "yo", "stem")).toBe(false);
    expect(isOwned(stems, "presente", "yo", "stem")).toBe(true);
    expect(isOwned(stems, "presente", "yo", "regular")).toBe(false);
    const split = [
      ...Array.from({ length: 3 }, () => typed("presente", "yo", true, { verb: "hablar" })),
      ...Array.from({ length: 3 }, () => typed("presente", "yo", true, { verb: "pensar" })),
    ];
    expect(isOwned(split, "presente", "yo", "regular")).toBe(false);
    expect(isOwned(split, "presente", "yo", "stem")).toBe(false);
  });

  it("does not let regular tú share ownership with vos", () => {
    const tu = Array.from({ length: 5 }, () => typed("presente", "tu", true, { verb: "hablar" }));
    expect(isOwned(tu, "presente", "tu", "regular")).toBe(true);
    expect(isOwned(tu, "presente", "vos", "regular")).toBe(false);
    const vos = Array.from({ length: 5 }, () => typed("presente", "vos", true, { verb: "hablar" }));
    expect(isOwned(vos, "presente", "vos", "regular")).toBe(true);
    expect(isOwned(vos, "presente", "tu", "regular")).toBe(false);
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

  it("mixed-pool readout is four buckets with visit vs owned, hidden on first play", () => {
    expect(isSingleTypePool(DEFAULT_SETTINGS)).toBe(true);
    expect(isSingleTypePool({ pool: POOL.IRREGULARS })).toBe(false);
    expect(TYPE_LINE_BUCKETS).toEqual(["regular", "irregular", "stem", "spelling"]);
    const cells = cellsFor(DEFAULT_SETTINGS);
    const regularOwned = cells.flatMap((cell) =>
      Array.from({ length: 5 }, () => typed(cell.tense, cell.person, true, { verb: "hablar" })),
    );
    const stemVisit = [typed("presente", "yo", false, { verb: "pensar" })];
    const rows = typeReadout([...regularOwned, ...stemVisit], TYPE_LINE_BUCKETS, cells);
    expect(rows.map((row) => row.label)).toEqual([
      "regulars",
      "common irregulars",
      "stem-changers",
      "spelling",
    ]);
    expect(rows.find((row) => row.id === "regular")).toMatchObject({ visits: 10, owned: 10 });
    expect(rows.find((row) => row.id === "stem")).toMatchObject({ visits: 1, owned: 0 });
    expect(rows.find((row) => row.id === "irregular")).toMatchObject({ visits: 0, owned: 0 });
    expect(rows.find((row) => row.id === "spelling")).toMatchObject({ visits: 0, owned: 0 });
  });
});

describe("attempt log", () => {
  it("stores POST-ready fields without a user API", () => {
    const entry = toLogAttempt({
      attempt_id: "att_test",
      tense: "presente",
      person: "yo",
      verb: "pensar",
      expected: "pienso",
      given: "pienso",
      correct: true,
      typed: true,
      latency_ms: 842.2,
    });
    expect(entry).toMatchObject({
      attempt_id: "att_test",
      tense: "presente",
      person: "yo",
      verb: "pensar",
      verb_type: "stem",
      type: "stem",
      expected: "pienso",
      given: "pienso",
      correct: true,
      typed: true,
      latency_ms: 842,
      content_version: CONTENT_VERSION,
    });
    expect(entry.ts).toEqual(expect.any(Number));
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

  it("lets both tú and vos appear as separate persons", () => {
    const both = { ...DEFAULT_SETTINGS, address: "both" };
    expect(personsFor(both, "presente")).toEqual(["yo", "tu", "vos", "el", "nos", "ellos"]);
    expect(personsFor({ ...DEFAULT_SETTINGS, address: "vos" }, "presente")).toEqual([
      "yo",
      "vos",
      "el",
      "nos",
      "ellos",
    ]);
    expect(personsFor(DEFAULT_SETTINGS, "mandato_af")).not.toContain("yo");
  });

  it("uses a custom infinitive list as the verb set", () => {
    expect(parseCustomList("hablar, ser\npedir").map((verb) => verb.inf)).toEqual([
      "hablar",
      "ser",
      "pedir",
    ]);
    const items = buildRound(
      { ...DEFAULT_SETTINGS, customList: "hablar" },
      [],
      mulberry32(2),
    );
    expect(items.every((item) => item.verb === "hablar")).toBe(true);
    expect(verbsForSettings({ ...DEFAULT_SETTINGS, customList: "xyz" }).length).toBeGreaterThan(1);
  });
});

describe("progress language", () => {
  it("uses practiced and mastered, not visit or owned", () => {
    expect(STATE_LABEL.visit).toBe("practiced");
    expect(STATE_LABEL.owned).toBe("mastered");
    const attempts = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    const report = progressReport(attempts);
    expect(report.tenses[0].rows[0].label).toBe("mastered");
    const labels = [
      ...report.tenses.flatMap((group) => group.rows.map((row) => row.label)),
      ...report.persons.map((row) => row.label),
      ...report.types.map((row) => row.label),
    ];
    expect(labels.every((label) => label === "practiced" || label === "mastered")).toBe(true);
  });
});
