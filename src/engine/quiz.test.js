import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { answersMatch, isBlankAnswer } from "./check.js";
import {
  BOARD_NOTE,
  CONTENT_VERSION,
  DEFAULT_PERSONS,
  DEFAULT_SETTINGS,
  FORM_COPY,
  LEVEL_FILL_TOTAL,
  MASTERY_MIN,
  MASTERY_NEED,
  MASTERY_WINDOW,
  MOODS,
  PERSONS,
  PIP_SLOTS,
  RANK_PATH,
  RECAP_BEAT_MS,
  RECAP_CLEAN,
  RECAP_HEAD,
  RECAP_SAME_TEN,
  RECAP_SUB,
  STORAGE_KEY,
  TENSES,
  VERB_BUCKETS,
  WORDMARK,
} from "./constants.js";
import {
  allSelectedKnown,
  formCopy,
  formState,
  itemFormKey,
  masteryWindow,
  parseFormKey,
  sittingCellMarks,
  sittingIncomplete,
  youKnowThis,
} from "./mastery.js";
import { namedLevels } from "./levels.js";
import {
  answeredCellKeys,
  cellKey,
  cellPips,
  cellsFor,
  columnLabels,
  columnPersons,
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
import { atlasCopyAt, atlasFillName, atlasFillStats, atlasRank, buildAtlas } from "./progress.js";
import { recapHitsToward, recapStory } from "./recap.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors } from "./round.js";
import { activeProfile, clearProgress, loadClassSet, loadState, rememberSitting, saveSettings, toLogAttempt } from "./storage.js";
import { classSetFromSettings } from "./classSet.js";
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

describe("blank submit", () => {
  it("does not count empty Check as a miss or a visit", () => {
    expect(isBlankAnswer("")).toBe(true);
    expect(isBlankAnswer("   ")).toBe(true);
    expect(isBlankAnswer("hablo")).toBe(false);
    expect(answeredCellKeys([{ tense: "presente", person: "yo", verb: "hablar" }]).size).toBe(0);
    expect(answeredCellKeys([{ tense: "presente", person: "yo", correct: false }]).size).toBe(1);
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
      other: "imperfecto",
    });
    expect(
      explainMiss("usamos", "uso", { verb: "usar", tense: "presente", person: "nos" }),
    ).toMatchObject({ kind: "person", message: "That's yo" });
    expect(
      explainMiss("esconden", "escondieron", {
        verb: "esconder",
        tense: "presente",
        person: "ellos",
      }),
    ).toMatchObject({ kind: "time", other: "preterito" });
    expect(
      explainMiss("temieron", "comieron", { verb: "temer", tense: "preterito", person: "ellos" }),
    ).toMatchObject({ kind: "stem" });
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
    expect(tokens).not.toMatch(/New map|RANK_PATH|Finding your feet/);
    const home = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/Home.jsx"),
      "utf8",
    );
    expect(home).toMatch(/Customize/);
    expect(home).toMatch(/finishedRound/);
  });
});

