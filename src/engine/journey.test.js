import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { conjugate } from "./verbs.js";
import { tenseFor } from "./pack.js";
import { parseFormKey, youKnowThis } from "./mastery.js";
import { cellsFor } from "./board.js";
import { playAgainRound } from "./round.js";
import { mulberry32 } from "./random.js";
import {
  beatenTrialIds,
  currentJourneyId,
  isJourneyUnlocked,
  journeyCatalog,
  journeyMap,
  journeyPlayable,
  journeySettings,
  journeyTrial,
  trialBeaten,
  trialSittingKeys,
  trialUnlocked,
} from "./journey.js";
import { activeProfile, blankProfile, loadState, setJourneyUnlocked } from "./storage.js";
import { JOURNEY, LEDE, PRACTICE } from "./constants.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function mintKeys(keys, verb = "hablar") {
  return keys.flatMap((key) => {
    const spec = parseFormKey(key);
    const tense = tenseFor(spec.mood, spec.time);
    return Array.from({ length: 5 }, () => ({
      tense,
      person: spec.person,
      verb,
      type: spec.type,
      ending_pattern: spec.ending,
      mood: spec.mood,
      time: spec.time,
      correct: true,
      typed: true,
    }));
  });
}

function beat(id, attempts = [], verb) {
  const trial = journeyTrial(id);
  return [...attempts, ...mintKeys(trialSittingKeys(trial), verb)];
}

describe("Home two modes", () => {
  it("shows Practice and Journey on Home, not the old clutter", () => {
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    const practice = readFileSync(join(root, "components/Practice.jsx"), "utf8");
    expect(PRACTICE).toBe("Practice");
    expect(JOURNEY).toBe("Journey");
    expect(LEDE).toBe("The conjugation quiz.");
    expect(home).toMatch(/PRACTICE/);
    expect(home).toMatch(/JOURNEY/);
    expect(home).toMatch(/journeyUnlocked/);
    expect(home).not.toMatch(/Customize/);
    expect(home).not.toMatch(/CLASS_SET_LOAD/);
    expect(home).not.toMatch(/WARMUP/);
    expect(practice).toMatch(/Play again/);
    expect(practice).toMatch(/Customize/);
    expect(practice).toMatch(/WHAT_YOU_KNOW/);
    expect(practice).toMatch(/CLASS_SET_LOAD/);
  });
});

describe("Journey gate", () => {
  it("defaults unlocked so playtest works, and locks only Journey", () => {
    const profile = blankProfile();
    expect(profile.journeyUnlocked).toBe(true);
    expect(isJourneyUnlocked(profile)).toBe(true);
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    let state = loadState();
    expect(isJourneyUnlocked(activeProfile(state))).toBe(true);
    state = setJourneyUnlocked(state, false);
    expect(isJourneyUnlocked(activeProfile(state))).toBe(false);
    expect(activeProfile(state).finishedRound).toBe(false);
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    expect(home).toMatch(/disabled=\{!journeyUnlocked\}/);
    expect(home).toMatch(/JOURNEY_LOCKED/);
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/openPractice/);
    expect(app).toMatch(/startJourney/);
    expect(app).not.toMatch(/stripe|Stripe|price_/);
  });
});

describe("beat and mint rules", () => {
  it("does not beat on one clean round and uses 5 of last 7 typed", () => {
    const trial = journeyTrial("1");
    const keys = trialSittingKeys(trial);
    const settings = journeySettings(trial);
    expect(keys).toHaveLength(cellsFor(settings).length);
    const items = playAgainRound(keys, settings, [], mulberry32(3), { matchForm: true });
    const once = items.map((item) => ({
      ...item,
      correct: true,
      typed: true,
    }));
    expect(trialBeaten(once, trial)).toBe(false);
    expect(once.every((row) => !youKnowThis(once, itemFormKeySafe(row)))).toBe(true);
    const minted = mintKeys(keys);
    expect(trialBeaten(minted, trial)).toBe(true);
    expect(trialBeaten(minted, trial)).toBe(true);
  });

  it("counts Practice mint as already beaten and keeps the same sitting keys", () => {
    const trial = journeyTrial("1");
    const keys = trialSittingKeys(trial);
    const fromPractice = mintKeys(keys);
    expect(trialBeaten(fromPractice, trial)).toBe(true);
    const again = playAgainRound(keys, journeySettings(trial), fromPractice, mulberry32(4), {
      matchForm: true,
    });
    expect(again.map((item) => `${item.tense}:${item.person}`).sort()).toEqual(
      keys.map((key) => {
        const spec = parseFormKey(key);
        return `${spec.time}:${spec.person}`;
      }).sort(),
    );
  });
});

function itemFormKeySafe(item) {
  return {
    mood: item.mood,
    time: item.time,
    person: item.person,
    type: item.type,
    ending: item.ending_pattern,
  };
}

