import {
  DEFAULT_SETTINGS,
  FORM_COPY,
  LEVEL_FILL_NEED,
  LEVEL_FILL_TOTAL,
  LEVEL_LIT,
  NEXT_PLAY_LEGEND,
  NEXT_PLAY_SUGGEST,
  RECAP_NEXT_AGAIN,
  RECAP_NEXT_MAP,
  RECAP_NEXT_REST,
} from "./constants.js";
import { cellPips, cellsFor } from "./board.js";
import { completePassDone, formState, isVisited, typedAttemptsFor, youKnowThis } from "./mastery.js";
import { moodOf, pack, personLabel, tenseLabel, timeOf } from "./pack.js";

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

export function miniCellPaint(attempts, tense, person) {
  return miniCellState(attempts, tense, person) === "know" ? "know" : "empty";
}

function playMoodId() {
  return moodOf(DEFAULT_SETTINGS.tenses[0]);
}

function boardLevelName() {
  const mood = pack.moods.find((item) => item.id === playMoodId());
  return `${mood?.label ?? "Board"} 2×5`;
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
      detail: `${known}/${LEVEL_FILL_TOTAL} ${FORM_COPY.know}`,
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

export function lastMiss(attempts = []) {
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (attempts[index].correct === false) return attempts[index];
  }
  return null;
}

function pickFocused(list, miss) {
  if (!list.length) return null;
  if (miss) {
    const hit = list.find((cell) => cell.tense === miss.tense && cell.person === miss.person);
    if (hit) return hit;
  }
  return list[0];
}

export function nextPlayFocus(attempts = [], settings = DEFAULT_SETTINGS) {
  if (!attempts.length) return null;
  const cells = cellsFor(settings);
  const miss = lastMiss(attempts);
  const empty = cells.filter((cell) => cellPips(attempts, cell.tense, cell.person) === 0);
  const learning = cells.filter(
    (cell) => miniCellState(attempts, cell.tense, cell.person) === "learning",
  );
  const unknown = cells.filter((cell) => miniCellState(attempts, cell.tense, cell.person) !== "know");
  return (
    pickFocused(empty, miss) ||
    pickFocused(learning, miss) ||
    pickFocused(
      unknown.filter((cell) => miss && cell.tense === miss.tense && cell.person === miss.person),
      miss,
    ) ||
    null
  );
}

export function nextPlayLine(attempts = [], leftover = true, settings = DEFAULT_SETTINGS) {
  const focus = nextPlayFocus(attempts, settings);
  if (focus) {
    return `${NEXT_PLAY_LEGEND}: ${tenseLabel(focus.tense)} · ${personLabel(focus.person)}`;
  }
  const contrast = namedLevels(attempts).find((level) => level.id === "contrast");
  if (contrast?.checked) return NEXT_PLAY_SUGGEST;
  if (leftover) {
    return completePassDone(attempts, cellsFor(settings)) ? RECAP_NEXT_AGAIN : RECAP_NEXT_REST;
  }
  return RECAP_NEXT_MAP;
}

export { nextMoodLabel };
