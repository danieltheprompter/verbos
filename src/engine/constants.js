export {
  ADD_PERSON,
  BOARD_NOTE,
  CLASS_SET,
  CLASS_SET_BAD,
  CLASS_SET_COPY,
  CLASS_SET_LOAD,
  CLASS_SET_NOTE,
  CLASS_SET_OK,
  CLEAR_ATLAS,
  CONTENT_VERSION,
  DISPLAY_NAME,
  DISPLAY_NAME_PLACEHOLDER,
  FARM_NOTE,
  LEVELS_LEGEND,
  LEVELS_NOTE,
  LEVEL_FILL_NEED,
  LEVEL_FILL_TOTAL,
  LEVEL_LIT,
  NEXT_PLAY_LEGEND,
  NEXT_PLAY_SUGGEST,
  PEOPLE_LEGEND,
  PROFILE_LEDE,
  PROFILE_TITLE,
  RECAP_BEAT_MS,
  RECAP_CLEAN,
  RECAP_HEAD,
  RECAP_NEXT_AGAIN,
  RECAP_NEXT_MAP,
  RECAP_NEXT_REST,
  RECAP_ROUND1,
  RECAP_SAME_TEN,
  RECAP_STILL,
  RECAP_SUB,
  FORM_COPY,
  FORM_STATE,
  RANK_PATH,
  MASTERY_MIN,
  MASTERY_NEED,
  MASTERY_WINDOW,
  PIP_SLOTS,
  POOL,
  ROUND_SIZE,
  SOUND_MUTED,
  STORAGE_KEY,
  WARMUP,
  WARMUP_BELL,
  WARMUP_BELL_NOTE,
  WARMUP_BELL_SEC,
  WORDMARK,
  LEDE,
} from "./config.js";

export {
  isCommand,
  moodOf,
  personLabel,
  tenseById as TENSE_BY_ID,
  tenses as TENSES,
  timeOf,
  timesForMood,
} from "./pack.js";

import { pack } from "./pack.js";
import { POOL } from "./config.js";

export const MOODS = pack.moods;
export const TARGET_GROUPS = pack.targetGroups;
export const PERSONS = pack.persons;
export const VERB_BUCKETS = pack.verbBuckets;
export const VERB_TYPES = pack.verbBuckets;
export const ENDING_PATTERNS = pack.endingPatterns;
export const DEFAULT_SETTINGS = pack.defaultSettings;
export const DEFAULT_TENSES = pack.defaultSettings.tenses;
export const DEFAULT_PERSONS = pack.persons
  .filter((person) => {
    if (person.optionalColumn) return false;
    if (person.address) return person.id === pack.defaultSettings.address;
    return true;
  })
  .map((person) => person.id);

export function typesFromLegacyPool(level) {
  const buckets = pack.verbBuckets.map((bucket) => bucket.id);
  if (level >= POOL.STEM) return buckets;
  if (level >= POOL.IRREGULARS) return buckets.slice(0, 2);
  return buckets.slice(0, 1);
}
