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
  RECAP_SAME_TEN,
  RECAP_SUB,
  SOUND_MUTED,
  STORAGE_KEY,
  WARMUP_BELL_SEC,
} from "./constants.js";
import { cellsFor, itemsToCells } from "./board.js";
import {
  applyClassSet,
  CLASS_SET_FIELDS,
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
    const css = readFileSync(join(root, "styles.css"), "utf8");
    const miniCss = css.slice(css.indexOf(".mini-cell"), css.indexOf(".session-bell"));
    expect(miniCss).not.toMatch(/--color-visit|--color-owned|#c9843c|#e39a45|#d8a35a/);
    expect(miniCss).not.toMatch(/is-not_enough|is-learning/);
  });

  it("starts a new sitting and a new recap from Customize", () => {
    memoryStore();
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    let state = rememberSitting(loadState(), first);
    expect(activeProfile(state).sittingKeys).toHaveLength(10);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual(
      activeProfile(state).sittingKeys,
    );
    state = saveSettings(state, { ...DEFAULT_SETTINGS, types: ["stem"] });
    expect(activeProfile(state).sittingKeys).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).sittingKeys).toEqual([]);
    expect(customizeLockedByLevels(namedLevels(activeProfile(state).attempts))).toBe(false);
  });

  it("keeps Warm-up on the sitting formKeys", () => {
    const first = buildRound(DEFAULT_SETTINGS, [], mulberry32(7));
    const keys = first.map(itemFormKey);
    const round1 = first.map((item) => typed(item.tense, item.person, true, { verb: item.verb }));
    const warm = playAgainRound(keys, warmupSettings(DEFAULT_SETTINGS), round1, mulberry32(8));
    expect(warm.map(itemFormKey).sort()).toEqual([...keys].sort());
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/sittingKeysFromAttempts/);
    expect(app).toMatch(/playAgainRound/);
    expect(app.split("function playAgain")[1]?.split("function start")[0] || "").not.toMatch(/buildRound/);
    expect(app).toMatch(/onPlayAgain=\{\(\) =>\s*playAgain\(/);
    expect(app).toMatch(/built round set ≠ sittingKeys/);
    expect(app).toMatch(/sittingKeys=\{profile\.sittingKeys\}/);
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    expect(play).toMatch(/recapStory\(items, log, sittingKeys\)/);
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
    expect(recapHitsToward(round1, keys).label).toBe("1/5");
    const second = buildRound(DEFAULT_SETTINGS, round1, mulberry32(11), 10, itemsToCells(first), keys);
    const after2 = [
      ...round1,
      ...second.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
    ];
    const story2 = recapStory(second.map((item) => ({ ...item, correct: true })), after2);
    expect(story2.pips).toBe("2/5");
    expect(story2.line).toBe(RECAP_SAME_TEN);
    expect(story2.line).not.toMatch(/0\/10|you know this/);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").known).toBe(0);
    expect(namedLevels(after2, keys).find((level) => level.id === "fill").detail).toBe(
      `0/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
    );
    expect(miniCellPaint(after2, first[0].tense, first[0].person)).toBe("empty");
    const visited = first[0];
    expect(miniCellState(round1, visited.tense, visited.person)).toBe("not_enough");
    expect(miniCellPaint(round1, visited.tense, visited.person)).toBe("empty");
    const boardUi = readFileSync(join(root, "components/Board.jsx"), "utf8");
    expect(boardUi).toMatch(/cell-marks/);
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
    expect(home.indexOf("warmup-bell")).toBeGreaterThan(home.indexOf("hasClassSet ?"));
    expect(home.indexOf("warmup-bell")).toBeGreaterThan(home.indexOf(") : null}"));
    const actions = home.split('className="home-actions"')[1] || "";
    expect(actions.indexOf("{WARMUP_BELL}")).toBeGreaterThan(actions.indexOf("{WARMUP}"));
    const customize = readFileSync(join(root, "components/Customize.jsx"), "utf8");
    expect(customize).toMatch(/classSetFromSettings/);
    expect(customize).not.toMatch(/warmupBell|WARMUP_BELL|5:00/);
    expect(customize).not.toMatch(/Per item|<strong>Timer<\/strong>|timerSec/);
    const classSet = readFileSync(join(root, "components/ClassSet.jsx"), "utf8");
    expect(classSet).toMatch(/classSetFromSettings/);
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
    let items = first;
    for (let round = 0; round < 5; round += 1) {
      items = buildRound(DEFAULT_SETTINGS, attempts, mulberry32(20 + round), 10, itemsToCells(first), keys);
      attempts = [
        ...attempts,
        ...items.map((item) => typed(item.tense, item.person, true, { verb: item.verb })),
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
    expect(NEXT_PLAY_SUGGEST).toMatch(/not you know this/);
    expect(NEXT_PLAY_SUGGEST).toMatch(/Customize/);
    const visits = board.map((cell) => typed(cell.tense, cell.person, true));
    const knownPresenteYo = [
      ...knownAt("presente", "yo"),
      ...knownAt("presente", "yo", "comer"),
    ];
    const items = buildRound(DEFAULT_SETTINGS, [...visits, ...knownPresenteYo], mulberry32(9));
    expect(items).toHaveLength(10);
    expect(new Set(items.map((item) => itemFormKey(item))).size).toBe(10);
  });

  it("keeps recap as a still-lit glance with Board lit / Clean board and no class scores", () => {
    expect(RECAP_HEAD).toBe("Board lit");
    expect(RECAP_CLEAN).toBe("Clean board");
    const play = readFileSync(join(root, "components/Play.jsx"), "utf8");
    expect(play).toMatch(/is-glance/);
    expect(play).toMatch(/recap-pips/);
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
