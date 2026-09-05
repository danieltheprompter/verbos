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
  RECAP_CLEAN_LINE,
  RECAP_HEAD,
  RECAP_SAME_BOARD,
  RECAP_SAME_TEN,
  RECAP_SUB,
  RECAP_TURN_RED,
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
  sittingKeysFromRound,
  sittingVisitCellKeys,
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
  visitPieceCount,
} from "./board.js";
import { explainMiss } from "./miss.js";
import { atlasCopyAt, atlasFillName, atlasFillStats, atlasRank, buildAtlas } from "./progress.js";
import { recapHitsToward, recapMissedLine, recapStory, recapTally } from "./recap.js";
import { mulberry32 } from "./random.js";
import { buildRound, makeDistractors, mapSittingKeys, playAgainRound } from "./round.js";
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

function itemCell(item) {
  return `${item.tense}:${item.person}`;
}

function cellsOfKeys(keys) {
  return keys.map((key) => {
    const spec = parseFormKey(key);
    return `${spec.time}:${spec.person}`;
  });
}

function expectSameCells(items, sittingOrItems) {
  const got = items.map(itemCell);
  const want =
    typeof sittingOrItems[0] === "string"
      ? cellsOfKeys(sittingOrItems)
      : sittingOrItems.map(itemCell);
  expect(got.sort()).toEqual([...want].sort());
  expect(new Set(got).size).toBe(items.length);
}

