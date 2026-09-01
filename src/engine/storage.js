import { CONTENT_VERSION, DEFAULT_SETTINGS, STORAGE_KEY } from "./constants.js";
import { verbType } from "./verbs.js";

function normalizeSettings(raw = {}) {
  const tenses = Array.isArray(raw.tenses) && raw.tenses.length
    ? raw.tenses
    : [...DEFAULT_SETTINGS.tenses];
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    tenses,
    address: raw.address || (raw.vos ? "vos" : "tu"),
    customList: raw.customList || "",
  };
}

function blank() {
  return {
    settings: normalizeSettings(),
    attempts: [],
    finishedRound: false,
  };
}

function newAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toLogAttempt(attempt, now = Date.now()) {
  const verb_type = attempt.verb_type || attempt.type || verbType(attempt.verb);
  return {
    attempt_id: attempt.attempt_id || newAttemptId(),
    tense: attempt.tense,
    person: attempt.person,
    verb: attempt.verb,
    verb_type,
    type: verb_type,
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
