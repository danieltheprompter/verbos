import { DEFAULT_SETTINGS, STORAGE_KEY } from "./constants.js";
import { verbType } from "./verbs.js";

function blank() {
  return {
    settings: { ...DEFAULT_SETTINGS, tenses: [...DEFAULT_SETTINGS.tenses] },
    attempts: [],
    finishedRound: false,
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
      settings: { ...blank().settings, ...parsed.settings },
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.map((attempt) => ({
            ...attempt,
            type: attempt.type || verbType(attempt.verb),
          }))
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
    attempts: [
      ...state.attempts,
      {
        tense: attempt.tense,
        person: attempt.person,
        verb: attempt.verb,
        type: attempt.type || verbType(attempt.verb),
        correct: Boolean(attempt.correct),
        typed: Boolean(attempt.typed),
        ts: Date.now(),
      },
    ],
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
  const next = { ...state, settings };
  saveState(next);
  return next;
}
