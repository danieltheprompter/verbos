export {
  BOARD_NOTE,
  CONTENT_VERSION,
  FARM_NOTE,
  RECAP_HEAD,
  RECAP_SUB,
  FORM_COPY,
  FORM_STATE,
  MASTERY_MIN,
  MASTERY_NEED,
  MASTERY_WINDOW,
  PIP_SLOTS,
  POOL,
  ROUND_SIZE,
  STORAGE_KEY,
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
  .filter((person) => ["yo", "tu", "el", "nos", "ellos"].includes(person.id))
  .map((person) => person.id);

export function typesFromLegacyPool(level) {
  if (level >= POOL.STEM) return pack.verbBuckets.map((bucket) => bucket.id);
  if (level >= POOL.IRREGULARS) return ["regular", "irregular"];
  return ["regular"];
}
