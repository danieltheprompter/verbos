import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FORM_COPY,
  LEDE,
  LEVELS_NOTE,
  LEVEL_FILL_NEED,
  LEVEL_FILL_TOTAL,
  LEVEL_LIT,
  MASTERY_MIN,
  NEXT_PLAY_LEGEND,
  NEXT_PLAY_SUGGEST,
  PROFILE_TITLE,
  RECAP_CLEAN,
  RECAP_CLEAN_LINE,
  RECAP_HEAD,
  RECAP_NEXT_REST,
  RECAP_SAME_BOARD,
  RECAP_SAME_TEN,
  RECAP_SUB,
  RECAP_TURN_RED,
  VERB_PICK_LEGEND,
  SOUND_MUTED,
  STORAGE_KEY,
  WARMUP_BELL_HOME,
  WARMUP_BELL_LABEL,
  WARMUP_BELL_SEC,
} from "./constants.js";
import { cellsFor, itemsToCells } from "./board.js";
import {
  applyClassSet,
  CLASS_SET_FIELDS,
  classSetFromSettings,
  classSetSummaryLines,
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
import { formCopy, itemFormKey } from "./mastery.js";
import { personLabel, tenseLabel } from "./pack.js";
import { recapHitsToward, recapStory } from "./recap.js";
import { buildRound, playAgainRound } from "./round.js";
import { mulberry32 } from "./random.js";
import {
  activeProfile,
  addProfile,
  clearProgress,
  loadClassSet,
  loadState,
  recordAttempt,
  rememberSitting,
  saveSettings,
  saveWarmupBell,
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
    expect(mini).toMatch(/sittingCellMarks/);
    expect(mini).toMatch(/is-know/);
    expect(mini).not.toMatch(/is-not_enough|color-visit|cell-visit/);
    const progress = readFileSync(join(root, "components/Progress.jsx"), "utf8");
    expect(progress).toMatch(/know-list/);
    expect(progress).toMatch(/sittingKeys/);
    expect(progress).toMatch(/atlasKeys/);
    expect(progress).not.toMatch(/RANK_PATH|atlas-rank|MiniBoard/);
    const profileUi = readFileSync(join(root, "components/Profile.jsx"), "utf8");
    expect(profileUi).toMatch(/MiniBoard/);
    const css = readFileSync(join(root, "styles.css"), "utf8");
    const miniCss = css.slice(css.indexOf(".mini-cell"), css.indexOf(".session-bell"));
    expect(miniCss).not.toMatch(/--color-visit|--color-owned|#c9843c|#e39a45|#d8a35a/);
    expect(miniCss).not.toMatch(/is-not_enough|is-learning/);
  });

  it("starts a new sitting and a new recap from Customize", () => {
    memoryStore();
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    let state = rememberSitting(loadState(), first);
    expect(activeProfile(state).sittingKeys).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual(
      activeProfile(state).sittingKeys,
    );
    state = saveSettings(state, { ...DEFAULT_SETTINGS, types: ["stem"] });
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual([]);
    expect(customizeLockedByLevels(namedLevels(activeProfile(state).attempts))).toBe(false);
  });

  it("keeps Warm-up on the sitting cells", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    const round1 = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const warm = playAgainRound(keys, warmupSettings(DEFAULT_SETTINGS), round1, mulberry32(8));
    expect(warm.map((item) => `${item.tense}:${item.person}`).sort()).toEqual(
      first.map((item) => `${item.tense}:${item.person}`).sort(),
    );
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/sittingKeysFromAttempts/);
    expect(app).toMatch(/sittingKeysFromRound/);
    expect(app).toMatch(/cellsFor\(roundSettings\)\.length/);
    expect(app).not.toMatch(/pin\.length !== 10|pin\.length === 10/);
    expect(app).toMatch(/playAgainRound/);
    expect(app.split("function playAgain")[1]?.split("function start")[0] || "").not.toMatch(/buildRound/);
    expect(app.split("function playAgain")[1]?.split("function start")[0] || "").not.toMatch(/throw new Error/);
    expect(app).toMatch(/onPlayAgain=\{\(\) =>\s*playAgain\(/);
    expect(app).not.toMatch(/Play again has no unique sittingKeys pin/);
    expect(app).not.toMatch(/built round set ≠ sittingKeys/);
    expect(app).toMatch(/sittingKeys=\{profile\.sittingKeys\}/);
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    expect(play).toMatch(/recapStory\(items, log, sittingKeys\)/);
    expect(play).toMatch(/onClick=\{onHome\}/);
    expect(play).toMatch(/>\s*Back\s*</);
    expect(play).not.toMatch(/beat === "go"/);
    expect(play).not.toMatch(/stopImmediatePropagation/);
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
    const keys = first.map(itemFormKey);
    const story1 = recapStory(first.map((item) => ({ ...item, correct: true })), round1);
    expect(story1.pips).toBe("1/5");
    expect(story1.banner).toBe(`${first.length} of ${first.length}`);
    expect(story1.line).toBe(RECAP_CLEAN_LINE);
    expect(story1.line).not.toMatch(/toward|3\/5|2 of 5/);
    expect(recapHitsToward(round1, keys).label).toBe("1/5");
    const second = buildRound(DEFAULT_SETTINGS, round1, mulberry32(11), 10, itemsToCells(first), keys);
    expect(second.map((item) => `${item.tense}:${item.person}`).sort()).toEqual(
      first.map((item) => `${item.tense}:${item.person}`).sort(),
    );
    const after2 = [
      ...round1,
      ...second.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
    ];
    const story2 = recapStory(second.map((item) => ({ ...item, correct: true })), after2);
    expect(story2.banner).toBe(`${second.length} of ${second.length}`);
    expect(story2.line).toBe(RECAP_CLEAN_LINE);
    expect(story2.line).not.toMatch(/0\/10|you know this|sitting|toward/i);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
    expect(miniCellPaint(after2, first[0].tense, first[0].person)).toBe("empty");
    const visited = first[0];
    expect(miniCellState(round1, visited.tense, visited.person)).toBe("not_enough");
    expect(miniCellPaint(round1, visited.tense, visited.person)).toBe("empty");
    const boardUi = readFileSync(join(root, "components/Board.jsx"), "utf8");
    expect(boardUi).not.toMatch(/cell-marks|sittingCellMarks/);
    expect(boardUi).not.toMatch(/pips/i);
    const styles = readFileSync(join(root, "styles.css"), "utf8");
    expect(styles).not.toMatch(/\.mini-cell\.is-not_enough[\s\S]{0,80}color-visit/);
    expect(styles).toMatch(/\.cell-visit/);
    expect(styles).toMatch(/\.mini-marks/);

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
  it("keeps Home as Practice and Journey, with Practice tools off the front door", () => {
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    const practice = readFileSync(join(root, "components/Practice.jsx"), "utf8");
    expect(home).toMatch(/PRACTICE/);
    expect(home).toMatch(/JOURNEY/);
    expect(home).toMatch(/LEDE/);
    expect(LEDE).toBe("The conjugation quiz.");
    expect(LEDE).not.toMatch(/spanish|ultimate|french|german|latin/i);
    expect(home).not.toMatch(/spanish|ultimate/i);
    expect(home).not.toMatch(/\{YOU\}/);
    expect(home).not.toMatch(/Never fails the item/);
    expect(home).not.toMatch(/5:00/);
    expect(home).not.toMatch(/useState\(false\)/);
    expect(home).not.toMatch(/nextPlay/);
    expect(home).toMatch(/journeyUnlocked/);
    expect(practice).toMatch(/finishedRound \? "Play again" : "Play"/);
    expect(practice).toMatch(/hasClassSet/);
    expect(practice).toMatch(/WARMUP/);
    expect(practice).toMatch(/onWarmup/);
    expect(practice).toMatch(/warmupBell/);
    expect(practice).toMatch(/onWarmupBell/);
    expect(practice).toMatch(/WARMUP_BELL_LABEL/);
    expect(practice).toMatch(/WARMUP_BELL_HOME/);
    expect(practice).toMatch(/\{WHAT_YOU_KNOW\}/);
    expect(practice).toMatch(/home-links/);
    expect(practice).toMatch(/home-warmup/);
    expect(practice).toMatch(/hasClassSet \?/);
    const classSetBlock = practice.split("hasClassSet ?")[1]?.split(") : null}")[0] || "";
    expect(classSetBlock).toMatch(/home-warmup/);
    expect(classSetBlock).toMatch(/warmup-bell/);
    expect(classSetBlock).toMatch(/\{WARMUP\}/);
    expect(classSetBlock).toMatch(/WARMUP_BELL_LABEL/);
    expect(classSetBlock.indexOf("{WARMUP}")).toBeLessThan(classSetBlock.indexOf("warmup-bell"));
    expect(practice.indexOf("{WARMUP}")).toBeGreaterThan(practice.indexOf("home-warmup"));
    expect(practice.indexOf("{WHAT_YOU_KNOW}")).toBeGreaterThan(practice.indexOf("home-links"));
    const actions = practice.split('className="home-actions"')[1] || "";
    expect(actions.indexOf("{WARMUP}")).toBeGreaterThan(actions.indexOf("Play"));
    expect(actions.indexOf("WARMUP_BELL_LABEL")).toBeGreaterThan(actions.indexOf("{WARMUP}"));
    expect(actions).toMatch(/Customize[\s\S]*\{WHAT_YOU_KNOW\}[\s\S]*CLASS_SET_LOAD/);
    expect(actions).toMatch(/text-back[\s\S]*Customize/);
    expect(home.split('className="home-actions"')[1] || "").toMatch(/PRACTICE/);
    expect(WARMUP_BELL_LABEL).toBe("5 minutes");
    expect(WARMUP_BELL_HOME).toBe("Stops the round. Misses still just mark red.");
    const customize = readFileSync(join(root, "components/Customize.jsx"), "utf8");
    expect(customize).toMatch(/classSetFromSettings/);
    expect(customize).toMatch(/aria-checked=\{on\}/);
    expect(customize).toMatch(/bucket-check/);
    expect(customize).toMatch(/VERB_PICK_LEGEND/);
    expect(customize).toMatch(/set-summary/);
    expect(customize).toMatch(/CLASS_SET_SHOW/);
    expect(customize).not.toMatch(/warmupBell|WARMUP_BELL|5:00/);
    expect(customize).not.toMatch(/Per item|<strong>Timer<\/strong>|timerSec/);
    const classSet = readFileSync(join(root, "components/ClassSet.jsx"), "utf8");
    expect(classSet).toMatch(/classSetFromSettings/);
    expect(classSet).toMatch(/set-summary/);
    expect(classSet).toMatch(/showCode/);
    expect(classSet).toMatch(/CLASS_SET_SHOW/);
    expect(classSet).not.toMatch(/timer|warmupBell|5:00/);
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/warmupBell/);
    expect(app).toMatch(/saveWarmupBell/);
    expect(app).toMatch(/warmupBell: Boolean\(prev\.warmupBell\)/);
    expect(app).toMatch(/onApplySet=\{/);
    expect(app).toMatch(/loadClassSet\(prev, classSetFromSettings/);
    expect(app).not.toMatch(/onApplySet=\{\(next\) => setStore\(\(prev\) => saveSettings/);
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
    memoryStore();
    const withBell = saveWarmupBell(loadState(), true);
    expect(withBell.warmupBell).toBe(true);
    expect(loadState().warmupBell).toBe(true);
    expect(saveWarmupBell(withBell, false).warmupBell).toBe(false);
    memoryStore();
    const noSet = saveWarmupBell(loadState(), true);
    expect(noSet.hasClassSet).toBe(false);
    expect(noSet.warmupBell).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).warmupBell).toBe(true);
    expect(loadState().warmupBell).toBe(true);
    expect(loadState().hasClassSet).toBe(false);
    const storage = readFileSync(join(root, "engine/storage.js"), "utf8");
    expect(storage).toMatch(/warmupBell: deviceWarmupBell\(current\)/);
    expect(storage).toMatch(/classSetSettingsPatch/);
    expect(storage).not.toMatch(/warmupBell: Boolean\(state\.warmupBell\)/);
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
    expect(encodeClassSet({ ...payload, timer: true, timerSec: 8, warmupBell: true, mc: true })).not.toMatch(
      /timer|warmupBell|"mc"/,
    );
    expect(CLASS_SET_FIELDS).toEqual([
      "types",
      "tenses",
      "pickedVerbs",
      "customList",
      "address",
      "extraColumn",
    ]);
    expect(CLASS_SET_FIELDS).not.toEqual(expect.arrayContaining(["timer", "timerSec", "warmupBell", "mc"]));
    expect(parseClassSet(JSON.stringify({ ...payload, timer: true, warmupBell: false }))).not.toHaveProperty(
      "timer",
    );
    expect(parseClassSet(JSON.stringify({ ...payload, timer: true, warmupBell: false }))).not.toHaveProperty(
      "warmupBell",
    );
    const summary = classSetSummaryLines(payload);
    expect(summary.map((line) => line.label)).toEqual(
      expect.arrayContaining(["People", "Times", "Verb types"]),
    );
    expect(summary.find((line) => line.label === "Verb types")?.value).toMatch(/Stem/);
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

  it("keeps minted atlas 10/10 after a class set clears sittingKeys", () => {
    memoryStore();
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    let attempts = [];
    for (let round = 0; round < 5; round += 1) {
      attempts = [
        ...attempts,
        ...first.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
      ];
    }
    let state = rememberSitting(loadState(), first);
    state = {
      ...state,
      profiles: state.profiles.map((profile) =>
        profile.id === state.activeProfileId ? { ...profile, attempts } : profile,
      ),
    };
    expect(activeProfile(state).atlasKeys).toEqual(keys);
    expect(namedLevels(attempts, activeProfile(state).sittingKeys, activeProfile(state).atlasKeys).find((level) => level.id === "fill").known).toBe(10);
    expect(miniCellPaint(attempts, first[0].tense, first[0].person, keys)).toBe("know");
    const before = activeProfile(state).attempts.length;
    state = loadClassSet(state, classSetFromSettings({ ...DEFAULT_SETTINGS, types: ["stem"] }));
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual([]);
    expect(activeProfile(state).atlasKeys).toEqual(keys);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).atlasKeys).toEqual(keys);
    expect(activeProfile(state).attempts).toHaveLength(before);
    const fill = namedLevels(
      activeProfile(state).attempts,
      activeProfile(state).sittingKeys,
      activeProfile(state).atlasKeys,
    ).find((level) => level.id === "fill");
    expect(fill.known).toBe(10);
    expect(fill.detail).toBe(`10/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`);
    expect(recapHitsToward(activeProfile(state).attempts, activeProfile(state).sittingKeys).label).toBe("0/5");
    expect(recapHitsToward(activeProfile(state).attempts, keys).label).toBe("5/5");
    expect(miniCellPaint(activeProfile(state).attempts, first[0].tense, first[0].person, activeProfile(state).atlasKeys)).toBe("know");
    expect(state.warmupBell).toBe(false);
    const withBell = saveWarmupBell(state, true);
    const hostile = {
      ...classSetFromSettings({ ...DEFAULT_SETTINGS, types: ["stem"] }),
      warmupBell: false,
      sittingKeys: ["should-not-write"],
    };
    const afterBell = loadClassSet(withBell, hostile);
    expect(afterBell.warmupBell).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).warmupBell).toBe(true);
    expect(loadState().warmupBell).toBe(true);
    expect(activeProfile(afterBell).sittingKeys).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual([]);
    expect(activeProfile(afterBell).atlasKeys).toEqual(keys);
    expect(encodeClassSet(classSetFromSettings(afterBell.settings))).not.toMatch(/warmupBell/);
  });

  it("keeps 5:00 on the device after a hard reload and after a class set", () => {
    memoryStore();
    let state = saveWarmupBell(loadState(), true);
    expect(state.hasClassSet).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).warmupBell).toBe(true);
    expect(loadState().warmupBell).toBe(true);
    expect(loadState().hasClassSet).toBe(false);

    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(3));
    const keys = first.map(itemFormKey);
    state = rememberSitting(loadState(), first);
    expect(state.warmupBell).toBe(true);
    expect(activeProfile(state).sittingKeys).toEqual(keys);

    const beforeTimer = state.settings.timer;
    const beforeSec = state.settings.timerSec;
    state = loadClassSet(state, {
      ...classSetFromSettings({ ...DEFAULT_SETTINGS, types: ["stem"] }),
      warmupBell: false,
      timer: true,
      timerSec: 8,
      mc: true,
      sittingKeys: keys,
    });
    expect(state.hasClassSet).toBe(true);
    expect(state.warmupBell).toBe(true);
    expect(state.settings.timer).toBe(beforeTimer);
    expect(state.settings.timerSec).toBe(beforeSec);
    expect(state.settings.mc).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).warmupBell).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).settings.timer).toBe(beforeTimer);
    expect(loadState().warmupBell).toBe(true);
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual([]);
    expect(activeProfile(state).atlasKeys).toEqual(keys);
    expect(encodeClassSet(classSetFromSettings(state.settings))).not.toMatch(/timer|warmupBell/);

    state = saveSettings(state, {
      ...DEFAULT_SETTINGS,
      types: ["irregular"],
      warmupBell: false,
      timer: true,
      timerSec: 8,
    });
    expect(state.warmupBell).toBe(true);
    expect(state.settings.timer).toBe(beforeTimer);
    expect(state.settings.timerSec).toBe(beforeSec);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).warmupBell).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).settings.timer).toBe(beforeTimer);
    expect(loadState().warmupBell).toBe(true);
    expect(timerFailsItem(timerExpireAction({ session: true }))).toBe(false);
    const profile = readFileSync(join(root, "components/Profile.jsx"), "utf8");
    expect(profile).toMatch(/atlasKeys/);
    expect(profile).not.toMatch(/recapHitsToward|recap-pips/);
    expect(profile).toMatch(/sittingKeys=\{profile\.sittingKeys\}/);
    expect(profile).toMatch(/atlasKeys=\{profile\.atlasKeys\}/);
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
    expect(NEXT_PLAY_SUGGEST).toBe(
      "Play the ones they still miss. Another mood is in Customize.",
    );
    expect(NEXT_PLAY_SUGGEST).not.toMatch(/you know this|sitting|hits toward|meters|when the class/i);
    expect(RECAP_NEXT_REST).toBe("Play the ones they still miss.");
    expect(RECAP_NEXT_REST).not.toMatch(/you know this|sitting|hits toward|meters/i);
    const visits = board.map((cell) => typed(cell.tense, cell.person, true));
    const knownPresenteYo = [
      ...knownAt("presente", "yo"),
      ...knownAt("presente", "yo", "comer"),
    ];
    const items = buildRound(DEFAULT_SETTINGS, [...visits, ...knownPresenteYo], mulberry32(9));
    expect(items).toHaveLength(cellsFor(DEFAULT_SETTINGS).length);
    expect(new Set(items.map((item) => itemFormKey(item))).size).toBe(
      cellsFor(DEFAULT_SETTINGS).length,
    );
  });

  it("keeps recap as this-round copy with a way home and no class scores", () => {
    expect(RECAP_HEAD).toBe(RECAP_TURN_RED);
    expect(RECAP_CLEAN).toBe(RECAP_CLEAN_LINE);
    expect(RECAP_SAME_BOARD).toBe(RECAP_TURN_RED);
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    expect(play).toMatch(/is-glance/);
    expect(play).toMatch(/\{story\.banner\}/);
    expect(play).toMatch(/recap-hdmi/);
    expect(play).toMatch(/\{story\.head\}/);
    expect(play).toMatch(/\{story\.line\}/);
    expect(play).not.toMatch(/Same 10\. Fill the wells\.|Same board\.|Board lit/);
    expect(play).not.toMatch(/recap-pips/);
    expect(play).not.toMatch(/\{story\.pips\}/);
    expect(play).not.toMatch(/Pips \{story\.pips\}/);
    expect(play).toMatch(/Play again/);
    expect(play).not.toMatch(/PROFILE_TITLE/);
    expect(play).not.toMatch(/class score|live score|roster|leaderboard|improved/i);
    expect(RECAP_SAME_TEN).toBe(RECAP_TURN_RED);
    expect(RECAP_TURN_RED).toBe("Play again for a new mix.");
    expect(RECAP_TURN_RED).not.toMatch(/turn the red|wells|Same board|Board lit/i);
    expect(RECAP_CLEAN_LINE).toBe("Nailed it. Play again so it sticks.");
    const recapActions = play.split("play-done")[1] || "";
    expect(recapActions).toMatch(/btn-primary/);
    expect(recapActions).toMatch(/>\s*Back\s*</);
    expect(recapActions).toMatch(/onClick=\{onPlayAgain\}/);
    expect(recapActions).not.toMatch(/Customize/);
    expect(recapActions).not.toMatch(/WHAT_YOU_KNOW|What you know/);
    expect(play).not.toMatch(/beat === "go"/);
    const recap = readFileSync(join(root, "engine/recap.js"), "utf8");
    expect(recap).toMatch(/banner: tally\.label/);
    expect(recap).toMatch(/RECAP_CLEAN_LINE/);
    expect(recap).toMatch(/RECAP_TURN_RED/);
    expect(recap).not.toMatch(/toward knowing this set/);
    expect(recap).not.toMatch(/\bscore\b|\bXP\b|streak|loot/i);
    const board = readFileSync(join(root, "components/Board.jsx"), "utf8");
    expect(board).not.toMatch(/sittingCellMarks|sittingVisitCellKeys/);
    expect(board).toMatch(/lastRoundResult/);
    expect(board).toMatch(/answeredCellKeys/);
    expect(board).toMatch(/data-result/);
    expect(board).not.toMatch(/recap \?\s*0/);
    const styles = readFileSync(join(root, "styles.css"), "utf8");
    expect(styles).toMatch(/\.recap-hdmi/);
    expect(styles).toMatch(/\.cell\[data-result="ok"\]/);
    expect(styles).toMatch(/\.cell\[data-result="bad"\]/);
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