function expectPoolVerbs(items, settings = DEFAULT_SETTINGS) {
  const pool = new Set(verbsForSettings(settings).map((verb) => verb.inf));
  expect(items.every((item) => pool.has(item.verb))).toBe(true);
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
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    const practice = readFileSync(join(root, "components/Practice.jsx"), "utf8");
    const board = readFileSync(join(root, "components/Board.jsx"), "utf8");
    expect(home).toMatch(/PRACTICE/);
    expect(home).toMatch(/JOURNEY/);
    expect(home).not.toMatch(/\{YOU\}/);
    expect(practice).toMatch(/Customize/);
    expect(practice).toMatch(/WHAT_YOU_KNOW/);
    expect(practice).toMatch(/home-links/);
    expect(practice).toMatch(/WARMUP_BELL_LABEL/);
    expect(board).toMatch(/false \? <p className="board-note">\{BOARD_NOTE\}<\/p>/);
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
      "components/Practice.jsx",
      "components/JourneyMap.jsx",
      "components/Progress.jsx",
      "components/Customize.jsx",
      "components/ClearProgress.jsx",
      "components/Profile.jsx",
      "components/MiniBoard.jsx",
      "components/ClassSet.jsx",
      "engine/round.js",
      "engine/journey.js",
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
      "perfecto",
      "pluscuamperfecto",
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

  it("fills the well on a miss so the board can drop the lecture", () => {
    const sitting = ["indicative:presente:yo:regular:ar"];
    const miss = typed("presente", "yo", false);
    const hit = typed("presente", "yo", true);
    expect(sittingVisitCellKeys([miss], sitting).has("presente:yo")).toBe(true);
    expect(sittingVisitCellKeys([hit], sitting).has("presente:yo")).toBe(true);
    expect(sittingCellMarks([miss], "presente", "yo", sitting)).toBe(1);
    expect(sittingCellMarks([miss, hit], "presente", "yo", sitting)).toBe(2);
    expect(visitPieceCount(0, 0, false)).toBe(0);
    expect(visitPieceCount(0, 0, true)).toBe(1);
    expect(visitPieceCount(0, 1, false)).toBe(1);
    expect(visitPieceCount(0, 1, true)).toBe(1);
    expect(visitPieceCount(2, 1, true)).toBe(2);
    const items = [{ tense: "presente", person: "yo", correct: false }];
    const wells = new Set([
      ...answeredCellKeys(items),
      ...sittingVisitCellKeys([miss], sitting),
    ]);
    expect(wells.has("presente:yo")).toBe(true);
    expect(roundCellState("presente", "yo", items[0], wells)).toBe("answered-now");
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const board = readFileSync(join(root, "components/Board.jsx"), "utf8");
    expect(board).toMatch(/false \? <p className="board-note">\{BOARD_NOTE\}<\/p>/);
    expect(board).toMatch(/lastRoundResult/);
    expect(board).toMatch(/answeredCellKeys/);
    expect(board).not.toMatch(/sittingCellMarks|sittingVisitCellKeys/);
    expect(board).not.toMatch(/visitPieceCount|cell-marks|data-marks/);
    expect(board).toMatch(/if \(land\) answered\.add/);
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    const judge = play.split("function judge")[1]?.split("function next")[0] || "";
    expect(judge).toMatch(/item\.correct = ok/);
    expect(judge).toMatch(/setLand\(\{ tense: item\.tense, person: item\.person \}\)/);
    expect(judge.indexOf("setLand")).toBeLessThan(judge.indexOf("if (!ok"));
    expect(judge).toMatch(/setVisitCounts/);
    expect(play).toMatch(/result\.miss\.message/);
    expect(play).toMatch(/is-flick-col|data-result/);
    expect(play).toMatch(/\{story\.line\}/);
    expect(play).not.toMatch(/Same 10\. Fill the wells\.|Same board\.|Board lit/);
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
    expect(recapTally(items).label).toBe("1 of 2");
    expect(recapMissedLine(items)).toBe("Missed tú");
    expect(recapStory(items, attempts).line).toBe(RECAP_TURN_RED);
    expect(recapStory(items, attempts).line).not.toMatch(/toward|3\/5|2 of 5/);
    const boardUi = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/Board.jsx"), "utf8");
    expect(boardUi).toMatch(/lastRoundResult\(/);
    expect(boardUi).toMatch(/data-result/);
    const recapCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles.css"), "utf8");
    expect(recapCss).toMatch(/\.cell\[data-result="ok"\]/);
    expect(recapCss).toMatch(/\.cell\[data-result="bad"\]/);
    expect(typedPips(attempts, "presente", "yo")).toBe(1);
    expect(cellPips(attempts, "presente", "el")).toBe(0);
    expect(PIP_SLOTS).toBe(5);
    expect(recapStillNotEnough(attempts, items)).toBe(true);
    expect(formCopy(attempts, spec())).toBe("not enough yet");
  });

  it("keeps recap as a this-round beat and never hardcodes a 2×5", () => {
    expect(RECAP_HEAD).toBe(RECAP_TURN_RED);
    expect(RECAP_CLEAN).toBe(RECAP_CLEAN_LINE);
    expect(RECAP_BEAT_MS).toBe(1600);
    expect(`${RECAP_HEAD} ${RECAP_CLEAN}`).not.toMatch(/5 of last 7/);
    expect(RECAP_SUB).not.toMatch(/2\s*[×x]\s*5|5 of last 7/);
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const clean = first.map((item) => ({ ...item, correct: true }));
    const story = recapStory(clean, attempts);
    expect(story.banner).toBe(`${clean.length} of ${clean.length}`);
    expect(story.head).toBe("");
    expect(story.line).toBe(RECAP_CLEAN_LINE);
    expect(story.line).not.toMatch(/sitting|3\/5|2 of 5|toward/i);
    expect(story.pips).toBe("1/5");
    expect(story.hits).toBe(1);
    expect(story.need).toBe(5);
    expect(story.action).toBe("again");
    expect(story.line).not.toMatch(/xp|streak|loot|5 of last 7/i);
    const mixed = clean.map((item, index) => ({ ...item, correct: index !== 0 }));
    const mixedStory = recapStory(mixed, attempts);
    expect(mixedStory.banner).toBe(recapTally(mixed).label);
    expect(mixedStory.head).toMatch(/^Missed /);
    expect(mixedStory.line).toBe(RECAP_TURN_RED);
    expect(mixedStory.line).not.toMatch(/toward|3\/5|2 of 5/);
    const commands = [
      { tense: "mandato_af", person: "tu", correct: true },
      { tense: "mandato_af", person: "el", correct: true },
      { tense: "mandato_af", person: "nos", correct: true },
      { tense: "mandato_af", person: "ellos", correct: true },
    ];
    const commandAttempts = commands.map((item) => typed(item.tense, item.person, true));
    const commandStory = recapStory(commands, commandAttempts);
    expect(commandStory.banner).toBe("4 of 4");
    expect(commandStory.head).toBe("");
    expect(commandStory.line).toBe(RECAP_CLEAN_LINE);
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
    expect(story.banner).toBe("0 of 1");
    expect(story.line).toBe(RECAP_TURN_RED);
    expect(story.line).not.toMatch(/sitting|you know this|still learning|toward/i);
    expect(story.pips).toBe("5/5");
    expect(story.next).toBe(RECAP_TURN_RED);
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
    expect(items).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    const keys = items.map((item) => `${item.tense}:${item.person}`);
    expect(new Set(keys).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
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
    const knownYo = [
      ...Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "hablar" })),
      ...Array.from({ length: 5 }, () => typed("presente", "yo", true, { verb: "comer" })),
    ];
    const all = [...attempts, ...knownYo];
    const counts = {};
    for (let i = 0; i < 80; i += 1) {
      const items = buildRound(wide, all, mulberry32(100 + i));
      expect(items).toHaveLength(cells.length);
      expect(new Set(items.map((item) => `${item.tense}:${item.person}`)).size).toBe(cells.length);
      for (const item of items) {
        const key = `${item.tense}:${item.person}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    expect(counts["preterito:tu"]).toBe(80);
    expect(counts["presente:yo"]).toBe(80);
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
    expect(first).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    const cells = itemsToCells(first);
    const keys = first.map(itemFormKey);
    expect(sameBoard(cells, DEFAULT_SETTINGS)).toBe(true);
    const attempts = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    for (const item of first) {
      expect(cellPips(attempts, item.tense, item.person)).toBe(1);
    }
    const second = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(11), 10, cells, keys);
    expect(second.map(cellKey).sort()).toEqual(cells.map(cellKey).sort());
    expectSameCells(second, first);
    expectPoolVerbs(second);
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

  it("mints you know this on the same 10 cells after five clean typed rounds", () => {
    let attempts = [];
    let replay = null;
    let sitting = [];
    const firstKeys = [];
    for (let round = 0; round < 5; round += 1) {
      const items = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(20 + round), 10, replay, sitting);
      expect(items).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
      const keys = items.map((item) => `${item.tense}:${item.person}`).sort();
      if (!firstKeys.length) firstKeys.push(...keys);
      expect(keys).toEqual(firstKeys);
      if (!sitting.length) sitting = items.map(itemFormKey);
      expectPoolVerbs(items);
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
      }
      if (round === 1) {
        expect(fill.known).toBe(0);
        expect(cellPips(attempts, items[0].tense, items[0].person)).toBe(2);
      }
    }
    expect(cellPips(attempts, replay[0].tense, replay[0].person)).toBe(5);
    const minted = [];
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(20), 10);
    for (let hit = 0; hit < 5; hit += 1) {
      minted.push(
        ...first.map((item) =>
          typed(item.tense, item.person, true, {
            verb: item.verb,
            type: item.type,
            ending: item.ending_pattern,
          }),
        ),
      );
    }
    const filled = namedLevels(minted, first.map(itemFormKey)).find((level) => level.id === "fill");
    expect(filled.known).toBe(10);
    expect(filled.checked).toBe(true);
    expect(sittingCellMarks(minted, first[0].tense, first[0].person, first.map(itemFormKey))).toBe(5);
    expect(
      youKnowThis(minted, {
        mood: "indicative",
        time: first[0].tense,
        person: first[0].person,
        type: first[0].type,
        ending: first[0].ending_pattern,
      }),
    ).toBe(true);
    expect(buildRound(DEFAULT_SETTINGS, minted, mulberry32(99), 10, itemsToCells(first), first.map(itemFormKey))).toEqual([]);
  });
});

describe("sitting keys lock cells, not infinitives", () => {
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
    expectSameCells(items, sitting);
    expect(items).toHaveLength(sitting.length);
    expectPoolVerbs(items);
  }

  it("logs the same formKey two rounds in a row; a new key before 5 typed fails", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    expect(keys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(keys).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
    const round1 = playClean(first);
    expect(namedLevels(round1, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(round1, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
    const story1 = recapStory(recapItems(first), round1);
    expect(story1.pips).toBe("1/5");
    expect(recapHitsToward(round1, keys).label).toBe("1/5");
    expect(story1.banner).toBe(`${first.length} of ${first.length}`);
    expect(story1.line).toBe(RECAP_CLEAN_LINE);
    expect(story1.line).not.toMatch(/0\/10|sitting|toward/i);
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
    expectSameCells(second, first);
    expectPoolVerbs(second);
    const after2 = playClean(second, round1);
    const story2 = recapStory(recapItems(second), after2);
    expect(story2.line).toBe(RECAP_CLEAN_LINE);
    expect(story2.banner).toBe(`${second.length} of ${second.length}`);
    expect(story2.line).not.toMatch(/0\/10|you know this|sitting|toward/i);
    expect(`${story2.head} ${story2.line} ${story2.pips}`).not.toMatch(
      new RegExp(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`),
    );
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
  });

  it("maps persisted sittingKeys for five Play-agains; esperaste-twice fixture cannot pass", () => {
    const sitting = [
      "indicative:preterito:yo:regular:er_ir",
      "indicative:presente:el:regular:er_ir",
      "indicative:presente:nos:regular:ar",
      "indicative:presente:tu:regular:er_ir",
      "indicative:presente:ellos:regular:er_ir",
      "indicative:preterito:tu:regular:ar",
      "indicative:preterito:nos:regular:er_ir",
      "indicative:presente:yo:regular:ar",
      "indicative:preterito:el:regular:er_ir",
      "indicative:preterito:ellos:regular:er_ir",
    ];
    expect(new Set(sitting).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
    const esperasteTwice = sitting.map((key) =>
      key === "indicative:presente:ellos:regular:er_ir" ? "indicative:preterito:tu:regular:ar" : key,
    );
    expect(new Set(esperasteTwice).size).toBe(9);
    expect(() => mapSittingKeys(esperasteTwice, DEFAULT_SETTINGS, [], mulberry32(2))).toThrow(
      /unique formKeys|built round set/,
    );
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "round.js"), "utf8");
    expect(src).toMatch(/export function playAgainRound/);
    expect(src.split("export function playAgainRound")[1].split("export function mapSittingKeys")[0]).not.toMatch(
      /buildRound|pickTypeForCell|fillWeighted/,
    );
    const app = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../App.jsx"), "utf8");
    const again = app.split("function playAgain")[1]?.split("function start")[0] || "";
    expect(again).toMatch(/playAgainRound/);
    expect(again).toMatch(/sittingKeysFromRound/);
    expect(again).not.toMatch(/buildRound/);
    expect(again).not.toMatch(/throw new Error/);
    expect(app).not.toMatch(/Play again has no unique sittingKeys pin/);
    expect(app).toMatch(/onPlayAgain=\{\(\) =>\s*playAgain\(/);
    let attempts = [];
    for (let round = 1; round <= 5; round += 1) {
      const items = playAgainRound(sitting, DEFAULT_SETTINGS, attempts, mulberry32(17 * round));
      expectSittingSet(items, sitting);
      expect(items.filter((item) => item.tense === "preterito" && item.person === "tu")).toHaveLength(1);
      expect(items.some((item) => item.tense === "presente" && item.person === "ellos")).toBe(true);
      attempts = playClean(items, attempts);
    }
  });

  it("recovers sittingKeys from the just-played round when the pin is empty", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    const attempts = playClean(first);
    expect(sittingKeysFromRound(first, []).sort()).toEqual([...keys].sort());
    expect(sittingKeysFromRound([], attempts).sort()).toEqual([...keys].sort());
    expect(sittingKeysFromRound([], []).length).toBe(0);
  });

  it("sizes a round to the current board, not a fixed count", () => {
    const base = cellsFor(DEFAULT_SETTINGS).length;
    expect(buildRound(DEFAULT_SETTINGS, [], mulberry32(3))).toHaveLength(base);
    const wide = { ...DEFAULT_SETTINGS, extraColumn: true };
    const wideNeed = cellsFor(wide).length;
    expect(wideNeed).not.toBe(base);
    const wideItems = buildRound(wide, [], mulberry32(3));
    expect(wideItems).toHaveLength(wideNeed);
    expect(new Set(wideItems.map((item) => `${item.tense}:${item.person}`)).size).toBe(wideNeed);
    const slim = { ...DEFAULT_SETTINGS, tenses: [DEFAULT_SETTINGS.tenses[0]] };
    const slimNeed = cellsFor(slim).length;
    expect(slimNeed).toBeLessThan(base);
    expect(buildRound(slim, [], mulberry32(4))).toHaveLength(slimNeed);
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "round.js"), "utf8");
    expect(src).toMatch(/const need = Number\(size\) > 0 \? size : cells\.length/);
    expect(src).not.toMatch(/ROUND_SIZE/);
    expect(src).toMatch(/cellsFor\(settings\)\.length/);
  });

  it("keeps the same sitting cells across five consecutive Play-agains", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const sitting = first.map(itemFormKey);
    expect(sitting).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(sitting).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
    let attempts = playClean(first);
    for (let round = 2; round <= 5; round += 1) {
      const items = playAgainRound(sitting, DEFAULT_SETTINGS, attempts, mulberry32(20 + round));
      expectSittingSet(items, sitting);
      attempts = playClean(items, attempts);
    }
  });

  it("shuffles prompt order each round and keeps the play board this-round only", () => {
    const sitting = [
      "indicative:preterito:yo:regular:er_ir",
      "indicative:presente:el:regular:er_ir",
      "indicative:presente:nos:regular:ar",
      "indicative:presente:tu:regular:er_ir",
      "indicative:presente:ellos:regular:er_ir",
      "indicative:preterito:tu:regular:ar",
      "indicative:preterito:nos:regular:er_ir",
      "indicative:presente:yo:regular:ar",
      "indicative:preterito:el:regular:er_ir",
      "indicative:preterito:ellos:regular:er_ir",
    ];
    const rowMajor = [
      "presente:yo",
      "presente:tu",
      "presente:el",
      "presente:nos",
      "presente:ellos",
      "preterito:yo",
      "preterito:tu",
      "preterito:el",
      "preterito:nos",
      "preterito:ellos",
    ];
    const a = playAgainRound(sitting, DEFAULT_SETTINGS, [], mulberry32(3));
    const b = playAgainRound(sitting, DEFAULT_SETTINGS, [], mulberry32(4));
    expectSittingSet(a, sitting);
    expectSittingSet(b, sitting);
    expect(a.map((item) => `${item.tense}:${item.person}`)).not.toEqual(rowMajor);
    expect(a.map(itemFormKey).join("|")).not.toBe(b.map(itemFormKey).join("|"));
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "round.js"), "utf8");
    const mapped = src.split("export function mapSittingKeys")[1] || "";
    expect(mapped).toMatch(/shuffle\(/);
    expect(mapped).not.toMatch(/rows\.indexOf|cols\.indexOf/);
    const board = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/Board.jsx"), "utf8");
    expect(board).toMatch(/lastRoundResult/);
    expect(board).toMatch(/answeredCellKeys/);
    expect(board).not.toMatch(/sittingVisitCellKeys|sittingCellMarks/);
    expect(board).not.toMatch(/visitPieceCount|cell-marks/);
    expect(board).toMatch(/is-land/);
    expect(board).not.toMatch(/color-owned|cell-owned/);
    const play = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/Play.jsx"), "utf8");
    expect(play).toMatch(/sittingKeys=\{sittingKeys\}/);
    expect(play).toMatch(/is-flick-col/);
    expect(play).toMatch(/setLand/);
    expect(play).toMatch(/\{story\.line\}/);
    expect(play).not.toMatch(/Same 10\. Fill the wells\.|Same board\.|Board lit/);
    expect(RECAP_SAME_TEN).toBe(RECAP_TURN_RED);
    expect(RECAP_SAME_BOARD).toBe(RECAP_TURN_RED);
  });

  it("does not duplicate or drop a sitting key when lastCells is corrupted", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const sitting = first.map(itemFormKey);
    const yoPreterito = sitting.find((key) => key.includes("preterito:yo:"));
    expect(yoPreterito).toBeTruthy();
    const elPresente = sitting.find((key) => key.includes("presente:el:"));
    expect(elPresente).toBeTruthy();
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
    expect(round4.filter((item) => item.tense === "presente" && item.person === "el")).toHaveLength(1);
    expect(round4.some((item) => item.tense === "preterito" && item.person === "yo")).toBe(true);
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
    expect(new Set(sitting).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
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
    expect(round4.filter((item) => item.tense === "presente" && item.person === "el")).toHaveLength(1);
    expect(round4.some((item) => item.tense === "preterito" && item.person === "yo")).toBe(true);
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
    expect(blob.sittingKeys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(blob.sittingKeys).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
    expect([...blob.sittingKeys].sort()).toEqual([...sitting].sort());
    expect(activeProfile(state).sittingKeys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
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
    expect(blob1.sittingKeys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(blob1.sittingKeys).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
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
    expect(blob2.sittingKeys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(activeProfile(state).sittingKeys).toEqual(sitting);
    expectSameCells(second, sitting);
    expectPoolVerbs(second);
    state = loadClassSet(state, classSetFromSettings({ ...DEFAULT_SETTINGS, types: ["stem"] }));
    const afterLoad = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(afterLoad.sittingKeys).toEqual([]);
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(activeProfile(state).atlasKeys).toEqual(sitting);
  });

  it("serializes sittingKeys from two consecutive Play-agains as the same set", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys1 = [...first.map(itemFormKey)].sort();
    expect(keys1).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    const round1 = playClean(first);
    const second = buildRound(DEFAULT_SETTINGS, round1, mulberry32(11), 10, itemsToCells(first));
    expectSameCells(second, first);
    expectPoolVerbs(second);
    expect(new Set(second.map(itemCell)).size).toBe(cellsFor(DEFAULT_SETTINGS).length);

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
    expectSameCells(viaStore, first);
    expectPoolVerbs(viaStore);
  });

  it("picks a fresh infinitive from the selected pool on the same cells", () => {
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
    expectSameCells(second, qa1);
    expectPoolVerbs(second);
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "round.js"), "utf8");
    expect(src).not.toMatch(/lastVerbOnKey|lastPromptOnCell|pinned\.verb/);
  });

  it("does not pin last-round infinitives onto the same squares", () => {
    const mixed = { ...DEFAULT_SETTINGS, types: ["regular", "stem"] };
    const first = buildRound(mixed, [], mulberry32(3));
    const keys = first.map(itemFormKey);
    expect(keys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    const visits = first.map((item) => ({
      tense: item.tense,
      person: item.person,
      correct: true,
      typed: true,
      verb: item.verb,
      type: item.type,
      ending: item.ending_pattern,
    }));
    const locked = buildRound(mixed, visits, mulberry32(80), 10, itemsToCells(first), keys);
    expectSameCells(locked, first);
    expectPoolVerbs(locked, mixed);
    const seen = {};
    for (const item of first) seen[itemCell(item)] = new Set([item.verb]);
    for (let seed = 0; seed < 24; seed += 1) {
      const again = playAgainRound(keys, mixed, visits, mulberry32(80 + seed));
      expectSameCells(again, first);
      expectPoolVerbs(again, mixed);
      for (const item of again) seen[itemCell(item)].add(item.verb);
    }
    expect(Object.values(seen).some((verbs) => verbs.size > 1)).toBe(true);
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

  it("mints you-know-this on the atlas after five clean hits on the same formKeys, never on round 1", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    let attempts = playClean(first);
    expect(namedLevels(attempts, keys).find((level) => level.id === "fill").known).toBe(0);

    for (let round = 2; round <= 5; round += 1) {
      const items = playAgainRound(keys, DEFAULT_SETTINGS, attempts, mulberry32(20 + round));
      expectSameCells(items, first);
      expectPoolVerbs(items);
      attempts = playClean(items, attempts);
      const mid = namedLevels(attempts, keys).find((level) => level.id === "fill");
      if (round < 5) {
        expect(mid.known).toBe(0);
      }
    }

    const minted = [];
    for (let hit = 0; hit < 5; hit += 1) {
      minted.push(...playClean(first));
    }
    const fill = namedLevels(minted, keys).find((level) => level.id === "fill");
    expect(masteryWindow(minted, parseFormKey(keys[0])).length).toBe(5);
    expect(fill.known).toBeGreaterThan(0);
    expect(fill.detail).not.toBe(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`);
    expect(fill.known).toBe(10);
    for (const key of keys) {
      const [mood, time, person, type, ending] = key.split(":");
      expect(youKnowThis(minted, { mood, time, person, type, ending })).toBe(true);
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
    expect(items).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(items.map(itemFormKey)).size).toBe(cellsFor(DEFAULT_SETTINGS).length);
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
