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
  journeyAtlas,
  journeyCatalog,
  journeyMap,
  journeyPlayable,
  journeyPronouns,
  journeySettings,
  journeyTrial,
  requiredAllBeaten,
  sameSittingSet,
  trialBeaten,
  trialSittingKeys,
  trialUnlocked,
} from "./journey.js";
import {
  activeProfile,
  blankProfile,
  loadState,
  rememberSitting,
  savePronouns,
  setJourneyUnlocked,
} from "./storage.js";
import { JOURNEY, LEDE, PRACTICE, WHAT_YOU_KNOW } from "./constants.js";

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

function beat(id, attempts = [], verb, pronouns = {}) {
  const trial = journeyTrial(id);
  return [...attempts, ...mintKeys(trialSittingKeys(trial, pronouns), verb)];
}

function peopleOn(keys) {
  return [...new Set(keys.map((key) => parseFormKey(key).person))];
}

describe("Home two modes", () => {
  it("shows Practice and Journey as cards, What you know secondary", () => {
    const home = readFileSync(join(root, "components/Home.jsx"), "utf8");
    const practice = readFileSync(join(root, "components/Practice.jsx"), "utf8");
    expect(PRACTICE).toBe("Practice");
    expect(JOURNEY).toBe("Journey");
    expect(LEDE).toBe("The conjugation quiz.");
    expect(WHAT_YOU_KNOW).toBe("What you know");
    expect(home).toMatch(/PRACTICE/);
    expect(home).toMatch(/JOURNEY/);
    expect(home).toMatch(/home-card/);
    expect(home).toMatch(/home-cards/);
    expect(home).toMatch(/WHAT_YOU_KNOW/);
    expect(home).toMatch(/finishedRound/);
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
    expect(app).toMatch(/savePronouns/);
    expect(app).toMatch(/journeyAtlas/);
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

describe("vos is opt-in then first-class", () => {
  it("does not put vos side-quest trials on the required path", () => {
    const ids = journeyCatalog().map((trial) => trial.id);
    expect(ids).not.toContain("vos");
    expect(ids).not.toContain("vosotros");
    expect(journeyCatalog().filter((trial) => !trial.optional).map((trial) => trial.id)).toEqual(
      Array.from({ length: 26 }, (_, index) => String(index + 1)),
    );
  });

  it("keeps default sittings on the standard person set", () => {
    const trial = journeyTrial("1");
    const people = peopleOn(trialSittingKeys(trial));
    expect(people).toContain("tu");
    expect(people).not.toContain("vos");
    expect(people).not.toContain("vosotros");
    expect(journeyPronouns({ address: "tu", extraColumn: false })).toEqual({
      address: "tu",
      extraColumn: false,
    });
  });

  it("makes selected vos first-class on cells, keys, and beat", () => {
    const trial = journeyTrial("1");
    const pronouns = { address: "vos" };
    const keys = trialSittingKeys(trial, pronouns);
    const settings = journeySettings(trial, pronouns);
    const people = peopleOn(keys);
    expect(people).toContain("vos");
    expect(people).not.toContain("tu");
    expect(people).not.toContain("vosotros");
    expect(keys).toHaveLength(cellsFor(settings).length);
    expect(trialBeaten(mintKeys(trialSittingKeys(trial)), trial, pronouns)).toBe(false);
    expect(trialBeaten(mintKeys(keys), trial, pronouns)).toBe(true);
    expect(sameSittingSet(keys, trialSittingKeys(trial))).toBe(false);
    expect(sameSittingSet(keys, trialSittingKeys(trial, pronouns))).toBe(true);
    const withColumn = trialSittingKeys(trial, { address: "tu", extraColumn: true });
    expect(peopleOn(withColumn)).toContain("vosotros");
    expect(peopleOn(withColumn)).toContain("tu");
    expect(trialBeaten(mintKeys(trialSittingKeys(trial)), trial, { extraColumn: true })).toBe(false);
    expect(trialBeaten(mintKeys(withColumn), trial, { extraColumn: true })).toBe(true);
  });

  it("lets the required path finish without vos or vosotros", () => {
    let attempts = [];
    for (const trial of journeyCatalog().filter((item) => !item.optional)) {
      attempts = beat(trial.id, attempts, ["3", "4", "9", "15"].includes(trial.id) ? "ser" : "hablar");
    }
    const people = peopleOn(trialSittingKeys(journeyTrial("1")));
    expect(people).not.toContain("vos");
    expect(people).not.toContain("vosotros");
    expect(requiredAllBeaten(beatenTrialIds(attempts))).toBe(true);
    expect(journeyAtlas(attempts).complete).toBe(true);
  });
});

describe("trial order and locks", () => {
  it("opens the first trial and previews later nodes without padlocks", () => {
    const beaten = new Set();
    expect(currentJourneyId([])).toBe("1");
    expect(trialUnlocked(journeyTrial("1"), beaten)).toBe(true);
    expect(trialUnlocked(journeyTrial("2"), beaten)).toBe(false);
    expect(trialUnlocked(journeyTrial("14"), beaten)).toBe(false);
    expect(journeyPlayable(journeyTrial("14"), [])).toBe(false);
    const nodes = journeyMap([]);
    expect(nodes.find((node) => node.id === "1").state).toBe("current");
    expect(nodes.find((node) => node.id === "2").state).toBe("ahead");
    expect(nodes.every((node) => node.state !== "locked")).toBe(true);
  });

  it("opens 2 after 1 without a vos gate", () => {
    const after1 = beat("1");
    const beaten = beatenTrialIds(after1);
    expect(beaten.has("1")).toBe(true);
    expect(journeyTrial("vos")).toBe(null);
    expect(journeyTrial("vosotros")).toBe(null);
    expect(trialUnlocked(journeyTrial("2"), beaten)).toBe(true);
    expect(currentJourneyId(after1)).toBe("2");
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

describe("island atlas", () => {
  it("shows the whole route, pulses trial 1, and previews ahead nodes", () => {
    const atlas = journeyAtlas([]);
    expect(atlas.islands).toHaveLength(7);
    expect(atlas.nodes.find((node) => node.id === "1").state).toBe("current");
    expect(atlas.nodes.find((node) => node.id === "1").playable).toBe(true);
    expect(atlas.nodes.filter((node) => node.id !== "1").every((node) => node.state === "ahead")).toBe(
      true,
    );
    expect(atlas.nodes.every((node) => node.state !== "locked")).toBe(true);
    expect(atlas.complete).toBe(false);
    expect(atlas.route.length).toBeGreaterThan(20);
    expect(atlas.route.every((seg) => !seg.lit)).toBe(true);
    const map = readFileSync(join(root, "components/JourneyMap.jsx"), "utf8");
    expect(map).toMatch(/atlas-svg/);
    expect(map).toMatch(/addressOptions/);
    expect(map).toMatch(/optionalColumn/);
    expect(map).not.toMatch(/journey-path/);
    expect(map).not.toMatch(/is-locked|padlock/);
  });

  it("fills a mastered node, lights its segment, and pulses the next required", () => {
    const after1 = beat("1");
    const atlas = journeyAtlas(after1);
    expect(atlas.nodes.find((node) => node.id === "1").state).toBe("beaten");
    expect(atlas.nodes.find((node) => node.id === "2").state).toBe("current");
    expect(atlas.route.find((seg) => seg.from === "1" && seg.to === "2").lit).toBe(true);
    expect(atlas.complete).toBe(false);
  });

  it("shares the pronoun chips with Customize and does not wipe sittings", () => {
    const customize = readFileSync(join(root, "components/Customize.jsx"), "utf8");
    const map = readFileSync(join(root, "components/JourneyMap.jsx"), "utf8");
    expect(customize).toMatch(/addressOptions/);
    expect(customize).toMatch(/optionalColumn/);
    expect(map).toMatch(/addressOptions/);
    expect(map).toMatch(/onPronouns/);
    const memory = {};
    globalThis.localStorage = {
      getItem: (key) => memory[key] ?? null,
      setItem: (key, value) => {
        memory[key] = String(value);
      },
    };
    let state = loadState();
    state = rememberSitting(state, [], {
      fresh: true,
      keys: ["indicative:presente:yo:regular:ar"],
    });
    const sitting = [...activeProfile(state).sittingKeys];
    const atlasKeys = [...activeProfile(state).atlasKeys];
    state = savePronouns(state, { address: "vos", extraColumn: true });
    expect(state.settings.address).toBe("vos");
    expect(state.settings.extraColumn).toBe(true);
    expect(state.hasClassSet).toBe(false);
    expect(activeProfile(state).sittingKeys).toEqual(sitting);
    expect(activeProfile(state).atlasKeys).toEqual(atlasKeys);
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