describe("trial order and locks", () => {
  it("opens the first trial and keeps later nodes locked", () => {
    const catalog = journeyCatalog();
    const beaten = new Set();
    expect(currentJourneyId([])).toBe("1");
    expect(trialUnlocked(journeyTrial("1"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("2"), beaten)).toBe(false);
    expect(trialUnlocked(journeyTrial("14"), beaten)).toBe(false);
    expect(journeyPlayable(journeyTrial("14"), [])).toBe(false);
  });

  it("opens optional vos after 1 and does not require it for 2", () => {
    const after1 = beat("1");
    const beaten = beatenTrialIds(after1);
    expect(beaten.has("1")).toBe(true);
    expect(trialUnlocked(journeyTrial("vos"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("2"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("vosotros"), beaten)).toBe(true);
    expect(currentJourneyId(after1)).toBe("2");
    expect(journeyTrial("vos").optional).toBe(true);
    expect(journeyTrial("vosotros").optional).toBe(true);
  });

  it("opens 8 and 9 together after 6 and 7, and 13 only after 12", () => {
    let attempts = [];
    for (const id of ["1", "2", "3", "4", "5", "6"]) attempts = beat(id, attempts, id === "3" ? "ser" : "hablar");
    expect(trialUnlocked(journeyTrial("8"), beatenTrialIds(attempts))).toBe(false);
    attempts = beat("7", attempts);
    const beaten = beatenTrialIds(attempts);
    expect(trialUnlocked(journeyTrial("8"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("9"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("12"), beaten)).toBe(false);
    for (const id of ["8", "9", "10", "11", "12"]) {
      attempts = beat(id, attempts, id === "9" ? "ser" : "hablar");
    }
    expect(trialUnlocked(journeyTrial("13"), beatenTrialIds(attempts))).toBe(true);
    expect(trialUnlocked(journeyTrial("14"), beatenTrialIds(attempts))).toBe(false);
  });

  it("keeps subjunctive closed until 1–2, 18 after 14, and 25/26 with 21/22 after 20", () => {
    let attempts = beat("1");
    expect(trialUnlocked(journeyTrial("14"), beatenTrialIds(attempts))).toBe(false);
    attempts = beat("2", attempts);
    expect(trialUnlocked(journeyTrial("14"), beatenTrialIds(attempts))).toBe(false);
    for (const id of ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]) {
      attempts = beat(id, attempts, ["3", "9"].includes(id) ? "ser" : "hablar");
    }
    expect(trialUnlocked(journeyTrial("14"), beatenTrialIds(attempts))).toBe(true);
    expect(trialUnlocked(journeyTrial("18"), beatenTrialIds(attempts))).toBe(false);
    expect(trialUnlocked(journeyTrial("17"), beatenTrialIds(attempts))).toBe(true);
    attempts = beat("14", attempts);
    expect(trialUnlocked(journeyTrial("18"), beatenTrialIds(attempts))).toBe(true);
    expect(trialUnlocked(journeyTrial("20"), beatenTrialIds(attempts))).toBe(true);
    attempts = beat("20", attempts);
    const after20 = beatenTrialIds(attempts);
    expect(trialUnlocked(journeyTrial("21"), after20)).toBe(true);
    expect(trialUnlocked(journeyTrial("22"), after20)).toBe(true);
    expect(trialUnlocked(journeyTrial("25"), after20)).toBe(true);
    expect(trialUnlocked(journeyTrial("26"), after20)).toBe(true);
    expect(trialUnlocked(journeyTrial("24"), after20)).toBe(false);
  });

  it("lights beaten nodes and can light the whole required path", () => {
    let attempts = [];
    for (const trial of journeyCatalog().filter((item) => !item.optional)) {
      attempts = beat(trial.id, attempts, ["3", "4", "9", "15"].includes(trial.id) ? "ser" : "hablar");
    }
    const nodes = journeyMap(attempts);
    expect(nodes.filter((node) => !node.optional).every((node) => node.state === "beaten")).toBe(true);
  });
});

describe("Practice stays open when Journey is locked", () => {
  it("keeps Practice as a free path", () => {
    expect(isJourneyUnlocked({ journeyUnlocked: false })).toBe(false);
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    expect(app).toMatch(/function openPractice/);
    expect(app.split("function openPractice")[1]).toMatch(/start\(\)/);
    expect(app).not.toMatch(/journeyUnlocked && start\(\)/);
  });
});

describe("compounds use tú haber", () => {
  it("does not split vos on haber", () => {
    expect(conjugate("hablar", "perfecto", "tu")).toBe("has hablado");
    expect(conjugate("hablar", "perfecto", "vos")).toBe("has hablado");
    expect(conjugate("hacer", "perfecto", "el")).toBe("ha hecho");
    expect(conjugate("hablar", "perfecto", "vos")).not.toMatch(/habés/);
  });
});