describe("content pack stays out of the quiz shell", () => {
  it("keeps language literals in the pack, not the loop, screens, or tokens", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const shell = [
      "App.jsx",
      "main.jsx",
      "components/Play.jsx",
      "components/Board.jsx",
      "components/Home.jsx",
      "components/Progress.jsx",
      "components/Customize.jsx",
      "components/ClearProgress.jsx",
      "components/Profile.jsx",
      "components/MiniBoard.jsx",
      "components/ClassSet.jsx",
      "engine/round.js",
      "engine/check.js",
      "engine/miss.js",
      "engine/board.js",
      "engine/progress.js",
      "engine/mastery.js",
      "engine/storage.js",
      "engine/classSet.js",
      "engine/levels.js",
      "engine/warmup.js",
      "engine/config.js",
      "engine/constants.js",
      "engine/recap.js",
      "engine/pack.js",
      "tokens.css",
      "tokens.md",
      "styles.css",
    ].map((file) => readFileSync(join(root, file), "utf8")).join("\n");
    expect(shell).not.toMatch(/[áéíóúüñ]/);
    expect(shell).not.toMatch(/hablar|Pretérito|estás|hablaste/);
    expect(shell).not.toMatch(/presente|preterito|mandato_/);
    expect(shell).not.toMatch(/vosotros|Spanish|Español|flag|🇪🇸|🇫🇷|🇩🇪/);
    expect(shell).not.toMatch(/\[\"yo\", \"tu\", \"el\"/);
    expect(shell).not.toMatch(/spain|latam|dialect-color/i);
    expect(WORDMARK).toBe("VERBOS");
    expect(DEFAULT_PERSONS).toEqual(columnPersons(DEFAULT_SETTINGS));
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

  it("keeps recap as a short beat and never hardcodes a 2×5", () => {
    expect(RECAP_HEAD).toBe("Board lit");
    expect(RECAP_CLEAN).toBe("Clean board");
    expect(RECAP_BEAT_MS).toBe(1600);
    expect(`${RECAP_HEAD} ${RECAP_CLEAN}`).not.toMatch(/8\/10|5 of last 7/);
    expect(RECAP_SUB).not.toMatch(/2\s*[×x]\s*5|5 of last 7/);
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const clean = first.map((item) => ({ ...item, correct: true }));
    const story = recapStory(clean, attempts);
    expect(story.head).toBe("Clean board");
    expect(story.line).toBe(RECAP_SUB);
    expect(story.pips).toBe("1/5");
    expect(story.hits).toBe(1);
    expect(story.need).toBe(5);
    expect(story.line.split(/\s+/).length).toBeLessThanOrEqual(6);
    expect(story.action).toBe("again");
    expect(story.line).not.toMatch(/xp|streak|loot|8\/10|0\/10|2\s*[×x]\s*5|5 of last 7/i);
    const mixed = clean.map((item, index) => ({ ...item, correct: index !== 0 }));
    expect(recapStory(mixed, attempts).head).toBe("Board lit");
    const commands = [
      { tense: "mandato_af", person: "tu", correct: true },
      { tense: "mandato_af", person: "el", correct: true },
      { tense: "mandato_af", person: "nos", correct: true },
      { tense: "mandato_af", person: "ellos", correct: true },
    ];
    const commandAttempts = commands.map((item) => typed(item.tense, item.person, true));
    const commandStory = recapStory(commands, commandAttempts);
    expect(commandStory.head).toBe("Clean board");
    expect(commandStory.line).not.toMatch(/2\s*[×x]\s*5/);
    const boardUi = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/Board.jsx"),
      "utf8",
    );
    expect(boardUi).not.toMatch(/pips/i);
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

  it("shows a named rank on the open region, not a known/total dump", () => {
    expect(atlasRank({ known: 0, opened: 0, allowed: 10 }).label).toBe("New map");
    const one = [typed("presente", "yo", true, { verb: "hablar" })];
    const stats = atlasFillStats(one, { mood: "indicative", type: "regular", ending: "ar" });
    expect(stats.name).toBe("Indicative · Regulars · -ar");
    expect(stats.known).toBe(0);
    expect(stats.opened).toBe(1);
    expect(stats.rank).toBe("first_marks");
    expect(stats.line).toBe("First marks");
    expect(stats.line).not.toMatch(/\d+\s*\/\s*\d+/);
    const known = Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" }));
    const owned = atlasFillStats(known, { mood: "indicative", type: "regular", ending: "ar" });
    expect(owned.known).toBe(1);
    expect(owned.line).toBe("Finding your feet");
    expect(owned.line).not.toMatch(/\d+\s*\/\s*\d+/);
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
      personsFor({ ...DEFAULT_SETTINGS, address: "both", extraColumn: true }, "mandato_af"),
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
    const who = next.profiles.find((profile) => profile.id === next.activeProfileId);
    expect(who.attempts).toEqual([]);
    expect(who.finishedRound).toBe(true);
    expect(next.settings.types).toEqual(["stem"]);
    expect(youKnowThis(who.attempts, spec())).toBe(false);
    expect(formCopy(who.attempts, spec())).toBe("not enough yet");
  });

  it("lets the pack rename a legacy extra-column setting", () => {
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    const next = saveSettings(
      { settings: DEFAULT_SETTINGS, attempts: [], finishedRound: false, lastCells: [] },
      { ...DEFAULT_SETTINGS, vosotros: true },
    );
    expect(next.settings.extraColumn).toBe(true);
    expect(next.settings.vosotros).toBeUndefined();
    expect(next.hasClassSet).toBe(true);
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

  it("does not pad the last-7 window with fake misses", () => {
    const five = Array.from({ length: 5 }, () => typed("presente", "yo", true));
    expect(masteryWindow(five, spec())).toHaveLength(5);
    expect(masteryWindow(five, spec()).every((attempt) => attempt.correct === true)).toBe(true);
    expect(formState(five, spec())).toBe("know");
    expect(formCopy(five, spec())).toBe("you know this");
    const four = five.slice(0, 4);
    expect(masteryWindow(four, spec())).toHaveLength(4);
    expect(formState(four, spec())).toBe("not_enough");
    const mixed = [
      typed("presente", "yo", true),
      typed("presente", "yo", false),
      typed("presente", "yo", true),
      typed("presente", "yo", true),
      typed("presente", "yo", true),
    ];
    expect(masteryWindow(mixed, spec())).toHaveLength(5);
    expect(formState(mixed, spec())).toBe("learning");
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
    expect(counts["presente:yo"] || 0).toBe(0);
    expect(counts["preterito:tu"]).toBeGreaterThan(0);
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

  it("replays the same 10 cells so a second pass can deepen the same squares", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    expect(first).toHaveLength(10);
    const cells = itemsToCells(first);
    const keys = first.map(itemFormKey);
    expect(sameBoard(cells, DEFAULT_SETTINGS)).toBe(true);
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    for (const item of first) {
      expect(cellPips(attempts, item.tense, item.person)).toBe(1);
    }
    const second = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(11), 10, cells, keys);
    expect(second.map(cellKey).sort()).toEqual(cells.map(cellKey).sort());
    expect(second.map(itemFormKey).sort()).toEqual([...keys].sort());
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
    expect(second.map((item) => `${item.tense}:${item.person}:${item.ending_pattern}`).sort()).toEqual(
      first.map((item) => `${item.tense}:${item.person}:${item.ending_pattern}`).sort(),
    );
  });

  it("mints you know this on the same 10 cells after five clean typed rounds", () => {
    let attempts = [];
    let replay = null;
    let sitting = [];
    const firstKeys = [];
    for (let round = 0; round < 5; round += 1) {
      const items = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(20 + round), 10, replay, sitting);
      expect(items).toHaveLength(10);
      const keys = items.map((item) => `${item.tense}:${item.person}`).sort();
      if (!firstKeys.length) firstKeys.push(...keys);
      expect(keys).toEqual(firstKeys);
      if (!sitting.length) sitting = items.map(itemFormKey);
      expect(items.map(itemFormKey).sort()).toEqual([...sitting].sort());
      if (replay) {
        expect(items.map((item) => `${item.tense}:${item.person}:${item.type}:${item.ending_pattern}`).sort()).toEqual(
          replay
            .map((cell) => `${cell.tense}:${cell.person}:${cell.type}:${cell.ending}`)
            .sort(),
        );
      }
      attempts = [
        ...attempts,
        ...items.map((item) =>
          typed(item.tense, item.person, true, {
            verb: item.verb,
            type: item.type,
            ending: item.ending_pattern,
          }),
        ),
      ];
      replay = items.map((item) => ({
        tense: item.tense,
        person: item.person,
        type: item.type,
        ending: item.ending_pattern,
        verb: item.verb,
      }));
      const fill = namedLevels(attempts, sitting).find((level) => level.id === "fill");
      if (round === 0) {
        expect(fill.known).toBe(0);
        expect(fill.checked).toBe(false);
        expect(cellPips(attempts, items[0].tense, items[0].person)).toBe(1);
        expect(sittingCellMarks(attempts, items[0].tense, items[0].person, sitting)).toBe(1);
      }
      if (round === 1) {
        expect(fill.known).toBe(0);
        expect(cellPips(attempts, items[0].tense, items[0].person)).toBe(2);
        expect(sittingCellMarks(attempts, items[0].tense, items[0].person, sitting)).toBe(2);
      }
    }
    const filled = namedLevels(attempts, sitting).find((level) => level.id === "fill");
    expect(filled.known).toBe(10);
    expect(filled.checked).toBe(true);
    expect(cellPips(attempts, replay[0].tense, replay[0].person)).toBe(5);
    expect(sittingCellMarks(attempts, replay[0].tense, replay[0].person, sitting)).toBe(5);
    expect(
      youKnowThis(attempts, {
        mood: "indicative",
        time: replay[0].tense,
        person: replay[0].person,
        type: replay[0].type,
        ending: replay[0].ending,
      }),
    ).toBe(true);
    expect(buildRound(DEFAULT_SETTINGS, attempts, mulberry32(99), 10, replay, sitting)).toEqual([]);
  });
});

describe("sitting keys lock type and ending", () => {
  function playClean(items, attempts = []) {
    return [
      ...attempts,
      ...items.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
    ];
  }

  function recapItems(items) {
    return items.map((item) => ({ ...item, correct: true }));
  }

  function expectSittingSet(items, sitting) {
    const keys = items.map(itemFormKey);
    expect(keys).toHaveLength(sitting.length);
    expect(new Set(keys).size).toBe(sitting.length);
    expect([...keys].sort()).toEqual([...sitting].sort());
  }

  it("logs the same formKey two rounds in a row; a new key before 5 typed fails", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    expect(keys).toHaveLength(10);
    expect(new Set(keys).size).toBe(10);
    const round1 = playClean(first);
    expect(namedLevels(round1, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(round1, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
    const story1 = recapStory(recapItems(first), round1);
    expect(story1.pips).toBe("1/5");
    expect(recapHitsToward(round1, keys).label).toBe("1/5");
    expect(story1.line).not.toMatch(/0\/10/);
    expect(`${story1.line} ${story1.pips}`).not.toMatch(
      new RegExp(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`),
    );

    const second = buildRound(
      DEFAULT_SETTINGS,
      round1,
      mulberry32(11),
      10,
      itemsToCells(first),
      keys,
    );
    expect(second.map(itemFormKey).sort()).toEqual([...keys].sort());
    for (const item of second) {
      expect(keys).toContain(itemFormKey(item));
    }
    const after2 = playClean(second, round1);
    const story2 = recapStory(recapItems(second), after2);
    expect(story2.pips).toBe("2/5");
    expect(recapHitsToward(after2, keys).label).toBe("2/5");
    expect(story2.line).toBe(RECAP_SAME_TEN);
    expect(story2.line).not.toMatch(/0\/10|you know this/);
    expect(`${story2.head} ${story2.line} ${story2.pips}`).not.toMatch(
      new RegExp(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`),
    );
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
  });

  it("keeps the same unique 10 formKeys across five consecutive Play-agains", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const sitting = first.map(itemFormKey);
    expect(sitting).toHaveLength(10);
    expect(new Set(sitting).size).toBe(10);
    let attempts = playClean(first);
    for (let round = 2; round <= 5; round += 1) {
      const items = buildRound(
        DEFAULT_SETTINGS,
        attempts,
        mulberry32(20 + round),
        10,
        itemsToCells(first),
      );
      expectSittingSet(items, sitting);
      attempts = playClean(items, attempts);
    }
  });

  it("does not duplicate or drop a sitting key when lastCells is corrupted", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const sitting = first.map(itemFormKey);
    const yoPreterito = sitting.find((key) => key === "indicative:preterito:yo:regular:ar")
      || sitting.find((key) => key.includes("preterito:yo:"));
    expect(yoPreterito).toBeTruthy();
    const elPresente = sitting.find((key) => key.includes("presente:el:"));
    const round1 = playClean(first);
    const round2 = buildRound(DEFAULT_SETTINGS, round1, mulberry32(21), 10, itemsToCells(first), sitting);
    const after2 = playClean(round2, round1);
    const round3 = buildRound(DEFAULT_SETTINGS, after2, mulberry32(22), 10, itemsToCells(first), sitting);
    const after3 = playClean(round3, after2);
    const badCells = [
      ...itemsToCells(first).slice(0, 9),
      itemsToCells(first)[2],
    ];
    const badKeys = [...sitting.slice(0, 9), sitting[0]];
    const round4 = buildRound(DEFAULT_SETTINGS, after3, mulberry32(23), 10, badCells, badKeys);
    expectSittingSet(round4, sitting);
    expect(round4.map(itemFormKey).filter((key) => key === elPresente)).toHaveLength(1);
    expect(round4.map(itemFormKey)).toContain(yoPreterito);
  });

  it("fails a rebuilt 10 that duplicates presente el -ar and drops pretérito yo -ar", () => {
    const sitting = [
      "indicative:presente:el:regular:ar",
      "indicative:preterito:yo:regular:ar",
      "indicative:presente:yo:regular:ar",
      "indicative:presente:tu:regular:ar",
      "indicative:presente:nos:regular:er_ir",
      "indicative:presente:ellos:regular:er_ir",
      "indicative:preterito:tu:regular:ar",
      "indicative:preterito:el:regular:ar",
      "indicative:preterito:nos:regular:er_ir",
      "indicative:preterito:ellos:regular:er_ir",
    ];
    expect(new Set(sitting).size).toBe(10);
    let attempts = [];
    for (let round = 0; round < 3; round += 1) {
      attempts = [
        ...attempts,
        ...sitting.map((key) => {
          const spec = parseFormKey(key);
          return typed(spec.time, spec.person, true, {
            verb: spec.ending === "ar" ? "viajar" : "vender",
            type: spec.type,
            ending: spec.ending,
          });
        }),
      ];
    }
    const badKeys = sitting.map((key) =>
      key === "indicative:preterito:yo:regular:ar" ? "indicative:presente:el:regular:ar" : key,
    );
    expect(new Set(badKeys).size).toBe(9);
    const badCells = badKeys.map((key) => {
      const spec = parseFormKey(key);
      return { tense: spec.time, person: spec.person, type: spec.type, ending: spec.ending };
    });
    const round4 = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(23), 10, badCells, []);
    expectSittingSet(round4, sitting);
    expect(round4.map(itemFormKey).filter((key) => key === "indicative:presente:el:regular:ar")).toHaveLength(1);
    expect(round4.map(itemFormKey)).toContain("indicative:preterito:yo:regular:ar");
  });

  it("persists sittingKeys when the blob dump is empty mid-sitting", () => {
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    const sitting = [
      "indicative:presente:el:regular:ar",
      "indicative:preterito:yo:regular:ar",
      "indicative:presente:yo:regular:ar",
      "indicative:presente:tu:regular:ar",
      "indicative:presente:nos:regular:er_ir",
      "indicative:presente:ellos:regular:er_ir",
      "indicative:preterito:tu:regular:ar",
      "indicative:preterito:el:regular:ar",
      "indicative:preterito:nos:regular:er_ir",
      "indicative:preterito:ellos:regular:er_ir",
    ];
    const items = sitting.map((key) => {
      const spec = parseFormKey(key);
      return {
        tense: spec.time,
        person: spec.person,
        type: spec.type,
        ending_pattern: spec.ending,
        verb: spec.ending === "ar" ? "viajar" : "vender",
      };
    });
    let state = rememberSitting(loadState(), items, { fresh: true, keys: sitting });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual(sitting);
    state = {
      ...state,
      sittingKeys: [],
      profiles: state.profiles.map((profile) =>
        profile.id === state.activeProfileId ? { ...profile, sittingKeys: [] } : profile,
      ),
    };
    const attempts = sitting.map((key) => {
      const spec = parseFormKey(key);
      return typed(spec.time, spec.person, true, {
        verb: spec.ending === "ar" ? "viajar" : "vender",
        type: spec.type,
        ending: spec.ending,
      });
    });
    state = {
      ...state,
      profiles: state.profiles.map((profile) =>
        profile.id === state.activeProfileId ? { ...profile, attempts } : profile,
      ),
    };
    expect(activeProfile(state).sittingKeys).toEqual([]);
    const duplicateRebuild = [
      ...items.filter((item) => !(item.tense === "preterito" && item.person === "yo")),
      items.find((item) => item.tense === "presente" && item.person === "el"),
    ];
    expect(new Set(duplicateRebuild.map(itemFormKey)).size).toBe(9);
    state = rememberSitting(state, duplicateRebuild, { fresh: true });
    const blob = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(blob.sittingKeys).toHaveLength(10);
    expect(new Set(blob.sittingKeys).size).toBe(10);
    expect([...blob.sittingKeys].sort()).toEqual([...sitting].sort());
    expect(activeProfile(state).sittingKeys).toHaveLength(10);
    const next = buildRound(
      DEFAULT_SETTINGS,
      attempts,
      mulberry32(4),
      10,
      duplicateRebuild,
      blob.sittingKeys,
    );
    expectSittingSet(next, sitting);
  });

  it("writes the 10 sittingKeys into the localStorage blob during a sitting", () => {
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const sitting = first.map(itemFormKey);
    let state = rememberSitting(loadState(), first, { fresh: true });
    const blob1 = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(blob1.sittingKeys).toEqual(sitting);
    expect(blob1.sittingKeys).toHaveLength(10);
    expect(new Set(blob1.sittingKeys).size).toBe(10);
    expect(activeProfile(state).sittingKeys).toEqual(sitting);
    const after = playClean(first);
    const second = buildRound(
      DEFAULT_SETTINGS,
      after,
      mulberry32(11),
      10,
      activeProfile(state).lastCells,
      blob1.sittingKeys,
    );
    state = rememberSitting(state, second);
    const blob2 = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(blob2.sittingKeys).toEqual(sitting);
    expect(blob2.sittingKeys).toHaveLength(10);
    expect(activeProfile(state).sittingKeys).toEqual(sitting);
    expect([...second.map(itemFormKey)].sort()).toEqual([...sitting].sort());
    state = loadClassSet(state, classSetFromSettings({ ...DEFAULT_SETTINGS, types: ["stem"] }));
    const afterLoad = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(afterLoad.sittingKeys).toEqual([]);
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(activeProfile(state).atlasKeys).toEqual(sitting);
  });

  it("serializes formKeys from two consecutive Play-agains as the same set", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys1 = [...first.map(itemFormKey)].sort();
    expect(keys1).toHaveLength(10);
    const round1 = playClean(first);
    const second = buildRound(DEFAULT_SETTINGS, round1, mulberry32(11), 10, itemsToCells(first));
    const keys2 = [...second.map(itemFormKey)].sort();
    expect(keys2).toEqual(keys1);
    expect(new Set(keys2).size).toBe(10);

    const qaFlipped = [
      "indicative:presente:el:regular:ar",
      "indicative:preterito:nos:regular:er_ir",
      "indicative:preterito:el:regular:er_ir",
    ];
    const qaGone = [
      "indicative:presente:el:regular:er_ir",
      "indicative:preterito:nos:regular:ar",
      "indicative:preterito:el:regular:ar",
    ];
    if (qaGone.every((key) => keys1.includes(key))) {
      for (const key of qaFlipped) expect(keys2).not.toContain(key);
    }

    let state = rememberSitting(
      { settings: DEFAULT_SETTINGS, attempts: [], finishedRound: true, lastCells: [] },
      first,
    );
    expect([...activeProfile(state).sittingKeys].sort()).toEqual(keys1);
    const viaStore = buildRound(
      DEFAULT_SETTINGS,
      round1,
      mulberry32(19),
      10,
      itemsToCells(activeProfile(state).lastCells),
      activeProfile(state).sittingKeys,
    );
    expect([...viaStore.map(itemFormKey)].sort()).toEqual(keys1);
  });

  it("cannot flip -ar / -er_ir on the QA dump cells before 5 typed", () => {
    const qa1 = [
      "indicative:presente:el:regular:er_ir",
      "indicative:presente:ellos:regular:ar",
      "indicative:preterito:tu:regular:ar",
      "indicative:preterito:yo:regular:er_ir",
      "indicative:presente:nos:regular:ar",
      "indicative:preterito:ellos:regular:er_ir",
      "indicative:presente:yo:regular:er_ir",
      "indicative:presente:tu:regular:ar",
      "indicative:preterito:nos:regular:ar",
      "indicative:preterito:el:regular:ar",
    ];
    const attempts = qa1.map((key) => {
      const spec = parseFormKey(key);
      return typed(spec.time, spec.person, true, {
        verb: spec.ending === "ar" ? "hablar" : "comer",
        type: spec.type,
        ending: spec.ending,
      });
    });
    const cells = qa1.map((key) => {
      const spec = parseFormKey(key);
      return { tense: spec.time, person: spec.person };
    });
    const second = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(3), 10, cells);
    expect([...second.map(itemFormKey)].sort()).toEqual([...qa1].sort());
    expect(second.map(itemFormKey)).not.toContain("indicative:presente:el:regular:ar");
    expect(second.map(itemFormKey)).not.toContain("indicative:preterito:nos:regular:er_ir");
    expect(second.map(itemFormKey)).not.toContain("indicative:preterito:el:regular:er_ir");
  });

  it("does not reweight types onto the same squares during a sitting", () => {
    const mixed = { ...DEFAULT_SETTINGS, types: ["regular", "stem"] };
    const first = buildRound(mixed, [], mulberry32(3));
    const keys = first.map(itemFormKey);
    expect(keys).toHaveLength(10);
    const visits = first.map((item) => ({
      tense: item.tense,
      person: item.person,
      correct: true,
      typed: true,
    }));
    let diverged = false;
    for (let seed = 0; seed < 50; seed += 1) {
      const loose = buildRound(mixed, visits, mulberry32(80 + seed), 10, itemsToCells(first));
      if (loose.map(itemFormKey).sort().join("|") !== [...keys].sort().join("|")) {
        diverged = true;
        break;
      }
    }
    expect(diverged).toBe(true);
    const locked = buildRound(mixed, visits, mulberry32(80), 10, itemsToCells(first), keys);
    expect(locked.map(itemFormKey).sort()).toEqual([...keys].sort());
    expect(locked.every((item) => keys.includes(itemFormKey(item)))).toBe(true);
  });

  it("counts marks on the sitting formKey, not every type collapsed onto the square", () => {
    const sitting = ["indicative:presente:yo:regular:ar"];
    const attempts = [
      typed("presente", "yo", true, { verb: "hablar" }),
      typed("presente", "yo", true, { verb: "pensar" }),
    ];
    expect(cellPips(attempts, "presente", "yo")).toBe(2);
    expect(sittingCellMarks(attempts, "presente", "yo", sitting)).toBe(1);
  });

  it("mints you-know-this on the atlas after five clean Play-agains, never on round 1", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    let attempts = playClean(first);
    expect(namedLevels(attempts, keys).find((level) => level.id === "fill").known).toBe(0);

    for (let round = 2; round <= 5; round += 1) {
      const items = buildRound(
        DEFAULT_SETTINGS,
        attempts,
        mulberry32(20 + round),
        10,
        itemsToCells(first),
        keys,
      );
      if (sittingIncomplete(attempts, keys)) {
        expect(items.map(itemFormKey).sort()).toEqual([...keys].sort());
      }
      attempts = playClean(items, attempts);
      const mid = namedLevels(attempts, keys).find((level) => level.id === "fill");
      if (round < 5) {
        expect(mid.known).toBe(0);
        expect(masteryWindow(attempts, parseFormKey(keys[0])).length).toBe(round);
      }
    }

    const fill = namedLevels(attempts, keys).find((level) => level.id === "fill");
    expect(masteryWindow(attempts, parseFormKey(keys[0])).length).toBe(5);
    expect(fill.known).toBeGreaterThan(0);
    expect(fill.detail).not.toBe(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`);
    expect(fill.known).toBe(10);
    for (const key of keys) {
      const [mood, time, person, type, ending] = key.split(":");
      expect(youKnowThis(attempts, { mood, time, person, type, ending })).toBe(true);
    }
  });

  it("starts a new sitting from Customize", () => {
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    let state = rememberSitting(
      { settings: DEFAULT_SETTINGS, attempts: [], finishedRound: true, lastCells: [] },
      first,
    );
    expect(activeProfile(state).sittingKeys).toEqual(first.map(itemFormKey));
    state = saveSettings(state, { ...DEFAULT_SETTINGS, types: ["stem"] });
    expect(activeProfile(state).sittingKeys).toEqual([]);
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
    expect(commandPersons({ ...DEFAULT_SETTINGS, extraColumn: true })).toEqual([
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
    expect(new Set(items.map(itemFormKey)).size).toBe(10);
    expect(sittingIncomplete([...visits, ...knownPresenteYo], items.map(itemFormKey))).toBe(true);
  });

  it("names the atlas fill and keeps three states, no points", () => {
    expect(atlasFillName("indicative", "regular", "ar")).toBe("Indicative · Regulars · -ar");
    expect(FORM_COPY).toEqual({
      not_enough: "not enough yet",
      learning: "still learning",
      know: "you know this",
    });
    expect(RANK_PATH.map((rank) => rank.label)).toEqual([
      "New map",
      "First marks",
      "Finding your feet",
      "On the map",
      "Lighting up",
      "You own this",
      "This map is yours",
    ]);
    const chrome = `${BOARD_NOTE} ${RECAP_HEAD} ${RECAP_SUB} ${RECAP_SAME_TEN} ${Object.values(FORM_COPY).join(" ")} ${RANK_PATH.map((rank) => rank.label).join(" ")}`;
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
