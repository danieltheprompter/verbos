import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import {
  CONTENT_VERSION,
  DEFAULT_SETTINGS,
  FORM_COPY,
  VERB_BUCKETS,
} from "./constants.js";
import { formCopy, formState, youKnowThis } from "./mastery.js";
import { answeredCellKeys, cellsFor, personsFor, roundCellState } from "./board.js";
import { atlasCopyAt, buildAtlas } from "./progress.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { toLogAttempt } from "./storage.js";
import {
  endingPattern,
  parseCustomList,
  verbType,
  verbsForSettings,
  verbsInBucket,
} from "./verbs.js";

function spec(extra = {}) {
  return {
    mood: "indicative",
    time: "presente",
    person: "yo",
    type: "regular",
    ending: "ar",
    ...extra,
  };
}

function typed(tense, person, correct, extra = {}) {
  const verb = extra.verb || "hablar";
  return {
    tense,
    person,
    verb,
    type: extra.type || verbType(verb),
    ending_pattern: extra.ending_pattern || extra.ending || endingPattern(verb),
    correct,
    typed: extra.typed ?? true,
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

describe("round board ignores mastery", () => {
  it("paints only the current square and squares answered this round", () => {
    const mastered = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    expect(youKnowThis(mastered, spec())).toBe(true);
    expect(roundCellState("presente", "yo", null, new Set())).toBe("empty");
    expect(roundCellState("presente", "yo", { tense: "presente", person: "yo" }, new Set())).toBe(
      "now",
    );
    expect(
      roundCellState("presente", "yo", null, new Set(["presente:yo"])),
    ).toBe("answered");
    expect(
      roundCellState("presente", "yo", { tense: "presente", person: "yo" }, new Set(["presente:yo"])),
    ).toBe("answered-now");
    expect(roundCellState("preterito", "tu", { tense: "presente", person: "yo" }, new Set(["presente:yo"]))).toBe(
      "empty",
    );
  });

  it("does not treat lifetime attempts as this-round answers", () => {
    const history = [
      { tense: "presente", person: "yo", verb: "hablar", correct: true },
      { tense: "preterito", person: "tu", verb: "comer", correct: false },
    ];
    expect(answeredCellKeys(history).size).toBe(2);
    expect(answeredCellKeys([]).size).toBe(0);
    expect(answeredCellKeys([{ tense: "presente", person: "yo", verb: "hablar" }]).size).toBe(0);
  });
});

describe("atlas copy and ending filter", () => {
  it("uses not enough yet / still learning / you know this", () => {
    expect(FORM_COPY).toEqual({
      not_enough: "not enough yet",
      learning: "still learning",
      know: "you know this",
    });
    expect(formCopy([], spec())).toBe("not enough yet");
    expect(formState([], spec())).toBe("not_enough");

    const four = Array.from({ length: 4 }, () => typed("presente", "yo", true));
    expect(formCopy(four, spec())).toBe("not enough yet");

    const learning = [
      ...Array.from({ length: 3 }, () => typed("presente", "yo", true)),
      ...Array.from({ length: 4 }, () => typed("presente", "yo", false)),
    ];
    expect(formCopy(learning, spec())).toBe("still learning");

    const known = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    expect(formCopy(known, spec())).toBe("you know this");
  });

  it("filters -ar separately from -er / -ir", () => {
    const ar = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    expect(atlasCopyAt(ar, "indicative", "presente", "yo", "regular", "ar")).toBe("you know this");
    expect(atlasCopyAt(ar, "indicative", "presente", "yo", "regular", "er_ir")).toBe(
      "not enough yet",
    );
    const er = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "comer" }));
    expect(atlasCopyAt(er, "indicative", "presente", "yo", "regular", "er_ir")).toBe("you know this");
    expect(atlasCopyAt(er, "indicative", "presente", "yo", "regular", "ar")).toBe("not enough yet");
  });

  it("keeps regular and stem-changing as different keys at the same form", () => {
    const regulars = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    expect(youKnowThis(regulars, spec({ type: "regular", ending: "ar" }))).toBe(true);
    expect(youKnowThis(regulars, spec({ type: "stem", ending: "ar" }))).toBe(false);
  });

  it("keeps subjunctive as a mood and commands off that grid", () => {
    const subj = Array.from({ length: 5 }, () => typed("subjuntivo", "yo", true));
    expect(atlasCopyAt(subj, "subjunctive", "presente", "yo", "regular", "ar")).toBe("you know this");
    expect(atlasCopyAt(subj, "indicative", "presente", "yo", "regular", "ar")).toBe("not enough yet");
    const atlas = buildAtlas(subj, { mood: "commands", type: "regular", ending: "ar" });
    expect(atlas.map((row) => row.id)).toEqual(["affirmative", "negative"]);
    expect(atlas[0].cells.every((cell) => cell.person !== "yo")).toBe(true);
  });
});

