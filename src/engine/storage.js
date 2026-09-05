import { CONTENT_VERSION, STORAGE_KEY } from "./config.js";
import { DEFAULT_SETTINGS, typesFromLegacyPool } from "./constants.js";
import { CLASS_SET_FIELDS, settingsLookLikeClassSet } from "./classSet.js";
import { moodOf, pack, timeOf } from "./pack.js";
import { cellsFor } from "./board.js";
import { itemFormKey, sittingKeysFromAttempts, uniqueFormKeys } from "./mastery.js";
import { endingPattern, verbType } from "./verbs.js";

function classSetSettingsPatch(payload) {
  const patch = {};
  for (const field of CLASS_SET_FIELDS) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
      patch[field] = payload[field];
    }
  }
  return patch;
}

function blobWarmupBell() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return Boolean(JSON.parse(raw).warmupBell);
  } catch {
    return false;
  }
}

function deviceWarmupBell(state) {
  if (state && Object.prototype.hasOwnProperty.call(state, "warmupBell")) {
    return Boolean(state.warmupBell);
  }
  return blobWarmupBell();
}

function normalizeSettings(raw = {}) {
  const safe = { ...(raw || {}) };
  delete safe.warmupBell;
  const fromPack = pack.normalizeSettings?.(safe) ?? safe;
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
    atlasKeys: [],
    journeyUnlocked: true,
    journeyNodeId: null,
    journeySittingKeys: [],
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
    atlasKeys: Array.isArray(raw?.atlasKeys) && raw.atlasKeys.length
      ? raw.atlasKeys
      : Array.isArray(raw?.sittingKeys)
        ? raw.sittingKeys
        : [],
    journeyUnlocked: raw?.journeyUnlocked !== false,
    journeyNodeId: raw?.journeyNodeId || null,
    journeySittingKeys: Array.isArray(raw?.journeySittingKeys) ? raw.journeySittingKeys : [],
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
    const topKeys = uniqueFormKeys(state.sittingKeys);
    const topAtlas = uniqueFormKeys(state.atlasKeys);
    return {
      settings: normalizeSettings(state.settings),
      hasClassSet: Boolean(state.hasClassSet),
      warmupBell: deviceWarmupBell(state),
      sittingKeys: topKeys,
      atlasKeys: topAtlas,
      activeProfileId,
      profiles: profiles.map((profile) => {
        if (profile.id !== activeProfileId) return profile;
        const sittingKeys = profile.sittingKeys.length ? profile.sittingKeys : topKeys;
        const atlasKeys = profile.atlasKeys.length
          ? profile.atlasKeys
          : topAtlas.length
            ? topAtlas
            : sittingKeys;
        return { ...profile, sittingKeys, atlasKeys };
      }),
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
      atlasKeys: state.atlasKeys,
    },
    "p1",
  );
  return {
    settings: normalizeSettings(state.settings),
    hasClassSet: Boolean(state.hasClassSet) || settingsLookLikeClassSet(state.settings),
    warmupBell: deviceWarmupBell(state),
    sittingKeys: profile.sittingKeys,
    atlasKeys: profile.atlasKeys,
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
  const warmupBell = deviceWarmupBell(state);
  const current = { ...ensureProfiles(state), warmupBell };
  const who = activeProfile(current);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: current.settings,
      hasClassSet: current.hasClassSet,
      warmupBell,
      sittingKeys: who.sittingKeys || [],
      atlasKeys: who.atlasKeys || [],
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

export function savePronouns(state, { address, extraColumn } = {}) {
  const current = ensureProfiles(state);
  const next = {
    ...current,
    settings: normalizeSettings({
      ...current.settings,
      address: address || current.settings.address,
      extraColumn:
        extraColumn === undefined ? current.settings.extraColumn : Boolean(extraColumn),
    }),
    warmupBell: deviceWarmupBell(current),
  };
  saveState(next);
  return next;
}

export function saveSettings(state, settings) {
  const current = ensureProfiles(state);
  const next = {
    ...current,
    settings: normalizeSettings({
      ...settings,
      timer: current.settings.timer,
      timerSec: current.settings.timerSec,
    }),
    hasClassSet: true,
    sittingKeys: [],
    warmupBell: deviceWarmupBell(current),
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

export function rememberSitting(state, items, { fresh = false, keys: pinKeys } = {}) {
  const profile = activeProfile(state);
  const raw = pinKeys?.length
    ? pinKeys
    : (items || []).map((item) => (typeof item === "string" ? item : itemFormKey(item)));
  const incoming = uniqueFormKeys(raw);
  const existing = uniqueFormKeys(profile.sittingKeys);
  const recovered = uniqueFormKeys(
    sittingKeysFromAttempts(profile.attempts, cellsFor(ensureProfiles(state).settings)),
  );
  const duplicateRebuild = raw.length > 0 && incoming.length !== raw.length;
  const keys = !fresh && existing.length
    ? existing
    : duplicateRebuild && existing.length
      ? existing
      : duplicateRebuild && recovered.length
        ? recovered
        : incoming.length
          ? incoming
          : existing.length
            ? existing
            : recovered;
  const atlasKeys = profile.atlasKeys?.length ? profile.atlasKeys : keys;
  const cells = (items || []).filter((cell) => cell && cell.tense && cell.person);
  const lastCells = cells.length
    ? cells.map((cell) => ({
        tense: cell.tense,
        person: cell.person,
        type: cell.type || cell.verb_type,
        ending: cell.ending_pattern || cell.ending,
        verb: cell.verb,
      }))
    : profile.lastCells;
  const next = {
    ...patchActive(state, {
      lastCells,
      sittingKeys: keys,
      atlasKeys,
    }),
    sittingKeys: keys,
    atlasKeys,
  };
  saveState(next);
  return next;
}

export function clearProgress(state) {
  const who = activeProfile(state);
  const next = {
    ...patchActive(state, {
      attempts: [],
      sittingKeys: [],
      atlasKeys: [],
      journeyNodeId: null,
      journeySittingKeys: [],
      journeyUnlocked: who.journeyUnlocked !== false,
    }),
    sittingKeys: [],
    atlasKeys: [],
  };
  saveState(next);
  return next;
}

export function setJourneyUnlocked(state, on) {
  const next = patchActive(state, { journeyUnlocked: Boolean(on) });
  saveState(next);
  return next;
}

export function rememberJourney(state, { nodeId, keys = [] } = {}) {
  const next = patchActive(state, {
    journeyNodeId: nodeId || activeProfile(state).journeyNodeId,
    journeySittingKeys: uniqueFormKeys(keys),
    journeyUnlocked: activeProfile(state).journeyUnlocked !== false,
  });
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
      ...classSetSettingsPatch(payload),
      mc: current.settings.mc,
      timer: current.settings.timer,
      timerSec: current.settings.timerSec,
    }),
    hasClassSet: true,
    sittingKeys: [],
    warmupBell: deviceWarmupBell(current),
    profiles: current.profiles.map((profile) =>
      profile.id === current.activeProfileId ? { ...profile, sittingKeys: [] } : profile,
    ),
  };
  saveState(next);
  return next;
}
