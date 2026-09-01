export const POOL = {
  REGULARS: 1,
  IRREGULARS: 2,
  STEM: 3,
};

export const ROUND_SIZE = 10;
export const CONTENT_VERSION = "v1";
export const PIP_SLOTS = 5;

export const BOARD_NOTE =
  "This board is this round. A square fills when you answer. Right or wrong shows on what you typed.";

export const RECAP_HEAD = "Board lit";
export const RECAP_CLEAN = "Clean board";
export const RECAP_BEAT_MS = 1600;
export const SOUND_MUTED = true;
export const RECAP_SUB =
  "You lit the 2×5; those squares are on What you know as not enough yet — you know this takes 5 of last 7 typed.";
export const RECAP_ROUND1 = RECAP_SUB;
export const RECAP_STILL =
  "Same squares, still not enough yet — you know this takes 5 of last 7 typed.";
export const RECAP_NEXT_AGAIN = "Play those squares again.";
export const RECAP_NEXT_REST = "Play the ones that are not you know this.";
export const RECAP_NEXT_MAP = "Open What you know.";

export const FARM_NOTE =
  "These are forms you already know. Add another time or kind of verb.";

export const FORM_STATE = {
  not_enough: "not_enough",
  learning: "learning",
  know: "know",
};

export const FORM_COPY = {
  not_enough: "not enough yet",
  learning: "still learning",
  know: "you know this",
};

export const MASTERY_WINDOW = 7;
export const MASTERY_NEED = 5;
export const MASTERY_MIN = 5;

export const STORAGE_KEY = "verbos.v1";

/** Product chrome — not a language identity. */
export const WORDMARK = "VERBOS";
export const LEDE = "The ultimate conjugation quiz.";
