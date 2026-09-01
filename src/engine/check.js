import { pack } from "./pack.js";

const MARKS = /[!?.,;:'"""''-]/g;

export function fold(value) {
  const extra = pack.stripPunct || MARKS;
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(extra, "")
    .replace(/\s+/g, " ");
}

export function stripMarks(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function stripPronoun(folded, pronouns = pack.leadingPronouns) {
  for (const pronoun of pronouns) {
    if (folded === pronoun) continue;
    if (folded.startsWith(`${pronoun} `)) {
      return folded.slice(pronoun.length + 1);
    }
  }
  return folded;
}

export function isBlankAnswer(raw) {
  return !String(raw ?? "").trim();
}

export function answersMatch(expected, given) {
  const want = fold(expected);
  const got = stripPronoun(fold(given));
  return Boolean(got) && got === want;
}
