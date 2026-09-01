export function fold(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[¡!¿?.,;:']/g, "")
    .replace(/\s+/g, " ");
}

const PRONOUNS = [
  "nosotros",
  "nosotras",
  "vosotros",
  "vosotras",
  "ustedes",
  "usted",
  "ellos",
  "ellas",
  "ella",
  "tú",
  "vos",
  "él",
  "yo",
  "tu",
  "el",
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
