import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { answersMatch } from "./check.js";
import {
  BOARD_NOTE,
  CONTENT_VERSION,
  DEFAULT_SETTINGS,
  FORM_COPY,
  MASTERY_MIN,
  MASTERY_NEED,
  MASTERY_WINDOW,
  MOODS,
  PERSONS,
  PIP_SLOTS,
  RECAP_HEAD,
  RECAP_SUB,
  TENSES,
  VERB_BUCKETS,
} from "./constants.js";
import { allSelectedKnown, formCopy, formState, youKnowThis } from "./mastery.js";
import {
  answeredCellKeys,
  cellKey,
  cellPips,
  cellsFor,
  columnLabels,
  commandPersons,
  itemsToCells,
  lastRoundResult,
  personLabel,
  recapCellTone,
  personsFor,
  recapStillNotEnough,
  roundCellState,
  sameBoard,
  typedPips,
} from "./board.js";
import { explainMiss } from "./miss.js";
import { atlasCopyAt, atlasFillName, atlasFillStats, buildAtlas } from "./progress.js";
import { recapStory } from "./recap.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { clearProgress, toLogAttempt } from "./storage.js";
import {
  conjugate,
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
  it("requires accents and still allows an optional pronoun", () => {
    expect(answersMatch("estás", "estas")).toBe(false);
    expect(answersMatch("estás", "estás")).toBe(true);
    expect(answersMatch("hablé", "hable")).toBe(false);
    expect(answersMatch("hablé", "hablé")).toBe(true);
    expect(answersMatch("hablé", " yo  Hablé ")).toBe(true);
    expect(answersMatch("comí", "comi")).toBe(false);
    expect(answersMatch("sé", "se")).toBe(false);
    expect(answersMatch("sé", "sé")).toBe(true);
    expect(answersMatch("hablo", "hablas")).toBe(false);
    expect(answersMatch("hablo", "")).toBe(false);
  });
});

describe("miss feedback names the miss", () => {
  it("calls missing accent and extra s, not a generic incorrect", () => {
    expect(explainMiss("estás", "estas")).toMatchObject({
      kind: "accent",
      message: "Missing the accent",
    });
    expect(explainMiss("hablé", "hable")).toMatchObject({ message: "Missing the accent" });
    expect(explainMiss("aprendí", "aprendi")).toMatchObject({ message: "Missing the accent" });
    expect(explainMiss("hablaste", "hablastes")).toMatchObject({
      kind: "extra_s",
      message: "Extra s",
    });
    expect(explainMiss("ayudaste", "ayudastes").message).toBe("Extra s");
    expect(explainMiss("hablo", "")).toMatchObject({ message: "Type a form" });
    expect(explainMiss("hablo", "hablas").message).not.toMatch(/incorrect|wrong/i);
    expect(explainMiss("hablo", "hablo")).toBe(null);
  });

  it("names the person or time when that is the miss", () => {
    const yoPreterite = { verb: "hablar", tense: "preterito", person: "yo" };
    expect(explainMiss("hablé", "hablaste", yoPreterite)).toMatchObject({
      kind: "person",
      message: "That's tú",
    });
    expect(explainMiss("hablé", "hablaba", yoPreterite)).toMatchObject({
      kind: "time",
      message: "Pretérito, not Imperfecto",
    });
    expect(explainMiss("hablé", "hablaste", yoPreterite).message).not.toMatch(/incorrect|shame/i);
  });
});

describe("visual tokens", () => {
  it("names visit, owned, and motion for a later iOS port", () => {
    const tokens = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../tokens.css"),
      "utf8",
    );
    expect(tokens).toMatch(/--color-visit/);
    expect(tokens).toMatch(/--color-owned/);
    expect(tokens).toMatch(/--color-empty/);
    expect(tokens).toMatch(/--motion-visit/);
    expect(tokens).toMatch(/--type-display/);
    expect(tokens).not.toMatch(/xp|streak|loot/i);
    const home = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/Home.jsx"),
      "utf8",
    );
    expect(home).toMatch(/Tweak/);
    expect(home).toMatch(/finishedRound/);
  });
});

