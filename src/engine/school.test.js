import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FORM_COPY,
  LEVELS_NOTE,
  LEVEL_FILL_NEED,
  LEVEL_FILL_TOTAL,
  LEVEL_LIT,
  MASTERY_MIN,
  NEXT_PLAY_LEGEND,
  NEXT_PLAY_SUGGEST,
  PROFILE_TITLE,
  RECAP_CLEAN,
  RECAP_HEAD,
  RECAP_NEXT_REST,
  RECAP_SUB,
  SOUND_MUTED,
  WARMUP_BELL_SEC,
} from "./constants.js";
import { cellsFor } from "./board.js";
import {
  applyClassSet,
  classSetFromSettings,
  encodeClassSet,
  parseClassSet,
} from "./classSet.js";
import {
  customizeLockedByLevels,
  miniCellPaint,
  miniCellState,
  namedLevels,
  nextPlayFocus,
  nextPlayLine,
} from "./levels.js";
import { formCopy } from "./mastery.js";
import { personLabel, tenseLabel } from "./pack.js";
import { recapStory } from "./recap.js";
import { buildRound } from "./round.js";
import { mulberry32 } from "./random.js";
import {
  activeProfile,
  addProfile,
  clearProgress,
  loadClassSet,
  loadState,
  recordAttempt,
  saveSettings,
  switchProfile,
} from "./storage.js";
import { endingPattern, verbType } from "./verbs.js";
import { timerExpireAction, timerFailsItem, warmupSettings } from "./warmup.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

function memoryStore() {
  const memory = {};
  globalThis.localStorage = {
    getItem: (key) => memory[key] ?? null,
    setItem: (key, value) => {
      memory[key] = String(value);
    },
  };
  return memory;
}

function knownAt(tense, person, verb = "hablar") {
  return Array.from({ length: 5 }, () => typed(tense, person, true, { verb }));
}

describe("on-device profiles", () => {
  it("keeps two people on one device from sharing an atlas", () => {
    memoryStore();
    let state = loadState();
    state = recordAttempt(state, typed("presente", "yo", true));
    const firstId = activeProfile(state).id;
    expect(activeProfile(state).attempts).toHaveLength(1);

    state = addProfile(state, "Luis");
    expect(activeProfile(state).name).toBe("Luis");
    expect(activeProfile(state).attempts).toEqual([]);
    expect(formCopy(activeProfile(state).attempts, {
      mood: "indicative",
      time: "presente",
      person: "yo",
      type: "regular",
      ending: "ar",
    })).toBe("not enough yet");

    state = recordAttempt(state, typed("preterito", "tu", false, { verb: "comer" }));
    expect(activeProfile(state).attempts).toHaveLength(1);
    expect(activeProfile(state).attempts[0].tense).toBe("preterito");

    state = switchProfile(state, firstId);
    expect(activeProfile(state).attempts).toHaveLength(1);
    expect(activeProfile(state).attempts[0].tense).toBe("presente");
    expect(activeProfile(state).attempts[0].person).toBe("yo");
    expect(state.profiles.find((profile) => profile.name === "Luis").attempts[0].tense).toBe(
      "preterito",
    );
  });

  it("clears this person's atlas and leaves Customize and the other log", () => {
    memoryStore();
    let state = saveSettings(loadState(), { ...DEFAULT_SETTINGS, types: ["stem"] });
    state = recordAttempt(state, typed("presente", "yo", true));
    const firstId = activeProfile(state).id;
    state = addProfile(state, "Maya");
    state = recordAttempt(state, typed("presente", "tu", true));
    state = switchProfile(state, firstId);
    state = clearProgress(state);

    expect(activeProfile(state).attempts).toEqual([]);
    expect(state.settings.types).toEqual(["stem"]);
    expect(state.hasClassSet).toBe(true);
    expect(state.profiles.find((profile) => profile.name === "Maya").attempts).toHaveLength(1);
  });
});