describe("verb buckets and pick/paste", () => {
  it("ships four named buckets with examples", () => {
    expect(VERB_BUCKETS.map((bucket) => bucket.id)).toEqual([
      "regular",
      "irregular",
      "stem",
      "spelling",
    ]);
    expect(VERB_BUCKETS).toEqual([
      { id: "regular", label: "Regulars", examples: "hablar" },
      { id: "irregular", label: "High-frequency irregulars", examples: "ser, ir, tener" },
      { id: "stem", label: "Stem-changing", examples: "pensar, volver" },
      { id: "spelling", label: "Spelling-change", examples: "llegar, sacar" },
    ]);
    expect(verbsInBucket("regular").some((verb) => verb.inf === "hablar")).toBe(true);
    expect(verbsInBucket("irregular").map((verb) => verb.inf)).toEqual(
      expect.arrayContaining(["ser", "ir", "tener"]),
    );
    expect(verbsInBucket("stem").map((verb) => verb.inf)).toEqual(
      expect.arrayContaining(["pensar", "volver"]),
    );
    expect(verbsInBucket("spelling").map((verb) => verb.inf)).toEqual(
      expect.arrayContaining(["llegar", "sacar"]),
    );
    expect(verbsForSettings({ types: ["stem"] }).every((verb) => verb.type === "stem")).toBe(true);
    expect(verbsForSettings({ types: ["spelling"] }).some((verb) => verb.inf === "sacar")).toBe(true);
    expect(verbsForSettings({ types: ["stem"] }).some((verb) => verb.inf === "llegar")).toBe(false);
  });

  it("lets pick verbs and paste a list become the set", () => {
    expect(parseCustomList("hablar, ser\npedir").map((verb) => verb.inf)).toEqual([
      "hablar",
      "ser",
      "pedir",
    ]);
    const picked = verbsForSettings({ types: ["regular"], pickedVerbs: ["pensar", "sacar"] });
    expect(picked.map((verb) => verb.inf)).toEqual(["pensar", "sacar"]);
    const mixed = verbsForSettings({
      types: ["regular"],
      pickedVerbs: ["pensar"],
      customList: "ser, llegar",
    });
    expect(mixed.map((verb) => verb.inf)).toEqual(["pensar", "ser", "llegar"]);
    expect(verbsForSettings({ ...DEFAULT_SETTINGS, customList: "xyz" }).every((verb) => verb.type === "regular")).toBe(
      true,
    );
  });
});

describe("tú and vos stay separate", () => {
  it("does not let regular tú share knowing a form with vos", () => {
    const tu = Array.from({ length: 5 }, () => typed("presente", "tu", true, { verb: "hablar" }));
    expect(youKnowThis(tu, spec({ person: "tu" }))).toBe(true);
    expect(youKnowThis(tu, spec({ person: "vos" }))).toBe(false);
    const vos = Array.from({ length: 5 }, () => typed("presente", "vos", true, { verb: "hablar" }));
    expect(youKnowThis(vos, spec({ person: "vos" }))).toBe(true);
    expect(youKnowThis(vos, spec({ person: "tu" }))).toBe(false);
    expect(personsFor({ ...DEFAULT_SETTINGS, address: "both" }, "presente")).toEqual([
      "yo",
      "tu",
      "vos",
      "el",
      "nos",
      "ellos",
    ]);
    expect(personsFor({ ...DEFAULT_SETTINGS, address: "vos" }, "presente")).toEqual([
      "yo",
      "vos",
      "el",
      "nos",
      "ellos",
    ]);
    expect(personsFor(DEFAULT_SETTINGS, "mandato_af")).not.toContain("yo");
  });
});

describe("multiple choice never counts toward knowing a form", () => {
  it("ignores MC even after seven correct answers", () => {
    const mc = Array.from({ length: 7 }, () => ({
      tense: "presente",
      person: "yo",
      verb: "hablar",
      type: "regular",
      ending_pattern: "ar",
      correct: true,
      typed: false,
      ts: 1,
    }));
    expect(formCopy(mc, spec())).toBe("not enough yet");
    expect(youKnowThis(mc, spec())).toBe(false);
  });
});

describe("attempt log", () => {
  it("stores POST-ready fields including mood, time, and ending pattern", () => {
    const entry = toLogAttempt({
      attempt_id: "att_test",
      tense: "subjuntivo",
      person: "yo",
      verb: "pensar",
      expected: "piense",
      given: "piense",
      correct: true,
      typed: true,
      latency_ms: 842.2,
    });
    expect(entry).toMatchObject({
      attempt_id: "att_test",
      mood: "subjunctive",
      time: "presente",
      tense: "subjuntivo",
      person: "yo",
      verb: "pensar",
      verb_type: "stem",
      type: "stem",
      ending_pattern: "ar",
      expected: "piense",
      given: "piense",
      correct: true,
      typed: true,
      latency_ms: 842,
      content_version: CONTENT_VERSION,
    });
    expect(toLogAttempt({ tense: "mandato_af", person: "tu", verb: "comer" })).toMatchObject({
      mood: "commands",
      time: "affirmative",
      ending_pattern: "er_ir",
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
    expect(items.every((item) => item.mood === "indicative")).toBe(true);
    expect(items.every((item) => item.ending_pattern === "ar" || item.ending_pattern === "er_ir")).toBe(
      true,
    );
  });

  it("after a complete pass, overweights weak cells", () => {
    const cells = cellsFor(DEFAULT_SETTINGS);
    const attempts = cells.flatMap((cell) => [
      typed(cell.tense, cell.person, true),
      typed(cell.tense, cell.person, cell.person === "yo"),
    ]);
    const knownYo = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    const all = [...attempts, ...knownYo];
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

  it("uses a custom infinitive list as the verb set", () => {
    const items = buildRound(
      { ...DEFAULT_SETTINGS, customList: "hablar" },
      [],
      mulberry32(2),
    );
    expect(items.every((item) => item.verb === "hablar")).toBe(true);
  });
});