describe("content pack stays out of the quiz shell", () => {
  it("keeps Spanish literals in the pack, not the loop or screens", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const shell = [
      "App.jsx",
      "components/Play.jsx",
      "components/Board.jsx",
      "components/Home.jsx",
      "components/Progress.jsx",
      "components/Customize.jsx",
      "engine/round.js",
      "engine/check.js",
      "engine/miss.js",
      "engine/board.js",
      "engine/progress.js",
      "engine/mastery.js",
      "engine/storage.js",
    ].map((file) => readFileSync(join(root, file), "utf8")).join("\n");
    expect(shell).not.toMatch(/[áéíóúüñ]/);
    expect(shell).not.toMatch(/hablar|Pretérito|estás|hablaste/);
    expect(shell).not.toMatch(/presente|preterito|mandato_/);
  });
});

describe("subject labels", () => {
  it("uses full subject pronouns, never nos for nosotros or vos for vosotros", () => {
    expect(PERSONS.map((person) => person.label)).toEqual([
      "yo",
      "tú",
      "vos",
      "él / ella / usted",
      "nosotros",
      "vosotros",
      "ellos / ellas / ustedes",
    ]);
    expect(PERSONS.some((person) => person.label === "nos")).toBe(false);
    expect(PERSONS.some((person) => person.label === "tu")).toBe(false);
    expect(PERSONS.some((person) => person.label === "el")).toBe(false);
    expect(personLabel("nos")).toBe("nosotros");
    expect(personLabel("tu")).toBe("tú");
    expect(personLabel("el")).toBe("él / ella / usted");
    expect(personLabel("ellos")).toBe("ellos / ellas / ustedes");
    expect(personLabel("vos")).toBe("vos");
    expect(personLabel("vosotros")).toBe("vosotros");
  });

  it("keeps Spanish teacher time names and no Pret./Imp./Subj. abbreviations", () => {
    const labels = [
      ...TENSES.flatMap((tense) => [tense.label, tense.boardLabel]),
      ...MOODS.map((mood) => mood.label),
    ].join(" ");
    expect(labels).toMatch(/Pretérito/);
    expect(labels).not.toMatch(/Pret\.|Imp\.|Subj\.|1sg|simple past|\bimperative\b/i);
    expect(MOODS.map((mood) => mood.id)).toEqual(["indicative", "subjunctive", "commands"]);
    expect(TENSES.filter((tense) => tense.mood === "commands").map((tense) => tense.time)).toEqual([
      "affirmative",
      "negative",
    ]);
  });
});

