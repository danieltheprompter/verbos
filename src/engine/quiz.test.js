import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import {
  ATLAS_LABEL,
  CONTENT_VERSION,
  DEFAULT_SETTINGS,
  VERB_BUCKETS,
} from "./constants.js";
import {
  atlasCellState,
  atlasLabel,
  cellKey,
  isOwned,
  roundCellState,
  sliceState,
} from "./mastery.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { cellsFor, personsFor } from "./board.js";
import { toLogAttempt } from "./storage.js";
import { parseCustomList, verbFamily, verbType, verbsForSettings } from "./verbs.js";
import { atlasGrid } from "./progress.js";

function typed(tense, person, correct, extra = {}) {
  const verb = extra.verb || "hablar";
  return {
    tense,
    person,
    verb,
    type: extra.type || verbType(verb),
    family: extra.family || verbFamily(verb),
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
  it("keys tense × person × verb type × -ar vs -er/-ir after 5 of last 7 typed, min 5", () => {
    expect(cellKey("presente", "yo", "regular", "ar")).toBe("presente:yo:regular:ar");
    const four = Array.from({ length: 4 }, () => typed("presente", "yo", true));
    expect(isOwned(four, "presente", "yo", "regular", "ar")).toBe(false);
    const five = [...four, typed("presente", "yo", true)];
    expect(isOwned(five, "presente", "yo", "regular", "ar")).toBe(true);
    expect(isOwned(five, "presente", "yo", "regular", "er_ir")).toBe(false);
  });

  it("keeps regular and stem-changer as different cells at the same tense and person", () => {
    const regulars = Array.from({ length: 5 }, () =>
      typed("presente", "yo", true, { verb: "hablar" }),
    );
    const stems = Array.from({ length: 5 }, () =>
      typed("presente", "yo", true, { verb: "pensar" }),
    );
    expect(isOwned(regulars, "presente", "yo", "regular", "ar")).toBe(true);
    expect(isOwned(regulars, "presente", "yo", "stem", "ar")).toBe(false);
    expect(isOwned(stems, "presente", "yo", "stem", "ar")).toBe(true);
    expect(isOwned(stems, "presente", "yo", "regular", "ar")).toBe(false);
  });

  it("does not let -ar share ownership with -er / -ir at the same type", () => {
    const ar = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    const er = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "comer" }));
    expect(isOwned(ar, "presente", "yo", "regular", "ar")).toBe(true);
    expect(isOwned(ar, "presente", "yo", "regular", "er_ir")).toBe(false);
    expect(isOwned(er, "presente", "yo", "regular", "er_ir")).toBe(true);
    expect(isOwned(er, "presente", "yo", "regular", "ar")).toBe(false);
  });

  it("does not let regular tú share ownership with vos", () => {
    const tu = Array.from({ length: 5 }, () => typed("presente", "tu", true, { verb: "hablar" }));
    expect(isOwned(tu, "presente", "tu", "regular", "ar")).toBe(true);
    expect(isOwned(tu, "presente", "vos", "regular", "ar")).toBe(false);
    const vos = Array.from({ length: 5 }, () => typed("presente", "vos", true, { verb: "hablar" }));
    expect(isOwned(vos, "presente", "vos", "regular", "ar")).toBe(true);
    expect(isOwned(vos, "presente", "tu", "regular", "ar")).toBe(false);
  });

  it("never counts multiple-choice toward knowing a cell", () => {
    const mc = Array.from({ length: 7 }, () => ({
      tense: "presente",
      person: "yo",
      verb: "hablar",
      type: "regular",
      family: "ar",
      correct: true,
      typed: false,
      ts: 1,
    }));
    expect(isOwned(mc, "presente", "yo", "regular", "ar")).toBe(false);
    expect(sliceState(mc, "presente", "yo", "regular", "ar")).toBe("not_enough");
  });

  it("classifies the four named buckets and ending families", () => {
    expect(VERB_BUCKETS.map((bucket) => bucket.id)).toEqual([
      "regular",
      "irregular",
      "stem",
      "spelling",
    ]);
    expect(verbType("hablar")).toBe("regular");
    expect(verbType("ser")).toBe("irregular");
    expect(verbType("pensar")).toBe("stem");
    expect(verbType("buscar")).toBe("spelling");
    expect(verbFamily("hablar")).toBe("ar");
    expect(verbFamily("comer")).toBe("er_ir");
    expect(verbFamily("vivir")).toBe("er_ir");
    expect(verbFamily("oír")).toBe("er_ir");
  });

  it("selects named buckets independently, without lumping stem and spelling", () => {
    const regulars = verbsForSettings(DEFAULT_SETTINGS);
    expect(regulars.every((verb) => verb.type === "regular")).toBe(true);
    const spelling = verbsForSettings({ ...DEFAULT_SETTINGS, buckets: ["spelling"] });
    expect(spelling.length).toBeGreaterThan(0);
    expect(spelling.every((verb) => verb.type === "spelling")).toBe(true);
    const stem = verbsForSettings({ ...DEFAULT_SETTINGS, buckets: ["stem"] });
    expect(stem.every((verb) => verb.type === "stem")).toBe(true);
    expect(stem.some((verb) => verb.inf === "pensar")).toBe(true);
    expect(stem.some((verb) => verb.inf === "buscar")).toBe(false);
  });
});

