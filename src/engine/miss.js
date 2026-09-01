import { answersMatch, fold, stripMarks, stripPronoun } from "./check.js";
import { pack } from "./pack.js";

function extraLetter(want, got) {
  if (got.length !== want.length + 1) return null;
  for (let i = 0; i < got.length; i += 1) {
    if (got.slice(0, i) + got.slice(i + 1) === want) return got[i];
  }
  return null;
}

function missingLetter(want, got) {
  return extraLetter(got, want);
}

function oneOff(want, got) {
  if (want.length !== got.length) return false;
  let diffs = 0;
  for (let i = 0; i < want.length; i += 1) {
    if (want[i] !== got[i]) diffs += 1;
    if (diffs > 1) return false;
  }
  return diffs === 1;
}

export function explainMiss(expected, given) {
  if (answersMatch(expected, given)) return null;
  const want = stripPronoun(fold(expected));
  const got = stripPronoun(fold(given));
  if (!got) return { kind: "empty", message: "Type a form" };

  const fromPack = pack.explainMiss?.(expected, given, { want, got });
  if (fromPack) return fromPack;

  if (stripMarks(want) === stripMarks(got)) {
    return { kind: "accent", message: "Missing the accent" };
  }

  const extra = extraLetter(want, got);
  if (extra) return { kind: "extra", message: `Extra ${extra}` };

  if (missingLetter(want, got)) return { kind: "short", message: "A letter short" };

  if (oneOff(want, got)) return { kind: "close", message: "One letter off" };

  return { kind: "form", message: "Not that form" };
}