describe("pedagogy freeze", () => {
  const studentCopy = [
    ...PERSONS.map((person) => person.label),
    ...TENSES.flatMap((tense) => [tense.label, tense.boardLabel]),
    ...MOODS.map((mood) => mood.label),
  ].join(" · ");

  it("never shows nos, tu, or el as the student label", () => {
    expect(studentCopy.split(" · ")).not.toContain("nos");
    expect(studentCopy.split(" · ")).not.toContain("tu");
    expect(studentCopy.split(" · ")).not.toContain("el");
    expect(personLabel("nos")).toBe("nosotros");
    expect(personLabel("vosotros")).toBe("vosotros");
    expect(personLabel("tu")).toBe("tú");
    expect(personLabel("el")).toBe("él / ella / usted");
  });

  it("keeps él / ella / usted and ellos / ellas / ustedes readable", () => {
    expect(personLabel("el")).toBe("él / ella / usted");
    expect(personLabel("ellos")).toBe("ellos / ellas / ustedes");
  });

  it("uses Spanish time names and bans English I/you/he, 1sg, and Pret./Imp./Subj.", () => {
    expect(studentCopy).toMatch(/Pretérito/);
    expect(studentCopy).not.toMatch(/\bpast\b|\bsimple past\b/i);
    expect(studentCopy).not.toMatch(/\bI\b|\byou\b|\bhe\b|1sg|Pret\.|Imp\.|Subj\./);
    expect(TENSES.every((tense) => tense.mood !== "subjunctive" || tense.time !== "subjunctive")).toBe(
      true,
    );
  });

  it("treats Subjunctive as a mood and Commands as Commands, never an imperative tense", () => {
    expect(MOODS.map((mood) => mood.label)).toEqual(["Indicative", "Subjunctive", "Commands"]);
    expect(studentCopy).not.toMatch(/\bimperative\b/i);
    expect(TENSES.filter((tense) => tense.mood === "subjunctive").map((tense) => tense.time)).toEqual([
      "presente",
      "imperfecto",
    ]);
    expect(TENSES.filter((tense) => tense.mood === "commands").map((tense) => tense.label)).toEqual([
      "Afirmativo",
      "Negativo",
    ]);
    const customize = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/Customize.jsx"),
      "utf8",
    );
    expect(customize).not.toMatch(/<legend>Times<\/legend>/);
    expect(customize).not.toMatch(/imperative/i);
  });

  it("keeps imperfect subjunctive on -ra only, with no -se picker", () => {
    const persons = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"];
    const forms = persons.map((person) => conjugate("hablar", "subjuntivo_imp", person));
    expect(forms).toEqual([
      "hablara",
      "hablaras",
      "hablaras",
      "hablara",
      "habláramos",
      "hablarais",
      "hablaran",
    ]);
    expect(forms.join(" ")).not.toMatch(/se\b/);
    expect(answersMatch("hablara", "hablase")).toBe(false);
    expect(studentCopy).not.toMatch(/-se|hablase|ra vs se/i);
    expect(TENSES.filter((tense) => tense.id === "subjuntivo_imp")).toHaveLength(1);
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

  it("lights every answered cell this round, right or wrong", () => {
    const items = [
      { tense: "presente", person: "yo", correct: true },
      { tense: "presente", person: "tu", correct: false },
    ];
    const keys = answeredCellKeys(items);
    expect(keys.has("presente:yo")).toBe(true);
    expect(keys.has("presente:tu")).toBe(true);
    expect(roundCellState("presente", "tu", null, keys)).toBe("answered");
    expect(BOARD_NOTE).toBe(
      "This board is this round. A square fills when you answer. Right or wrong shows on what you typed.",
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

describe("recap hero", () => {
  it("keeps this-round lights and shows one pip after round 1", () => {
    const items = [
      { tense: "presente", person: "yo", correct: true },
      { tense: "presente", person: "tu", correct: false },
    ];
    const attempts = [typed("presente", "yo", true), typed("presente", "tu", false)];
    expect(lastRoundResult(items, "presente", "yo")).toBe(true);
    expect(lastRoundResult(items, "presente", "tu")).toBe(false);
    expect(recapCellTone(items, "presente", "yo")).toBe("hit");
    expect(recapCellTone(items, "presente", "tu")).toBe("miss");
    expect(typedPips(attempts, "presente", "yo")).toBe(1);
    expect(cellPips(attempts, "presente", "el")).toBe(0);
    expect(PIP_SLOTS).toBe(5);
    expect(recapStillNotEnough(attempts, items)).toBe(true);
    expect(formCopy(attempts, spec())).toBe("not enough yet");
  });

  it("tells the teacher what the first 2×5 means", () => {
    expect(RECAP_HEAD).toBe("You lit the board.");
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const story = recapStory(first, attempts);
    expect(story.line).toBe(RECAP_SUB);
    expect(story.line).toMatch(/not enough yet/);
    expect(story.line).toMatch(/5 of last 7 typed/);
    expect(story.action).toBe("again");
    expect(story.line).not.toMatch(/xp|streak|loot/i);
  });

  it("names a cell that changed state and gives one next action", () => {
    const prior = Array.from({ length: 4 }, () => typed("presente", "yo", false));
    const item = {
      tense: "presente",
      person: "yo",
      mood: "indicative",
      time: "presente",
      type: "regular",
      ending_pattern: "ar",
    };
    const after = [...prior, typed("presente", "yo", true)];
    expect(formState(after, spec())).toBe("learning");
    const story = recapStory([item], after);
    expect(story.line).toMatch(/Presente · yo/);
    expect(story.line).toMatch(/still learning/);
    expect(story.next).toBe("Play those squares again.");
    expect(story.action).toBe("again");
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

  it("shows fill chrome as known over opened on the open region", () => {
    const one = [typed("presente", "yo", true, { verb: "hablar" })];
    const stats = atlasFillStats(one, { mood: "indicative", type: "regular", ending: "ar" });
    expect(stats.name).toBe("Indicative · Regulars · -ar");
    expect(stats.known).toBe(0);
    expect(stats.opened).toBe(1);
    expect(stats.line).toBe("0/1 you know this");
    const known = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    expect(atlasFillStats(known, { mood: "indicative", type: "regular", ending: "ar" }).line).toBe(
      "1/1 you know this",
    );
    const rows = buildAtlas(one, { mood: "indicative", type: "regular", ending: "ar" });
    const yo = rows[0].cells.find((cell) => cell.person === "yo");
    expect(yo.opened).toBe(true);
    expect(yo.state).toBe("not_enough");
    expect(rows[0].cells.find((cell) => cell.person === "tu").opened).toBe(false);
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
    expect(personsFor(DEFAULT_SETTINGS, "mandato_af")).toEqual(["tu", "el", "nos", "ellos"]);
    expect(personsFor({ ...DEFAULT_SETTINGS, address: "vos" }, "mandato_neg")).toEqual([
      "vos",
      "el",
      "nos",
      "ellos",
    ]);
    expect(
      personsFor({ ...DEFAULT_SETTINGS, address: "both", vosotros: true }, "mandato_af"),
    ).toEqual(["tu", "vos", "el", "nos", "vosotros", "ellos"]);
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

describe("clear progress", () => {
  it("wipes the atlas log and keeps settings", () => {
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    const state = {
      settings: { ...DEFAULT_SETTINGS, types: ["stem"] },
      attempts: [typed("presente", "yo", true)],
      finishedRound: true,
    };
    const next = clearProgress(state);
    expect(next.attempts).toEqual([]);
    expect(next.finishedRound).toBe(true);
    expect(next.settings.types).toEqual(["stem"]);
    expect(youKnowThis(next.attempts, spec())).toBe(false);
    expect(formCopy(next.attempts, spec())).toBe("not enough yet");
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

  it("does not stuff retries into the first complete pass", () => {
    const presenteOnly = { ...DEFAULT_SETTINGS, tenses: ["presente"] };
    const items = buildRound(presenteOnly, [], mulberry32(4));
    expect(items).toHaveLength(5);
    expect(new Set(items.map((item) => `${item.tense}:${item.person}`)).size).toBe(5);
  });

  it("cannot mint you know this from a first complete pass", () => {
    const items = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const attempts = items.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    for (const item of items) {
      expect(
        formCopy(attempts, {
          mood: item.mood,
          time: item.time,
          person: item.person,
          type: item.type,
          ending: item.ending_pattern,
        }),
      ).toBe("not enough yet");
    }
  });

  it("credits only the prompted cell, never a contrast neighbor", () => {
    const yoPreterite = Array.from({ length: 5 }, () =>
      typed("preterito", "yo", true, { verb: "hablar" }),
    );
    expect(
      formCopy(yoPreterite, spec({ time: "preterito", person: "yo" })),
    ).toBe("you know this");
    expect(formCopy(yoPreterite, spec({ time: "preterito", person: "tu" }))).toBe("not enough yet");
    expect(formCopy(yoPreterite, spec({ time: "presente", person: "yo" }))).toBe("not enough yet");
  });

  it("uses the last-7 window only, with no calendar rust", () => {
    const old = Array.from({ length: 5 }, (_, i) => ({
      ...typed("presente", "yo", true),
      ts: i + 1,
    }));
    expect(formCopy(old, spec())).toBe("you know this");
    const laterMisses = [
      ...old,
      ...Array.from({ length: 7 }, (_, i) => ({
        ...typed("presente", "yo", false),
        ts: 1_000 + i,
      })),
    ];
    expect(formCopy(laterMisses, spec())).toBe("still learning");
  });

  it("refuses a customize set that only farms known present regulars", () => {
    const presentRegulars = { ...DEFAULT_SETTINGS, tenses: ["presente"] };
    const cells = cellsFor(presentRegulars);
    const known = cells.flatMap((cell) => [
      ...Array.from({ length: 5 }, () => typed(cell.tense, cell.person, true, { verb: "hablar" })),
      ...Array.from({ length: 5 }, () => typed(cell.tense, cell.person, true, { verb: "comer" })),
    ]);
    expect(allSelectedKnown(presentRegulars, known)).toBe(true);
    expect(allSelectedKnown(DEFAULT_SETTINGS, known)).toBe(false);
    expect(buildRound(presentRegulars, known, mulberry32(1))).toEqual([]);
  });

  it("after a complete pass, overweights weak cells on a bigger board", () => {
    const wide = { ...DEFAULT_SETTINGS, tenses: ["presente", "preterito", "imperfecto"] };
    const cells = cellsFor(wide);
    const attempts = cells.flatMap((cell) => [
      typed(cell.tense, cell.person, true),
      typed(cell.tense, cell.person, cell.person === "yo"),
    ]);
    const knownYo = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    const all = [...attempts, ...knownYo];
    const counts = {};
    for (let i = 0; i < 80; i += 1) {
      const items = buildRound(wide, all, mulberry32(100 + i));
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

  it("replays the same 10 cells so recap pips can move", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    expect(first).toHaveLength(10);
    const cells = itemsToCells(first);
    expect(sameBoard(cells, DEFAULT_SETTINGS)).toBe(true);
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    for (const item of first) {
      expect(cellPips(attempts, item.tense, item.person)).toBe(1);
    }
    const second = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(11), 10, cells);
    expect(second.map(cellKey).sort()).toEqual(cells.map(cellKey).sort());
    const after = [
      ...attempts,
      ...second.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
    ];
    for (const item of first) {
      expect(cellPips(after, item.tense, item.person)).toBe(2);
      expect(cellPips(after, item.tense, item.person)).toBeGreaterThan(
        cellPips(attempts, item.tense, item.person),
      );
    }
  });
});

describe("teaching + UX freeze", () => {
  it("never paints know / still learning on the round board", () => {
    expect(roundCellState("presente", "yo", null, new Set(["presente:yo"]))).toBe("answered");
    expect(["empty", "now", "answered", "answered-now"]).toContain(
      roundCellState("presente", "yo", { tense: "presente", person: "yo" }, new Set()),
    );
    expect(BOARD_NOTE).toBe(
      "This board is this round. A square fills when you answer. Right or wrong shows on what you typed.",
    );
  });

  it("keeps commands off yo and uses the default four persons", () => {
    expect(personsFor(DEFAULT_SETTINGS, "mandato_af")).toEqual(["tu", "el", "nos", "ellos"]);
    expect(personsFor(DEFAULT_SETTINGS, "mandato_neg")).toEqual(["tu", "el", "nos", "ellos"]);
    expect(commandPersons(DEFAULT_SETTINGS)).toEqual(["tu", "el", "nos", "ellos"]);
    expect(commandPersons({ ...DEFAULT_SETTINGS, address: "vos" })).toEqual([
      "vos",
      "el",
      "nos",
      "ellos",
    ]);
    expect(commandPersons({ ...DEFAULT_SETTINGS, vosotros: true })).toEqual([
      "tu",
      "el",
      "nos",
      "vosotros",
      "ellos",
    ]);
    expect(TENSES.filter((tense) => tense.mood === "commands").map((tense) => tense.time)).toEqual([
      "affirmative",
      "negative",
    ]);
    expect(TENSES.filter((tense) => tense.mood === "subjunctive").map((tense) => tense.time)).not.toContain(
      "affirmative",
    );
  });

  it("uses last-7 only and cannot mint you-know-this in one pass", () => {
    expect(MASTERY_WINDOW).toBe(7);
    expect(MASTERY_NEED).toBe(5);
    expect(MASTERY_MIN).toBe(5);
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7)).map((item) =>
      typed(item.tense, item.person, true, { verb: item.verb }),
    );
    expect(first.every((attempt) => formCopy(first, {
      mood: "indicative",
      time: attempt.tense === "presente" ? "presente" : "preterito",
      person: attempt.person,
      type: "regular",
      ending: endingPattern(attempt.verb),
    }) === "not enough yet")).toBe(true);
  });

  it("after a complete pass, drops cells that are already you-know-this", () => {
    const visits = cellsFor(DEFAULT_SETTINGS).map((cell) => typed(cell.tense, cell.person, true));
    const knownPresenteYo = [
      ...Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" })),
      ...Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "comer" })),
    ];
    const items = buildRound(DEFAULT_SETTINGS, [...visits, ...knownPresenteYo], mulberry32(9));
    expect(items).toHaveLength(10);
    expect(items.every((item) => `${item.tense}:${item.person}` !== "presente:yo")).toBe(true);
  });

  it("names the atlas fill and keeps three states, no points", () => {
    expect(atlasFillName("indicative", "regular", "ar")).toBe("Indicative · Regulars · -ar");
    expect(FORM_COPY).toEqual({
      not_enough: "not enough yet",
      learning: "still learning",
      know: "you know this",
    });
    const chrome = `${BOARD_NOTE} ${RECAP_HEAD} ${RECAP_SUB} ${Object.values(FORM_COPY).join(" ")}`;
    expect(chrome).not.toMatch(/xp|streak|loot|points|\bscore\b/i);
    expect(PERSONS.map((person) => person.label)).toEqual([
      "yo",
      "tú",
      "vos",
      "él / ella / usted",
      "nosotros",
      "vosotros",
      "ellos / ellas / ustedes",
    ]);
    const defaultCols = columnLabels(DEFAULT_SETTINGS).map((column) => column.label);
    expect(defaultCols).toEqual([
      "yo",
      "tú",
      "él / ella / usted",
      "nosotros",
      "ellos / ellas / ustedes",
    ]);
    expect(defaultCols.at(-1)).not.toBe("ustedes");
  });
});