describe("this-round board", () => {
  it("paints only this round’s fills and the active cell", () => {
    const fills = [{ tense: "presente", person: "yo" }];
    const current = { tense: "presente", person: "tu" };
    expect(roundCellState(fills, current, "presente", "yo")).toBe("fill");
    expect(roundCellState(fills, current, "presente", "tu")).toBe("now");
    expect(roundCellState(fills, current, "preterito", "yo")).toBe("empty");
    const owned = Array.from({ length: 5 }, () => typed("preterito", "el", true));
    expect(roundCellState(fills, current, "preterito", "el")).toBe("empty");
    expect(isOwned(owned, "preterito", "el", "regular", "ar")).toBe(true);
  });
});

describe("atlas", () => {
  it("uses only not enough yet / still learning / you know this", () => {
    expect(atlasLabel("not_enough")).toBe("not enough yet");
    expect(atlasLabel("learning")).toBe("still learning");
    expect(atlasLabel("know")).toBe("you know this");
    expect(Object.values(ATLAS_LABEL)).toEqual([
      "not enough yet",
      "still learning",
      "you know this",
    ]);
  });

  it("filters kind of verb and -ar vs -er/-ir as real slices", () => {
    const arKnow = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    const erLearn = [
      typed("presente", "yo", false, { verb: "comer" }),
      typed("presente", "yo", false, { verb: "comer" }),
      typed("presente", "yo", true, { verb: "comer" }),
      typed("presente", "yo", true, { verb: "comer" }),
      typed("presente", "yo", true, { verb: "comer" }),
    ];
    const attempts = [...arKnow, ...erLearn];
    expect(atlasCellState(attempts, "presente", "yo", { type: "regular", family: "ar" })).toBe(
      "know",
    );
    expect(atlasCellState(attempts, "presente", "yo", { type: "regular", family: "er_ir" })).toBe(
      "learning",
    );
    expect(atlasCellState(attempts, "presente", "yo")).toBe("learning");
    expect(atlasCellState(attempts, "presente", "yo", { type: "stem" })).toBe("not_enough");
    const grid = atlasGrid(attempts, "indicative", { type: "regular", family: "ar" });
    const presenteYo = grid.rows
      .find((row) => row.id === "presente")
      .cells.find((cell) => cell.person === "yo");
    expect(presenteYo.label).toBe("you know this");
    expect(atlasGrid([], "commands").columns.every((column) => column.id !== "yo")).toBe(true);
  });
});

describe("attempt log", () => {
  it("stores POST-ready fields including family so the atlas filter is real", () => {
    const stem = toLogAttempt({
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
    expect(stem).toMatchObject({
      attempt_id: "att_test",
      tense: "presente",
      person: "yo",
      verb: "pensar",
      verb_type: "stem",
      type: "stem",
      family: "ar",
      expected: "pienso",
      given: "pienso",
      correct: true,
      typed: true,
      latency_ms: 842,
      content_version: CONTENT_VERSION,
    });
    expect(stem.ts).toEqual(expect.any(Number));
    expect(toLogAttempt({ verb: "comer", tense: "presente", person: "yo" }).family).toBe("er_ir");
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
    expect(items.every((item) => item.family === "ar" || item.family === "er_ir")).toBe(true);
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
