export const POOL = {
  REGULARS: 1,
  IRREGULARS: 2,
  STEM: 3,
};

export const CONTENT_VERSION = "v1";
export const PIP_SLOTS = 5;

export const BOARD_NOTE =
  "This board is this round. A square fills when you answer. Right or wrong shows on what you typed.";

export const RECAP_TURN_RED = "Play again — turn the red ones green.";
export const RECAP_CLEAN_LINE = "Nailed it. Play again so it sticks.";
export const RECAP_TOWARD_SET = "toward knowing this set";
export const RECAP_MISSED = "Missed";
export const RECAP_HEAD = RECAP_TURN_RED;
export const RECAP_CLEAN = RECAP_CLEAN_LINE;
export const RECAP_SAME_BOARD = RECAP_TURN_RED;
export const RECAP_BEAT_MS = 1600;
export const SOUND_MUTED = true;
export const RECAP_SUB = RECAP_TURN_RED;
export const RECAP_ROUND1 = RECAP_SUB;
export const RECAP_STILL = RECAP_SUB;
export const RECAP_SAME_TEN = RECAP_TURN_RED;
export const RECAP_NEXT_AGAIN = RECAP_TURN_RED;
export const RECAP_NEXT_REST = "Play the ones they still miss.";
export const RECAP_NEXT_MAP = "Open What you know.";
export const YOU = "You";
export const WHAT_YOU_KNOW = "What you know";

export const FARM_NOTE =
  "They already know these. Add another time or kind of verb.";

export const PROFILE_TITLE = "You, this device";
export const PROFILE_LEDE = "This device. Not an account.";
export const PEOPLE_LEGEND = "People";
export const ADD_PERSON = "Add someone";
export const DISPLAY_NAME = "Display name";
export const DISPLAY_NAME_PLACEHOLDER = "You";
export const NEXT_PLAY_LEGEND = "Next Play";
export const LEVELS_LEGEND = "Atlas fill";
export const LEVELS_NOTE = "Checks, not locks. Customize always opens.";
export const LEVEL_LIT = "Lit the board";
export const LEVEL_FILL_NEED = 6;
export const LEVEL_FILL_TOTAL = 10;
export const WARMUP = "Warm-up";
export const WARMUP_BELL = "5:00";
export const WARMUP_BELL_SEC = 300;
export const WARMUP_BELL_NOTE = "Bell — finish this item";
export const CLASS_SET = "Class set";
export const CLASS_SET_COPY = "Copy class set";
export const CLASS_SET_LOAD = "Load class set";
export const CLASS_SET_NOTE = "Yesterday's set stays on this device.";
export const CLASS_SET_BAD = "Could not load that class set.";
export const CLASS_SET_OK = "Loaded on this device.";
export const CLASS_SET_SHOW = "Show code";
export const CLASS_SET_HIDE = "Hide code";
export const VERB_PICK_LEGEND = "Pick any that apply.";
export const CLEAR_ATLAS = "Clear the atlas";
export const NEXT_PLAY_SUGGEST =
  "Play the ones they still miss. Another mood is in Customize.";

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

/** Placeholder path until Pedagogy freezes names. Copy, not tokens. */
export const RANK_PATH = [
  { id: "new_map", label: "New map" },
  { id: "first_marks", label: "First marks" },
  { id: "finding_feet", label: "Finding your feet" },
  { id: "on_the_map", label: "On the map" },
  { id: "lighting_up", label: "Lighting up" },
  { id: "you_own_this", label: "You own this" },
  { id: "this_map", label: "This map is yours" },
];

export const MASTERY_WINDOW = 7;
export const MASTERY_NEED = 5;
export const MASTERY_MIN = 5;

export const STORAGE_KEY = "verbos.v1";

/** Product chrome — not a language identity. */
export const WORDMARK = "VERBOS";
export const LEDE = "The ultimate conjugation quiz.";
