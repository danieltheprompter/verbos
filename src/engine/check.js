const MARKS = /[\u0300-\u036f]/g;

export function fold(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(MARKS, "")
    .replace(/[¡!¿?.,;:']/g, "")
    .replace(/\s+/g, " ");
}

const PRONOUNS = [
  "yo",
  "tu",
  "vos",
  "el",
  "ella",
  "usted",
  "nosotros",
  "nosotras",
  "vosotros",
  "vosotras",
  "ellos",
  "ellas",
  "ustedes",
  "nos",
];

export function stripPronoun(folded) {
  for (const pronoun of PRONOUNS) {
    if (folded === pronoun) continue;
    if (folded.startsWith(`${pronoun} `)) {
      return folded.slice(pronoun.length + 1);
    }
  }
  return folded;
}

export function answersMatch(expected, given) {
  const want = fold(expected);
  const got = stripPronoun(fold(given));
  return Boolean(got) && got === want;
}