describe("named levels do not lock Customize", () => {
  it("treats atlas-fill names as checks, never locks", () => {
    const empty = namedLevels([]);
    expect(empty.every((level) => level.lock === false)).toBe(true);
    expect(empty.every((level) => level.checked === false)).toBe(true);
    expect(empty[0].name).toBe(LEVEL_LIT);
    expect(empty[1].name).toMatch(/2\s*×\s*5/);
    expect(empty[1].detail).toBe(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`);
    expect(customizeLockedByLevels(empty)).toBe(false);
    expect(customizeLockedByLevels(namedLevels(knownAt("presente", "yo")))).toBe(false);
  });

  it("does not paint profile mini-board visits as you know this", () => {
    const board = cellsFor(DEFAULT_SETTINGS);
    const visits = board.map((cell) => typed(cell.tense, cell.person, true));
    const fill = namedLevels(visits).find((level) => level.id === "fill");
    expect(fill.known).toBe(0);
    expect(fill.detail).toBe(`0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`);
    expect(fill.opened).toBe(board.length);
    for (const cell of board) {
      expect(miniCellState(visits, cell.tense, cell.person)).toBe("not_enough");
      expect(miniCellPaint(visits, cell.tense, cell.person)).toBe("empty");
    }
    const learning = [
      ...Array.from({ length: 3 }, () => typed("presente", "yo", true)),
      ...Array.from({ length: 4 }, () => typed("presente", "yo", false)),
    ];
    expect(miniCellState(learning, "presente", "yo")).toBe("learning");
    expect(miniCellPaint(learning, "presente", "yo")).toBe("empty");
    const knownYo = [...knownAt("presente", "yo"), ...knownAt("presente", "yo", "comer")];
    expect(miniCellPaint(knownYo, "presente", "yo")).toBe("know");
    expect(miniCellPaint(knownYo, "presente", "tu")).toBe("empty");
    expect(namedLevels(knownYo).find((level) => level.id === "fill").known).toBe(1);

    const mini = readFileSync(join(root, "components/MiniBoard.jsx"), "utf8");
    expect(mini).toMatch(/miniCellPaint/);
    expect(mini).toMatch(/is-know/);
    expect(mini).not.toMatch(/is-not_enough|color-visit|cell-visit/);
    const css = readFileSync(join(root, "styles.css"), "utf8");
    const miniCss = css.slice(css.indexOf(".mini-cell"), css.indexOf(".session-bell"));
    expect(miniCss).not.toMatch(/--color-visit|--color-owned|#c9843c|#e39a45|#d8a35a/);
    expect(miniCss).not.toMatch(/is-not_enough|is-learning/);
  });

  it("does not gate Customize or Subjunctive on levels", () => {
    const customize = readFileSync(join(root, "components/Customize.jsx"), "utf8");
    expect(customize).not.toMatch(/namedLevels|customizeLockedByLevels|LEVEL_FILL/);
    expect(customize).toMatch(/pack\.targetGroups\.map/);
    expect(customize).not.toMatch(/disabled=\{.*level/);
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).not.toMatch(/namedLevels|customizeLockedByLevels/);
  });

  it("can mark 6/10 you know this only across many rounds, never as a class-period goal", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const round1 = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const afterOne = namedLevels(round1);
    expect(afterOne.find((level) => level.id === "lit").checked).toBe(true);
    expect(afterOne.find((level) => level.id === "fill").checked).toBe(false);
    expect(afterOne.find((level) => level.id === "fill").known).toBe(0);
    expect(MASTERY_MIN).toBe(5);
    expect(LEVEL_FILL_NEED).toBe(6);
    expect(LEVELS_NOTE).not.toMatch(/class period|this period|today|goal/i);
    expect(recapStory(first.map((item) => ({ ...item, correct: true })), round1).line).not.toMatch(
      /6\/10/,
    );
    expect(`${RECAP_HEAD} ${RECAP_CLEAN} ${RECAP_SUB}`).not.toMatch(/6\/10/);
    const visited = first[0];
    expect(miniCellState(round1, visited.tense, visited.person)).toBe("not_enough");
    expect(miniCellPaint(round1, visited.tense, visited.person)).toBe("empty");
    const styles = readFileSync(join(root, "styles.css"), "utf8");
    expect(styles).not.toMatch(/\.mini-cell\.is-not_enough[\s\S]{0,80}color-visit/);
    expect(styles).toMatch(/\.cell-visit/);

    const board = cellsFor(DEFAULT_SETTINGS);
    const six = board.slice(0, 6).flatMap((cell) => [
      ...knownAt(cell.tense, cell.person, "hablar"),
      ...knownAt(cell.tense, cell.person, "comer"),
    ]);
    const filled = namedLevels(six);
    expect(filled.find((level) => level.id === "fill").checked).toBe(true);
    expect(filled.find((level) => level.id === "fill").known).toBe(6);
    expect(customizeLockedByLevels(filled)).toBe(false);
  });
});

describe("warm-up and class set", () => {
  it("keeps first Play one tap and Warm-up only after a class set", () => {
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    expect(home).toMatch(/finishedRound \? "Play again" : "Play"/);
    expect(home).toMatch(/nextPlay/);
    expect(home).toMatch(/LEDE/);
    expect(home).toMatch(/hasClassSet/);
    expect(home).toMatch(/WARMUP/);
    expect(home).toMatch(/onWarmup/);
    expect(home).toMatch(/warmupBell/);
    expect(home).toMatch(/onWarmupBell/);
    expect(home).not.toMatch(/useState\(false\)/);
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/warmupBell/);
    expect(app).toMatch(/setWarmupBell/);
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    const warmupRecap = play.split("{warmup ? (")[1]?.split(") : (")[0] || "";
    expect(warmupRecap).toMatch(/Done/);
    expect(warmupRecap).not.toMatch(/Customize/);
    expect(play).toMatch(/mode === "warmup"/);
    expect(SOUND_MUTED).toBe(true);
  });

  it("never auto-fails on the 5:00 bell", () => {
    expect(WARMUP_BELL_SEC).toBe(300);
    expect(timerExpireAction({ session: true })).toBe("bell");
    expect(timerFailsItem(timerExpireAction({ session: true }))).toBe(false);
    const settings = warmupSettings({ ...DEFAULT_SETTINGS, mc: true, timer: true, timerSec: 8 });
    expect(settings.mc).toBe(false);
    expect(settings.timer).toBe(false);
    expect(settings.tenses).toEqual(DEFAULT_SETTINGS.tenses);
  });

  it("loads a shareable class set without accounts or wiping a profile log", () => {
    memoryStore();
    let state = recordAttempt(loadState(), typed("presente", "yo", true));
    const payload = classSetFromSettings({
      ...DEFAULT_SETTINGS,
      types: ["stem"],
      tenses: ["presente", "subjuntivo"],
      extraColumn: true,
    });
    const text = encodeClassSet(payload);
    expect(text).not.toMatch(/account|password|SIS|login/i);
    expect(parseClassSet(text)).toMatchObject({
      types: ["stem"],
      tenses: ["presente", "subjuntivo"],
      extraColumn: true,
    });
    expect(parseClassSet("not json")).toBe(null);
    const nextSettings = applyClassSet(DEFAULT_SETTINGS, parseClassSet(text));
    expect(nextSettings.types).toEqual(["stem"]);
    state = loadClassSet(state, payload);
    expect(state.hasClassSet).toBe(true);
    expect(state.settings.types).toEqual(["stem"]);
    expect(state.settings.tenses).toEqual(["presente", "subjuntivo"]);
    expect(activeProfile(state).attempts).toHaveLength(1);
  });
});

describe("Next Play and projector recap", () => {
  it("points Next Play at leftover weak spots, not random easy present", () => {
    expect(nextPlayLine([], true)).toBe(RECAP_NEXT_REST);
    const board = cellsFor(DEFAULT_SETTINGS);
    const missRound = board.map((cell) =>
      typed(cell.tense, cell.person, !(cell.tense === "preterito" && cell.person === "nos")),
    );
    expect(nextPlayFocus(missRound)).toEqual({ tense: "preterito", person: "nos" });
    expect(nextPlayLine(missRound, true)).toBe(
      `${NEXT_PLAY_LEGEND}: ${tenseLabel("preterito")} · ${personLabel("nos")}`,
    );
    const contrast = [
      ...knownAt("presente", "yo"),
      ...knownAt("presente", "yo", "comer"),
      ...knownAt("preterito", "tu"),
      ...knownAt("preterito", "tu", "comer"),
    ];
    expect(namedLevels(contrast).find((level) => level.id === "contrast").checked).toBe(true);
    expect(namedLevels(contrast).find((level) => level.id === "contrast").lock).toBe(false);
    expect(nextPlayLine(contrast, true)).toMatch(new RegExp(`^${NEXT_PLAY_LEGEND}:`));
    expect(NEXT_PLAY_SUGGEST).toMatch(/not you know this/);
    expect(NEXT_PLAY_SUGGEST).toMatch(/Customize/);
    const visits = board.map((cell) => typed(cell.tense, cell.person, true));
    const knownPresenteYo = [
      ...knownAt("presente", "yo"),
      ...knownAt("presente", "yo", "comer"),
    ];
    const items = buildRound(DEFAULT_SETTINGS, [...visits, ...knownPresenteYo], mulberry32(9));
    expect(items.every((item) => `${item.tense}:${item.person}` !== "presente:yo")).toBe(true);
  });

  it("keeps recap as a still-lit glance with Board lit / Clean board and no class scores", () => {
    expect(RECAP_HEAD).toBe("Board lit");
    expect(RECAP_CLEAN).toBe("Clean board");
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    expect(play).toMatch(/is-glance/);
    expect(play).toMatch(/Play again/);
    expect(play).toMatch(/PROFILE_TITLE/);
    expect(play).not.toMatch(/class score|live score|roster|leaderboard/i);
    const recap = readFileSync(join(root, "engine/recap.js"), "utf8");
    expect(recap).not.toMatch(/\bscore\b|\bXP\b|streak|loot/i);
  });
});

describe("school-ready freeze copy", () => {
  it("does not add loot, XP, streaks, grades, accounts, or SIS", () => {
    const files = [
      "App.jsx",
      "components/Home.jsx",
      "components/Play.jsx",
      "components/Profile.jsx",
      "components/ClassSet.jsx",
      "engine/config.js",
      "engine/levels.js",
      "engine/classSet.js",
      "engine/warmup.js",
      "engine/storage.js",
    ].map((file) => readFileSync(join(root, file), "utf8"));
    const src = files.join("\n");
    expect(src).not.toMatch(/\bXP\b|loot|streak|SIS|grade as score|sign[- ]in|log[- ]in|leaderboard/i);
    expect(src).toMatch(PROFILE_TITLE);
  });
});
