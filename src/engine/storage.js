import { CONTENT_VERSION, STORAGE_KEY } from "./config.js";
import { DEFAULT_SETTINGS, typesFromLegacyPool } from "./constants.js";
import { moodOf, pack, timeOf } from "./pack.js";
import { endingPattern, verbType } from "./verbs.js";

function normalizeSettings(raw = {}) {
  const tenses = Array.isArray(raw.tenses) && raw.tenses.length
    ? raw.tenses
    : [...DEFAULT_SETTINGS.tenses];
  const types = Array.isArray(raw.types) && raw.types.length
    ? raw.types
    : typesFromLegacyPool(raw.pool);
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    tenses,
    types,
    address: raw.address || (raw.vos ? pack.addressOptions[1]?.id : pack.addressOptions[0]?.id),
    customList: raw.customList || "",
    pickedVerbs: Array.isArray(raw.pickedVerbs) ? raw.pickedVerbs : [],
  };
}

function blank() {
  return {
    settings: normalizeSettings(),
    attempts: [],
    finishedRound: false,
    lastCells: [],
  };
}

function newAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
    const parsed = JSON.parse(raw);
    return {
      ...blank(),
      ...parsed,
      settings: normalizeSettings(parsed.settings),
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.map((attempt) => toLogAttempt(attempt, attempt.ts || Date.now()))
        : [],
      lastCells: Array.isArray(parsed.lastCells) ? parsed.lastCells : [],
    };
  } catch {
    return blank();
  }
}

export function saveState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: state.settings,
      attempts: state.attempts.slice(-400),
      finishedRound: state.finishedRound,
      lastCells: Array.isArray(state.lastCells) ? state.lastCells : [],
    }),
  );
}

export function recordAttempt(state, attempt) {
  const next = {
    ...state,
    attempts: [...state.attempts, toLogAttempt(attempt)],
  };
  saveState(next);
  return next;
}

export function markFinished(state) {
  const next = { ...state, finishedRound: true };
  saveState(next);
  return next;
}

export function saveSettings(state, settings) {
  const next = { ...state, settings: normalizeSettings(settings) };
  saveState(next);
  return next;
}

export function rememberCells(state, cells) {
  const next = {
    ...state,
    lastCells: (cells || []).map((cell) => ({ tense: cell.tense, person: cell.person })),
  };
  saveState(next);
  return next;
}

export function clearProgress(state) {
  const next = {
    ...state,
    attempts: [],
  };
  saveState(next);
  return next;
}
