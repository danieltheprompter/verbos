import { CONTENT_VERSION, STORAGE_KEY } from "./config.js";
import { DEFAULT_SETTINGS, typesFromLegacyPool } from "./constants.js";
import { settingsLookLikeClassSet } from "./classSet.js";
import { moodOf, pack, timeOf } from "./pack.js";
import { itemFormKey } from "./mastery.js";
import { endingPattern, verbType } from "./verbs.js";

function normalizeSettings(raw = {}) {
  const fromPack = pack.normalizeSettings?.(raw) ?? raw;
  const tenses = Array.isArray(fromPack.tenses) && fromPack.tenses.length
    ? fromPack.tenses
    : [...DEFAULT_SETTINGS.tenses];
  const types = Array.isArray(fromPack.types) && fromPack.types.length
    ? fromPack.types
    : typesFromLegacyPool(fromPack.pool);
  return {
    ...DEFAULT_SETTINGS,
    ...fromPack,
    tenses,
    types,
    address: fromPack.address || pack.defaultSettings.address || pack.addressOptions[0]?.id,
    extraColumn: Boolean(fromPack.extraColumn),
    customList: fromPack.customList || "",
    pickedVerbs: Array.isArray(fromPack.pickedVerbs) ? fromPack.pickedVerbs : [],
  };
}

function newId(prefix) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function blankProfile(id = newId("p"), name = "") {
  return {
    id,
    name: String(name || ""),
    attempts: [],
    finishedRound: false,
    lastCells: [],
    sittingKeys: [],
  };
}

function blank() {
  const profile = blankProfile("p1");
  return {
    settings: normalizeSettings(),
    hasClassSet: false,
    warmupBell: false,
    activeProfileId: profile.id,
    profiles: [profile],
  };
}

function normalizeProfile(raw, fallbackId) {
  return {
    id: raw?.id || fallbackId || newId("p"),
    name: String(raw?.name || ""),
    attempts: Array.isArray(raw?.attempts)
      ? raw.attempts.map((attempt) => toLogAttempt(attempt, attempt.ts || Date.now()))
      : [],
    finishedRound: Boolean(raw?.finishedRound),
    lastCells: Array.isArray(raw?.lastCells) ? raw.lastCells : [],
    sittingKeys: Array.isArray(raw?.sittingKeys) ? raw.sittingKeys : [],
  };
}

export function ensureProfiles(state = {}) {
  if (Array.isArray(state.profiles) && state.profiles.length) {
    const profiles = state.profiles.map((profile, index) =>
      normalizeProfile(profile, profile?.id || `p${index + 1}`),
    );
    const activeProfileId = profiles.some((profile) => profile.id === state.activeProfileId)
      ? state.activeProfileId
      : profiles[0].id;
    return {
      settings: normalizeSettings(state.settings),
      hasClassSet: Boolean(state.hasClassSet),
      warmupBell: Boolean(state.warmupBell),
      activeProfileId,
      profiles,
    };
  }
  const profile = normalizeProfile(
    {
      id: "p1",
      name: state.name || "",
      attempts: state.attempts,
      finishedRound: state.finishedRound,
      lastCells: state.lastCells,
      sittingKeys: state.sittingKeys,
    },
    "p1",
  );
  return {
    settings: normalizeSettings(state.settings),
    hasClassSet: Boolean(state.hasClassSet) || settingsLookLikeClassSet(state.settings),
    warmupBell: Boolean(state.warmupBell),
    activeProfileId: profile.id,
    profiles: [profile],
  };
}

export function activeProfile(state) {
  const current = ensureProfiles(state);
  return (
    current.profiles.find((profile) => profile.id === current.activeProfileId) ||
    current.profiles[0]
  );
}

export function profileName(profile, profiles = []) {
  const name = String(profile?.name || "").trim();
  if (name) return name;
  const empties = profiles.filter((item) => !String(item.name || "").trim());
  if (empties.length > 1) {
    const index = empties.findIndex((item) => item.id === profile.id);
    return `You ${index + 1}`;
  }
  return "You";
}

function patchActive(state, patch) {
  const current = ensureProfiles(state);
  return {
    ...current,
    profiles: current.profiles.map((profile) =>
      profile.id === current.activeProfileId ? { ...profile, ...patch } : profile,
    ),
  };
}

function newAttemptId() {
  return newId("att");
}

