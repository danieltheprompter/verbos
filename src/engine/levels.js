import {
  DEFAULT_SETTINGS,
  LEVEL_FILL_NEED,
  LEVEL_LIT,
  NEXT_PLAY_SUGGEST,
  RECAP_NEXT_MAP,
  RECAP_NEXT_REST,
} from "./constants.js";
import { cellsFor } from "./board.js";
import { completePassDone, formState, isVisited, typedAttemptsFor, youKnowThis } from "./mastery.js";
import { moodOf, pack, tenseLabel, timeOf } from "./pack.js";
import { atlasRank } from "./progress.js";

export function defaultBoardCells() {
  return cellsFor(DEFAULT_SETTINGS);
}

export function cellKnown(attempts, cell) {
  const mood = moodOf(cell.tense);
  const time = timeOf(cell.tense);
  for (const bucket of pack.verbBuckets) {
    for (const ending of pack.endingPatterns) {
      if (
        youKnowThis(attempts, {
          mood,
          time,
          person: cell.person,
          type: bucket.id,
          ending: ending.id,
        })
      ) {
        return true;
      }
    }
  }
  return false;
}

export function miniCellState(attempts, tense, person) {
  const mood = moodOf(tense);
  const time = timeOf(tense);
  const base = { mood, time, person };
  for (const bucket of pack.verbBuckets) {
    for (const ending of pack.endingPatterns) {
      if (formState(attempts, { ...base, type: bucket.id, ending: ending.id }) === "know") {
        return "know";
      }
    }
  }
  for (const bucket of pack.verbBuckets) {
    for (const ending of pack.endingPatterns) {
      if (formState(attempts, { ...base, type: bucket.id, ending: ending.id }) === "learning") {
        return "learning";
      }
    }
  }
  if (typedAttemptsFor(attempts, base).length) return "not_enough";
  return "empty";
}

function playMoodId() {
  return moodOf(DEFAULT_SETTINGS.tenses[0]);
}

function boardLevelName() {
  const mood = pack.moods.find((item) => item.id === playMoodId());
  return `${mood?.label ?? "Board"} board`;
}

function contrastName() {
  const [first, second] = DEFAULT_SETTINGS.tenses;
  return `${tenseLabel(first)} vs ${tenseLabel(second)}`;
}

function nextMoodLabel() {
  const play = playMoodId();
  const next = pack.moods.find((item) => item.id !== play && item.id !== "commands");
  return next?.label ?? "next mood";
}

export function namedLevels(attempts = []) {
  const board = defaultBoardCells();
  const known = board.filter((cell) => cellKnown(attempts, cell)).length;
  const opened = board.filter((cell) => isVisited(attempts, cell.tense, cell.person)).length;
  const [presentId, pastId] = DEFAULT_SETTINGS.tenses;
  const presentKnown = board.some((cell) => cell.tense === presentId && cellKnown(attempts, cell));
  const pastKnown = board.some((cell) => cell.tense === pastId && cellKnown(attempts, cell));

  return [
    {
      id: "lit",
      name: LEVEL_LIT,
      detail: "",
      checked: completePassDone(attempts, board),
      lock: false,
    },
    {
      id: "fill",
      name: boardLevelName(),
      detail: atlasRank({ known, opened, allowed: board.length }).label,
      checked: known >= LEVEL_FILL_NEED,
      lock: false,
      known,
      opened,
    },
    {
      id: "contrast",
      name: contrastName(),
      detail: "",
      checked: presentKnown && pastKnown,
      lock: false,
      suggests: "next-mood",
    },
  ];
}

export function customizeLockedByLevels(_levels) {
  return false;
}

export function nextPlayLine(attempts = [], leftover = true) {
  const levels = namedLevels(attempts);
  const contrast = levels.find((level) => level.id === "contrast");
  if (contrast?.checked) return NEXT_PLAY_SUGGEST;
  if (leftover) return RECAP_NEXT_REST;
  return RECAP_NEXT_MAP;
}

export { nextMoodLabel };
