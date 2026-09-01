/**
 * Active content pack. The quiz loop — round, board, check, miss, atlas —
 * reads this object. Spanish ships now. French / German / Latin later is
 * another pack with the same shape, not a change to the shell.
 */
import * as spanish from "../packs/spanish/index.js";

export const pack = spanish;

export {
  ALL_VERBS,
  SPECIAL_VERBS,
  activeTypes,
  asPlayableVerb,
  conjugate,
  endingPattern,
  parseCustomList,
  verbType,
  verbsForSettings,
  verbsInBucket,
} from "../packs/spanish/index.js";

export const tenses = spanish.targetGroups.flatMap((group) => group.items);

export const tenseById = Object.fromEntries(tenses.map((tense) => [tense.id, tense]));

export function moodOf(tense) {
  return tenseById[tense]?.mood ?? tense;
}

export function timeOf(tense) {
  return tenseById[tense]?.time ?? tense;
}

export function timesForMood(mood) {
  return spanish.targetGroups.find((group) => group.id === mood)?.items ?? [];
}

export function isCommand(tense) {
  return tenseById[tense]?.mood === "commands";
}

export function personById(id) {
  return spanish.persons.find((person) => person.id === id);
}

export function personLabel(person) {
  return personById(person)?.label ?? person;
}

export function tenseLabel(tense, { board = false } = {}) {
  const meta = tenseById[tense];
  if (!meta) return tense;
  return board ? meta.boardLabel || meta.label : meta.label;
}