export function toLogAttempt(attempt, now = Date.now()) {
  const verb_type = attempt.verb_type || attempt.type || verbType(attempt.verb);
  const ending_pattern = attempt.ending_pattern || attempt.ending || endingPattern(attempt.verb);
  return {
    attempt_id: attempt.attempt_id || newAttemptId(),
    mood: attempt.mood || moodOf(attempt.tense),
    time: attempt.time || timeOf(attempt.tense),
    tense: attempt.tense,
    person: attempt.person,
    verb: attempt.verb,
    verb_type,
    type: verb_type,
    ending_pattern,
    expected: attempt.expected ?? null,
    given: attempt.given ?? "",
    correct: Boolean(attempt.correct),
    typed: Boolean(attempt.typed),
    latency_ms: Number.isFinite(attempt.latency_ms) ? Math.max(0, Math.round(attempt.latency_ms)) : null,
    content_version: attempt.content_version || CONTENT_VERSION,
    ts: now,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blank();
    return ensureProfiles(JSON.parse(raw));
  } catch {
    return blank();
  }
}

export function saveState(state) {
  const current = ensureProfiles(state);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: current.settings,
      hasClassSet: current.hasClassSet,
      warmupBell: Boolean(current.warmupBell),
      activeProfileId: current.activeProfileId,
      profiles: current.profiles.map((profile) => ({
        ...profile,
        attempts: profile.attempts.slice(-400),
      })),
    }),
  );
}

export function recordAttempt(state, attempt) {
  const profile = activeProfile(state);
  const next = patchActive(state, {
    attempts: [...profile.attempts, toLogAttempt(attempt)],
  });
  saveState(next);
  return next;
}

export function markFinished(state) {
  const next = patchActive(state, { finishedRound: true });
  saveState(next);
  return next;
}

export function saveSettings(state, settings) {
  const current = ensureProfiles(state);
  const next = {
    ...current,
    settings: normalizeSettings(settings),
    hasClassSet: true,
    profiles: current.profiles.map((profile) =>
      profile.id === current.activeProfileId ? { ...profile, sittingKeys: [] } : profile,
    ),
  };
  saveState(next);
  return next;
}

export function rememberCells(state, cells) {
  const next = patchActive(state, {
    lastCells: (cells || []).map((cell) => ({
      tense: cell.tense,
      person: cell.person,
      type: cell.type || cell.verb_type,
      ending: cell.ending_pattern || cell.ending,
      verb: cell.verb,
    })),
  });
  saveState(next);
  return next;
}

export function saveWarmupBell(state, on) {
  const current = ensureProfiles(state);
  const next = { ...current, warmupBell: Boolean(on) };
  saveState(next);
  return next;
}

export function rememberSitting(state, items) {
  const next = patchActive(state, {
    lastCells: (items || []).map((cell) => ({
      tense: cell.tense,
      person: cell.person,
      type: cell.type || cell.verb_type,
      ending: cell.ending_pattern || cell.ending,
      verb: cell.verb,
    })),
    sittingKeys: (items || []).map(itemFormKey),
  });
  saveState(next);
  return next;
}

export function clearProgress(state) {
  const next = patchActive(state, { attempts: [], sittingKeys: [] });
  saveState(next);
  return next;
}

export function switchProfile(state, id) {
  const current = ensureProfiles(state);
  if (!current.profiles.some((profile) => profile.id === id)) return current;
  const next = { ...current, activeProfileId: id };
  saveState(next);
  return next;
}

export function addProfile(state, name = "") {
  const current = ensureProfiles(state);
  const profile = blankProfile(newId("p"), name);
  const next = {
    ...current,
    activeProfileId: profile.id,
    profiles: [...current.profiles, profile],
  };
  saveState(next);
  return next;
}

export function renameProfile(state, name) {
  const next = patchActive(state, { name: String(name || "") });
  saveState(next);
  return next;
}

export function loadClassSet(state, payload) {
  if (!payload) return ensureProfiles(state);
  const current = ensureProfiles(state);
  const next = {
    ...current,
    settings: normalizeSettings({
      ...current.settings,
      ...payload,
      mc: current.settings.mc,
      timer: current.settings.timer,
      timerSec: current.settings.timerSec,
    }),
    hasClassSet: true,
    profiles: current.profiles.map((profile) =>
      profile.id === current.activeProfileId ? { ...profile, sittingKeys: [] } : profile,
    ),
  };
  saveState(next);
  return next;
}
