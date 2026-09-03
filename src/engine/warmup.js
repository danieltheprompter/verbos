import { SOUND_MUTED, WARMUP_BELL_SEC } from "./config.js";
import { cellsFor } from "./board.js";

export const TIMER_BELL = "bell";
export const TIMER_FAIL = "fail";

export function warmupSettings(settings) {
  return {
    ...settings,
    mc: false,
    timer: false,
  };
}

export function warmupRoundSize(settings) {
  return cellsFor(settings).length;
}

export function warmupMuted() {
  return SOUND_MUTED;
}

export function timerExpireAction({ session = false } = {}) {
  if (session) return TIMER_BELL;
  return TIMER_FAIL;
}

export function timerFailsItem(action) {
  return action === TIMER_FAIL;
}

export function formatBellClock(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export { WARMUP_BELL_SEC };
